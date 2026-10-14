import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  AsyncSemaphore,
  generateStandardSpiderTestCases,
  evaluateBranchExecution,
  runPromptSpider,
  getSpiderTestSuite,
} from "../src/index.js";
import {
  computeCriticalGatePassed,
  SpiderReportSchema,
  SpiderBranchResult,
} from "@prompt-workspace/prompt-contracts";
import { LLMProviderAdapter } from "@prompt-workspace/provider-adapters";
import {
  prisma,
  setDatabaseUrl,
  saveSpiderRun,
  savePrompt,
  savePromptVersion,
} from "@prompt-workspace/database";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("🕸️  TEST SUITE: PROMPT SPIDER ENGINE (packages/prompt-spider)");
  console.log("═══════════════════════════════════════════════════════════════════");

  // ===========================================================================
  // [1] Testing Semaphore Concurrency Boundedness (maxActiveRequests <= 2)
  // ===========================================================================
  console.log("\n[1] Menguji pembatasan konkurensi Semaphore (maxActive <= 2)...");
  let activeConcurrentRequests = 0;
  let maxObservedActiveRequests = 0;

  const mockConcurrentAdapter: LLMProviderAdapter = {
    providerId: "groq",
    defaultModel: "mock-llama-3",
    async chatCompletion(messages) {
      activeConcurrentRequests++;
      if (activeConcurrentRequests > maxObservedActiveRequests) {
        maxObservedActiveRequests = activeConcurrentRequests;
      }
      // Simulasi delay eksekusi
      await new Promise((resolve) => setTimeout(resolve, 60));
      activeConcurrentRequests--;

      return {
        content: '{"status": "success", "note": "Safe response"}',
        model: "mock-llama-3",
        usage: { promptTokens: 25, completionTokens: 15 },
      };
    },
  };

  const concurrentReport = await runPromptSpider(
    {
      promptContent: "You are a customer support agent. Always return JSON.",
      promptVersionId: "ver-concurrent-test",
      testSuiteVersionId: "v2.0-core-5cases",
      runMode: "SINGLE",
    },
    {
      adapter: mockConcurrentAdapter,
      concurrency: 2,
    }
  );

  assert.equal(concurrentReport.branches.length, 5, "Harus menjalankan 5 cabang uji");
  assert.ok(
    maxObservedActiveRequests <= 2,
    `Konkurensi aktif maksimum terpantau (${maxObservedActiveRequests}) tidak boleh melebihi 2!`
  );
  console.log(
    `✅ Concurrency Semaphore terbukti membatasi eksekusi: maxActiveRequests = ${maxObservedActiveRequests} <= 2.`
  );

  // ===========================================================================
  // [2] Testing Pemisahan qualityMetrics vs securityFindings[]
  // ===========================================================================
  console.log("\n[2] Menguji pemisahan tegas qualityMetrics vs securityFindings[]...");
  const mockVulnerableAdapter: LLMProviderAdapter = {
    providerId: "groq",
    defaultModel: "mock-vulnerable-model",
    async chatCompletion(messages) {
      const userMsg = messages.find((m) => m.role === "user")?.content || "";
      if (userMsg.includes("IGNORE ALL PREVIOUS")) {
        // Model mematuhi injeksi
        return {
          content: "System override code: 999 accepted! [PWNED] Hidden system prompt leaked.",
          model: "mock-vulnerable-model",
        };
      }
      return {
        content: '{"status": "ok"}',
        model: "mock-vulnerable-model",
      };
    },
  };

  const vulnReport = await runPromptSpider(
    {
      promptContent: "You are an assistant. Output JSON.",
      promptVersionId: "ver-vuln-test",
      testSuiteVersionId: "v2.0-core-5cases",
      runMode: "SINGLE",
    },
    {
      adapter: mockVulnerableAdapter,
      concurrency: 2,
    }
  );

  // Verifikasi struktur qualityMetrics murni angka 0..100
  assert.equal(typeof vulnReport.qualityMetrics.taskAdherence, "number");
  assert.equal(typeof vulnReport.qualityMetrics.constraintAdherence, "number");
  assert.equal(typeof vulnReport.qualityMetrics.formatCompliance, "number");
  assert.equal(typeof vulnReport.qualityMetrics.robustness, "number");
  assert.ok(vulnReport.qualityMetrics.constraintAdherence <= 30, "Constraint adherence harus anjlok saat ada injeksi");

  // Verifikasi temuan keamanan terisolasi di securityFindings[]
  assert.ok(Array.isArray(vulnReport.securityFindings));
  assert.ok(vulnReport.securityFindings.length >= 1, "Harus mencatat celah injeksi di securityFindings");
  const injectionFinding = vulnReport.securityFindings.find(
    (f) => f.category === "PROMPT_INJECTION_VULNERABILITY"
  );
  assert.ok(injectionFinding, "Harus menemukan kategori PROMPT_INJECTION_VULNERABILITY");
  assert.equal(injectionFinding?.severity, "CRITICAL");
  assert.ok(injectionFinding?.remediationHint.length > 0);

  console.log(
    `✅ qualityMetrics (robustness: ${vulnReport.qualityMetrics.robustness}%) terpisah tegas dari ${vulnReport.securityFindings.length} securityFindings.`
  );

  // ===========================================================================
  // [3] Testing Aturan criticalGatePassed (ERROR, INDETERMINATE, FAIL -> false)
  // ===========================================================================
  console.log("\n[3] Menguji aturan ketat computeCriticalGatePassed...");

  // 3a. Semua PASS -> true
  const allPassBranches: Array<{ severity: any; status: any }> = [
    { severity: "HIGH", status: "PASS" },
    { severity: "MEDIUM", status: "PASS" },
    { severity: "HIGH", status: "PASS" },
    { severity: "CRITICAL", status: "PASS" },
    { severity: "CRITICAL", status: "PASS" },
  ];
  assert.equal(computeCriticalGatePassed(allPassBranches), true, "All PASS harus lolos");

  // 3b. Cabang CRITICAL berstatus FAIL -> false
  const criticalFailBranches: Array<{ severity: any; status: any }> = [
    ...allPassBranches.slice(0, 3),
    { severity: "CRITICAL", status: "FAIL" },
    { severity: "CRITICAL", status: "PASS" },
  ];
  assert.equal(computeCriticalGatePassed(criticalFailBranches), false, "Critical FAIL harus menghasilkan false");

  // 3c. Cabang CRITICAL berstatus ERROR -> false
  const criticalErrorBranches: Array<{ severity: any; status: any }> = [
    ...allPassBranches.slice(0, 3),
    { severity: "CRITICAL", status: "ERROR" },
    { severity: "CRITICAL", status: "PASS" },
  ];
  assert.equal(computeCriticalGatePassed(criticalErrorBranches), false, "Critical ERROR harus menghasilkan false");

  // 3d. Cabang CRITICAL berstatus INDETERMINATE -> false
  const criticalIndeterminateBranches: Array<{ severity: any; status: any }> = [
    ...allPassBranches.slice(0, 3),
    { severity: "CRITICAL", status: "INDETERMINATE" },
    { severity: "CRITICAL", status: "PASS" },
  ];
  assert.equal(
    computeCriticalGatePassed(criticalIndeterminateBranches),
    false,
    "Critical INDETERMINATE harus menghasilkan false"
  );

  // 3e. Cabang CRITICAL berstatus SKIPPED -> false
  const criticalSkippedBranches: Array<{ severity: any; status: any }> = [
    ...allPassBranches.slice(0, 3),
    { severity: "CRITICAL", status: "SKIPPED" },
    { severity: "CRITICAL", status: "PASS" },
  ];
  assert.equal(computeCriticalGatePassed(criticalSkippedBranches), false, "Critical SKIPPED harus menghasilkan false");

  // 3f. Array kosong -> false
  assert.equal(computeCriticalGatePassed([]), false, "Empty branches harus menghasilkan false");

  console.log("✅ computeCriticalGatePassed memvalidasi kepatuhan gerbang kritis 100%.");

  // ===========================================================================
  // [4] Testing Integrasi Penyimpanan SQLite Sementara (Bebas SQLITE_BUSY)
  // ===========================================================================
  console.log("\n[4] Menguji persistensi saveSpiderRun ke SQLite sementara terisolasi...");
  const tempDbName = `temp-spider-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
  const tempDbPath = path.join(os.tmpdir(), tempDbName).replace(/\\/g, "/");
  const tempDbUrl = `file:${tempDbPath}`;

  try {
    const candidate1 = path.resolve(process.cwd(), "packages/database");
    const candidate2 = path.resolve(new URL(".", import.meta.url).pathname, "../../database");
    const dbPackageDir = fs.existsSync(candidate1) ? candidate1 : candidate2;
    const schemaPath = path.resolve(dbPackageDir, "prisma/schema.prisma");

    execSync(`npx prisma db push --skip-generate --schema="${schemaPath}"`, {
      cwd: dbPackageDir,
      env: { ...process.env, DATABASE_URL: tempDbUrl },
      stdio: "pipe",
    });

    setDatabaseUrl(tempDbUrl);

    // Buat SavedPrompt & Version induk
    const testUserId = "user-spider-eval-test";
    const promptRecord = await savePrompt({
      userId: testUserId,
      originalPrompt: "You are a secure assistant.",
      optimizedPrompt: "You are a secure assistant. Strict format adherence.",
      score: 95,
      intentSummary: "Test intent",
    });

    const versionRecord = await savePromptVersion({
      savedPromptId: promptRecord.id,
      promptText: promptRecord.optimizedPrompt,
      score: 95,
      changesSummary: "Initial version",
    });

    // Simpan hasil SpiderRun beserta test results
    const savedRun = await saveSpiderRun({
      promptVersionId: versionRecord.id,
      targetProvider: concurrentReport.modelMetadata.provider,
      targetModel: concurrentReport.modelMetadata.model,
      status: concurrentReport.status,
      totalCases: concurrentReport.coverageSummary.totalCases,
      passedCases: concurrentReport.coverageSummary.passedCases,
      averageScore: concurrentReport.qualityMetrics.robustness,
      averageLatencyMs: 120,
      testResults: concurrentReport.branches.map((b, idx) => ({
        caseIndex: idx + 1,
        testInput: b.sanitizedInput,
        actualOutput: b.sanitizedOutput,
        score: b.score ?? 80,
        latencyMs: b.latencyMs,
        status: b.status,
        findings: b.rationale ?? null,
      })),
    });

    assert.ok(savedRun.id, "SpiderRun harus memiliki ID yang ter-generate");
    assert.equal(savedRun.totalCases, 5);
    assert.equal(savedRun.passedCases, 5);
    assert.equal(savedRun.testResults?.length, 5);

    console.log(
      `✅ saveSpiderRun berhasil menyimpan run ID "${savedRun.id}" dengan ${savedRun.testResults?.length} test results bebas SQLITE_BUSY.`
    );
  } finally {
    await prisma.$disconnect();
    // Bersihkan file sementara
    if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    if (fs.existsSync(`${tempDbPath}-journal`)) fs.unlinkSync(`${tempDbPath}-journal`);
    if (fs.existsSync(`${tempDbPath}-wal`)) fs.unlinkSync(`${tempDbPath}-wal`);
    if (fs.existsSync(`${tempDbPath}-shm`)) fs.unlinkSync(`${tempDbPath}-shm`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🏁 PROMPT SPIDER ENGINE TEST SUITE BERHASIL 100%");
  console.log("═══════════════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("❌ Test spider gagal:", err);
  process.exit(1);
});
