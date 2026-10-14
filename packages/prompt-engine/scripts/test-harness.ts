import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import { GroqAdapter } from "@prompt-workspace/provider-adapters";
import { PromptOptimizationRequest } from "@prompt-workspace/prompt-contracts";
import {
  runOptimizationPipeline,
  evaluateOptimization,
  safeLogger,
  redactPrompt,
  ProviderUnavailableError,
  EngineError,
} from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Monorepo root is 3 levels up from scripts/
const rootDir = resolve(__dirname, "../../..");
const envPath = resolve(rootDir, ".env");

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // fallback to current working directory
}

interface BaselineFixture {
  id: string;
  domain: string;
  badPrompt: string;
  originalIntent: string;
  problems: string[];
  expectedBehavior: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("🛡️  PROMPT INTELLIGENCE ENGINE — HARDENED QA AUDIT TEST HARNESS");
  console.log("    (Gate 3: LLM-as-a-Judge Quality & Anti-Hallucination Audit)");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const fixturesPath = resolve(rootDir, "test-fixtures/baseline-prompts.json");
  if (!existsSync(fixturesPath)) {
    safeLogger.error(`Fixture file not found: ${fixturesPath}`);
    process.exit(1);
  }

  const resultsDir = resolve(rootDir, "test-fixtures/results");
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }

  const raw = readFileSync(fixturesPath, "utf-8");
  const fixtures: BaselineFixture[] = JSON.parse(raw);

  safeLogger.info(`Loaded ${fixtures.length} baseline fixtures for QA audit testing`);

  let adapter: GroqAdapter;
  try {
    adapter = new GroqAdapter();
    safeLogger.info(`GroqAdapter initialized with ${adapter.getAvailableKeyCount()} keys in rotation pool`);
  } catch (err: any) {
    safeLogger.error("Failed to initialize GroqAdapter", err);
    process.exit(1);
  }

  let successCount = 0;

  for (let i = 0; i < fixtures.length; i++) {
    const item = fixtures[i];
    console.log("\n───────────────────────────────────────────────────────────────────");
    console.log(`[${i + 1}/${fixtures.length}] PIPELINE & AUDIT: ${item.id} | Domain: ${item.domain}`);
    // PRIVACY COMPLIANCE: Redact raw prompt in console output
    console.log(`User Bad Prompt (REDACTED): ${redactPrompt(item.badPrompt, 15)}`);
    console.log(`Original Intent: "${item.originalIntent}"`);
    console.log("───────────────────────────────────────────────────────────────────");

    try {
      safeLogger.info(`Menjalankan runOptimizationPipeline dengan QA Auditor untuk ${item.id}...`);

      const request: PromptOptimizationRequest = {
        requestId: `req-${item.id}`,
        prompt: item.badPrompt,
        context: `Domain: ${item.domain}. Expected: ${item.expectedBehavior}`,
        taskType: item.domain,
        constraints: [],
      };

      // Jalankan pipeline lengkap (Analyzer -> Optimizer -> Auditor QA)
      const result = await runOptimizationPipeline(request, adapter, {
        expectedBehavior: item.expectedBehavior,
      });

      // Simpan hasil utuh (un-redacted) ke file test-fixtures/results/{id}.json untuk evaluasi
      const outputPath = resolve(resultsDir, `${item.id}.json`);
      writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

      console.log(`\n✅ SUKSES PIPELINE [${item.id}]`);
      console.log(`📊 Telemetry:`);
      console.log(`   - Model Target: ${result.metadata?.modelTarget}`);
      console.log(`   - Processing Time: ${result.metadata?.processingTimeMs}ms`);
      console.log(`   - Latency LLM: ${result.metadata?.latencyMs}ms`);
      console.log(
        `   - Tokens Used: prompt=${result.metadata?.tokensUsed?.promptTokens}, completion=${result.metadata?.tokensUsed?.completionTokens}, total=${result.metadata?.tokensUsed?.totalTokens}`
      );
      console.log(`🎯 Detected Intent: ${result.detectedIntent}`);
      console.log(`🔍 Findings (${result.analysis.findings.length} temuan terdeteksi):`);
      for (const finding of result.analysis.findings) {
        console.log(`   - [${finding.category}] (${finding.severity}): ${finding.recommendation}`);
      }
      console.log(`\n✨ Optimized Prompt Preview (Snippet):\n${result.optimizedPrompt.slice(0, 180)}...`);
      console.log(`\n📝 Changes:`);
      for (const change of result.changes) {
        console.log(`   + ${change}`);
      }
      if (result.warnings.length > 0) {
        console.log(`\n⚠️ Warnings:`);
        for (const warning of result.warnings) {
          console.log(`   ! ${warning}`);
        }
      }

      if (result.evaluation) {
        const statusTag = result.evaluation.passed ? "✅ [PASS]" : "❌ [FAIL]";
        console.log(`\n⚖️  AUDITOR QA (LLM-as-a-Judge):`);
        console.log(`   ${statusTag} Score: ${result.evaluation.score}/100`);
        console.log(`   Auditor Notes: ${result.evaluation.auditorNotes}`);
        if (result.evaluation.intentPreserved !== undefined) {
          console.log(`   - Intent Preserved: ${result.evaluation.intentPreserved ? "YES" : "NO"}`);
        }
        if (result.evaluation.deceptiveCertaintyAvoided !== undefined) {
          console.log(`   - Deceptive Certainty Avoided (Anti-Hallucination): ${result.evaluation.deceptiveCertaintyAvoided ? "YES" : "NO"}`);
        }
      }

      console.log(`💾 Saved full JSON (un-redacted for evaluation) to: ${outputPath}`);

      successCount++;
    } catch (err: any) {
      safeLogger.error(`Error optimizing ${item.id}`, err);
    }

    // Jeda 2 detik antar request jika masih ada item berikutnya
    if (i < fixtures.length - 1) {
      console.log("\n⏸ Menunggu jeda 2 detik untuk rate-limit compliance...");
      await sleep(2000);
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // Auditor Negative Test (Pendeteksian Deceptive Certainty / Halusinasi)
  // ───────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🕵️  AUDITOR NEGATIVE TEST (Pendeteksian Deceptive Certainty / Halusinasi)");
  console.log("═══════════════════════════════════════════════════════════════════");

  try {
    safeLogger.info("Menguji Auditor terhadap prompt halusinasi (mengarang URL/fakta palsu)...");
    const fakeHallucinatedPrompt =
      "Scrape data dari situs https://tokopedia-ecommerce-fake.com/products/all menggunakan BeautifulSoup. Ambil selector .price-val dan .product-sku lalu simpan ke database PostgreSQL di postgresql://admin:secret@localhost:5432/scrape_db.";

    const negativeAudit = await evaluateOptimization(
      fixtures[0].badPrompt,
      fakeHallucinatedPrompt,
      fixtures[0].expectedBehavior,
      adapter
    );

    console.log(`Hasil Audit Prompt Palsu/Halusinasi:`);
    console.log(`- Passed: ${negativeAudit.passed} (Expected: false)`);
    console.log(`- Score: ${negativeAudit.score}/100 (Expected: < 50)`);
    console.log(`- Auditor Notes: ${negativeAudit.auditorNotes}`);
    console.log(`- Deceptive Certainty Avoided: ${negativeAudit.deceptiveCertaintyAvoided ? "YES" : "NO"}`);

    if (!negativeAudit.passed && negativeAudit.score < 60) {
      console.log(`\n✅ NEGATIVE TEST LULUS: Auditor berhasil mendeteksi deceptive certainty dan menggagalkannya (passed: false)!`);
    } else {
      console.warn(`\n⚠️ NEGATIVE TEST PERLU DITINJAU: Auditor meloloskan atau memberi skor tinggi pada halusinasi.`);
    }
  } catch (err: any) {
    safeLogger.error("Negative test error", err);
  }

  // ───────────────────────────────────────────────────────────────────
  // Simulasi Error & Graceful Degradation (Simulated Failure Test)
  // ───────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🧪 SIMULASI ERROR & GRACEFUL DEGRADATION TEST");
  console.log("═══════════════════════════════════════════════════════════════════");

  try {
    safeLogger.info("Menguji penanganan error saat provider menggunakan API key invalid...");
    // Inisialisasi adapter dengan API key dummy yang salah
    const brokenAdapter = new GroqAdapter([
      "gsk_dummy_invalid_key_for_testing_purposes_1234567890",
    ]);

    const brokenRequest: PromptOptimizationRequest = {
      requestId: "req-simulated-error",
      prompt: "Prompt uji untuk simulasi error provider.",
      context: null,
      taskType: "test",
      constraints: [],
    };

    await runOptimizationPipeline(brokenRequest, brokenAdapter);
    console.error("❌ Test GAGAL: Seharusnya pipeline melempar ProviderUnavailableError!");
  } catch (err: any) {
    if (err instanceof EngineError || err.name === "ProviderUnavailableError") {
      console.log(`✅ GRACEFUL DEGRADATION BERHASIL: Error tertangkap dengan tipe "${err.name}" (${err.code}).`);
      console.log(`   Pesan error: ${err.message}`);
      console.log("   Node.js TIDAK crash, error tertangani secara aman.");
    } else {
      console.warn(`⚠️ Error tertangkap dengan tipe lain: ${err?.name || err}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log(`🏁 SELESAI: ${successCount}/${fixtures.length} fixtures berhasil diproses dan diaudit.`);
  console.log("═══════════════════════════════════════════════════════════════════");

  if (successCount === 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  safeLogger.error("Fatal error during harness execution", err);
  process.exit(1);
});
