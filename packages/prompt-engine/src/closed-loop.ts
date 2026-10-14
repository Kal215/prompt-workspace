import {
  CrawlExtractedItem,
  SpiderSecurityFinding,
  SpiderBranchResult,
} from "@prompt-workspace/prompt-contracts";
import { LLMProviderAdapter, GroqAdapter } from "@prompt-workspace/provider-adapters";
import { DomainRulePack } from "@prompt-workspace/domain-rules";
import { optimizePrompt, OptimizePromptResult } from "./optimizer.js";
import { safeLogger } from "./logger.js";

export interface ClosedLoopContextOptions {
  userContext?: string | null;
  groundingFacts?: string[];
  spiderFindings?: Array<{
    category: string;
    remediationHint: string;
    sanitizedEvidence?: string;
  }>;
}

/**
 * Membangun konteks teks optimasi closed-loop yang menyuntikkan fakta Crawler
 * dan remediasi temuan Spider ke dalam pipeline optimasi.
 */
export function buildClosedLoopOptimizationContext(
  options: ClosedLoopContextOptions
): string {
  const sections: string[] = [];

  if (options.userContext && options.userContext.trim().length > 0) {
    sections.push(`### Konteks Pengguna Asli:\n${options.userContext.trim()}`);
  }

  if (options.groundingFacts && options.groundingFacts.length > 0) {
    const factsList = options.groundingFacts
      .map((fact, idx) => `${idx + 1}. ${fact.trim()}`)
      .join("\n");
    sections.push(`### Fakta Teknis Terverifikasi (Crawler Grounding):\n${factsList}`);
  }

  if (options.spiderFindings && options.spiderFindings.length > 0) {
    const findingsList = options.spiderFindings
      .map((finding, idx) => {
        let entry = `${idx + 1}. [Kategori: ${finding.category}] Remediasi: ${finding.remediationHint}`;
        if (finding.sanitizedEvidence) {
          entry += ` (Bukti Pelanggaran: ${finding.sanitizedEvidence.slice(0, 150)})`;
        }
        return entry;
      })
      .join("\n");
    sections.push(`### Temuan Ketahanan & Keamanan (Spider Audit):\n${findingsList}`);
  }

  return sections.join("\n\n");
}

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
