import {
  AgentActionProposal,
  AgentBudget,
  PolicyDecision,
} from "@prompt-workspace/prompt-contracts";

export interface EvaluationState {
  currentStep: number;
  currentRevisions: number;
  durationMs: number;
  providerCallsCount: number;
  currentCostMicrounits?: number;
  callerOwnerId: string;
}

export class AgentPolicyEngine {
  public readonly policyVersion: string = "1.0.0";

  /**
   * Evaluasi batas anggaran (Budget Exhaustion Check)
   */
  public checkBudget(
    state: EvaluationState,
    budget: AgentBudget
  ): { exhausted: boolean; reason?: string } {
    if (state.currentStep >= budget.maxSteps) {
      return {
        exhausted: true,
        reason: `BUDGET_EXHAUSTED: Langkah mencapai batas maksimum (${state.currentStep}/${budget.maxSteps}).`,
      };
    }

    if (state.currentRevisions >= budget.maxPromptRevisions) {
      return {
        exhausted: true,
        reason: `BUDGET_EXHAUSTED: Revisi prompt mencapai batas maksimum (${state.currentRevisions}/${budget.maxPromptRevisions}).`,
      };
    }

    if (state.durationMs >= budget.maxDurationMs) {
      return {
        exhausted: true,
        reason: `BUDGET_EXHAUSTED: Durasi runtime terlampaui (${state.durationMs}ms >= ${budget.maxDurationMs}ms).`,
      };
    }

    if (state.providerCallsCount >= budget.maxProviderCalls) {
      return {
        exhausted: true,
        reason: `BUDGET_EXHAUSTED: Panggilan LLM provider mencapai batas maksimum (${state.providerCallsCount}/${budget.maxProviderCalls}).`,
      };
    }

    if (
      budget.maxCostMicrounits !== undefined &&
      (state.currentCostMicrounits || 0) >= budget.maxCostMicrounits
    ) {
      return {
        exhausted: true,
        reason: `BUDGET_EXHAUSTED: Biaya komputasi melampaui batas anggaran (${state.currentCostMicrounits} >= ${budget.maxCostMicrounits}).`,
      };
    }

    return { exhausted: false };
  }

