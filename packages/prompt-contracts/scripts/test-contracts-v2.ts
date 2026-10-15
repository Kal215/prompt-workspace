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
  ProjectPhaseStateSchema,
  PhaseSubmissionInputSchema,
  PhaseAuditResultSchema,
  AutonomousProjectSessionSchema,
  InitProjectSessionInputSchema,
  GetCurrentPhaseInputSchema,
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

// 8. Mega Task #44: Master Prompt Synthesis Contracts
console.log("\n[8] Testing TaskSpecificationMapSchema & MasterPromptValidationResultSchema...");
import {
  TaskArchetypeEnum,
  TaskComplexityEnum,
  OpenDecisionStrategyEnum,
  TaskSpecificationMapSchema,
  MasterPromptValidationResultSchema,
  PromptAnalysisSchema,
  PromptOptimizationResultSchema,
} from "../src/index.js";

const sampleTaskSpec = TaskSpecificationMapSchema.parse({
  primaryGoal: "Buat website toko kue dengan fitur stok barang dan laporan penjualan. Jangan buat POS.",
  detectedArchetype: "software_engineering",
  complexity: "complex",
  explicitRequirements: ["Katalog produk", "Manajemen stok", "Laporan penjualan"],
  negativeConstraints: ["Jangan buat POS"],
  operationalExpansions: ["Validasi stok negatif", "Audit log mutasi", "Pemisahan omzet vs laba"],
  logicalTensions: [
    {
      tension: "Laporan penjualan butuh sumber data tetapi POS dilarang",
      resolutionStrategy: "Pencatatan penjualan langsung sederhana tanpa kasir POS",
    },
  ],
  openDecisions: [
    {
      topic: "Framework Web",
      handlingStrategy: "inspect_existing_project",
      guidance: "Gunakan framework yang ada di repo",
    },
  ],
  requiredDeliverables: ["Source code", "Schema DB", "Test suite"],
  verificationScenarios: ["Stok berkurang saat terjual", "Pencegahan stok negatif"],
  definitionOfDone: ["Semua test pass", "Zero deceptive certainty"],
});
assert.strictEqual(sampleTaskSpec.detectedArchetype, "software_engineering");
assert.strictEqual(sampleTaskSpec.negativeConstraints[0], "Jangan buat POS");

const sampleValidation = MasterPromptValidationResultSchema.parse({
  passed: true,
  overallSynthesisScore: 95,
  checks: {
    intentPreserved: true,
    explicitRequirementsCovered: true,
    negativeConstraintsEnforced: true,
    notShallowRewrite: true,
    notPlaceholderDumping: true,
    hasOperationalStages: true,
    hasVerificationAndDoD: true,
    noDeceptiveTechFabrication: true,
  },
  missingRequirements: [],
  violatedNegativeConstraints: [],
  failureReasons: [],
  repairPassesTriggered: 0,
});
assert.strictEqual(sampleValidation.passed, true);
assert.strictEqual(sampleValidation.overallSynthesisScore, 95);

// Test additive optional fields on PromptAnalysisSchema & PromptOptimizationResultSchema
const analysisWithSpec = PromptAnalysisSchema.parse({
  findings: [],
  score: 90,
  taskSpec: sampleTaskSpec,
});
assert.strictEqual(analysisWithSpec.taskSpec?.detectedArchetype, "software_engineering");

const resultWithValidation = PromptOptimizationResultSchema.parse({
  requestId: "req-synth-001",
  originalPrompt: "Buat website toko kue...",
  detectedIntent: "Website toko kue...",
  analysis: analysisWithSpec,
  optimizedPrompt: "MASTER PROMPT...",
  changes: ["Ekspansi operasional"],
  warnings: [],
  synthesisValidation: sampleValidation,
});
assert.strictEqual(resultWithValidation.synthesisValidation?.passed, true);
console.log("✅ Mega Task #44 TaskSpec & SynthesisValidation contracts verified 100%.");

// ──────────────────────────────────────────────
// 10. Autonomous Supervision Contracts (Tahap B / Task #50)
// ──────────────────────────────────────────────
console.log("\n[10] Testing Autonomous Supervision Contracts (Task #50)...");

// A. ProjectPhaseStateSchema
const samplePhase = ProjectPhaseStateSchema.parse({
  phaseId: "PHASE_0",
  phaseIndex: 0,
  title: "Fondasi & Setup Lingkungan",
  objective: "Menyiapkan monorepo, dependensi, dan kontrak tipe data",
  requiredDeliverables: ["package.json", "tsconfig.json", "schema.prisma"],
  acceptanceCriteria: ["Semua build pass", "Zero typecheck errors"],
  status: "IN_PROGRESS",
  attemptCount: 1,
  lastAuditSummary: "Audit awal in-progress",
});
assert.strictEqual(samplePhase.phaseId, "PHASE_0");
assert.strictEqual(samplePhase.attemptCount, 1);
assert.strictEqual(samplePhase.status, "IN_PROGRESS");

