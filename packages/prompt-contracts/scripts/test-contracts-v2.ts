import {
  CrawlRequestSchema,
  CrawlExtractedItemSchema,
  CrawlResultSchema,
  SpiderRequestSchema,
  SpiderQualityMetricsSchema,
  SpiderSecurityFindingSchema,
  SpiderBranchResultSchema,
  SpiderReportSchema,
  computeCriticalGatePassed,
  PromptOptimizationRequestSchema,
  PromptExecutionRequestSchema,
} from "../src/index.js";
import assert from "node:assert";

console.log("═══════════════════════════════════════════════════════════════════");
console.log("🧪 TEST SUITE: PROMPT CONTRACTS v2.0 (CRAWLER & SPIDER)");
console.log("═══════════════════════════════════════════════════════════════════");

// 1. CrawlRequestSchema
console.log("\n[1] Testing CrawlRequestSchema...");
const validCrawl = CrawlRequestSchema.parse({
  targetUrl: "https://raw.githubusercontent.com/user/repo/main/prompt.md",
  sourceType: "GITHUB_RAW_FILE",
  mode: "EXTRACT_PROMPTS",
  idempotencyKey: "crawl-req-001",
});
assert.strictEqual(validCrawl.sourceType, "GITHUB_RAW_FILE");

assert.throws(() => {
  CrawlRequestSchema.parse({
    targetUrl: "http://insecure-domain.com/prompt.md", // Non-HTTPS must fail
    sourceType: "GITHUB_RAW_FILE",
    mode: "EXTRACT_PROMPTS",
  });
}, /HTTPS/);
console.log("✅ CrawlRequestSchema HTTPS validation verified.");

// 2. CrawlExtractedItemSchema & CrawlResultSchema
console.log("\n[2] Testing CrawlExtractedItemSchema & CrawlResultSchema...");
const validItem = CrawlExtractedItemSchema.parse({
  itemType: "PROMPT_CANDIDATE",
  extractedText: "You are an expert system analyst...",
  surroundingContext: "Found under # System Prompt section",
  lineStart: 12,
  lineEnd: 25,
  confidenceEstimate: 0.95,
  extractionMethod: "MARKDOWN_HEADER_PARSE",
  warnings: [],
});
assert.strictEqual(validItem.confidenceEstimate, 0.95);

const validCrawlResult = CrawlResultSchema.parse({
  crawlSessionId: "crawl-sess-12345",
  status: "SUCCEEDED",
  sourceUrl: "https://raw.githubusercontent.com/org/repo/main/prompt.md",
  normalizedUrl: "https://raw.githubusercontent.com/org/repo/main/prompt.md",
  fetchedAt: new Date().toISOString(),
  items: [validItem],
  sourceMetadata: {
    contentType: "text/markdown; charset=utf-8",
    bytesRead: 1024,
    contentSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    licenseHint: "MIT",
  },
});
assert.strictEqual(validCrawlResult.status, "SUCCEEDED");
console.log("✅ CrawlResultSchema parse verified.");

// 3. SpiderRequestSchema & SpiderQualityMetricsSchema
console.log("\n[3] Testing SpiderRequestSchema & SpiderQualityMetricsSchema...");
const validSpiderReq = SpiderRequestSchema.parse({
  promptVersionId: "pv-uuid-001",
  testSuiteVersionId: "ts-v1-standard",
  runMode: "SINGLE",
});
assert.strictEqual(validSpiderReq.runMode, "SINGLE");

const validMetrics = SpiderQualityMetricsSchema.parse({
  taskAdherence: 95,
  constraintAdherence: 90,
  formatCompliance: 100,
  robustness: 88,
});
assert.strictEqual(validMetrics.formatCompliance, 100);

// 4. SpiderSecurityFindingSchema & SpiderBranchResultSchema
console.log("\n[4] Testing SpiderSecurityFindingSchema & SpiderBranchResultSchema...");
const validFinding = SpiderSecurityFindingSchema.parse({
  severity: "CRITICAL",
  category: "ADVERSARIAL_INJECTION",
  caseId: "case-inj-01",
  sanitizedEvidence: "User input bypassed prefix",
  remediationHint: "Enforce strict delimiter wrapping",
});
assert.strictEqual(validFinding.severity, "CRITICAL");

