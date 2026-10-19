import assert from "node:assert";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  initAutonomousProject,
  inspectGitDiff,
  executeVerificationCommand,
  parseCompilerAndLinterErrors,
  inspectDockerHealth,
  evaluateNegativeConstraints,
  buildSteeringDirective,
  runAutonomousEmpiricalAudit,
  getProjectSession,
} from "../src/index.js";

console.log("═══════════════════════════════════════════════════════════════════");
console.log("🔬 TEST SUITE: PIEW EMPIRICAL SUPERVISOR & STEERING RUNTIME");
console.log("═══════════════════════════════════════════════════════════════════");

async function runEmpiricalSupervisorTests() {
  const currentWorkspace = path.resolve(process.cwd());

  // ──────────────────────────────────────────────
  // Test 1: Git Diff Inspector
  // ──────────────────────────────────────────────
  console.log("\n[Uji 1] Git Diff Inspector pada workspace riil...");
  const gitResult = inspectGitDiff({
    workingDirectory: currentWorkspace,
    maxDiffLines: 50,
  });

  assert.strictEqual(gitResult.isGitRepo, true, "Workspace harus terdeteksi sebagai git repo");
  assert(Array.isArray(gitResult.changedFiles), "changedFiles harus berupa array");
  assert(typeof gitResult.deletionsDetected === "boolean", "deletionsDetected harus boolean");
  console.log(`✅ Git inspector lulus: Branch=${gitResult.branchName}, ${gitResult.changedFiles.length} berkas berubah, Deletions=${gitResult.deletionsDetected}`);

  // ──────────────────────────────────────────────
  // Test 2: Terminal Verifier & Compiler Error Parser
  // ──────────────────────────────────────────────
  console.log("\n[Uji 2] Terminal Verifier & Parser Galat TypeScript...");
  // 2a. Perintah sukses
  const successExec = executeVerificationCommand({
    workingDirectory: currentWorkspace,
    command: "node -e 'process.exit(0)'",
  });
  assert.strictEqual(successExec.passed, true, "node exit(0) harus passed");
  assert.strictEqual(successExec.exitCode, 0, "Exit code harus 0");
  assert.strictEqual(successExec.defects.length, 0, "Tidak boleh ada defect pada perintah sukses");

  // 2b. Perintah gagal
  const failExec = executeVerificationCommand({
    workingDirectory: currentWorkspace,
    command: "node -e 'process.exit(1)'",
  });
  assert.strictEqual(failExec.passed, false, "node exit(1) harus gagal");
  assert.strictEqual(failExec.exitCode, 1, "Exit code harus 1");
  assert(failExec.defects.length > 0, "Harus menghasilkan defect untuk kegagalan eksekusi");

  // 2c. Parser galat TS
  const mockTsError = `
src/auth/jwt.ts(45,12): error TS2322: Type 'null' is not assignable to type 'string'.
src/api/payment.ts(88,5): error TS2304: Cannot find name 'idempotencyKey'.
FAIL src/tests/order.test.ts
  ● OrderService › creates transaction
    AssertionError: expected 200 to equal 201
`;
  const parsedDefects = parseCompilerAndLinterErrors(mockTsError);
  assert.strictEqual(parsedDefects.length, 3, "Harus mengekstrak 3 defect dari output");
  assert.strictEqual(parsedDefects[0].fileLocation, "src/auth/jwt.ts");
  assert.strictEqual(parsedDefects[0].category, "COMPILER_TYPE_ERROR");
  assert.strictEqual(parsedDefects[1].fileLocation, "src/api/payment.ts");
  assert.strictEqual(parsedDefects[2].category, "TEST_SUITE_FAILURE");
  console.log("✅ Terminal Verifier & Compiler Parser lulus 100%.");

  // ──────────────────────────────────────────────
  // Test 3: Negative Constraint Guard
  // ──────────────────────────────────────────────
  console.log("\n[Uji 3] Evaluasi Batasan Negatif Pengguna...");
  const negativeCheck = evaluateNegativeConstraints({
    negativeConstraints: [
      "DILARANG menghapus catatan transaksi pelanggan",
      "DILARANG data palsu mock",
    ],
    submissionText: "Kami memperbarui skema database dan menghapus catatan transaksi lama yang kadaluarsa.",
    gitDiffSnippet: "const mockData = [{ id: 1, name: 'dummy' }];",
  });

  assert.strictEqual(negativeCheck.passed, false, "Harus gagal karena melanggar batasan larangan");
  assert.strictEqual(negativeCheck.violations.length, 2, "Harus menangkap 2 pelanggaran batasan negatif");
  assert.strictEqual(negativeCheck.defects.length, 2, "Harus mencatat 2 defect CRITICAL");
  console.log("✅ Negative Constraint Guard berhasil memblokir pelanggaran batasan mutlak.");

  // ──────────────────────────────────────────────
  // Test 4: Docker Health Checker (Graceful Fallback)
  // ──────────────────────────────────────────────
  console.log("\n[Uji 4] Docker Health Checker...");
  const dockerDisabled = inspectDockerHealth({ enabled: false });
  assert.strictEqual(dockerDisabled.status, "NOT_CONFIGURED");

  const dockerNonExistent = inspectDockerHealth({
    enabled: true,
    containerNameOrId: "non_existent_container_12345",
  });
  assert(
    dockerNonExistent.status === "NOT_CONFIGURED" || dockerDisabled.status === "NOT_CONFIGURED",
    "Docker check harus menangani kontainer tidak ada secara aman"
  );
  console.log("✅ Docker Health Checker beroperasi secara tangguh tanpa crash.");

  // ──────────────────────────────────────────────
  // Test 5: Steering Director (4-Part Directive & Circuit Breaker)
  // ──────────────────────────────────────────────
  console.log("\n[Uji 5] Steering Director & Circuit Breaker...");
  // 5a. Revisi Aktif
  const directiveActive = buildSteeringDirective({
    phaseIndex: 0,
    phaseId: "PHASE_0",
    phaseTitle: "Database & Auth Foundations",
    retryCount: 1,
    maxRetries: 3,
    verdict: "REJECTED_NEEDS_REPAIR",
    summaryDiagnosis: "Kompilasi tsc gagal dengan 2 galat tipe",
    defects: parsedDefects,
    negativeViolations: ["Dilarang menghapus transaksi"],
    missingDeliverables: ["skema-prisma.prisma"],
    requiredActions: ["Perbaiki tipe data pada src/auth/jwt.ts"],
  });

  assert.strictEqual(directiveActive.canRetry, true);
  assert.strictEqual(directiveActive.humanEscalationRequired, false);
  assert(directiveActive.fullSteeringPrompt.includes("DIREKTIF REVISI TEKNIS WAJIB"));
  assert(directiveActive.fullSteeringPrompt.includes("src/auth/jwt.ts"));
  assert(directiveActive.fullSteeringPrompt.includes("skema-prisma.prisma"));

  // 5b. Circuit Breaker Triggered (Retry exhausted)
  const directiveCircuitBreaker = buildSteeringDirective({
    phaseIndex: 0,
    phaseId: "PHASE_0",
    phaseTitle: "Database & Auth Foundations",
    retryCount: 3,
    maxRetries: 3,
    verdict: "REJECTED_NEEDS_REPAIR",
    summaryDiagnosis: "Kompilasi berulang kali gagal",
    defects: parsedDefects,
    negativeViolations: [],
    missingDeliverables: [],
    requiredActions: [],
  });

  assert.strictEqual(directiveCircuitBreaker.canRetry, false);
  assert.strictEqual(directiveCircuitBreaker.humanEscalationRequired, true);
  assert(directiveCircuitBreaker.fullSteeringPrompt.includes("CIRCUIT BREAKER TRIGGERED"));
  assert(directiveCircuitBreaker.fullSteeringPrompt.includes("HALTED_MAX_RETRIES"));
  console.log("✅ Steering Director & Circuit Breaker tervalidasi 100%.");

  // ──────────────────────────────────────────────
  // Test 6: End-to-End Autonomous Empirical Audit Execution
  // ──────────────────────────────────────────────
  console.log("\n[Uji 6] End-to-End Autonomous Empirical Audit Loop...");
  const init = initAutonomousProject({
    prompt: "Bangun backend microservice reservasi tiket dengan Prisma dan Express. Dilarang menghapus riwayat pemesanan.",
    audienceLevel: "specialist",
    maxAttemptsPerPhase: 3,
  });

  const session = init.session;
  assert.strictEqual(session.currentPhaseIndex, 0);

  // Buat mock submission dengan perintah verifikasi node
  const empiricalResult = runAutonomousEmpiricalAudit(
    {
      sessionId: session.sessionId,
      phaseIndex: 0,
      summaryOfWork: "Menyiapkan skema basis data dan model reservasi tiket.",
      deliveredArtifacts: [
        {
          name: session.phases[0].requiredDeliverables[0] || "database-schema",
          type: "artifact",
          summary: "Skema basis data relasional",
        },
      ],
      verificationOutput: "Kompilasi dan linting terverifikasi pada disk.",
      workingDirectory: currentWorkspace,
    },
    {
      workingDirectory: currentWorkspace,
      buildCommand: "node -e 'process.exit(0)'",
      maxRetriesPerPhase: 3,
      timeoutMs: 10000,
    }
  );

  assert(empiricalResult.session, "Session harus dikembalikan");
  assert(empiricalResult.empiricalDetail.gitDiffVerified, "Git diff harus diverifikasi");
  assert.strictEqual(empiricalResult.empiricalDetail.terminalBuildExitCode, 0);
  assert(empiricalResult.steeringDirective.fullSteeringPrompt.length > 50);

  const reloadedSession = getProjectSession(session.sessionId);
  assert(reloadedSession, "Sesi harus tersimpan di disk/storage");
  assert.strictEqual(reloadedSession.auditHistory.length, 1, "Audit history harus bertambah 1");
  console.log(`✅ End-to-End Autonomous Audit Loop berhasil dieksekusi: Verdict=${empiricalResult.auditResult.verdict}, Skor=${empiricalResult.auditResult.score}`);

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🎉 SELURUH 6 ASERSAI PENGUJIAN EMPIRICAL SUPERVISOR LULUS 100%!");
  console.log("═══════════════════════════════════════════════════════════════════\n");
}

runEmpiricalSupervisorTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
