import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import { chatCompletion } from "@prompt-workspace/provider-adapters";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const rootDir = resolve(__dirname, "../../..");
  const envPath = resolve(rootDir, ".env");

  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  const fixturesPath = resolve(rootDir, "test-fixtures/baseline-prompts.json");
  if (!existsSync(fixturesPath)) {
    console.error(`❌ Fixture file not found: ${fixturesPath}`);
    process.exit(1);
  }

  const rawFixtures = readFileSync(fixturesPath, "utf-8");
  const fixtures = JSON.parse(rawFixtures);

  // Ambil fixture pertama sebagai contoh pengujian (PIW-BL-001)
  const targetFixture = fixtures[0];
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🚀 TEST HARNESS — OPENAI ADAPTER");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`📦 Fixture ID  : ${targetFixture.id}`);
  console.log(`🎯 Domain      : ${targetFixture.domain}`);
  console.log(`💬 Bad Prompt  : "${targetFixture.badPrompt}"`);
  console.log(`📋 Original    : "${targetFixture.originalIntent}"`);
  console.log("───────────────────────────────────────────────────────────────");

  const systemPrompt = "Anda adalah analis prompt. Sebutkan apa yang kurang dari prompt user ini.";
  const userPrompt = targetFixture.badPrompt;

  console.log("⏳ Mengirim permintaan ke OpenAI API...");
  const startTime = Date.now();

  try {
    const result = await chatCompletion(systemPrompt, userPrompt);
    const latency = Date.now() - startTime;

    console.log(`✅ Respons diterima dalam ${latency}ms:\n`);
    console.log(result);
    console.log("\n═══════════════════════════════════════════════════════════════");
  } catch (error: any) {
    console.error(`❌ Gagal memanggil OpenAI API: ${error.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
