/**
 * Test Suite: Open-Source Readiness & Multi-Platform Integration
 *
 * Menguji:
 * 1. Windows CRLF sanitization pada stdio JSON-RPC (mencegah crash \r\n di Windows CMD/PowerShell)
 * 2. Ekspos 4 MCP tools lengkap termasuk piew_autopilot 1-klik
 * 3. Eksekusi tool piew_autopilot via JSON-RPC stdio
 * 4. Dynamic Allowlist pada Crawler via PIEW_ALLOWED_DOMAINS & SSRF Guard
 * 5. Pemuatan konfigurasi modular loadPiewConfig & default overrides
 * 6. Transport HTTP/SSE Server (endpoint handshake, session ID, dan POST dispatch over SSE)
 */

import { spawnSync, spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import {
  loadPiewConfig,
  runAutoPilotMasterPipeline,
} from "@prompt-workspace/prompt-engine";
import {
  getAllowedDomains,
  validateTargetUrl,
  CrawlerSecurityError,
} from "@prompt-workspace/prompt-crawler";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failedCount++;
  }
}

function testWindowsCrlfAndMcpTools() {
  console.log("\n🪟 1. Pengujian Windows CRLF Sanitasi & MCP Stdio Handshake");

  // Kirim 3 pesan berformat Windows CRLF (\r\n) sekaligus
  const inputPayload =
    [
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2024-11-05" },
      }),
      JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      }),
      JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "piew_autopilot",
          arguments: {
            prompt: "Buat fitur ringkasan pesanan toko kue",
            stylePreset: "concise_tactical",
            budgetMode: "eco",
          },
        },
      }),
    ].join("\r\n") + "\r\n";

  const mcpProc = spawnSync("npx", ["tsx", "scripts/piew-mcp-server.ts"], {
    input: inputPayload,
    encoding: "utf-8",
    timeout: 15000,
  });

  const lines = (mcpProc.stdout || "")
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{"));

  assert(
    lines.length >= 3,
    `Server merespons seluruh 3 pesan JSON-RPC dengan CRLF (Menerima: ${lines.length})`
  );

  const responses = lines.map((l) => JSON.parse(l));

  const initRes = responses.find((r) => r.id === 1);
  assert(
    initRes?.result?.serverInfo?.name === "piew-mcp-server" &&
      initRes?.result?.serverInfo?.version === "2.2.0",
    "Handshake initialize sukses dengan serverInfo v2.2.0"
  );

  const listRes = responses.find((r) => r.id === 2);
  const toolNames = (listRes?.result?.tools || []).map((t: any) => t.name);
  assert(
    toolNames.includes("piew_autopilot"),
    "MCP Server mengekspos tool 'piew_autopilot'"
  );
  assert(
    toolNames.includes("piew_synthesize_master_prompt"),
    "MCP Server mengekspos tool 'piew_synthesize_master_prompt'"
  );
  assert(
    toolNames.includes("piew_crawl_grounding_context"),
    "MCP Server mengekspos tool 'piew_crawl_grounding_context'"
  );
  assert(
    toolNames.includes("piew_verify_prompt_spider"),
    "MCP Server mengekspos tool 'piew_verify_prompt_spider'"
  );

  const callRes = responses.find((r) => r.id === 3);
  assert(
    !callRes?.error && callRes?.result?.content?.[0]?.text?.length > 100,
    "Pemanggilan tool 'piew_autopilot' mengembalikan Master Prompt valid via stdio"
  );
}

function testCrawlerDynamicAllowlist() {
  console.log("\n🌐 2. Pengujian Dynamic Allowlist & SSRF Defense in Depth");

  // Default allowed domain
  const defaultAllowed = getAllowedDomains();
  assert(
    defaultAllowed.includes("nextjs.org"),
    "Domain terkurasi bawaan (nextjs.org) otomatis diizinkan"
  );

  // Uji penambahan domain via custom parameter / env
  const withCustom = getAllowedDomains(["internal-docs.mycompany.com"]);
  assert(
    withCustom.includes("internal-docs.mycompany.com"),
    "Custom domain dapat ditambahkan secara aman ke allowlist"
  );

  // Validasi URL dengan custom domain sukses
  const validCustomUrl = validateTargetUrl(
    "https://internal-docs.mycompany.com/api/v1",
    ["internal-docs.mycompany.com"]
  );
  assert(
    validCustomUrl.hostname === "internal-docs.mycompany.com",
    "validateTargetUrl menerima domain kustom yang terdaftar"
  );

  // Domain tidak terdaftar tetap diblokir
  let blocked = false;
  try {
    validateTargetUrl("https://unauthorized-evil-domain.com/hack");
  } catch (err: any) {
    if (err instanceof CrawlerSecurityError && err.code === "DOMAIN_NOT_ALLOWED") {
      blocked = true;
    }
  }
  assert(blocked, "Domain tidak terdaftar tetap diblokir dengan DOMAIN_NOT_ALLOWED");

  // Skema non-HTTPS tetap diblokir meski domainnya diizinkan
  let httpBlocked = false;
  try {
    validateTargetUrl("http://internal-docs.mycompany.com/plain", [
      "internal-docs.mycompany.com",
    ]);
  } catch (err: any) {
    if (err instanceof CrawlerSecurityError && err.code === "DISALLOWED_PROTOCOL") {
      httpBlocked = true;
    }
  }
  assert(httpBlocked, "Skema HTTP polos tetap diblokir demi keamanan data");
}

