import assert from "node:assert";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import {
  initAutonomousProject,
  auditAndAdvancePhase,
  getProjectStatus,
  applyHumanOverride,
  exportHandoverBundle,
  executeVerificationCommandSync,
  verifyArtifactsOnDisk,
  getSessionStorageDirectory,
} from "../src/supervisor.js";

console.log("═══════════════════════════════════════════════════════════════════");
console.log("🏛️ TEST SUITE: AUTONOMOUS SUPERVISOR ENGINE & MCP PROTOCOL (Tahap B)");
console.log("═══════════════════════════════════════════════════════════════════");

async function runTests() {
  // ──────────────────────────────────────────────
  // Simulasi 1: Inisiasi Proyek & Universal Blueprint
  // ──────────────────────────────────────────────
  console.log("\n[Simulasi 1] Inisiasi Proyek Otonom...");
  const prompt1 =
    "Buat sistem web toko roti dengan katalog produk, keranjang belanja, dan integrasi WhatsApp. DILARANG membuat sistem kasir POS fisik dan DILARANG menggunakan mock data palsu.";

  const initResult = initAutonomousProject({
    prompt: prompt1,
    audienceLevel: "specialist",
    maxAttemptsPerPhase: 5,
  });

  const session = initResult.session;
  assert(session.sessionId.startsWith("piew-proj-"), "Session ID harus memiliki prefix piew-proj-");
  assert.strictEqual(session.overallStatus, "ACTIVE");
  assert(session.phases.length >= 3, `Minimal 3 fase eksekusi, aktual: ${session.phases.length}`);
  assert.strictEqual(session.phases[0].status, "IN_PROGRESS", "Fase 0 harus IN_PROGRESS");
  assert.strictEqual(session.phases[1].status, "TODO", "Fase 1 harus TODO");
  assert(initResult.dispatchPrompt.includes("FASE 0"), "Initial dispatch prompt harus memuat Fase 0");
  assert(
    session.masterBlueprint.diagrams.length >= 1,
    "Master blueprint wajib memuat diagram Mermaid tersanitasi"
  );
  console.log(`✅ Sesi berhasil dibuat: ${session.sessionId}`);
  console.log(`   Total Fase: ${session.phases.length} | Master Blueprint: ${session.masterBlueprint.title}`);
  console.log(`   Diagram Mermaid: ${session.masterBlueprint.diagrams.length} diagram`);

  // ──────────────────────────────────────────────
  // Simulasi 2: Tangkap Agent Melenceng (Reject & Self-Healing)
  // ──────────────────────────────────────────────
  console.log("\n[Simulasi 2a] Tangkap Agent Tanpa Bukti Nyata (Evidence Check Failure)...");
  const failedSubmissionNoEvidence = {
    sessionId: session.sessionId,
    phaseIndex: 0,
    summaryOfWork: "Saya sudah menyelesaikan arsitektur dasar dan file konfigurasi.",
    deliveredArtifacts: session.phases[0].requiredDeliverables.map((d) => ({
      name: d,
      type: "artifact",
    })),
    verificationOutput: "FAILED! Test suite failed with Exit Code 1. 3 assertions broken.",
  };

  const auditReject1 = auditAndAdvancePhase(failedSubmissionNoEvidence);
  assert.strictEqual(auditReject1.verdict, "REJECTED_NEEDS_REPAIR");
  assert.strictEqual(auditReject1.evidenceCheckPassed, false);
  assert(auditReject1.score <= 75, `Skor harus di bawah 85, aktual: ${auditReject1.score}`);
  assert(
    /SELF-HEALING/i.test(auditReject1.nextActionPrompt) &&
      /BUKTI/i.test(auditReject1.nextActionPrompt),
    "Harus menghasilkan Self-Healing Corrective Prompt"
  );
  console.log("✅ Berhasil menolak submission dengan bukti pengujian gagal (Evidence Guard aktif).");

  console.log("\n[Simulasi 2b] Tangkap Agent Melakukan Scope Creep (Pelanggaran Batasan Larangan)...");
  const failedSubmissionScopeCreep = {
    sessionId: session.sessionId,
    phaseIndex: 0,
    summaryOfWork:
      "Kami menambahkan modul POS kasir fisik lengkap dengan perangkat keras barcode scanner dan mock data.",
    deliveredArtifacts: ["hardware-pos-scanner.ts"],
    verificationOutput: "npm run build -> Exit Code 0 (0 errors, build success)",
  };

  const auditReject2 = auditAndAdvancePhase(failedSubmissionScopeCreep);
  assert.strictEqual(auditReject2.verdict, "REJECTED_NEEDS_REPAIR");
  assert(
    auditReject2.scopeCreepOrForbiddenViolations.length > 0,
    "Harus mendeteksi pelanggaran batasan larangan POS / fake data"
  );
  assert(
    auditReject2.missingDeliverables.length > 0,
    "Harus mendeteksi missing deliverables fase 0"
  );
  assert(
    auditReject2.nextActionPrompt.includes("POS") ||
      auditReject2.nextActionPrompt.includes("Batasan") ||
      auditReject2.nextActionPrompt.includes("Scope Creep"),
    "Prompt koreksi harus menegaskan pelanggaran scope creep POS"
  );
  console.log("✅ Berhasil menolak submission yang melanggar batasan larangan pengguna (Anti-Scope-Creep aktif).");

  // ──────────────────────────────────────────────
  // Simulasi 3: Perbaikan Agent & Transisi Otomatis hingga PROJECT_COMPLETED
  // ──────────────────────────────────────────────
  console.log("\n[Simulasi 3] Siklus Transisi Otomatis hingga Proyek Selesai...");
  
  // Selesaikan seluruh fase berurutan
  while (true) {
    const currentStatus = getProjectStatus(session.sessionId);
    const pIdx = currentStatus.currentPhaseIndex;
    const activePhase = currentStatus.phases[pIdx];

    console.log(`   ➡️ Menjalankan pengerjaan patuh untuk Fase ${pIdx}: ${activePhase.title}...`);

    const compliantSubmission = {
      sessionId: session.sessionId,
      phaseIndex: pIdx,
      summaryOfWork: `Implementasi lengkap seluruh deliverables untuk fase ${pIdx} (${activePhase.title}) sesuai spesifikasi teknis dan diagram arsitektur.`,
      deliveredArtifacts: activePhase.requiredDeliverables.map((item) => ({
        name: item,
        type: "code",
        summary: `Komponen ${item} terverifikasi`,
        contentSnippet: `// Implementation of ${item} with strict types and zero fake data`,
      })),
      verificationOutput: `npx vitest run --coverage -> Tests: 12 passed, 12 total. Coverage: 98%. Exit Code 0 (0 errors). Typecheck clean.`,
    };

    const auditRes = auditAndAdvancePhase(compliantSubmission);

    if (auditRes.verdict === "PROJECT_COMPLETED") {
      console.log(`   🏆 Seluruh fase selesai! Verdict: PROJECT_COMPLETED (Skor: ${auditRes.score}/100)`);
      assert.strictEqual(auditRes.score >= 85, true);
      assert(auditRes.nextActionPrompt.includes("SERTIFIKAT AUDIT OTONOM"));
      break;
    } else {
      assert.strictEqual(auditRes.verdict, "VERIFIED_PROCEED");
      console.log(`   ✅ Fase ${pIdx} VERIFIED (Skor: ${auditRes.score}/100) -> Maju ke fase berikutnya`);
    }
  }

  const finalStatus = getProjectStatus(session.sessionId);
  assert.strictEqual(finalStatus.overallStatus, "COMPLETED");
  assert.strictEqual(finalStatus.progressPercentage, 100);
  assert(finalStatus.phases.every((p) => p.status === "VERIFIED"));
  console.log("✅ Verifikasi seluruh fase berstatus VERIFIED dan proyek 100% COMPLETED.");

  // ──────────────────────────────────────────────
  // Simulasi 4: JSON-RPC 2.0 MCP Server Roundtrip Test (Stdio)
  // ──────────────────────────────────────────────
  console.log("\n[Simulasi 4] Uji Roundtrip Protokol MCP Stdio JSON-RPC 2.0...");
  await testMcpServerRoundtrip();

  // ──────────────────────────────────────────────
  // Simulasi 5: Zero-Trust Active Verification Runner
  // ──────────────────────────────────────────────
  console.log("\n[Simulasi 5] Zero-Trust Active Verification Runner (Direct Command Execution)...");
  const initRes5 = initAutonomousProject({
    prompt: "Aplikasi keuangan mikro dengan audit trail ketat. DILARANG menghapus catatan transaksi.",
  });
  const session5 = initRes5.session;
  const reqDeliv5 = session5.phases[0].requiredDeliverables;

  // 5a. Kirim klaim sukses tapi verificationCommand sengaja dibuat exit 1
  const activeFailSubmission = {
    sessionId: session5.sessionId,
    phaseIndex: 0,
    summaryOfWork: "Menyelesaikan seluruh deliverable dan mengklaim tes sukses 100%.",
    deliveredArtifacts: reqDeliv5.map((d) => ({
      name: d,
      type: "artifact",
      summary: `Artefak ${d}`,
    })),
    verificationOutput: "PASS - All 10 tests passed (Exit Code 0 palsu dari agent)",
    verificationCommand: 'node -e "process.exit(1)"', // PIEW mengeksekusi sendiri perintah ini!
  };

  const auditActiveFail = auditAndAdvancePhase(activeFailSubmission);
  assert.strictEqual(auditActiveFail.verdict, "REJECTED_NEEDS_REPAIR");
  assert.strictEqual(auditActiveFail.evidenceCheckPassed, false);
  assert(auditActiveFail.independentExecutionResult?.executed === true);
  assert.strictEqual(auditActiveFail.independentExecutionResult?.exitCode, 1);
  console.log("   ✅ Zero-Trust Gate berhasil menangkap klaim palsu lewat eksekusi perintah independen (Exit 1).");

  // 5b. Kirim perintah nyata dengan Exit Code 0
  const activePassSubmission = {
    sessionId: session5.sessionId,
    phaseIndex: 0,
    summaryOfWork: "Menyelesaikan seluruh deliverable dengan pengujian aktif yang benar-benar lulus.",
    deliveredArtifacts: reqDeliv5.map((d) => ({
      name: d,
      type: "artifact",
      summary: `Artefak ${d}`,
      contentSnippet: `# ${d}\nSpesifikasi lengkap dengan audit trail transaksi aman.`,
    })),
    verificationOutput: "Eksekusi mandiri diverifikasi",
    verificationCommand: 'node -e "process.exit(0)"',
  };

  const auditActivePass = auditAndAdvancePhase(activePassSubmission);
  assert.strictEqual(auditActivePass.verdict, "VERIFIED_PROCEED");
  assert.strictEqual(auditActivePass.evidenceCheckPassed, true);
  assert.strictEqual(auditActivePass.independentExecutionResult?.exitCode, 0);
  console.log("   ✅ Zero-Trust Gate mengonfirmasi eksekusi aktif sukses (Exit 0).");

  // ──────────────────────────────────────────────
  // Simulasi 6: Artifact Integrity & File On-Disk Verification
  // ──────────────────────────────────────────────
  console.log("\n[Simulasi 6] Deep Artifact Inspector (On-Disk Existence & SHA-256 Check)...");
  const workspaceRoot = process.cwd();
  const diskDetails = verifyArtifactsOnDisk(
    [
      { name: "package.json" },
      { name: "tsconfig.json" },
      { name: "non_existent_dummy_file.ts" },
    ],
    workspaceRoot
  );

  const pkgJsonDetail = diskDetails.find((d) => d.name === "package.json");
  assert(pkgJsonDetail?.existsOnDisk === true, "package.json wajib terdeteksi ada di disk");
  assert(typeof pkgJsonDetail?.sha256 === "string" && pkgJsonDetail.sha256.length === 64, "SHA-256 wajib terhitung");
  assert((pkgJsonDetail?.sizeBytes || 0) > 0, "Ukuran file wajib > 0 bytes");

  const nonExistentDetail = diskDetails.find((d) => d.name === "non_existent_dummy_file.ts");
  assert.strictEqual(nonExistentDetail?.existsOnDisk, false, "File fiktif wajib terdeteksi false");
  console.log(`   ✅ Integritas artefak on-disk tervalidasi: package.json (SHA-256: ${pkgJsonDetail?.sha256.slice(0, 16)}..., Size: ${pkgJsonDetail?.sizeBytes} B)`);

  // ──────────────────────────────────────────────
  // Simulasi 7: Durable Session Persistence & Handover Bundle Export
  // ──────────────────────────────────────────────
  console.log("\n[Simulasi 7] Durable Session Persistence & Handover Bundle Export...");
  const storageDir = getSessionStorageDirectory();
  assert(typeof storageDir === "string" && storageDir.length > 0);
  console.log(`   ✅ Direktori sesi persisten: ${storageDir}`);

  const exportResult = exportHandoverBundle(session.sessionId, "/tmp/piew-handover-export-test");
  assert.strictEqual(exportResult.success, true);
  assert(fs.existsSync(exportResult.markdownPath), "Berkas sertifikat Markdown wajib ada di disk");
  assert(fs.existsSync(exportResult.jsonPath), "Berkas bundel JSON wajib ada di disk");

  const exportedJson = JSON.parse(fs.readFileSync(exportResult.jsonPath, "utf-8"));
  assert.strictEqual(exportedJson.sessionId, session.sessionId);
  assert.strictEqual(exportedJson.overallStatus, "COMPLETED");
  console.log(`   ✅ Bundel serah terima berhasil diekspor ke disk:`);
  console.log(`      - Markdown: ${exportResult.markdownPath}`);
  console.log(`      - JSON: ${exportResult.jsonPath}`);

  console.log("\n🎉 ALL AUTONOMOUS SUPERVISOR & MCP TESTS PASSED (EXIT CODE 0)");
}

