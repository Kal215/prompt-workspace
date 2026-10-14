import {
  CrawlExtractedItem,
  SpiderSecurityFinding,
  SpiderBranchResult,
} from "@prompt-workspace/prompt-contracts";
import { LLMProviderAdapter, GroqAdapter } from "@prompt-workspace/provider-adapters";
import { DomainRulePack } from "@prompt-workspace/domain-rules";
import { optimizePrompt, OptimizePromptResult } from "./optimizer.js";
import { safeLogger } from "./logger.js";

export interface ClosedLoopSynthesisInput {
  basePrompt: string;
  spiderFindings?: SpiderSecurityFinding[];
  failedBranches?: SpiderBranchResult[];
  groundingFacts?: CrawlExtractedItem[];
  userConstraints?: string[];
  adapter?: LLMProviderAdapter | GroqAdapter;
  domainPackInput?: DomainRulePack | string | null;
}

export interface ClosedLoopSynthesisResult {
  synthesizedPrompt: string;
  appliedRemediations: string[];
  appliedGroundingFacts: string[];
  changes: string[];
  warnings: string[];
  telemetry?: OptimizePromptResult["telemetry"];
}

/**
 * Closed-Loop Prompt Synthesis Engine (ADR-002 Bab 3.3).
 *
 * Menggabungkan loop umpan balik dari:
 * 1. Temuan celah keamanan & kegagalan ketahanan dari Prompt Spider
 * 2. Fakta konteks dan batasan teknis dari Prompt Crawler
 *
 * Menghasilkan prompt versi baru yang tahan uji (hardened) tanpa merusak intent asli pengguna.
 */
export async function synthesizeClosedLoopPrompt(
  input: ClosedLoopSynthesisInput
): Promise<ClosedLoopSynthesisResult> {
  safeLogger.info("Memulai synthesizeClosedLoopPrompt (Gate 2/3 Closed Loop)", {
    basePrompt: input.basePrompt,
    findingsCount: input.spiderFindings?.length || 0,
    groundingFactsCount: input.groundingFacts?.length || 0,
  });

  const appliedRemediations: string[] = [];
  const appliedGroundingFacts: string[] = [];
  const combinedConstraints: string[] = [...(input.userConstraints || [])];

  // 1. Ekstrak remediations dari Spider Findings
  if (input.spiderFindings && input.spiderFindings.length > 0) {
    for (const finding of input.spiderFindings) {
      const remediation = `[Guardrail Ketahanan: ${finding.category}] ${finding.remediationHint}`;
      if (!combinedConstraints.includes(remediation)) {
        combinedConstraints.push(remediation);
        appliedRemediations.push(remediation);
      }
    }
  }

  // 2. Ekstrak mitigasi dari failed branches jika belum tercakup di findings
  if (input.failedBranches && input.failedBranches.length > 0) {
    for (const branch of input.failedBranches) {
      if (branch.status === "FAIL" && branch.rationale) {
        const branchConstraint = `[Mitigasi Kasus ${branch.caseId} (${branch.category})]: Pertahankan stabilitas terhadap ${branch.rationale}`;
        if (!combinedConstraints.includes(branchConstraint)) {
          combinedConstraints.push(branchConstraint);
          appliedRemediations.push(branchConstraint);
        }
      }
    }
  }

  // 3. Ekstrak fakta kontekstual dari Crawler Facts
  if (input.groundingFacts && input.groundingFacts.length > 0) {
    for (const fact of input.groundingFacts) {
      const sanitizedFactText = fact.extractedText.replace(/\s+/g, " ").trim();
      if (sanitizedFactText.length > 0) {
        const factConstraint = `[Fakta Grounding Terverifikasi]: ${sanitizedFactText.slice(0, 300)}`;
        if (!combinedConstraints.includes(factConstraint)) {
          combinedConstraints.push(factConstraint);
          appliedGroundingFacts.push(factConstraint);
        }
      }
    }
  }

  // 4. Synthesize dengan Optimizer (Preserve Intent)
  const optimizationResult = await optimizePrompt(
    input.basePrompt,
    [], // Analyzer findings kosong karena ini adalah closed-loop hardening
    combinedConstraints,
    input.adapter,
    input.domainPackInput
  );

  return {
    synthesizedPrompt: optimizationResult.optimizedPrompt,
    appliedRemediations,
    appliedGroundingFacts,
    changes: [
      `Closed-loop synthesis menerapkan ${appliedRemediations.length} perbaikan ketahanan Spider`,
      `Closed-loop synthesis menginjeksi ${appliedGroundingFacts.length} fakta konteks Crawler`,
      ...optimizationResult.changes,
    ],
    warnings: optimizationResult.warnings,
    telemetry: optimizationResult.telemetry,
  };
}
