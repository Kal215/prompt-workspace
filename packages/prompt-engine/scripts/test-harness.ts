import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import { GroqAdapter } from "@prompt-workspace/provider-adapters";
import { PromptOptimizationRequest } from "@prompt-workspace/prompt-contracts";
import {
  runOptimizationPipeline,
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
  console.log("🛡️  PROMPT INTELLIGENCE ENGINE — HARDENED PIPELINE TEST HARNESS");
  console.log("    (Data Minimization, Redaction & Telemetry Verification)");
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

  safeLogger.info(`Loaded ${fixtures.length} baseline fixtures for hardened testing`);

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
    console.log(`[${i + 1}/${fixtures.length}] PIPELINE RUN: ${item.id} | Domain: ${item.domain}`);
    // PRIVACY COMPLIANCE: Redact raw prompt in console output
    console.log(`User Bad Prompt (REDACTED): ${redactPrompt(item.badPrompt, 15)}`);
    console.log(`Original Intent: "${item.originalIntent}"`);
    console.log("───────────────────────────────────────────────────────────────────");

    try {
      safeLogger.info(`Menjalankan runOptimizationPipeline untuk ${item.id}...`);

      const request: PromptOptimizationRequest = {
        requestId: `req-${item.id}`,
        prompt: item.badPrompt,
        context: `Domain: ${item.domain}. Expected: ${item.expectedBehavior}`,
        taskType: item.domain,
        constraints: [],
      };

      const result = await runOptimizationPipeline(request, adapter);

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
  console.log(`🏁 SELESAI: ${successCount}/${fixtures.length} fixtures berhasil diproses secara aman.`);
  console.log("═══════════════════════════════════════════════════════════════════");

  if (successCount === 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  safeLogger.error("Fatal error during harness execution", err);
  process.exit(1);
});
