import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import { GroqAdapter } from "@prompt-workspace/provider-adapters";

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
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🚀 PROMPT INTELLIGENCE ENGINE — BASELINE TEST HARNESS (GROQ)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const fixturesPath = resolve(rootDir, "test-fixtures/baseline-prompts.json");
  if (!existsSync(fixturesPath)) {
    console.error(`❌ Fixture file not found: ${fixturesPath}`);
    process.exit(1);
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

  const SYSTEM_PROMPT =
    "Anda adalah analis prompt. Tugas Anda HANYA mengidentifikasi kelemahan dari prompt user. Jangan memperbaiki, hanya analisis. Sebutkan: (1) tujuan yang terdeteksi, (2) informasi yang hilang, (3) ambiguitas. Jawab dalam format terstruktur.";

  let successCount = 0;

  for (let i = 0; i < fixtures.length; i++) {
    const item = fixtures[i];
    console.log("───────────────────────────────────────────────────────────────");
    console.log(`[${i + 1}/${fixtures.length}] TEST FIXTURE: ${item.id} | Domain: ${item.domain}`);
    console.log(`User Bad Prompt: "${item.badPrompt}"`);
    console.log(`Original Intent: "${item.originalIntent}"`);
    console.log("───────────────────────────────────────────────────────────────");

    try {
      console.log("⏳ Mengirim analisis ke Groq API...");
      const response = await adapter.chatCompletion([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: item.badPrompt },
      ]);

      console.log(`\n✅ Hasil Analisis LLM (Model: ${response.model} | Key: ${response.keyUsed} | Latency: ${response.latencyMs}ms):`);
      console.log(response.content.trim());

      if (response.usage) {
        console.log(`📊 Tokens: prompt=${response.usage.promptTokens}, completion=${response.usage.completionTokens}`);
      }

      successCount++;
    } catch (err: any) {
      console.error(`❌ Error analyzing ${item.id}:`, err.message);
    }

    // Jeda 2 detik antar request jika masih ada item berikutnya
    if (i < fixtures.length - 1) {
      console.log("\n⏸ Menunggu jeda 2 detik untuk rate-limit compliance...");
      await sleep(2000);
      console.log();
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`🏁 SELESAI: ${successCount}/${fixtures.length} fixtures berhasil dianalisis via Groq API.`);
  console.log("═══════════════════════════════════════════════════════════════");

  if (successCount === 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