async function testMcpServerRoundtrip(): Promise<void> {
  const mcpServerPath = path.resolve(
    process.cwd(),
    "scripts/piew-mcp-server.ts"
  );

  const child = spawn("npx", ["tsx", mcpServerPath], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  let stdoutBuffer = "";

  function sendRpc(msg: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = msg.id;

      const onData = (chunk: Buffer) => {
        stdoutBuffer += chunk.toString("utf-8");
        const lines = stdoutBuffer.split("\n");
        stdoutBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.id === id) {
              child.stdout.off("data", onData);
              resolve(parsed);
              return;
            }
          } catch {
            // Abaikan log non-JSON
          }
        }
      };

      child.stdout.on("data", onData);
      child.stdin.write(JSON.stringify(msg) + "\n");

      setTimeout(() => {
        child.stdout.off("data", onData);
        reject(new Error(`MCP request id=${id} timed out`));
      }, 30000);
    });
  }

  try {
    // 1. Inisialisasi Proyek via MCP
    const startRes = await sendRpc({
      jsonrpc: "2.0",
      id: 101,
      method: "tools/call",
      params: {
        name: "piew_start_project",
        arguments: {
          prompt: "Bangun microservice payment gateway dengan idempotency key. Jangan gunakan mock gateway.",
          audienceLevel: "specialist",
          forceOfflineFallback: true,
        },
      },
    });

    assert(startRes.result, "MCP result harus ada");
    assert.strictEqual(startRes.result.isError, false);
    const mcpSessionId = startRes.result._meta.sessionId;
    assert(mcpSessionId, "Harus mengembalikan sessionId di _meta");
    console.log(`   ✅ MCP piew_start_project sukses: ${mcpSessionId}`);

    // 2. Cek Status Proyek via MCP
    const statusRes = await sendRpc({
      jsonrpc: "2.0",
      id: 102,
      method: "tools/call",
      params: {
        name: "piew_get_project_status",
        arguments: {
          sessionId: mcpSessionId,
        },
      },
    });
    assert.strictEqual(statusRes.result.isError, false);
    assert.strictEqual(statusRes.result._meta.overallStatus, "ACTIVE");
    console.log(`   ✅ MCP piew_get_project_status sukses (Status: ACTIVE, Progress: 0%)`);

    // 3. Submit Phase 0 Work via MCP
    const requiredDeliverables = statusRes.result._meta.activePhase?.requiredDeliverables || [
      "Dokumen Spesifikasi Persyaratan Kebutuhan",
      "Daftar Batasan Negatif & Ruang Lingkup",
    ];

    const submitRes = await sendRpc({
      jsonrpc: "2.0",
      id: 103,
      method: "tools/call",
      params: {
        name: "piew_submit_phase_work",
        arguments: {
          sessionId: mcpSessionId,
          phaseIndex: 0,
          summaryOfWork: `Setup repository dan menyelesaikan seluruh deliverables: ${requiredDeliverables.join(", ")}.`,
          deliveredArtifacts: requiredDeliverables.map((item: string) => ({
            name: item,
            type: "document",
            summary: `Spesifikasi ${item} lengkap`,
            contentSnippet: `# ${item}\nSpesifikasi lengkap dan arsitektur idempotent request key.`,
          })),
          verificationOutput: "npm run build && npm test -> Exit Code 0 (0 errors, 8 tests passed)",
        },
      },
    });

    assert.strictEqual(submitRes.result.isError, false);
    assert.strictEqual(submitRes.result._meta.verdict, "VERIFIED_PROCEED");
    assert.strictEqual(submitRes.result._meta.evidenceCheckPassed, true);
    console.log(`   ✅ MCP piew_submit_phase_work sukses (Verdict: VERIFIED_PROCEED, Next Phase Dispatched)`);

    // 4. Human Override via MCP
    const overrideRes = await sendRpc({
      jsonrpc: "2.0",
      id: 104,
      method: "tools/call",
      params: {
        name: "piew_human_override",
        arguments: {
          sessionId: mcpSessionId,
          action: "INJECT_CONSTRAINT",
          additionalConstraint: "Wajib menggunakan Redis TTL untuk idempotency cache.",
          reason: "Instruksi arsitek tambahan dari operator manusia",
        },
      },
    });
    assert.strictEqual(overrideRes.result.isError, false);
    assert(overrideRes.result.content[0].text.includes("BERHASIL"));
    console.log(`   ✅ MCP piew_human_override sukses (Constraint Disuntikkan Secara Otonom)`);

    // 5. MCP Export Handover Bundle
    const exportBundleRes = await sendRpc({
      jsonrpc: "2.0",
      id: 105,
      method: "tools/call",
      params: {
        name: "piew_export_handover_bundle",
        arguments: {
          sessionId: mcpSessionId,
          targetDirectory: "/tmp/piew-mcp-bundle-test",
        },
      },
    });
    assert.strictEqual(exportBundleRes.result.isError, false);
    assert(exportBundleRes.result._meta.markdownPath.includes("PIEW-AUDIT-CERTIFICATE-"));
    console.log(`   ✅ MCP piew_export_handover_bundle sukses diekspor`);

  } finally {
    child.kill();
  }
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
