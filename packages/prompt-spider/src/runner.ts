import crypto from "node:crypto";
import {
  computeCriticalGatePassed,
  SpiderBranchResult,
  SpiderReport,
  SpiderReportSchema,
  SpiderSecurityFinding,
} from "@prompt-workspace/prompt-contracts";
import { LLMProviderAdapter } from "@prompt-workspace/provider-adapters";
import { AsyncSemaphore } from "./semaphore.js";
import { generateStandardSpiderTestCases, SpiderTestCase } from "./test-cases.js";
import {
  calculateAggregateQualityMetrics,
  evaluateBranchExecution,
} from "./evaluator.js";

export interface SpiderRunnerOptions {
  testSuiteVersionId?: string;
  rubricVersion?: string;
  runMode?: "SINGLE" | "COMPARE";
  concurrencyLimit?: number;
  maxCases?: number;
  customTestCases?: SpiderTestCase[];
}

/**
 * Runner Orchestrator untuk Prompt Spider.
 * Menjalankan matriks uji ketahanan dengan batas konkurensi (semaphore)
 * dan validasi kontrak Zod lengkap.
 */
export async function runPromptSpider(
  promptText: string,
  promptVersionId: string,
  adapter: LLMProviderAdapter,
  options: SpiderRunnerOptions = {}
): Promise<SpiderReport> {
  const runId = `spider-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const testSuiteVersion = options.testSuiteVersionId || "1.0.0";
  const rubricVersion = options.rubricVersion || "2026.1";
  const concurrency = Math.min(options.concurrencyLimit || 2, 4);
  const maxCases = Math.min(options.maxCases || 5, 5);

  const testCasesPool = options.customTestCases || generateStandardSpiderTestCases(promptText);
  const selectedTestCases = testCasesPool.slice(0, maxCases);

  const semaphore = new AsyncSemaphore(concurrency);
  const branches: SpiderBranchResult[] = [];
  const securityFindings: SpiderSecurityFinding[] = [];

  // Jalankan eksekusi kasus uji dengan pembatasan semaphore
  const executionPromises = selectedTestCases.map(async (tc) => {
    return semaphore.runExclusive(async () => {
      const startTime = Date.now();
      let responseContent = "";
      try {
        const response = await adapter.chatCompletion([
          { role: "system", content: promptText },
          { role: "user", content: tc.input },
        ]);
        responseContent = response.content;
      } catch (err: any) {
        responseContent = `ERROR_EXECUTION: ${err.message || String(err)}`;
      }
      const latencyMs = Date.now() - startTime;

      const { branchResult, securityFinding } = evaluateBranchExecution(
        tc,
        responseContent,
        latencyMs,
        promptText
      );

      return { branchResult, securityFinding };
    });
  });

  const executionResults = await Promise.all(executionPromises);

  for (const res of executionResults) {
    branches.push(res.branchResult);
    if (res.securityFinding) {
      securityFindings.push(res.securityFinding);
    }
  }

  // Hitung cakupan dan metrik
  const passedCases = branches.filter((b) => b.status === "PASS").length;
  const failedCases = branches.filter((b) => b.status === "FAIL").length;
  const indeterminateCases = branches.filter((b) => b.status === "INDETERMINATE").length;
  const errorCases = branches.filter((b) => b.status === "ERROR").length;
  const skippedCases = branches.filter((b) => b.status === "SKIPPED").length;

  const qualityMetrics = calculateAggregateQualityMetrics(branches);
  const criticalGatePassed = computeCriticalGatePassed(branches);

  const report: SpiderReport = {
    runId,
    status: failedCases === 0 ? "SUCCEEDED" : passedCases > 0 ? "PARTIAL" : "FAILED",
    promptVersionId,
    testSuiteVersion,
    rubricVersion,
    modelMetadata: {
      provider: String(adapter.providerId),
      model: adapter.defaultModel,
    },
    coverageSummary: {
      totalCases: selectedTestCases.length,
      executedCases: branches.length,
      passedCases,
      failedCases,
      indeterminateCases,
      errorCases,
      skippedCases,
    },
    qualityMetrics,
    securityFindings,
    criticalGatePassed,
    branches,
    limitations: [
      "Bounded execution (concurrency=2, max=5 test cases per run).",
      "Deterministic pattern evaluation backed by LLM judge where configured.",
    ],
  };

  return SpiderReportSchema.parse(report);
}
