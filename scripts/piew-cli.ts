#!/usr/bin/env node
/**
 * PIEW CLI — Command Line Interface untuk Prompt Improvement & Engineering Workspace
 *
 * Contoh penggunaan:
 *   npx tsx scripts/piew-cli.ts "Buat website toko kue dengan stok barang dan laporan penjualan. Jangan buat POS."
 *   npx tsx scripts/piew-cli.ts "Analisis data penjualan" --style=concise_tactical --budget=eco
 *   npx tsx scripts/piew-cli.ts "Fitur auth Next.js" --url=https://nextjs.org/docs --json
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import {
  runAutoPilotMasterPipeline,
  loadPiewConfig,
  initAutonomousProject,
  initAutonomousProjectAsync,
  listMcpConnectors,
  testAndDiscoverMcpConnector,
  BoundedAgentRuntime,
  AgentMemoryStore,
  AgentSkillRegistry,
  ScientificExperimentRunner,
  runAutonomousEmpiricalAudit,
  getProjectSession,
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
  --setup             Pasang otomatis konfigurasi MCP Server ke Cursor, Claude Desktop, & Windsurf
  --supervise         Inisialisasi sesi supervisi otonom (Closed-Loop MCP Supervisor)
  --audit             Jalankan audit fisik empiris mandiri pada fase aktif
  --session=<id>      ID sesi supervisi untuk audit atau inspeksi status
  --phase=<index>     Indeks fase yang diaudit (default: fase aktif)
  --build-cmd=<cmd>   Perintah kompilasi verifikasi (default: npm run build)
  --test-cmd=<cmd>    Perintah test suite verifikasi (default: npm test)
  --providers         Tampilkan daftar penyedia built-in dan custom endpoints
  --test-provider=<id> Uji koneksi diagnostik ke provider atau custom endpoint
  --connectors        Tampilkan status Universal MCP Connectors & Tools Hub
  --test-connector=<id> Uji koneksi & discover tools dari MCP Server eksternal
  --agent-run         Jalankan Bounded Autonomous Agent Loop
  --memory            Tampilkan atau kelola memory record agen
  --skills            Tampilkan daftar declarative skill registry
  --experiment        Jalankan Scientific Paired Experiment (B0..B4)
  --no-mcp-context    Nonaktifkan pengayaan konteks eksternal otomatis dari MCP
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
  let listConnectorsMode = false;
  let testConnectorTarget: string | undefined;
  let enableMcpContext = true;
  let agentRunMode = false;
  let memoryMode = false;
  let skillsMode = false;
  let experimentMode = false;
  let auditMode = false;
  let setupMode = false;
  let sessionTarget: string | undefined;
  let phaseTarget: number | undefined;
  let buildCmdTarget: string | undefined;
  let testCmdTarget: string | undefined;

  for (const arg of args) {
    if (arg === "--setup" || arg === "setup") {
      setupMode = true;
    } else if (arg === "--providers" || arg === "--list-providers") {
      listProvidersMode = true;
    } else if (arg.startsWith("--test-provider=")) {
      testProviderTarget = arg.slice("--test-provider=".length).trim();
    } else if (arg === "--connectors" || arg === "--list-connectors") {
      listConnectorsMode = true;
    } else if (arg.startsWith("--test-connector=")) {
      testConnectorTarget = arg.slice("--test-connector=".length).trim();
    } else if (arg === "--no-mcp-context") {
      enableMcpContext = false;
    } else if (arg === "--agent-run") {
      agentRunMode = true;
    } else if (arg === "--memory") {
      memoryMode = true;
    } else if (arg === "--skills") {
      skillsMode = true;
    } else if (arg === "--experiment") {
      experimentMode = true;
    } else if (arg === "--supervise") {
      superviseMode = true;
    } else if (arg === "--audit") {
      auditMode = true;
    } else if (arg.startsWith("--session=")) {
      sessionTarget = arg.slice("--session=".length).trim();
    } else if (arg.startsWith("--phase=")) {
      phaseTarget = parseInt(arg.slice("--phase=".length).trim(), 10);
    } else if (arg.startsWith("--build-cmd=")) {
      buildCmdTarget = arg.slice("--build-cmd=".length).trim();
    } else if (arg.startsWith("--test-cmd=")) {
      testCmdTarget = arg.slice("--test-cmd=".length).trim();
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

  if (setupMode) {
    await handleIdeSetup({ json: jsonOutput });
    process.exit(0);
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

  if (listConnectorsMode) {
    const connectors = await listMcpConnectors();

    if (jsonOutput) {
      console.log(JSON.stringify(connectors, null, 2));
      process.exit(0);
    }

    console.log("\n=======================================================");
    console.log("🔌 PIEW UNIVERSAL MCP CONNECTOR HUB & TOOL BRIDGE");
    console.log("=======================================================\n");

    const onDevice = connectors.filter((c: any) => c.installedOnDevice || c.badgeType === "MCP · Custom");
    const availableCatalog = connectors.filter((c: any) => !c.installedOnDevice && c.badgeType !== "MCP · Custom");

    console.log(`📱 TERPASANG DI PERANGKAT INI (${onDevice.length}):`);
    for (const c of onDevice) {
      const statusIcon = c.connectionStatus === "connected" ? "🟢 CONNECTED" : (c.enabled ? "⚪ ON (Unused)" : "🔴 DISABLED");
      const latencyStr = c.latencyMs ? ` (${c.latencyMs}ms)` : "";
      console.log(` • [${c.connectorId}] ${c.name} [${c.badgeType}] — ${statusIcon}${latencyStr}`);
      console.log(`   Kategori   : ${c.category} | Mode Izin: ${c.permissionMode}`);
      const transportSummary = c.transportType === "stdio"
        ? `stdio: ${c.stdioConfig?.command} ${c.stdioConfig?.args.join(" ")}`
        : `http/sse: ${c.httpConfig?.endpointUrl}`;
      console.log(`   Transport  : ${transportSummary}`);
      console.log(`   Deskripsi  : ${c.description}`);
      if (c.discoveredTools.length > 0) {
        const toolNames = c.discoveredTools.map((t: any) => `${t.name}${t.isMutating ? " (✍️ mutating)" : ""}`).join(", ");
        console.log(`   Tools (${c.discoveredTools.length}) : ${toolNames}`);
      }
      console.log("");
    }

    console.log(`\n📦 KATALOG TERSEDIA (${availableCatalog.length}):`);
    for (const c of availableCatalog) {
      const statusIcon = c.enabled ? "Ready to Connect" : "Disabled";
      console.log(` • [${c.connectorId}] ${c.name} (${c.category}) — ${statusIcon}`);
      console.log(`   Deskripsi  : ${c.description}`);
      console.log(`   Mode Izin  : ${c.permissionMode}`);
      console.log("");
    }
    process.exit(0);
  }

  if (skillsMode) {
    const registry = new AgentSkillRegistry();
    const skills = registry.getActiveSkills();
    if (jsonOutput) {
      console.log(JSON.stringify(skills, null, 2));
      process.exit(0);
    }
    console.log(`\n🧩 DECLARATIVE SKILL REGISTRY (${skills.length}):`);
    for (const s of skills) {
      console.log(` • [${s.name}@${s.version}] (Risk: ${s.riskClass.toUpperCase()}) — Active`);
      console.log(`   Summary : ${s.summary}`);
    }
    process.exit(0);
  }

  if (memoryMode) {
    const memStore = new AgentMemoryStore();
    const memories = memStore.queryMemories({ ownerId: "user-default" });
    if (jsonOutput) {
      console.log(JSON.stringify(memories, null, 2));
      process.exit(0);
    }
    console.log(`\n🧠 HYBRID MEMORY STORE (${memories.length}):`);
    for (const m of memories) {
      console.log(` • [${m.id}] (${m.type}) [${m.status}] Conf: ${m.confidence}`);
      console.log(`   Content: ${m.content}`);
    }
    process.exit(0);
  }

  if (agentRunMode) {
    if (!prompt) {
      console.error("❌ Error: Prompt utama wajib diberikan untuk --agent-run.");
      process.exit(1);
    }
    console.log(`\n🤖 MENJALANKAN BOUNDED AUTONOMOUS AGENT RUN...`);
    const runtime = new BoundedAgentRuntime();
    const record = await runtime.executeBoundedAgentRun({
      ownerId: "user-cli",
      prompt,
    });
    if (jsonOutput) {
      console.log(JSON.stringify(record, null, 2));
      process.exit(0);
    }
    console.log(`✅ Status Selesai: ${record.status.toUpperCase()}`);
    console.log(`🎯 Run ID: ${record.runId}`);
    console.log(`📈 Final Score: ${record.finalScore}`);
    console.log(`📝 Total Langkah: ${record.steps.length}`);
    console.log(`\nPROMPT HASIL AGENT RUN:\n${record.currentPrompt}`);
    process.exit(0);
  }

  if (experimentMode) {
    console.log(`\n🧪 MENJALANKAN SCIENTIFIC PAIRED EXPERIMENT (B0..B4)...`);
    const runner = new ScientificExperimentRunner({
      fastDeterministicMode: true,
    });
    const sampleDataset: any = {
      datasetId: "ds-benchmark-v1",
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      sha256Hash: "hash-benchmark-test-01",
      testCases: [
        {
          id: "tc-01",
          domain: "software_engineering",
          prompt: prompt || "Buat sistem website e-commerce dengan stok barang dan audit log.",
          hardConstraints: ["Jangan buat POS"],
          split: "holdout",
        },
      ],
    };
    const report = await runner.runPairedPromptExperiment({
      dataset: sampleDataset,
      split: "holdout",
      ownerId: "user-cli",
      fastDeterministicMode: true,
    });
    if (jsonOutput) {
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    }
    console.log(`🏆 Winner Baseline: ${report.winnerBaseline}`);
    console.log(`🔒 Immutable Artifact SHA-256: ${report.immutableArtifactSha256}`);
    for (const b of report.baselinesEvaluated) {
      const m = report.aggregateMetrics[b];
      if (m) {
        console.log(` • ${b}: Avg Score ${m.averageScore} | Passed ${m.passedCases}/${m.totalCases} | Gate Failed ${m.gateFailedCases}`);
      }
    }
    process.exit(0);
  }

  if (testConnectorTarget) {
    console.log(`\n⚡ Menguji koneksi & discover tools untuk connector: "${testConnectorTarget}"...`);
    const result = await testAndDiscoverMcpConnector(testConnectorTarget);

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    }

    const icon = result.ok ? "✅" : "❌";
    console.log(`${icon} Hasil Pengujian & Discovery:`);
    console.log(`   Status     : ${result.connectionStatus.toUpperCase()}`);
    console.log(`   Latensi    : ${result.latencyMs}ms`);
    console.log(`   Pesan      : ${result.message}`);
    if (result.discoveredTools.length > 0) {
      console.log(`   Tools Ditemukan (${result.discoveredTools.length}):`);
      for (const t of result.discoveredTools) {
        const mutBadge = t.isMutating ? "[MUTATING - Wajib Approval]" : "[READ-ONLY - Auto Pass]";
        console.log(`     • ${t.name}: ${t.description || "(Tanpa deskripsi)"} ${mutBadge}`);
      }
    }
    if (result.discoveredResources.length > 0) {
      console.log(`   Resources Ditemukan (${result.discoveredResources.length}):`);
      for (const r of result.discoveredResources) {
        console.log(`     • ${r.name} (${r.uri})`);
      }
    }
    process.exit(result.ok ? 0 : 1);
  }

  if (auditMode) {
    if (!sessionTarget) {
      console.error("❌ Error: Opsi --session=<sessionId> wajib diberikan untuk menjalankan audit fisik.");
      process.exit(1);
    }
    const session = getProjectSession(sessionTarget);
    if (!session) {
      console.error(`❌ Error: Sesi proyek "${sessionTarget}" tidak ditemukan pada penyimpanan lokal.`);
      process.exit(1);
    }
    const phaseIdx = phaseTarget !== undefined ? phaseTarget : session.currentPhaseIndex;
    const currentPhase = session.phases[phaseIdx];
    if (!currentPhase) {
      console.error(`❌ Error: Fase indeks ${phaseIdx} tidak valid pada sesi ${sessionTarget}.`);
      process.exit(1);
    }

    console.log(`\n🔍 MENJALANKAN AUDIT FISIK EMPIRIS (PIEW SUPERVISOR)...`);
    console.log(`Sesi: ${session.sessionId} | Fase: ${currentPhase.phaseId} (${currentPhase.title})`);
    console.log(`Workspace: ${process.cwd()}\n`);

    const executionResult = runAutonomousEmpiricalAudit(
      {
        sessionId: session.sessionId,
        phaseIndex: phaseIdx,
        summaryOfWork: `Audit fisik dipicu via CLI pada direktori kerja ${process.cwd()}`,
        deliveredArtifacts: currentPhase.requiredDeliverables.map((d) => ({
          name: d,
          type: "artifact",
        })),
        verificationOutput: "Audit fisik diinisiasi secara independen oleh PIEW CLI runner.",
        workingDirectory: process.cwd(),
      },
      {
        workingDirectory: process.cwd(),
        buildCommand: buildCmdTarget || "npm run build",
        testCommand: testCmdTarget,
        maxRetriesPerPhase: 3,
        timeoutMs: 60000,
      }
    );

    if (jsonOutput) {
      console.log(JSON.stringify(executionResult, null, 2));
      process.exit(0);
    }

    const { auditResult, empiricalDetail, steeringDirective } = executionResult;
    console.log("═".repeat(68));
    console.log(`HASIL KEPUTUSAN AUDIT MUTU: ${auditResult.verdict}`);
    console.log(`Skor Kualitas: ${auditResult.score}/100 | Durasi Audit: ${empiricalDetail.auditDurationMs}ms`);
    console.log("═".repeat(68));
    console.log(`Git Diff Verified    : ${empiricalDetail.gitDiffVerified ? "YA" : "TIDAK"} (${empiricalDetail.gitChangedFiles.length} berkas berubah)`);
    console.log(`Build Exit Code      : ${empiricalDetail.terminalBuildExitCode !== null && empiricalDetail.terminalBuildExitCode !== undefined ? empiricalDetail.terminalBuildExitCode : "TIDAK DIEKSEKUSI"}`);
    console.log(`Pelanggaran Batasan  : ${empiricalDetail.negativeConstraintsViolations.length} pelanggaran`);
    console.log(`Total Cacat Terdeteksi: ${empiricalDetail.defects.length} temuan\n`);

    console.log("─".repeat(68));
    console.log("📋 DIREKTIF PENGARAHAN (STEERING PROMPT):");
    console.log("─".repeat(68));
    console.log(steeringDirective.fullSteeringPrompt);
    console.log("═".repeat(68) + "\n");
    process.exit(0);
  }

  if (!prompt) {
    console.error("❌ Error: Prompt utama wajib diberikan.");
    printUsage();
    process.exit(1);
  }

  if (superviseMode) {
    try {
      const initResult = await initAutonomousProjectAsync({
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
      if (err.stack) console.error(err.stack);
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
      const meta = (result.universalBlueprint as any).metadata;
      const modeStr = meta?.synthesisMode === "live_llm_dynamic"
        ? `🔥 Mode: LIVE LLM DYNAMIC (${meta.providerId} / ${meta.model})`
        : `⚡ Mode: DETERMINISTIC FALLBACK`;
      const mcpStr = meta?.mcpEnriched
        ? `\n   🔌 Grounding Eksternal MCP: ${meta.mcpConnectors?.join(", ")} (Tersinkronisasi)`
        : "";
      console.log(
        `📊 Domain: ${result.universalBlueprint.domain.toUpperCase()} | ` +
        `Audiens: ${result.audienceLevel} | Diagram: ${result.universalBlueprint.diagrams.length} Mermaid | ` +
        `Fase: ${result.universalBlueprint.executionPhases.length} | Latency: ${result.processingTimeMs ?? 0}ms\n` +
        `   ${modeStr}${mcpStr}`
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

async function handleIdeSetup(options: { json?: boolean } = {}) {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const workspaceRoot = path.resolve(currentDir, "..");
  const mcpServerPath = path.resolve(workspaceRoot, "scripts", "piew-mcp-server.ts");

  const homedir = os.homedir();
  const isWin = process.platform === "win32";

  const targets: Array<{
    ideName: string;
    configPath: string;
    description: string;
  }> = [];

  // 1. Cursor Global Config
  targets.push({
    ideName: "Cursor (Global User Config)",
    configPath: path.join(homedir, ".cursor", "mcp.json"),
    description: "Pengaturan MCP global Cursor di direktori profil pengguna",
  });

  // 2. Cursor Workspace Config (jika di dalam root workspace aktif)
  targets.push({
    ideName: "Cursor (Workspace Config)",
    configPath: path.join(process.cwd(), ".cursor", "mcp.json"),
    description: "Pengaturan MCP lokal direktori workspace aktif",
  });

  // 3. Claude Desktop
  if (isWin) {
    const appdata = process.env.APPDATA || path.join(homedir, "AppData", "Roaming");
    targets.push({
      ideName: "Claude Desktop (Windows)",
      configPath: path.join(appdata, "Claude", "claude_desktop_config.json"),
      description: "Pengaturan resmi Claude Desktop untuk Windows",
    });
  } else if (process.platform === "darwin") {
    targets.push({
      ideName: "Claude Desktop (macOS)",
      configPath: path.join(homedir, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
      description: "Pengaturan resmi Claude Desktop untuk macOS",
    });
  } else {
    targets.push({
      ideName: "Claude Desktop (Linux)",
      configPath: path.join(homedir, ".config", "Claude", "claude_desktop_config.json"),
      description: "Pengaturan resmi Claude Desktop untuk Linux",
    });
  }

  // 4. Windsurf
  targets.push({
    ideName: "Windsurf",
    configPath: path.join(homedir, ".codeium", "windsurf", "mcp_config.json"),
    description: "Pengaturan MCP resmi Codeium Windsurf",
  });

  const piewServerConfig = {
    command: "npx",
    args: ["-y", "tsx", mcpServerPath],
  };

  const results: Array<{
    ideName: string;
    configPath: string;
    status: "TERPASANG" | "DIPERBARUI" | "GAGAL";
    error?: string;
  }> = [];

  for (const target of targets) {
    try {
      const dir = path.dirname(target.configPath);

      // Lewati workspace jika direktori .cursor tidak ada dan cwd bukan git repo
      if (
        target.ideName.includes("Workspace") &&
        !fs.existsSync(dir) &&
        !fs.existsSync(path.join(process.cwd(), ".git"))
      ) {
        continue;
      }

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      let currentConfig: any = { mcpServers: {} };
      let existed = false;

      if (fs.existsSync(target.configPath)) {
        try {
          const raw = fs.readFileSync(target.configPath, "utf-8");
          currentConfig = JSON.parse(raw);
          existed = true;
        } catch {
          currentConfig = { mcpServers: {} };
        }
      }

      if (!currentConfig || typeof currentConfig !== "object") {
        currentConfig = { mcpServers: {} };
      }
      if (!currentConfig.mcpServers || typeof currentConfig.mcpServers !== "object") {
        currentConfig.mcpServers = {};
      }

      currentConfig.mcpServers["piew"] = piewServerConfig;

      fs.writeFileSync(target.configPath, JSON.stringify(currentConfig, null, 2), "utf-8");
      results.push({
        ideName: target.ideName,
        configPath: target.configPath,
        status: existed ? "DIPERBARUI" : "TERPASANG",
      });
    } catch (err: any) {
      results.push({
        ideName: target.ideName,
        configPath: target.configPath,
        status: "GAGAL",
        error: err.message,
      });
    }
  }

  if (options.json) {
    console.log(JSON.stringify({ success: true, results, mcpServerPath }, null, 2));
    return;
  }

  console.log("\n" + "═".repeat(68));
  console.log("⚡ PIEW 1-CLICK MCP IDE CONNECTOR SETUP");
  console.log("═".repeat(68) + "\n");
  console.log(`Path Eksekusi MCP Server: ${mcpServerPath}\n`);

  for (const res of results) {
    const badge =
      res.status === "TERPASANG"
        ? "✅ TERPASANG"
        : res.status === "DIPERBARUI"
        ? "🔄 DIPERBARUI"
        : "❌ GAGAL";
    console.log(` • [${badge}] ${res.ideName}`);
    console.log(`   File : ${res.configPath}`);
    if (res.error) console.log(`   Error: ${res.error}`);
    console.log("");
  }

  console.log("─".repeat(68));
  console.log("🛠️ Tools yang Otomatis Terhubung ke AI Agent:");
  console.log(" 1. piew_autopilot             - Orkestrator penuh: Crawl -> Spec -> Synthesize -> Spider");
  console.log(" 2. piew_synthesize_master_prompt - Sintesis prompt terstruktur tingkat tinggi");
  console.log(" 3. piew_crawl_grounding_context  - Ekstraksi referensi dokumentasi resmi");
  console.log(" 4. piew_verify_prompt_spider     - Uji ketahanan adversarial prompt 5-cabang");
  console.log(" 5. piew_init_project_supervision - Inisialisasi pengawasan otonom closed-loop");
  console.log(" 6. piew_submit_phase_work        - Validasi empiris git diff & build status");
  console.log("─".repeat(68));
  console.log("💡 Langkah Selanjutnya: Buka atau restart Cursor/Claude Desktop Anda.");
  console.log("   AI Agent Anda sekarang dapat langsung memanggil perkakas PIEW secara mandiri.\n");
}

main();
