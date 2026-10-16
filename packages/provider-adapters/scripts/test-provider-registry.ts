#!/usr/bin/env node
/**
 * Test Suite: Multi-Provider & Custom Endpoints Registry
 *
 * Menguji:
 * 1. CRUD Custom Endpoints (lyra-pc & local-vision), slug generator, perilaku "Leave blank to keep current key"
 * 2. Ke-4 apiMode (auto_detect, chat_completions, responses_api, anthropic_messages)
 * 3. discoverEndpointModels & testProviderConnection pada mock server lokal
 * 4. Zero Secret Leakage (Jaminan keamanan kredensial tidak pernah bocor)
 */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

import {
  slugifyProviderName,
  isLocalEndpointUrl,
  listCustomEndpoints,
  getCustomEndpoint,
  saveCustomEndpoint,
  deleteCustomEndpoint,
  listCatalogProviders,
  CustomEndpointAdapter,
  discoverEndpointModels,
  testProviderConnection,
} from "../src/index.js";

async function runTestSuite() {
  console.log("===============================================================");
  console.log("🧪 PIEW TEST SUITE: MULTI-PROVIDER & CUSTOM ENDPOINTS REGISTRY");
  console.log("===============================================================\n");

  const testStoreDir = path.join(os.tmpdir(), `piew-test-reg-${Date.now()}`);
  await fs.mkdir(testStoreDir, { recursive: true });
  const testStorePath = path.join(testStoreDir, "providers.json");

  let mockServer: http.Server | null = null;
  let mockPort = 0;
  let mockBaseUrl = "";

  try {
    // ─────────────────────────────────────────────────────────────
    // [TEST 1] SLUG GENERATOR & LOCAL URL DETECTOR
    // ─────────────────────────────────────────────────────────────
    console.log("▶ [TEST 1] Menguji Slug Generator & Deteksi Local/Private URL...");

    assert.equal(slugifyProviderName("lyra pc"), "lyra-pc");
    assert.equal(slugifyProviderName("local vision"), "local-vision");
    assert.equal(slugifyProviderName("  OpenAI Compatible (vLLM)  "), "openai-compatible-vllm");
    assert.equal(slugifyProviderName("Private_Cluster! #99"), "private-cluster-99");

    assert.equal(isLocalEndpointUrl("http://localhost:11434/v1"), true);
    assert.equal(isLocalEndpointUrl("http://127.0.0.1:20128/v1"), true);
    assert.equal(isLocalEndpointUrl("http://100.127.180.57:20128/v1"), true); // Tailscale IP
    assert.equal(isLocalEndpointUrl("http://192.168.1.100:8000/v1"), true);
    assert.equal(isLocalEndpointUrl("https://api.groq.com/openai/v1"), false);
    assert.equal(isLocalEndpointUrl("https://api.anthropic.com/v1"), false);

    console.log("  ✅ Slug generator & URL detector: PASS\n");

    // ─────────────────────────────────────────────────────────────
    // [TEST 2] CRUD CUSTOM ENDPOINTS & "LEAVE BLANK TO KEEP CURRENT KEY"
    // ─────────────────────────────────────────────────────────────
    console.log("▶ [TEST 2] Menguji CRUD Custom Endpoints & Retensi Kunci...");

    const initialSecretKey = "sk-super-secret-production-key-998877";

    // 2a. Create Lyra PC endpoint
    const createdLyra = await saveCustomEndpoint(
      {
        name: "lyra pc",
        endpointUrl: "http://100.127.180.57:20128/v1",
        apiMode: "chat_completions",
        defaultModel: "hermes-agent",
        apiKey: initialSecretKey,
        envKeyRef: "${HERMES_CUSTOM_LYRA_PC_API_KEY}",
        useForNewChats: true,
        discoverModels: true,
      },
      { storePath: testStorePath }
    );

    assert.equal(createdLyra.name, "lyra pc");
    assert.equal(createdLyra.providerId, "lyra-pc");
    assert.equal(createdLyra.isLocal, true);
    assert.equal(createdLyra.hasSavedKey, true);
    assert.equal((createdLyra as any).apiKey, undefined, "Plaintext apiKey tidak boleh ada di return config!");

    // 2b. Create Local Vision endpoint
    const createdVision = await saveCustomEndpoint(
      {
        name: "local vision",
        endpointUrl: "http://127.0.0.1:11434/v1",
        apiMode: "chat_completions",
        defaultModel: "minicpm-v",
        useForNewChats: false,
        discoverModels: false,
      },
      { storePath: testStorePath }
    );

    assert.equal(createdVision.name, "local vision");
    assert.equal(createdVision.providerId, "local-vision");
    assert.equal(createdVision.isLocal, true);
    assert.equal(createdVision.hasSavedKey, false);

    // 2c. Verify List
    const listBefore = await listCustomEndpoints({ storePath: testStorePath });
    assert.equal(listBefore.length, 2);

    // 2d. Update Lyra PC: Leave blank to keep current key
    const updatedLyra = await saveCustomEndpoint(
      {
        id: createdLyra.id,
        name: "Lyra PC Workstation",
        endpointUrl: "http://100.127.180.57:20128/v1",
        defaultModel: "hermes-agent-v2",
        apiKey: "", // Leave blank to keep current key!
      },
      { storePath: testStorePath }
    );

    assert.equal(updatedLyra.name, "Lyra PC Workstation");
    assert.equal(updatedLyra.defaultModel, "hermes-agent-v2");
    assert.equal(updatedLyra.hasSavedKey, true, "Kunci lama harus dipertahankan!");

    // Verify key in internal store is still intact
    const internalList = await listCustomEndpoints({ includeSecrets: true, storePath: testStorePath });
    const lyraRecord = internalList.find((r: any) => r.id === createdLyra.id) as any;
    assert.equal(lyraRecord.savedApiKey, initialSecretKey, "Kunci rahasia asli wajib tetap utuh di internal storage!");

    // 2e. Delete Local Vision
    const deleted = await deleteCustomEndpoint(createdVision.id, { storePath: testStorePath });
    assert.equal(deleted, true);

    const listAfter = await listCustomEndpoints({ storePath: testStorePath });
    assert.equal(listAfter.length, 1);
    assert.equal(listAfter[0].id, createdLyra.id);

    console.log("  ✅ CRUD custom endpoints & 'Leave blank to keep key': PASS\n");

    // ─────────────────────────────────────────────────────────────
    // [TEST 3] SETUP MOCK HTTP SERVER UNTUK 4 API MODES & DISCOVERY
    // ─────────────────────────────────────────────────────────────
    console.log("▶ [TEST 3] Menyiapkan Mock HTTP Server untuk Pengujian 4 API Mode...");

    const capturedAuthHeaders: string[] = [];
    const capturedAnthropicHeaders: Record<string, string>[] = [];

    mockServer = http.createServer((req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      const method = req.method;

      if (req.headers.authorization) {
        capturedAuthHeaders.push(req.headers.authorization);
      }

      if (url.pathname === "/v1/models" && method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            data: [
              { id: "hermes-agent" },
              { id: "qwen-2.5-coder" },
              { id: "llama-3.3-70b" },
            ],
          })
        );
        return;
      }

      if (url.pathname === "/v1/chat/completions" && method === "POST") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const parsed = JSON.parse(body || "{}");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: "chatcmpl-mock-123",
              model: parsed.model || "mock-model",
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: "Respons sukses dari chat_completions standard.",
                  },
                },
              ],
              usage: {
                prompt_tokens: 15,
                completion_tokens: 25,
              },
            })
          );
        });
        return;
      }

      if (url.pathname === "/v1/responses" && method === "POST") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              response: "Respons sukses dari responses_api endpoint.",
              output_tokens: 30,
            })
          );
        });
        return;
      }

      if (url.pathname === "/v1/messages" && method === "POST") {
        capturedAnthropicHeaders.push({
          "x-api-key": String(req.headers["x-api-key"] || ""),
          "anthropic-version": String(req.headers["anthropic-version"] || ""),
        });

        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const parsed = JSON.parse(body || "{}");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              id: "msg-mock-anthropic",
              model: parsed.model || "claude-mock",
              content: [
                {
                  type: "text",
                  text: "Respons sukses dari anthropic_messages endpoint.",
                },
              ],
              usage: {
                input_tokens: 18,
                output_tokens: 42,
              },
            })
          );
        });
        return;
      }

      // Default fallback 404
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found", path: url.pathname }));
    });

    await new Promise<void>((resolve) => {
      mockServer!.listen(0, "127.0.0.1", () => {
        const addr = mockServer!.address() as any;
        mockPort = addr.port;
        mockBaseUrl = `http://127.0.0.1:${mockPort}/v1`;
        resolve();
      });
    });

    console.log(`  Mock Server aktif di: ${mockBaseUrl}`);

    // ─────────────────────────────────────────────────────────────
    // [TEST 4] PENGUJIAN KE-4 API MODE
    // ─────────────────────────────────────────────────────────────
    console.log("\n▶ [TEST 4] Menguji ke-4 apiMode (chat_completions, responses_api, anthropic_messages, auto_detect)...");

    // 4a. Mode: chat_completions
    const adapterChat = new CustomEndpointAdapter({
      endpointUrl: mockBaseUrl,
      apiMode: "chat_completions",
      defaultModel: "hermes-agent",
      apiKey: "secret-chat-token",
    });
    const resChat = await adapterChat.chatCompletion([
      { role: "user", content: "Halo chat_completions" },
    ]);
    assert.equal(resChat.content, "Respons sukses dari chat_completions standard.");
    assert.equal(resChat.usage?.promptTokens, 15);
    assert.equal(resChat.usage?.completionTokens, 25);
    assert.ok(capturedAuthHeaders.includes("Bearer secret-chat-token"));
    console.log("  ✅ Mode chat_completions: PASS");

    // 4b. Mode: responses_api
    const adapterResponses = new CustomEndpointAdapter({
      endpointUrl: mockBaseUrl,
      apiMode: "responses_api",
      defaultModel: "custom-responses-model",
    });
    const resResponses = await adapterResponses.chatCompletion([
      { role: "user", content: "Halo responses_api" },
    ]);
    assert.equal(resResponses.content, "Respons sukses dari responses_api endpoint.");
    console.log("  ✅ Mode responses_api: PASS");

    // 4c. Mode: anthropic_messages
    const adapterAnthropic = new CustomEndpointAdapter({
      endpointUrl: mockBaseUrl,
      apiMode: "anthropic_messages",
      defaultModel: "claude-3-5-sonnet",
      apiKey: "ant-api-key-test-99",
    });
    const resAnthropic = await adapterAnthropic.chatCompletion([
      { role: "user", content: "Halo anthropic_messages" },
    ]);
    assert.equal(resAnthropic.content, "Respons sukses dari anthropic_messages endpoint.");
    assert.equal(resAnthropic.usage?.promptTokens, 18);
    assert.equal(resAnthropic.usage?.completionTokens, 42);
    const lastAnthropicHeader = capturedAnthropicHeaders[capturedAnthropicHeaders.length - 1];
    assert.equal(lastAnthropicHeader["x-api-key"], "ant-api-key-test-99");
    assert.equal(lastAnthropicHeader["anthropic-version"], "2023-06-01");
    console.log("  ✅ Mode anthropic_messages: PASS");

    // 4d. Mode: auto_detect (URL points to standard /v1, should detect chat_completions)
    const adapterAuto = new CustomEndpointAdapter({
      endpointUrl: mockBaseUrl,
      apiMode: "auto_detect",
      defaultModel: "auto-detect-model",
    });
    const resAuto = await adapterAuto.chatCompletion([
      { role: "user", content: "Halo auto_detect" },
    ]);
    assert.equal(resAuto.content, "Respons sukses dari chat_completions standard.");
    console.log("  ✅ Mode auto_detect: PASS\n");

    // ─────────────────────────────────────────────────────────────
    // [TEST 5] MODEL DISCOVERY & CONNECTION TESTER
    // ─────────────────────────────────────────────────────────────
    console.log("▶ [TEST 5] Menguji discoverEndpointModels & testProviderConnection...");

    // 5a. discoverEndpointModels
    const models = await discoverEndpointModels(mockBaseUrl, "test-key");
    assert.equal(models.length, 3);
    assert.deepEqual(models, ["hermes-agent", "qwen-2.5-coder", "llama-3.3-70b"]);
    console.log(`  ✅ Model discovery berhasil mendeteksi ${models.length} model: PASS`);

    // 5b. testProviderConnection
    const connTest = await testProviderConnection({
      endpointUrl: mockBaseUrl,
      apiMode: "chat_completions",
      apiKey: "diagnostic-test-key",
      model: "hermes-agent",
    });

    assert.equal(connTest.ok, true);
    assert.ok(connTest.latencyMs >= 0);
    assert.equal(connTest.discoveredModels.length, 3);
    assert.ok(connTest.message.includes("sukses") || connTest.message.includes("Terhubung"));
    console.log(`  ✅ Diagnostic Connection Tester (${connTest.latencyMs}ms): PASS\n`);

    // ─────────────────────────────────────────────────────────────
    // [TEST 6] ZERO SECRET LEAKAGE VERIFICATION
    // ─────────────────────────────────────────────────────────────
    console.log("▶ [TEST 6] Menguji Jaminan Zero Secret Leakage (Keamanan Kredensial)...");

    // Public list endpoint must NEVER contain raw secrets
    const publicEndpoints = await listCustomEndpoints({ storePath: testStorePath });
    const publicJson = JSON.stringify(publicEndpoints);
    assert.equal(
      publicJson.includes(initialSecretKey),
      false,
      "CRITICAL SECURITY: Plaintext API key bocor ke output listCustomEndpoints()!"
    );
    assert.equal(publicEndpoints[0].hasSavedKey, true);

    // Catalog providers list must not contain raw keys
    const catalog = listCatalogProviders();
    const catalogJson = JSON.stringify(catalog);
    assert.equal(catalogJson.includes("gsk_"), false);
    assert.equal(catalogJson.includes("sk-ant-"), false);
    assert.ok(catalog.length >= 10, "Katalog bawaan harus menyediakan minimal 10 provider!");

    console.log("  ✅ Zero Secret Leakage Guarantee: PASS\n");

    console.log("===============================================================");
    console.log("🎉 SELURUH 6 PENGUJIAN REGISTRY PROVIDER LULUS 100% (EXIT CODE 0)");
    console.log("===============================================================");
  } finally {
    if (mockServer) {
      mockServer.close();
    }
    try {
      await fs.rm(testStoreDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

runTestSuite().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED WITH ERROR:");
  console.error(err);
  process.exit(1);
});
