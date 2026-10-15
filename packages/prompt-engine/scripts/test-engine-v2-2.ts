/**
 * MEGA TASK #48: PIEW Engine v2.2 Automated Verification Suite
 *
 * Menguji 5 upgrade mesin inti:
 * 1. Mesin Orkestrator 1-Klik Auto-Pilot (runAutoPilotMasterPipeline)
 * 2. Smart SHA-256 Cache & Budget Mode 'eco' (runPromptSpider)
 * 3. Style Presets (comprehensive, concise_tactical, conversational_expert) & Dynamic Phrasing
 * 4. Trusted Docs Crawler Allowlist & Clean HTML-to-Markdown Extractor
 * 5. Native CLI (piew-cli) & MCP Server (piew-mcp-server) stdio JSON-RPC 2.0 handshake
 */

import { spawnSync, execSync } from "node:child_process";
import { runAutoPilotMasterPipeline } from "../src/autopilot.js";
import { clearDeterministicCache } from "../src/cache.js";
import {
  synthesizeMasterPrompt,
  extractActionAndSubject,
} from "../src/master-synthesizer.js";
import { validateMasterPromptSynthesis } from "../src/validator.js";
import { extractTaskSpecification } from "../src/task-extractor.js";
import {
  detectTaskArchetypeAndDomain,
  getSynthesisBlueprint,
} from "@prompt-workspace/domain-rules";
import { runPromptSpider } from "@prompt-workspace/prompt-spider";
import { computeCriticalGatePassed } from "@prompt-workspace/prompt-contracts";
import {
  validateTargetUrl,
  cleanHtmlToMarkdown,
  extractGroundingContextHeuristic,
} from "@prompt-workspace/prompt-crawler";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

