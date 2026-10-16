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
  loadPiewConfig,
  initAutonomousProject,
} from "@prompt-workspace/prompt-engine";
import {
  SynthesisStylePreset,
  TokenBudgetMode,
} from "@prompt-workspace/prompt-contracts";
import {
  listCatalogProviders,
  listCustomEndpoints,
  testProviderConnection,
  getCustomEndpoint,
  getCatalogProvider,
} from "@prompt-workspace/provider-adapters";

function printUsage() {
  console.log(`
🚀 PIEW CLI v2.2 — Prompt Improvement & Engineering Workspace
Penggunaan:
  npm run piew -- "<prompt>" [opsi]

Opsi:
  --style=<preset>    Preset gaya: comprehensive_blueprint (default), concise_tactical, conversational_expert
  --audience=<level>  Tingkat audiens: specialist (default), professional, academic, student
  --blueprint         Cetak Universal Meta-Blueprint 10-Bagian lengkap dengan diagram Mermaid (Default)
  --prompt-only       Cetak prompt teroptimasi v2.2 saja tanpa blueprint diagram
  --budget=<mode>     Mode budget token: balanced (default), eco, deep_audit
  --url=<url>         URL dokumentasi/GitHub referensi (maks 2, pisahkan koma atau ulang flag)
  --context=<teks>    Konteks tambahan / spesifikasi arsitektur
  --supervise         Inisialisasi sesi supervisi otonom (Closed-Loop MCP Supervisor)
  --providers         Tampilkan daftar penyedia built-in dan custom endpoints
  --test-provider=<id> Uji koneksi diagnostik ke provider atau custom endpoint
  --json              Cetak output utuh dalam format JSON
  -h, --help          Tampilkan panduan bantuan ini

Contoh:
  npm run piew -- "Buat website toko kue dengan fitur stok barang dan laporan penjualan. Jangan buat POS."
  npm run piew -- "Rancang riset mikroplastik laut" --audience=academic --blueprint
  npm run piew -- "Fix login bug" --style=concise_tactical --budget=eco
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const config = loadPiewConfig();
  let prompt = "";
  let stylePreset: SynthesisStylePreset = config.defaultStylePreset || "comprehensive_blueprint";
  let budgetMode: TokenBudgetMode = config.defaultBudgetMode || "balanced";
  let audienceLevel: any = "specialist";
  let promptOnly = false;
  let showBlueprint: boolean | undefined = undefined;
  let context: string | undefined;
  const referenceUrls: string[] = [];
  let jsonOutput = false;
  let superviseMode = false;
  let listProvidersMode = false;
  let testProviderTarget: string | undefined;

  for (const arg of args) {
    if (arg === "--providers" || arg === "--list-providers") {
      listProvidersMode = true;
    } else if (arg.startsWith("--test-provider=")) {
      testProviderTarget = arg.slice("--test-provider=".length).trim();
    } else if (arg === "--supervise") {
      superviseMode = true;
    } else if (arg.startsWith("--style=")) {
      stylePreset = arg.split("=")[1] as SynthesisStylePreset;
    } else if (arg.startsWith("--budget=")) {
      budgetMode = arg.split("=")[1] as TokenBudgetMode;
    } else if (arg.startsWith("--audience=")) {
      audienceLevel = arg.split("=")[1];
    } else if (arg === "--blueprint") {
      showBlueprint = true;
    } else if (arg === "--prompt-only") {
      promptOnly = true;
      showBlueprint = false;
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

  // Smart Auto-Detection: Aktifkan mode blueprint secara default kecuali diminta --prompt-only
  if (showBlueprint === undefined) {
    showBlueprint = !promptOnly;
  }

  if (listProvidersMode) {
    const catalog = listCatalogProviders();
    const custom = await listCustomEndpoints();

    if (jsonOutput) {
      console.log(JSON.stringify({ catalog, customEndpoints: custom }, null, 2));
      process.exit(0);
    }

    console.log("\n=======================================================");
    console.log("🌐 PIEW MULTI-PROVIDER & CUSTOM ENDPOINT REGISTRY");
    console.log("=======================================================\n");

    console.log("📦 BUILT-IN PROVIDERS:");
    for (const p of catalog) {
      const statusIcon = p.configured ? "✅ Configured" : "⚪ Not Configured";
      console.log(` • [${p.providerId}] ${p.displayName}`);
      console.log(`   Model Default : ${p.defaultModel}`);
      console.log(`   Status        : ${statusIcon} ${p.maskedKeyHint ? `(${p.maskedKeyHint})` : ""}`);
      if (p.getKeyUrl) console.log(`   Dapatkan Key  : ${p.getKeyUrl}`);
      console.log("");
    }

    console.log("🔌 CUSTOM ENDPOINTS (~/.piew/providers.json):");
    if (custom.length === 0) {
      console.log("   (Belum ada custom endpoint terdaftar)");
    } else {
      for (const e of custom) {
        const localBadge = e.isLocal ? "[LOKAL/PRIVATE]" : "[REMOTE]";
        const statusBadge = e.isActive ? "AKTIF" : "NONAKTIF";
        console.log(` • ${e.name} (${e.providerId}) ${localBadge} - ${statusBadge}`);
        console.log(`   URL           : ${e.endpointUrl}`);
        console.log(`   Mode API      : ${e.apiMode}`);
        console.log(`   Model Default : ${e.defaultModel}`);
        console.log(`   API Key       : ${e.hasSavedKey ? "Tersimpan (Masked)" : e.envKeyRef || "None"}`);
        console.log("");
      }
    }
    process.exit(0);
  }

  if (testProviderTarget) {
    console.log(`\n⚡ Menguji koneksi ke provider/endpoint: ${testProviderTarget}...`);
    // Cari di custom endpoint dulu
    const custom = await getCustomEndpoint(testProviderTarget);
    if (custom) {
      // Ambil record lengkap dengan key internal untuk runtime test
      const storeList = await listCustomEndpoints({ includeSecrets: true });
      const targetRecord = storeList.find((r: any) => r.id === custom.id || r.providerId === custom.providerId) as any;
      const testResult = await testProviderConnection({
        endpointUrl: custom.endpointUrl,
        apiMode: custom.apiMode,
        apiKey: targetRecord?.savedApiKey,
        providerId: custom.providerId,
        model: custom.defaultModel,
      });

      if (jsonOutput) {
        console.log(JSON.stringify(testResult, null, 2));
      } else {
        const icon = testResult.ok ? "✅" : "❌";
        console.log(`${icon} Hasil Uji Koneksi:`);
        console.log(`   Status        : ${testResult.ok ? "BERHASIL" : "GAGAL"}`);
        console.log(`   Latensi       : ${testResult.latencyMs}ms`);
        console.log(`   Detected Mode : ${testResult.detectedApiMode}`);
        console.log(`   Pesan         : ${testResult.message}`);
        if (testResult.discoveredModels.length > 0) {
          console.log(`   Model Ditemukan (${testResult.discoveredModels.length}): ${testResult.discoveredModels.slice(0, 5).join(", ")}${testResult.discoveredModels.length > 5 ? "..." : ""}`);
        }
      }
      process.exit(testResult.ok ? 0 : 1);
    }

    const cat = getCatalogProvider(testProviderTarget);
    if (cat) {
      console.log(`ℹ️ Provider ${cat.displayName} (${cat.providerId}) terdaftar di katalog built-in.`);
      console.log(`   Status konfigurasi: ${cat.configured ? "Ready (" + cat.maskedKeyHint + ")" : "Belum ada API key di environment"}`);
      process.exit(0);
    }

    console.error(`❌ Provider atau endpoint "${testProviderTarget}" tidak ditemukan.`);
    process.exit(1);
  }

  if (!prompt) {
    console.error("❌ Error: Prompt utama wajib diberikan.");
    printUsage();
    process.exit(1);
  }

  if (superviseMode) {
    try {
      const initResult = initAutonomousProject({
        prompt,
        context,
        audienceLevel,
      });

      if (jsonOutput) {
        console.log(JSON.stringify(initResult, null, 2));
        process.exit(0);
      }

      console.log("\n" + "═".repeat(68));
      console.log(`🏛️ PIEW AUTONOMOUS SUPERVISOR INITIALIZED: ${initResult.session.sessionId}`);
      console.log("═".repeat(68) + "\n");
      console.log(`Proyek: ${initResult.session.masterBlueprint.title}`);
      console.log(`Domain: ${initResult.session.domainId} | Subtopik: ${initResult.session.subtopicId} | Audiens: ${initResult.session.audienceLevel}`);
      console.log(`Total Fase: ${initResult.session.phases.length} fase eksekusi\n`);
      console.log("─".repeat(68));
      console.log("📋 INITIAL DISPATCH PROMPT (FASE 0):");
      console.log("─".repeat(68) + "\n");
      console.log(initResult.dispatchPrompt);
      console.log("\n" + "─".repeat(68));
      console.log(`💡 Instruksi Lanjutan untuk Agen:`);
      console.log(`Gunakan MCP tool 'piew_submit_phase_work' dengan sessionId: "${initResult.session.sessionId}"`);
      console.log("─".repeat(68) + "\n");
      process.exit(0);
    } catch (err: any) {
      console.error(`❌ Gagal menginisialisasi sesi supervisi: ${err.message}`);
      process.exit(1);
    }
  }

  try {
    const result = await runAutoPilotMasterPipeline({
      prompt,
      stylePreset,
      budgetMode,
      audienceLevel,
      context,
      referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
    });

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    }

    if (showBlueprint && result.universalBlueprint) {
      console.log("\n" + "═".repeat(68));
      console.log("🌟 PIEW UNIVERSAL META-BLUEPRINT (10-Bagian + Diagram Mermaid)");
      console.log("═".repeat(68) + "\n");
      console.log(result.universalBlueprint.renderedMasterPrompt);
      console.log("\n" + "─".repeat(68));
      console.log(
        `📊 Domain: ${result.universalBlueprint.domain.toUpperCase()} | ` +
        `Audiens: ${result.audienceLevel} | Diagram: ${result.universalBlueprint.diagrams.length} Mermaid | ` +
        `Fase: ${result.universalBlueprint.executionPhases.length} | Latency: ${result.processingTimeMs ?? 0}ms`
      );
      console.log("─".repeat(68) + "\n");
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
