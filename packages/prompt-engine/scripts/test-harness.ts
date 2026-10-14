import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import { GroqAdapter } from "@prompt-workspace/provider-adapters";
import { PromptOptimizationRequest } from "@prompt-workspace/prompt-contracts";
import { runOptimizationPipeline } from "../src/index.js";

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
  console.log("🚀 PROMPT INTELLIGENCE ENGINE — OPTIMIZATION PIPELINE TEST HARNESS");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const fixturesPath = resolve(rootDir, "test-fixtures/baseline-prompts.json");
  if (!existsSync(fixturesPath)) {
    console.error(`❌ Fixture file not found: ${fixturesPath}`);
    process.exit(1);
  }

  const resultsDir = resolve(rootDir, "test-fixtures/results");
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }

  const raw = readFileSync(fixturesPath, "utf-8");
  const fixtures: BaselineFixture[] = JSON.parse(raw);

  console.log(`📦 Loaded ${fixtures.length} baseline fixtures from test-fixtures/baseline-prompts.json`);

  let adapter: GroqAdapter;
  try {
    adapter = new GroqAdapter();
    console.log(`🔑 GroqAdapter initialized with ${adapter.getAvailableKeyCount()} keys in rotation pool.\n`);
  } catch (err: any) {
    console.error("❌ Failed to initialize GroqAdapter:", err.message);
    process.exit(1);
  }

  let successCount = 0;

  for (let i = 0; i < fixtures.length; i++) {
    const item = fixtures[i];
    console.log("───────────────────────────────────────────────────────────────────");
    console.log(`[${i + 1}/${fixtures.length}] PIPELINE RUN: ${item.id} | Domain: ${item.domain}`);
    console.log(`User Bad Prompt: "${item.badPrompt}"`);
    console.log(`Original Intent: "${item.originalIntent}"`);
    console.log("───────────────────────────────────────────────────────────────────");

    try {
      console.log("⏳ Menjalankan runOptimizationPipeline (Analyzer -> Optimizer)...");
      const request: PromptOptimizationRequest = {
        requestId: `req-${item.id}`,
        prompt: item.badPrompt,
        context: `Domain: ${item.domain}. Expected: ${item.expectedBehavior}`,
        taskType: item.domain,
        constraints: [],
      };

      const result = await runOptimizationPipeline(request, adapter);

      // Simpan hasil ke test-fixtures/results/{id}.json
      const outputPath = resolve(resultsDir, `${item.id}.json`);
      writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

      console.log(`\n✅ SUKSES PIPELINE [${item.id}] (Waktu: ${result.metadata?.processingTimeMs}ms)`);
      console.log(`🎯 Detected Intent: ${result.detectedIntent}`);
      console.log(`🔍 Findings (${result.analysis.findings.length} temuan terdeteksi):`);
      for (const finding of result.analysis.findings) {
        console.log(`   - [${finding.category}] (${finding.severity}): ${finding.recommendation}`);
      }
      console.log(`\n✨ Optimized Prompt Preview:\n${result.optimizedPrompt}`);
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
      console.log(`💾 Saved full JSON to: ${outputPath}`);

      successCount++;
    } catch (err: any) {
      console.error(`❌ Error optimizing ${item.id}:`, err.message);
    }

    // Jeda 2 detik antar request jika masih ada item berikutnya
    if (i < fixtures.length - 1) {
      console.log("\n⏸ Menunggu jeda 2 detik untuk rate-limit compliance...");
      await sleep(2000);
      console.log();
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log(`🏁 SELESAI: ${successCount}/${fixtures.length} fixtures berhasil dioptimasi melalui pipeline.`);
  console.log("═══════════════════════════════════════════════════════════════════");

  if (successCount === 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
