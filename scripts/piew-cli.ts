#!/usr/bin/env node
/**
 * PIEW CLI — Command Line Interface untuk Prompt Improvement & Engineering Workspace
 *
 * Contoh penggunaan:
 *   npx tsx scripts/piew-cli.ts "Buat website toko kue dengan stok barang dan laporan penjualan. Jangan buat POS."
 *   npx tsx scripts/piew-cli.ts "Analisis data penjualan" --style=concise_tactical --budget=eco
 *   npx tsx scripts/piew-cli.ts "Fitur auth Next.js" --url=https://nextjs.org/docs --json
 */

import {
  runAutoPilotMasterPipeline,
  SynthesisStylePreset,
  TokenBudgetMode,
} from "@prompt-workspace/prompt-engine";

function printUsage() {
  console.log(`
🚀 PIEW CLI v2.2 — Prompt Improvement & Engineering Workspace
Penggunaan:
  npm run piew -- "<prompt>" [opsi]

Opsi:
  --style=<preset>    Preset gaya: comprehensive_blueprint (default), concise_tactical, conversational_expert
  --budget=<mode>     Mode budget token: balanced (default), eco, deep_audit
  --url=<url>         URL dokumentasi/GitHub referensi (maks 2, pisahkan koma atau ulang flag)
  --context=<teks>    Konteks tambahan / spesifikasi arsitektur
  --json              Cetak output utuh dalam format JSON
  -h, --help          Tampilkan panduan bantuan ini

Contoh:
  npm run piew -- "Buat website toko kue dengan fitur stok barang dan laporan penjualan. Jangan buat POS."
  npm run piew -- "Fix login bug" --style=concise_tactical --budget=eco
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  let prompt = "";
  let stylePreset: SynthesisStylePreset = "comprehensive_blueprint";
  let budgetMode: TokenBudgetMode = "balanced";
  let context: string | undefined;
  const referenceUrls: string[] = [];
  let jsonOutput = false;

  for (const arg of args) {
    if (arg.startsWith("--style=")) {
      stylePreset = arg.split("=")[1] as SynthesisStylePreset;
    } else if (arg.startsWith("--budget=")) {
      budgetMode = arg.split("=")[1] as TokenBudgetMode;
    } else if (arg.startsWith("--context=")) {
      context = arg.slice("--context=".length);
    } else if (arg.startsWith("--url=")) {
      const urls = arg.slice("--url=".length).split(",");
      referenceUrls.push(...urls.map((u) => u.trim()));
    } else if (arg === "--json") {
      jsonOutput = true;
    } else if (!arg.startsWith("-") && !prompt) {
      prompt = arg;
    }
  }

  if (!prompt) {
    console.error("❌ Error: Prompt utama wajib diberikan.");
    printUsage();
    process.exit(1);
  }

  try {
    const result = await runAutoPilotMasterPipeline({
      prompt,
      stylePreset,
      budgetMode,
      context,
      referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
    });

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    console.log("\n" + "═".repeat(68));
    console.log("⚡ PIEW MASTER PROMPT (Auto-Pilot v2.2)");
    console.log("═".repeat(68) + "\n");
    console.log(result.optimizedPrompt);
    console.log("\n" + "─".repeat(68));
    console.log(
      `📊 Status: VALIDATED (${result.synthesisValidation.overallSynthesisScore}/100) | ` +
      `Preset: ${result.stylePreset} | Budget: ${result.budgetMode} | ` +
      `Cache: ${result.cacheHit ? "HIT (0 tokens)" : "MISS"} | Latency: ${result.processingTimeMs ?? 0}ms`
    );
    console.log("─".repeat(68) + "\n");
    process.exit(0);
  } catch (err: any) {
    console.error(`❌ Gagal mengeksekusi PIEW Auto-Pilot: ${err.message}`);
    process.exit(1);
  }
}

main();