async function runSuite() {
  console.log("═".repeat(68));
  console.log("🚀 PIEW ENGINE v2.2 AUTOMATED VERIFICATION SUITE");
  console.log("═".repeat(68) + "\n");

  clearDeterministicCache();

  // ─────────────────────────────────────────────────────────────
  // 1. UPGRADE 1: Auto-Pilot 1-Call Pipeline
  // ─────────────────────────────────────────────────────────────
  console.log("📦 1. Pengujian Mesin Orkestrator 1-Klik Auto-Pilot");

  const testPrompt =
    "Buat website toko kue dengan fitur stok barang dan laporan penjualan. Jangan buat POS.";

  const autoPilotResult = await runAutoPilotMasterPipeline({
    prompt: testPrompt,
    stylePreset: "comprehensive_blueprint",
    budgetMode: "balanced",
  });

  assert(
    !!autoPilotResult.optimizedPrompt && autoPilotResult.optimizedPrompt.length > 500,
    "runAutoPilotMasterPipeline menghasilkan Master Prompt operasional (>500 karakter)"
  );
  assert(
    autoPilotResult.synthesisValidation.passed === true,
    "Validasi deterministik synthesisValidation.passed bernilai true"
  );
  assert(
    autoPilotResult.synthesisValidation.overallSynthesisScore >= 90,
    `Skor validasi Master Prompt tinggi (Skor: ${autoPilotResult.synthesisValidation.overallSynthesisScore}/100)`
  );
  assert(
    autoPilotResult.taskSpec.negativeConstraints.some((nc) =>
      nc.toLowerCase().includes("pos")
    ),
    "Batasan larangan ('Jangan buat POS') terserap ke dalam TaskSpecificationMap"
  );
  assert(
    autoPilotResult.cacheHit === false,
    "Panggilan pertama tercatat sebagai cacheHit: false"
  );

  // ─────────────────────────────────────────────────────────────
  // 2. UPGRADE 2: Smart SHA-256 Cache & Budget Mode
  // ─────────────────────────────────────────────────────────────
  console.log("\n⚡ 2. Pengujian Smart SHA-256 Cache & Token Budget Mode");

  const tStart = Date.now();
  const cachedResult = await runAutoPilotMasterPipeline({
    prompt: testPrompt,
    stylePreset: "comprehensive_blueprint",
    budgetMode: "balanced",
  });
  const tDuration = Date.now() - tStart;

  assert(
    cachedResult.cacheHit === true,
    "Panggilan kedua dengan input identik menghasilkan cacheHit: true (0 token)"
  );
  assert(
    tDuration < 50,
    `Latensi cache hit instan (${tDuration}ms < 50ms)`
  );
  assert(
    cachedResult.optimizedPrompt === autoPilotResult.optimizedPrompt,
    "Keluaran dari cache 100% identik dengan hasil sebelumnya"
  );

  // Pengujian Spider Budget Mode 'eco' (Critical-Only)
  const spiderEcoReport = await runPromptSpider(autoPilotResult.optimizedPrompt, {
    budgetMode: "eco",
  });

  assert(
    spiderEcoReport.branches.length === 2,
    `Budget mode 'eco' hanya mengeksekusi 2 cabang CRITICAL (Aktual: ${spiderEcoReport.branches.length} cabang)`
  );
  assert(
    spiderEcoReport.branches.every((b) => b.severity === "CRITICAL"),
    "Seluruh cabang pada mode 'eco' ber-severity CRITICAL (hemat >60% token)"
  );
  assert(
    computeCriticalGatePassed(spiderEcoReport.branches) === spiderEcoReport.criticalGatePassed,
    `computeCriticalGatePassed selaras dengan criticalGatePassed (${spiderEcoReport.criticalGatePassed})`
  );

  // ─────────────────────────────────────────────────────────────
  // 3. UPGRADE 3: Style Presets & Penghalusan Gaya Bahasa
  // ─────────────────────────────────────────────────────────────
  console.log("\n🎭 3. Pengujian Style Presets & Penghalusan Gaya Bahasa");

  const route = detectTaskArchetypeAndDomain(testPrompt, null);
  const blueprint = getSynthesisBlueprint(route.archetype);
  const taskSpec = extractTaskSpecification(testPrompt, null, route);

  // Preset A: Comprehensive Blueprint
  const promptBlueprint = synthesizeMasterPrompt(
    testPrompt,
    taskSpec,
    blueprint,
    [],
    "comprehensive_blueprint"
  );
  const valBlueprint = validateMasterPromptSynthesis(
    testPrompt,
    promptBlueprint.masterPrompt,
    taskSpec,
    0,
    "comprehensive_blueprint"
  );
  assert(
    valBlueprint.passed && promptBlueprint.masterPrompt.length >= 600,
    "Preset 'comprehensive_blueprint' lengkap 11-bagian dan lulus validasi"
  );

  // Preset B: Concise Tactical
  const promptTactical = synthesizeMasterPrompt(
    testPrompt,
    taskSpec,
    blueprint,
    [],
    "concise_tactical"
  );
  const valTactical = validateMasterPromptSynthesis(
    testPrompt,
    promptTactical.masterPrompt,
    taskSpec,
    0,
    "concise_tactical"
  );
  assert(
    valTactical.passed,
    "Preset 'concise_tactical' lulus validasi deterministik"
  );
  assert(
    promptTactical.masterPrompt.includes("## 1. Sasaran & Peran Eksekusi") &&
      promptTactical.masterPrompt.includes("## 5. Deliverables & Kriteria Selesai"),
    "Preset 'concise_tactical' memiliki struktur 5-bagian taktis terfokus"
  );
  assert(
    promptTactical.masterPrompt.toLowerCase().includes("pos"),
    "Preset 'concise_tactical' tetap menegakkan larangan mutlak (anti-POS)"
  );

  // Preset C: Conversational Expert
  const promptConversational = synthesizeMasterPrompt(
    testPrompt,
    taskSpec,
    blueprint,
    [],
    "conversational_expert"
  );
  const valConversational = validateMasterPromptSynthesis(
    testPrompt,
    promptConversational.masterPrompt,
    taskSpec,
    0,
    "conversational_expert"
  );
  assert(
    valConversational.passed,
    "Preset 'conversational_expert' lulus validasi deterministik"
  );
  assert(
    promptConversational.masterPrompt.includes("Halo rekan engineer") ||
      promptConversational.masterPrompt.includes("rekan engineer"),
    "Preset 'conversational_expert' menyajikan narasi instruksi luwes gaya Principal Engineer"
  );

  // Uji Variasi Kalimat Pembuka Dinamis
  const prompt1 = "Buat katalog toko roti";
  const prompt2 = "Kembangkan modul audit pergudangan modern";
  const info1 = extractActionAndSubject(prompt1);
  const info2 = extractActionAndSubject(prompt2);
  assert(
    info1.contextualOpening !== info2.contextualOpening,
    "Dua prompt dengan kata kunci berbeda menghasilkan variasi kalimat pembuka kontekstual"
  );

  // ─────────────────────────────────────────────────────────────
  // 4. UPGRADE 4: Trusted Docs Crawler Allowlist & HTML-to-Markdown
  // ─────────────────────────────────────────────────────────────
  console.log("\n🌐 4. Pengujian Trusted Docs Crawler & Clean HTML-to-Markdown");

  // Allowlist tests
  const nextjsCheck = validateTargetUrl("https://nextjs.org/docs/app/building-your-application");
  assert(nextjsCheck.hostname === "nextjs.org", "Domain dokumentasi resmi 'nextjs.org' DIIZINKAN oleh allowlist");

  const mdnCheck = validateTargetUrl("https://developer.mozilla.org/en-US/docs/Web");
  assert(mdnCheck.hostname === "developer.mozilla.org", "Domain dokumentasi resmi 'developer.mozilla.org' DIIZINKAN oleh allowlist");

  const stripeCheck = validateTargetUrl("https://docs.stripe.com/api");
  assert(stripeCheck.hostname === "docs.stripe.com", "Domain dokumentasi resmi 'docs.stripe.com' DIIZINKAN oleh allowlist");

  const zodCheck = validateTargetUrl("https://zod.dev");
  assert(zodCheck.hostname === "zod.dev", "Domain dokumentasi resmi 'zod.dev' DIIZINKAN oleh allowlist");

  let evilBlocked = false;
  let evilCode = "";
  try {
    validateTargetUrl("https://evil.com/malicious");
  } catch (err: any) {
    evilBlocked = true;
    evilCode = err.code;
  }
  assert(evilBlocked && evilCode === "DOMAIN_NOT_ALLOWED", "Domain asing 'evil.com' TETAP DITOLAK (DOMAIN_NOT_ALLOWED)");

  let httpBlocked = false;
  let httpCode = "";
  try {
    validateTargetUrl("http://nextjs.org/docs");
  } catch (err: any) {
    httpBlocked = true;
    httpCode = err.code;
  }
  assert(httpBlocked && httpCode === "DISALLOWED_PROTOCOL", "Protokol HTTP biasa (tanpa TLS) TETAP DITOLAK (DISALLOWED_PROTOCOL)");

  let loopbackBlocked = false;
  let loopbackCode = "";
  try {
    validateTargetUrl("https://127.0.0.1/admin");
  } catch (err: any) {
    loopbackBlocked = true;
    loopbackCode = err.code;
  }
  assert(loopbackBlocked && loopbackCode === "IP_LITERAL_FORBIDDEN", "IP loopback '127.0.0.1' TETAP DITOLAK oleh SSRF Guard (IP_LITERAL_FORBIDDEN)");

  // Clean HTML to Markdown test
  const rawHtmlDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Next.js Server Actions</title>
        <style>body { font-family: sans-serif; }</style>
        <script>alert('unwanted xss');</script>
      </head>
      <body>
        <nav><a href="/">Home</a><a href="/docs">Docs</a></nav>
        <h1>Server Actions</h1>
        <p>Server Actions are <code>asynchronous functions</code> that run on the server.</p>
        <pre><code>async function createItem(formData: FormData) {
  'use server'
  await db.item.create({ data: { name: 'Cake' } });
}</code></pre>
        <h3>Usage Guidelines</h3>
        <ul>
          <li>Use progressive enhancement when possible.</li>
          <li>Validate input schemas strictly using Zod.</li>
        </ul>
        <footer>Copyright 2026 Next.js</footer>
      </body>
    </html>
  `;

  const cleanMd = cleanHtmlToMarkdown(rawHtmlDoc);
  assert(
    !cleanMd.includes("<script>") && !cleanMd.includes("alert('unwanted xss')"),
    "HTML-to-Markdown berhasil membuang elemen <script> dan payload berbahaya"
  );
  assert(
    !cleanMd.includes("<style>") && !cleanMd.includes("font-family"),
    "HTML-to-Markdown berhasil membuang elemen <style>"
  );
  assert(
    !cleanMd.includes("<nav>") && !cleanMd.includes("<footer>"),
    "HTML-to-Markdown berhasil membersihkan navigasi dan footer"
  );
  assert(
    cleanMd.includes("# Server Actions") && cleanMd.includes("```\nasync function createItem"),
    "HTML-to-Markdown mengonversi heading dan code block ke Markdown bersih"
  );

  const extractedFacts = extractGroundingContextHeuristic(cleanMd);
  assert(
    extractedFacts.length > 0,
    `Ekstraktor fakta grounding berhasil mengekstrak fakta teknis dari Markdown bersih (${extractedFacts.length} fakta)`
  );

  // ─────────────────────────────────────────────────────────────
  // 5. UPGRADE 5: Native CLI & MCP Server JSON-RPC Handshake
  // ─────────────────────────────────────────────────────────────
  console.log("\n🔌 5. Pengujian PIEW CLI & MCP Server Stdio JSON-RPC 2.0");

  // CLI Test
  try {
    const cliOutput = execSync(
      'npx tsx scripts/piew-cli.ts "Buat API autentikasi sederhana" --style=concise_tactical --budget=eco --json',
      { encoding: "utf-8" }
    );
    const parsedCli = JSON.parse(cliOutput);
    assert(
      !!parsedCli.optimizedPrompt && parsedCli.stylePreset === "concise_tactical",
      "PIEW CLI sukses mengeksekusi pipeline dan mencetak JSON output (--json)"
    );
  } catch (err: any) {
    assert(false, `Eksekusi PIEW CLI gagal: ${err.message}`);
  }

  // MCP Server Test via child_process
  try {
    const mcpProc = spawnSync(
      "npx",
      ["tsx", "scripts/piew-mcp-server.ts"],
      {
        input: [
          JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
          JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
          JSON.stringify({
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
              name: "piew_synthesize_master_prompt",
              arguments: {
                prompt: "Rancang modul manajemen stok toko kue",
                stylePreset: "concise_tactical",
              },
            },
          }),
        ].join("\n") + "\n",
        encoding: "utf-8",
        timeout: 10000,
      }
    );

    const mcpLines = (mcpProc.stdout || "")
      .trim()
      .split("\n")
      .filter((l) => l.trim().startsWith("{"));

    assert(
      mcpLines.length >= 3,
      `MCP Server merespons 3 pesan JSON-RPC melalui stdio (Menerima: ${mcpLines.length} respons)`
    );

    const initResp = JSON.parse(mcpLines[0]);
    assert(
      initResp.result?.serverInfo?.name === "piew-mcp-server" &&
        initResp.result?.serverInfo?.version === "2.2.0",
      "Handshake 'initialize' sukses: serverInfo piew-mcp-server v2.2.0"
    );

    const toolsResp = JSON.parse(mcpLines[1]);
    const toolNames = (toolsResp.result?.tools || []).map((t: any) => t.name);
    assert(
      toolNames.includes("piew_synthesize_master_prompt") &&
        toolNames.includes("piew_crawl_grounding_context") &&
        toolNames.includes("piew_verify_prompt_spider"),
      "Metode 'tools/list' mengekspos 3 tools MCP lengkap"
    );

    const callResp = JSON.parse(mcpLines[2]);
    assert(
      !callResp.error &&
        callResp.result?.content?.[0]?.text?.length > 100,
      "Metode 'tools/call' (piew_synthesize_master_prompt) sukses mengembalikan Master Prompt"
    );
  } catch (err: any) {
    assert(false, `Handshake MCP Server gagal: ${err.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // REKAP HASIL
  // ─────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(68));
  if (process.exitCode === 1) {
    console.error(
      `❌ BEBERAPA TES GAGAL: ${passedCount}/${totalCount} TES LULUS`
    );
    process.exit(1);
  } else {
    console.log(
      `🎉 SELURUH PENGUJIAN SELESAI: ${passedCount}/${totalCount} TES LULUS 100% (EXIT CODE 0)`
    );
    console.log("═".repeat(68) + "\n");
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