  /**
   * Menilai apakah aksi proposal diizinkan, memerlukan persetujuan manusia, atau ditolak
   * berdasarkan Matriks Izin Bab 6.2 secara deterministik & fail-closed.
   */
  public evaluateAction(
    proposal: AgentActionProposal,
    state: EvaluationState,
    budget?: AgentBudget
  ): PolicyDecision {
    // 1. Cek Anggaran jika budget disediakan
    if (budget) {
      const budgetCheck = this.checkBudget(state, budget);
      if (budgetCheck.exhausted) {
        return {
          decision: "deny",
          policyVersion: this.policyVersion,
          reasonCodes: ["BUDGET_EXHAUSTED", budgetCheck.reason || ""],
          riskClass: "high",
        };
      }
    }

    const { toolId, arguments: args, resourceScope } = proposal;

    // 2. DENY KELAS CRITICAL (Fail-Closed Anti-Privilege Escalation & Anti-IDOR)
    // a. Upaya modifikasi policy
    if (
      toolId.includes("policy") ||
      toolId.includes("reconfigure") ||
      JSON.stringify(args).includes("policy:modify")
    ) {
      return {
        decision: "deny",
        policyVersion: this.policyVersion,
        reasonCodes: [
          "POLICY_DENIED",
          "ANTI_PRIVILEGE_ESCALATION: Upaya mengubah konfigurasi policy ditolak mutlak.",
        ],
        riskClass: "critical",
      };
    }

    // b. Eksekusi script biner / executable liar
    if (
      toolId === "exec_command" ||
      toolId === "terminal_exec" ||
      toolId.includes("bash") ||
      toolId.includes("spawn_process")
    ) {
      return {
        decision: "deny",
        policyVersion: this.policyVersion,
        reasonCodes: [
          "POLICY_DENIED",
          "ARBITRARY_CODE_EXECUTION_FORBIDDEN: Eksekusi terminal/shell dilarang keras bagi runtime agent.",
        ],
        riskClass: "critical",
      };
    }

    // c. Anti-IDOR: Akses resource milik orang lain
    const targetOwnerId = args["ownerId"] as string | undefined;
    if (targetOwnerId && targetOwnerId !== state.callerOwnerId && !resourceScope.includes("global")) {
      return {
        decision: "deny",
        policyVersion: this.policyVersion,
        reasonCodes: [
          "POLICY_DENIED",
          "CROSS_SCOPE_IDOR_VIOLATION: Dilarang mengakses data milik identitas lain.",
        ],
        riskClass: "critical",
      };
    }

    // d. Upaya menghapus log audit
    if (
      toolId.includes("delete_audit") ||
      toolId.includes("purge_logs") ||
      toolId.includes("truncate")
    ) {
      return {
        decision: "deny",
        policyVersion: this.policyVersion,
        reasonCodes: [
          "POLICY_DENIED",
          "AUDIT_IMMUTABILITY_VIOLATION: Jejak audit dan log bersifat permanen dan tidak boleh dihapus.",
        ],
        riskClass: "critical",
      };
    }

    // 3. REQUIRE_APPROVAL (Tindakan Berisiko / Mutasi Eksternal)
    // a. Penulisan ke filesystem di luar scope lokal
    if (
      toolId === "write_file" ||
      toolId.includes("mcp_mutate") ||
      toolId.includes("git_push") ||
      toolId.includes("deploy")
    ) {
      return {
        decision: "require_approval",
        policyVersion: this.policyVersion,
        reasonCodes: [
          "APPROVAL_REQUIRED",
          "EXTERNAL_MUTATION_GUARD: Operasi mutasi eksternal memerlukan konfirmasi persetujuan manusia.",
        ],
        riskClass: "high",
      };
    }

    // b. Pengaktifan skill berisiko medium/high
    if (toolId === "activate_skill" && (args["riskClass"] === "high" || args["riskClass"] === "medium")) {
      return {
        decision: "require_approval",
        policyVersion: this.policyVersion,
        reasonCodes: [
          "APPROVAL_REQUIRED",
          "HIGH_RISK_SKILL_ACTIVATION: Aktivasi skill dengan risiko tinggi wajib ditinjau manusia.",
        ],
        riskClass: "high",
      };
    }

    // 4. ALLOWLIST (Aksi Aman Dalam Batas)
    // a. Analisis prompt, spider testing, kalkulasi optimasi
    if (
      toolId === "analyze_prompt" ||
      toolId === "optimize_prompt" ||
      toolId === "run_spider" ||
      toolId === "evaluate_quality"
    ) {
      return {
        decision: "allow",
        policyVersion: this.policyVersion,
        reasonCodes: ["ALLOWED_ANALYTICAL_TOOL"],
        riskClass: "low",
      };
    }

    // b. Operasi Memory Aman (Read milik sendiri / Global, atau Usul Memory)
    if (
      toolId === "query_memories" ||
      toolId === "get_memory" ||
      toolId === "propose_memory"
    ) {
      return {
        decision: "allow",
        policyVersion: this.policyVersion,
        reasonCodes: ["ALLOWED_MEMORY_OPERATION"],
        riskClass: "low",
      };
    }

    // c. Evaluasi Skill Aman & Registrasi Declarative
    if (
      toolId === "query_skills" ||
      toolId === "get_skill" ||
      toolId === "register_declarative_skill"
    ) {
      return {
        decision: "allow",
        policyVersion: this.policyVersion,
        reasonCodes: ["ALLOWED_DECLARATIVE_SKILL_OPERATION"],
        riskClass: "low",
      };
    }

    // 5. Default Fail-Closed: Jika aksi tidak dikenal dalam allowlist, tolak secara aman
    return {
      decision: "deny",
      policyVersion: this.policyVersion,
      reasonCodes: [
        "POLICY_DENIED",
        `UNKNOWN_ACTION_DEFAULT_DENY: Tool '${toolId}' tidak terdaftar pada matriks izin yang diizinkan.`,
      ],
      riskClass: "medium",
    };
  }
}