function testModularConfiguration() {
  console.log("\n⚙️ 3. Pengujian Pemuatan Konfigurasi (loadPiewConfig)");

  const defaultConfig = loadPiewConfig();
  assert(
    defaultConfig.defaultStylePreset === "comprehensive_blueprint",
    "Default style preset adalah 'comprehensive_blueprint'"
  );
  assert(
    defaultConfig.defaultBudgetMode === "balanced",
    "Default budget mode adalah 'balanced'"
  );

  // Uji pembuatan file konfigurasi sementara
  const tempConfigPath = path.resolve(process.cwd(), "temp-test.piew.config.json");
  fs.writeFileSync(
    tempConfigPath,
    JSON.stringify({
      defaultStylePreset: "concise_tactical",
      defaultBudgetMode: "eco",
      allowedDomains: ["docs.acme.corp"],
    })
  );

  try {
    const loaded = loadPiewConfig(tempConfigPath);
    assert(
      loaded.defaultStylePreset === "concise_tactical",
      "loadPiewConfig sukses membaca override style preset dari config file"
    );
    assert(
      loaded.defaultBudgetMode === "eco",
      "loadPiewConfig sukses membaca override budget mode dari config file"
    );
    assert(
      loaded.allowedDomains.includes("docs.acme.corp"),
      "loadPiewConfig sukses membaca allowedDomains kustom"
    );
  } finally {
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath);
    }
  }
}

async function testHttpSseTransport() {
  console.log("\n🔌 4. Pengujian Transport HTTP/SSE (Cursor Remote Connection)");

  const TEST_PORT = 3200 + Math.floor(Math.random() * 200);
  const mcpServer = spawn(
    "npx",
    ["tsx", "scripts/piew-mcp-server.ts", `--port=${TEST_PORT}`, "--sse-only"],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  // Poll server readiness
  let isReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${TEST_PORT}/health`, (res) => {
          if (res.statusCode === 200) {
            isReady = true;
            resolve();
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        });
        req.on("error", reject);
      });
      if (isReady) break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  assert(isReady, `Server HTTP/SSE berhasil online di port ${TEST_PORT}`);

  try {
    // 1. Cek GET /health
    const healthData = await new Promise<any>((resolve, reject) => {
      http.get(`http://127.0.0.1:${TEST_PORT}/health`, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(JSON.parse(body)));
      }).on("error", reject);
    });

    assert(
      healthData.status === "ok" && healthData.toolsCount === 4,
      `GET /health mengembalikan status ok dengan 4 tools aktif`
    );

    // 2. Hubungkan ke SSE stream GET /sse
    let sessionId = "";
    const sseMessages: any[] = [];

    const sseReq = http.request(
      `http://127.0.0.1:${TEST_PORT}/sse`,
      { headers: { Accept: "text/event-stream" } },
      (res) => {
        res.on("data", (chunk) => {
          const text = chunk.toString();
          if (text.includes("event: endpoint")) {
            const match = text.match(/sessionId=([a-f0-9-]+)/);
            if (match) {
              sessionId = match[1];
            }
          }
          if (text.includes("event: message")) {
            const dataLine = text.split("\n").find((l) => l.startsWith("data: "));
            if (dataLine) {
              try {
                sseMessages.push(JSON.parse(dataLine.slice(6)));
              } catch {
                // ignore
              }
            }
          }
        });
      }
    );
    sseReq.end();

    // Tunggu sessionId diterima
    for (let i = 0; i < 40; i++) {
      if (sessionId) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    assert(Boolean(sessionId), `Handshake SSE berhasil menerima sessionId: ${sessionId}`);

    // 3. Kirim POST /message?sessionId=...
    const postPayload = JSON.stringify({
      jsonrpc: "2.0",
      id: 99,
      method: "tools/list",
    });

    await new Promise<void>((resolve, reject) => {
      const postReq = http.request(
        `http://127.0.0.1:${TEST_PORT}/message?sessionId=${sessionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postPayload),
          },
        },
        (res) => {
          assert(
            res.statusCode === 202,
            `POST /message diterima oleh server (Status 202 Accepted)`
          );
          resolve();
        }
      );
      postReq.on("error", reject);
      postReq.write(postPayload);
      postReq.end();
    });

    // Tunggu SSE response message
    for (let i = 0; i < 40; i++) {
      if (sseMessages.find((m) => m.id === 99)) break;
      await new Promise((r) => setTimeout(r, 50));
    }

    const sseResult = sseMessages.find((m) => m.id === 99);
    assert(
      sseResult?.result?.tools?.length === 4,
      `Hasil tools/list berhasil ditransmisikan kembali melalui SSE stream`
    );

    sseReq.destroy();
  } finally {
    mcpServer.kill();
  }
}

async function runAll() {
  console.log("═".repeat(68));
  console.log("🌐 PIEW OPEN-SOURCE READINESS & INTEGRATION SUITE");
  console.log("═".repeat(68));

  try {
    testWindowsCrlfAndMcpTools();
    testCrawlerDynamicAllowlist();
    testModularConfiguration();
    await testHttpSseTransport();

    console.log("\n" + "═".repeat(68));
    if (failedCount === 0) {
      console.log(
        `🎉 SELURUH PENGUJIAN OPEN-SOURCE SUKSES: ${passedCount}/${passedCount} LULUS 100%!`
      );
      console.log("═".repeat(68) + "\n");
      process.exit(0);
    } else {
      console.error(
        `❌ TERDAPAT KEGAGALAN: ${failedCount} gagal, ${passedCount} lulus.`
      );
      process.exit(1);
    }
  } catch (err: any) {
    console.error("❌ Exception during test suite:", err);
    process.exit(1);
  }
}

runAll();