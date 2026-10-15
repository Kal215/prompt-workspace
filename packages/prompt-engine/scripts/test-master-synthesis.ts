import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import * as dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import {
  runOptimizationPipeline,
  validateMasterPromptSynthesis,
  extractTaskSpecification,
  synthesizeMasterPrompt,
} from "../src/index.js";
import {
  detectTaskArchetypeAndDomain,
  getSynthesisBlueprint,
} from "@prompt-workspace/domain-rules";

interface BenchmarkCase {
  id: string;
  name: string;
  prompt: string;
  context: string | null;
  taskType: string | null;
  expectedArchetype: string;
  expectedNegativeConstraints: string[];
  expectedLogicalTension: boolean;
  criticalChecks: string[];
}

async function runMasterSynthesisBenchmark() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("🚀 MEGA TASK #44: MASTER PROMPT SYNTHESIS ENGINE BENCHMARK SUITE");
  console.log("══════════════════════════════════════════════════════════════════\n");

  const fixturesPath = path.resolve(process.cwd(), "test-fixtures/master-synthesis-benchmark.json");
  const cases: BenchmarkCase[] = JSON.parse(fs.readFileSync(fixturesPath, "utf-8"));

  let totalTests = 0;
  let passedTests = 0;

  function test(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      passedTests++;
      console.log(`  ✅ [PASS] ${name}`);
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // A. Auto-Detecting Task Router Tests (MPS-001 to MPS-006)
  // ─────────────────────────────────────────────────────────────
  console.log("🔍 A. Pengujian Auto-Detecting Task Router (Tanpa taskType / General)");
  for (const c of cases) {
    test(`Router mendeteksi ${c.id} sebagai arketipe ${c.expectedArchetype}`, () => {
      const route = detectTaskArchetypeAndDomain(c.prompt, c.context, c.taskType);
      assert.strictEqual(
        route.archetype,
        c.expectedArchetype,
        `Kasus ${c.id} harus terdeteksi sebagai ${c.expectedArchetype}, didapat ${route.archetype}`
      );
      assert.ok(route.signals.length > 0, `Kasus ${c.id} harus memiliki sinyal deteksi`);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // B. Ekstraksi TaskSpecificationMap pada MPS-001 (Website Toko Kue Tanpa POS)
  // ─────────────────────────────────────────────────────────────
  console.log("\n📐 B. Pengujian Ekstraksi TaskSpecificationMap pada Kasus Utama (MPS-001)");
  const mps001 = cases.find((c) => c.id === "MPS-001")!;
  const route001 = detectTaskArchetypeAndDomain(mps001.prompt, mps001.context, mps001.taskType);
  const taskSpec001 = extractTaskSpecification(mps001.prompt, mps001.context, route001);

  test("MPS-001: Deteksi persyaratan eksplisit (Katalog/Produk, Stok, Laporan)", () => {
    assert.ok(taskSpec001.explicitRequirements.length >= 2, "Harus mengekstrak minimal 2 persyaratan eksplisit");
    const reqText = taskSpec001.explicitRequirements.join(" ").toLowerCase();
    assert.ok(reqText.includes("stok"), "Harus mendeteksi kebutuhan stok");
    assert.ok(reqText.includes("laporan") || reqText.includes("penjualan"), "Harus mendeteksi kebutuhan laporan penjualan");
  });

  test("MPS-001: Deteksi batasan negatif mutlak ('Jangan buat POS')", () => {
    assert.ok(taskSpec001.negativeConstraints.length > 0, "Harus mendeteksi minimal 1 batasan negatif");
    const negText = taskSpec001.negativeConstraints.join(" ").toLowerCase();
    assert.ok(negText.includes("pos") || negText.includes("kasir"), "Harus mengunci larangan pembuatan sistem POS/kasir");
  });

  test("MPS-001: Deteksi ketegangan logis & strategi resolusi (Laporan Penjualan vs Tanpa POS)", () => {
    assert.ok(taskSpec001.logicalTensions.length > 0, "Harus mengidentifikasi ketegangan logis antara laporan penjualan dan larangan POS");
    const tension = taskSpec001.logicalTensions[0];
    assert.ok(tension.tension.toLowerCase().includes("pos"), "Ketegangan harus menyebutkan batasan POS");
    assert.ok(
      tension.resolutionStrategy.toLowerCase().includes("pencatatan") ||
      tension.resolutionStrategy.toLowerCase().includes("sederhana"),
      "Resolusi harus menyediakan mekanisme pencatatan data penjualan sederhana tanpa sistem POS"
    );
  });

  test("MPS-001: Formulasi keputusan terbuka (Open Decisions) adaptif tanpa placeholder dumping", () => {
    assert.ok(taskSpec001.openDecisions.length >= 2, "Harus menyertakan minimal 2 keputusan terbuka");
    for (const od of taskSpec001.openDecisions) {
      assert.ok(
        od.handlingStrategy === "inspect_existing_project" || od.handlingStrategy === "document_assumption",
        `Strategi ${od.handlingStrategy} harus adaptif, bukan placeholder dumping`
      );
      assert.ok(
        od.guidance.toLowerCase().includes("periksa") || od.guidance.toLowerCase().includes("asumsi"),
        "Panduan harus menginstruksikan inspeksi proyek atau dokumentasi asumsi"
      );
    }
  });

  test("MPS-001: Formulasi skenario verifikasi perilaku & Definition of Done", () => {
    assert.ok(taskSpec001.verificationScenarios.length >= 6, "Harus memiliki minimal 6 skenario verifikasi");
    assert.ok(taskSpec001.definitionOfDone.length >= 4, "Harus memiliki minimal 4 item DoD");
  });

  // ─────────────────────────────────────────────────────────────
  // C. Validator Deterministik & Negative / Adversarial Tests
  // ─────────────────────────────────────────────────────────────
  console.log("\n🛡️ C. Pengujian Validator Deterministik & Uji Adversarial (Negative Testing)");

  test("Adversarial 1: Menolak prompt pendek/dangkal (Shallow Rewrite)", () => {
    const shallowPrompt = "Buat website toko kue dengan stok dan laporan penjualan sesuai permintaan pengguna.";
    const result = validateMasterPromptSynthesis(mps001.prompt, shallowPrompt, taskSpec001);
    assert.strictEqual(result.passed, false, "Validator harus menolak shallow rewrite");
    assert.strictEqual(result.checks.notShallowRewrite, false, "Pemeriksaan notShallowRewrite harus false");
    assert.ok(result.failureReasons.some((r) => r.includes("dangkal") || r.includes("pendek")));
  });

  test("Adversarial 2: Menolak prompt yang melanggar batasan larangan (Violating Negative Constraint)", () => {
    const violatingPrompt = `
# Master Prompt: Website Toko Kue
## 1. Peran dan Tujuan
Bangun website toko kue.
## 2. Persyaratan Utama
1. Kelola stok barang kue.
2. Laporan penjualan.
## 3. Fitur Kasir
Bangun sistem POS lengkap dengan checkout keranjang kasir terintegrasi dan cetak nota kasir.
## 4. Tahapan
Tahap 1: Buat UI POS.
## 5. Pengujian
Uji alur kasir.
## 6. Definition of Done
Kasir selesai.
    `.trim();
    const result = validateMasterPromptSynthesis(mps001.prompt, violatingPrompt, taskSpec001);
    assert.strictEqual(result.passed, false, "Validator harus menolak prompt yang melanggar larangan");
    assert.strictEqual(result.checks.negativeConstraintsEnforced, false, "Pemeriksaan negativeConstraintsEnforced harus false");
    assert.ok(result.violatedNegativeConstraints.length > 0, "Harus ada daftar violatedNegativeConstraints");
  });

  test("Adversarial 3: Menolak prompt dengan pembuangan placeholder masif (Placeholder Dumping)", () => {
    const dumpingPrompt = `
# Master Prompt: Website
## 1. Peran
Anda adalah pengembang.
## 2. Persyaratan
Gunakan [MASUKKAN_FRAMEWORK] dan sambungkan ke [MASUKKAN_DATABASE].
Definisikan stok kue di [MASUKKAN_TABEL_STOK] dan buat [MASUKKAN_METODE_LAPORAN].
Jangan buat POS di [MASUKKAN_MODUL_POS].
Gunakan [MASUKKAN_AUTH], [MASUKKAN_STYLING], [MASUKKAN_DEPLOISASI].
## 3. Tahap
Tahap 1: Isi [MASUKKAN_KONFIG].
## 4. Pengujian
Lakukan uji di [MASUKKAN_TEST_SUITE].
## 5. DoD
Selesai di [MASUKKAN_DEFINISI].
    `.trim();
    const result = validateMasterPromptSynthesis(mps001.prompt, dumpingPrompt, taskSpec001);
    assert.strictEqual(result.passed, false, "Validator harus menolak placeholder dumping");
    assert.strictEqual(result.checks.notPlaceholderDumping, false, "Pemeriksaan notPlaceholderDumping harus false");
  });

  test("Positif: Meluluskan Master Prompt Synthesis yang memenuhi seluruh standar (Score >= 90)", () => {
    const blueprint = getSynthesisBlueprint(route001.archetype);
    const synthOutput = synthesizeMasterPrompt(mps001.prompt, taskSpec001, blueprint, []);
    const result = validateMasterPromptSynthesis(mps001.prompt, synthOutput.masterPrompt, taskSpec001);
    assert.strictEqual(result.passed, true, "Validator harus meluluskan Master Prompt sintesis");
    assert.ok(result.overallSynthesisScore >= 90, `Skor sintesis harus >= 90, didapat ${result.overallSynthesisScore}`);
    assert.strictEqual(result.checks.intentPreserved, true);
    assert.strictEqual(result.checks.negativeConstraintsEnforced, true);
    assert.strictEqual(result.checks.notShallowRewrite, true);
    assert.strictEqual(result.checks.notPlaceholderDumping, true);
    assert.strictEqual(result.checks.hasOperationalStages, true);
    assert.strictEqual(result.checks.hasVerificationAndDoD, true);
  });

  // ─────────────────────────────────────────────────────────────
  // D. Eksekusi Penuh Pipeline (runOptimizationPipeline) pada 6 Benchmark
  // ─────────────────────────────────────────────────────────────
  console.log("\n⚡ D. Eksekusi Penuh Pipeline (runOptimizationPipeline) pada Seluruh Benchmark");

  let mps001FinalMasterPrompt = "";

  for (const c of cases) {
    await (async () => {
      const res = await runOptimizationPipeline({
        requestId: `benchmark-${c.id}`,
        prompt: c.prompt,
        context: c.context,
        taskType: c.taskType,
        constraints: [],
      });

      test(`Pipeline ${c.id} (${c.name}): Sukses menghasilkan Master Prompt dan lulus validasi`, () => {
        assert.ok(res.optimizedPrompt.length > 500, "Panjang optimizedPrompt harus substansial");
        assert.ok(res.analysis.taskSpec, "Hasil analisis harus menyertakan taskSpec");
        assert.strictEqual(res.analysis.taskSpec?.detectedArchetype, c.expectedArchetype);
        assert.ok(res.synthesisValidation, "Hasil harus menyertakan synthesisValidation");
        assert.strictEqual(res.synthesisValidation?.passed, true, `Validasi sintesis untuk ${c.id} harus lulus`);
        assert.ok(
          (res.synthesisValidation?.overallSynthesisScore || 0) >= 85,
          `Skor sintesis untuk ${c.id} harus >= 85`
        );
      });

      if (c.id === "MPS-001") {
        mps001FinalMasterPrompt = res.optimizedPrompt;
        const resultsDir = path.resolve(process.cwd(), "test-fixtures/results");
        if (!fs.existsSync(resultsDir)) {
          fs.mkdirSync(resultsDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(resultsDir, "MPS-001.json"),
          JSON.stringify(res, null, 2),
          "utf-8"
        );
      }
    })();
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log(`🎉 BENCHMARK SUITE COMPLETED: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  console.log("📄 OUTPUT MASTER PROMPT LENGKAP UNTUK KASUS MPS-001:");
  console.log("------------------------------------------------------------------");
  console.log(mps001FinalMasterPrompt);
  console.log("------------------------------------------------------------------");
}

runMasterSynthesisBenchmark().catch((err) => {
  console.error("FATAL ERROR IN BENCHMARK SUITE:", err);
  process.exit(1);
});