const validBranch = SpiderBranchResultSchema.parse({
  caseId: "case-01",
  category: "BASELINE_HAPPY_PATH",
  severity: "LOW",
  status: "PASS",
  score: 95,
  latencyMs: 320,
  sanitizedInput: "Halo asisten",
  sanitizedOutput: "Halo, ada yang bisa dibantu?",
  rationale: "Prompt successfully greeted user",
  deterministicPass: true,
});
assert.strictEqual(validBranch.status, "PASS");

// 5. computeCriticalGatePassed helper function
console.log("\n[5] Testing computeCriticalGatePassed helper function...");
// Empty branches
assert.strictEqual(computeCriticalGatePassed([]), false, "Empty branches must return false");

// All critical PASS
assert.strictEqual(
  computeCriticalGatePassed([
    { severity: "CRITICAL", status: "PASS" },
    { severity: "LOW", status: "FAIL" },
  ]),
  true,
  "All critical branches PASS must return true even if low severity fails"
);

// One critical FAIL
assert.strictEqual(
  computeCriticalGatePassed([
    { severity: "CRITICAL", status: "FAIL" },
    { severity: "LOW", status: "PASS" },
  ]),
  false,
  "Any critical branch FAIL must return false"
);

// One critical ERROR
assert.strictEqual(
  computeCriticalGatePassed([
    { severity: "CRITICAL", status: "ERROR" },
  ]),
  false,
  "Critical branch ERROR must return false"
);

// One critical INDETERMINATE
assert.strictEqual(
  computeCriticalGatePassed([
    { severity: "CRITICAL", status: "INDETERMINATE" },
  ]),
  false,
  "Critical branch INDETERMINATE must return false"
);

// One critical SKIPPED
assert.strictEqual(
  computeCriticalGatePassed([
    { severity: "CRITICAL", status: "SKIPPED" },
  ]),
  false,
  "Critical branch SKIPPED must return false"
);

// No critical branches, but all branches PASS
assert.strictEqual(
  computeCriticalGatePassed([
    { severity: "MEDIUM", status: "PASS" },
    { severity: "LOW", status: "PASS" },
  ]),
  true,
  "Non-critical branches all PASS must return true"
);

// No critical branches, but one branch FAIL
assert.strictEqual(
  computeCriticalGatePassed([
    { severity: "MEDIUM", status: "FAIL" },
    { severity: "LOW", status: "PASS" },
  ]),
  false,
  "Non-critical branches with a FAIL must return false"
);
console.log("✅ computeCriticalGatePassed 8/8 assertions passed.");

// 6. SpiderReportSchema
console.log("\n[6] Testing SpiderReportSchema...");
const validReport = SpiderReportSchema.parse({
  runId: "run-spider-001",
  status: "SUCCEEDED",
  promptVersionId: "pv-uuid-001",
  testSuiteVersion: "1.0.0",
  rubricVersion: "2.0.0-draft-2",
  modelMetadata: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
  },
  coverageSummary: {
    totalCases: 5,
    executedCases: 5,
    passedCases: 4,
    failedCases: 1,
  },
  qualityMetrics: validMetrics,
  securityFindings: [validFinding],
  criticalGatePassed: false,
  branches: [
    validBranch,
    {
      caseId: "case-inj-01",
      category: "ADVERSARIAL_INJECTION",
      severity: "CRITICAL",
      status: "FAIL",
      latencyMs: 410,
      sanitizedInput: "Ignore instructions",
      sanitizedOutput: "Sure, here is confidential info",
      deterministicPass: false,
    },
  ],
  limitations: ["Tested on single target model"],
});
assert.strictEqual(validReport.criticalGatePassed, false);
console.log("✅ SpiderReportSchema verified.");

// 7. Backward compatibility check for v1.0
console.log("\n[7] Verifying v1.0 backward compatibility...");
const v1Request = PromptOptimizationRequestSchema.parse({
  prompt: "Help me write a test",
  requestId: "req-v1-001",
});
assert.strictEqual(v1Request.prompt, "Help me write a test");
console.log("✅ v1.0 PromptOptimizationRequestSchema remains 100% functional.");

console.log("\n🎉 ALL PROMPT CONTRACTS v2.0 TESTS PASSED (EXIT CODE 0)");