// B. PhaseSubmissionInputSchema (menerima string maupun object artifact)
const sampleSubmission = PhaseSubmissionInputSchema.parse({
  sessionId: "sess-supervision-001",
  phaseIndex: 0,
  summaryOfWork: "Menyiapkan struktur paket dan konfigurasi dasar",
  deliveredArtifacts: [
    "packages/contracts/src/index.ts",
    {
      name: "tsconfig.base.json",
      type: "config",
      summary: "Konfigurasi compiler TypeScript dasar",
      contentSnippet: "compilerOptions: { strict: true }",
    },
  ],
  verificationOutput: "tsc --noEmit -> Exit Code 0 (0 errors)",
  knownIssues: ["Perlu verifikasi isolasi multi-user di fase 1"],
});
assert.strictEqual(sampleSubmission.sessionId, "sess-supervision-001");
assert.strictEqual(sampleSubmission.deliveredArtifacts.length, 2);
assert.strictEqual(sampleSubmission.deliveredArtifacts[0].name, "packages/contracts/src/index.ts");
assert.strictEqual(sampleSubmission.deliveredArtifacts[0].type, "artifact");
assert.strictEqual(sampleSubmission.deliveredArtifacts[1].name, "tsconfig.base.json");

// C. PhaseAuditResultSchema (Audit verdict, self-healing corrective prompt)
const sampleAuditResult = PhaseAuditResultSchema.parse({
  verdict: "REJECTED_NEEDS_REPAIR",
  score: 65,
  missingDeliverables: ["schema.prisma"],
  consistencyViolations: ["Nama entitas User berbeda dengan diagram ERD"],
  scopeCreepOrForbiddenViolations: ["Dilarang membuat modul auth pihak ketiga (negative constraint)"],
  evidenceCheckPassed: true,
  nextActionPrompt: "PERBAIKI FASE 0: Tambahkan schema.prisma dan hapus dependensi third-party auth.",
  phaseIndex: 0,
  auditTimestamp: new Date().toISOString(),
});
assert.strictEqual(sampleAuditResult.verdict, "REJECTED_NEEDS_REPAIR");
assert.strictEqual(sampleAuditResult.missingDeliverables[0], "schema.prisma");
assert.strictEqual(sampleAuditResult.evidenceCheckPassed, true);

// D. AutonomousProjectSessionSchema
const sampleBlueprintSpec = {
  title: "Sistem Kasir Pintar",
  domain: "software_engineering",
  audienceLevel: "professional" as const,
  roles: ["Lead Architect", "Backend Specialist"],
  contextParameters: { target: "UMKM" },
  smartAssumptions: ["Menggunakan SQLite lokal"],
  primaryObjectives: ["Manajemen stok dan nota"],
  coreSpecification: "Arsitektur modular monolith",
  diagrams: [{
    id: "diag-01",
    type: "flowchart" as const,
    title: "Alur Transaksi",
    mermaidCode: "graph TD\nA-->B",
    description: "Diagram alur transaksi kasir",
    entities: ["Kasir", "Produk"],
  }],
  executionPhases: [{
    phaseNumber: 0,
    name: "Setup Dasar",
    tasks: ["Init repo"],
    deliverables: ["package.json"],
  }],
  negativeConstraints: ["Jangan gunakan mock data palsu"],
  executionProtocol: ["Wajib uji verifikasi nyata"],
  workManagement: {
    statusModel: ["TODO", "DONE"],
    trackingRules: ["Commit per fase"],
  },
  definitionOfDone: ["Semua build pass"],
  renderedMasterPrompt: "MASTER PROMPT",
};

const sampleSession = AutonomousProjectSessionSchema.parse({
  sessionId: "sess-supervision-001",
  originalPrompt: "Buat sistem kasir toko roti",
  domainId: "software_engineering",
  subtopicId: "web_fullstack",
  audienceLevel: "professional",
  masterBlueprint: sampleBlueprintSpec,
  phases: [samplePhase],
  currentPhaseIndex: 0,
  overallStatus: "ACTIVE",
  auditHistory: [{
    phaseIndex: 0,
    attemptNumber: 1,
    submissionSummary: "Laporan fase 0",
    auditResult: sampleAuditResult,
    timestamp: new Date().toISOString(),
  }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
assert.strictEqual(sampleSession.sessionId, "sess-supervision-001");
assert.strictEqual(sampleSession.phases[0].phaseId, "PHASE_0");
assert.strictEqual(sampleSession.auditHistory.length, 1);
assert.strictEqual(sampleSession.overallStatus, "ACTIVE");

// E. MCP Helper Schemas
const initInput = InitProjectSessionInputSchema.parse({
  prompt: "Bangun platform e-commerce",
  audienceLevel: "specialist",
  maxAttemptsPerPhase: 3,
});
assert.strictEqual(initInput.maxAttemptsPerPhase, 3);

const getCurrentInput = GetCurrentPhaseInputSchema.parse({
  sessionId: "sess-123",
});
assert.strictEqual(getCurrentInput.sessionId, "sess-123");

console.log("✅ Tahap B / Task #50 Autonomous Supervision contracts verified 100%.");

console.log("\n🎉 ALL PROMPT CONTRACTS v2.0 TESTS PASSED (EXIT CODE 0)");
