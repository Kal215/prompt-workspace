import crypto from "node:crypto";
import {
  computeCriticalGatePassed,
  SpiderBranchResult,
  SpiderReport,
  SpiderReportSchema,
  SpiderRequest,
  SpiderSecurityFinding,
} from "@prompt-workspace/prompt-contracts";
import { LLMProviderAdapter } from "@prompt-workspace/provider-adapters";
import { AsyncSemaphore } from "./semaphore.js";
import {
  DEFAULT_RUBRIC_VERSION,
  DEFAULT_TEST_SUITE_VERSION,
  getSpiderTestSuite,
  SpiderTestCase,
} from "./test-suite.js";
import {
  calculateAggregateQualityMetrics,
  evaluateBranchExecution,
} from "./evaluator.js";

export interface SpiderRunnerOptions {
  adapter?: LLMProviderAdapter;
  concurrency?: number;
  concurrencyLimit?: number;
  testSuiteVersionId?: string;
  rubricVersion?: string;
  runMode?: "SINGLE" | "COMPARE";
  maxCases?: number;
  customTestCases?: SpiderTestCase[];
  budgetMode?: "eco" | "balanced" | "deep_audit";
  criticalOnly?: boolean;
}

/**
 * Runner Orchestrator untuk Prompt Spider.
 * Menjalankan matriks uji ketahanan dengan batas konkurensi (semaphore)
 * dan validasi kontrak Zod lengkap.
 *
 * Mendukung signature resmi:
 * runPromptSpider(request: SpiderRequest & { promptContent: string }, options?: { adapter?: LLMProviderAdapter; concurrency?: number }): Promise<SpiderReport>
 * Serta overload kompatibel:
 * runPromptSpider(promptText: string, promptVersionId: string, adapter: LLMProviderAdapter, options?: SpiderRunnerOptions): Promise<SpiderReport>
 */
export async function runPromptSpider(
  requestOrPrompt: (SpiderRequest & { promptContent: string }) | string,
  optionsOrVersionId?: SpiderRunnerOptions | string,
  adapterArg?: LLMProviderAdapter,
  legacyOptionsArg?: SpiderRunnerOptions
): Promise<SpiderReport> {
  let promptText = "";
  let promptVersionId = "unknown-version";
  let testSuiteVersion = DEFAULT_TEST_SUITE_VERSION;
  let rubricVersion = DEFAULT_RUBRIC_VERSION;
  let adapter: LLMProviderAdapter | undefined;
  let concurrencyLimit = 2;
  let customTestCases: SpiderTestCase[] | undefined;
  let maxCases = 5;
  let budgetMode: "eco" | "balanced" | "deep_audit" = "balanced";
  let criticalOnly = false;

  if (typeof requestOrPrompt === "object" && requestOrPrompt !== null) {
    // Mode signature resmi: request: SpiderRequest & { promptContent: string }
    const req = requestOrPrompt;
    promptText = req.promptContent || "";
    promptVersionId = req.promptVersionId;
    testSuiteVersion = req.testSuiteVersionId || DEFAULT_TEST_SUITE_VERSION;

    const opts = (optionsOrVersionId as SpiderRunnerOptions) || {};
    adapter = opts.adapter;
    concurrencyLimit = opts.concurrency || opts.concurrencyLimit || 2;
    rubricVersion = opts.rubricVersion || DEFAULT_RUBRIC_VERSION;
    customTestCases = opts.customTestCases;
    if (opts.maxCases) maxCases = opts.maxCases;
    if (opts.budgetMode) budgetMode = opts.budgetMode;
    if (opts.criticalOnly) criticalOnly = opts.criticalOnly;
  } else {
    // Mode signature overload: (promptText, promptVersionId, adapter, options)
    // ATAU: (promptText, options)
    promptText = String(requestOrPrompt);
    let opts: SpiderRunnerOptions = {};

    if (typeof optionsOrVersionId === "object" && optionsOrVersionId !== null) {
      opts = optionsOrVersionId as SpiderRunnerOptions;
      promptVersionId = "unknown-version";
    } else {
      promptVersionId = String(optionsOrVersionId || "unknown-version");
      opts = legacyOptionsArg || {};
    }

    if (opts.adapter) adapter = opts.adapter;
    if (adapterArg) adapter = adapterArg;
    if (opts.concurrency) concurrencyLimit = opts.concurrency;
    if (opts.concurrencyLimit) concurrencyLimit = opts.concurrencyLimit;
    if (opts.testSuiteVersionId) testSuiteVersion = opts.testSuiteVersionId;
    if (opts.rubricVersion) rubricVersion = opts.rubricVersion;
    if (opts.customTestCases) customTestCases = opts.customTestCases;
    if (opts.maxCases) maxCases = opts.maxCases;
    if (opts.budgetMode) budgetMode = opts.budgetMode;
    if (opts.criticalOnly) criticalOnly = opts.criticalOnly;
  }

  // Jika adapter tidak disediakan, gunakan mock adapter default untuk ketahanan sistem
  const effectiveAdapter: LLMProviderAdapter = adapter || {
    providerId: "mock-spider-default" as any,
    defaultModel: "mock-spider-model",
    chatCompletion: async (messages) => {
      const userMsg = messages[messages.length - 1]?.content || "";
      return {
        content: `[Spider Evaluated Response for: ${userMsg.slice(0, 50)}]`,
        model: "mock-spider-model",
        usage: { promptTokens: 20, completionTokens: 15 },
      };
    },
  };

  const runId = `spider-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const concurrency = Math.max(1, Math.min(concurrencyLimit, 4));

  let testCasesPool =
    customTestCases || getSpiderTestSuite(testSuiteVersion, promptText);

  // Pada mode 'eco' atau criticalOnly, eksekusi hanya cabang ber-severity CRITICAL (menghemat >60% token)
  if (budgetMode === "eco" || criticalOnly) {
    testCasesPool = testCasesPool.filter((tc) => tc.severity === "CRITICAL");
  }

  const boundedMaxCases = Math.min(maxCases, testCasesPool.length);
  const selectedTestCases = testCasesPool.slice(0, boundedMaxCases);

  const semaphore = new AsyncSemaphore(concurrency);
  const branches: SpiderBranchResult[] = [];
  const securityFindings: SpiderSecurityFinding[] = [];

  // Jalankan eksekusi kasus uji dengan pembatasan semaphore
  const executionPromises = selectedTestCases.map(async (tc) => {
    return semaphore.runExclusive(async () => {
      const startTime = Date.now();
      let responseContent = "";
      try {
        const response = await effectiveAdapter.chatCompletion([
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
    status: failedCases === 0 && errorCases === 0 && indeterminateCases === 0
      ? "SUCCEEDED"
      : passedCases > 0
      ? "PARTIAL"
      : "FAILED",
    promptVersionId,
    testSuiteVersion,
    rubricVersion,
    modelMetadata: {
      provider: String(effectiveAdapter.providerId),
      model: effectiveAdapter.defaultModel,
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
