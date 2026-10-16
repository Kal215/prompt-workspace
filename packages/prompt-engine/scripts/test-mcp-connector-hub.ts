import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import assert from "node:assert";
import {
  listMcpConnectors,
  getMcpConnector,
  saveMcpConnector,
  deleteMcpConnector,
  toggleMcpConnector,
  testAndDiscoverMcpConnector,
  executeMcpConnectorTool,
  gatherMcpExternalContext,
  formatMcpContextForPrompt,
  synthesizeUniversalBlueprintAsync,
} from "../src/index.js";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
};

function pass(name: string, detail?: string) {
  console.log(`  ${colors.green}✔ PASS${colors.reset} ${colors.bold}${name}${colors.reset}${detail ? ` (${detail})` : ""}`);
}

function fail(name: string, error: any) {
  console.error(`  ${colors.red}✖ FAIL${colors.reset} ${colors.bold}${name}${colors.reset}`);
  console.error(error);
}

async function runMcpConnectorHubTests() {
  console.log(`\n${colors.cyan}${colors.bold}========================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}🧪 PIEW UNIVERSAL MCP CONNECTOR HUB & 2-WAY SAFETY GATE TEST SUITE${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}========================================================================${colors.reset}\n`);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "piew-mcp-test-"));
  const tempStorePath = path.join(tempDir, "test-mcp-connectors.json");
  const mockServerScriptPath = path.join(tempDir, "mock-stdio-server.mjs");

  try {
    // -------------------------------------------------------------------------
    // TEST 1: CRUD & Zero-Secret Masking on ~/.piew/mcp-connectors.json
    // -------------------------------------------------------------------------
    console.log(`${colors.yellow}--- [TEST 1] CRUD & Zero-Secret Masking on Connector Store ---${colors.reset}`);

    // 1.1 List awal: Harus memuat 10 built-in connector
    const initialList = await listMcpConnectors(tempStorePath);
    assert.strictEqual(initialList.length, 10, "Katalog bawaan harus memuat 10 konektor");
    pass("1.1 Inisialisasi Toko Konektor", "10 built-in connector katalog terpasang");

    // 1.2 Zero-Secret Masking: Semua token bawaan wajib ter-masking
    const figmaPublic = initialList.find((c) => c.connectorId === "figma-mcp");
    assert.ok(figmaPublic, "Figma MCP harus ada di katalog");
    const figmaTokenPublic = figmaPublic.stdioConfig?.envVars?.FIGMA_ACCESS_TOKEN;
    assert.ok(
      figmaTokenPublic === undefined ||
      figmaTokenPublic.includes("••••") ||
      figmaTokenPublic.startsWith("${") ||
      figmaTokenPublic === "",
      "Secret token pada listing publik wajib disamarkan atau berupa referensi env (Zero Secret Leakage)"
    );
    pass("1.2 Zero-Secret Masking Publik", "Token dan secret otomatis disamarkan");

    // 1.3 Tambah Custom MCP Connector ("Add your own")
    const customInput = {
      name: "Acme Corp Internal ERP",
      category: "custom" as const,
      badgeType: "MCP · Custom" as const,
      description: "Internal ERP MCP server for warehouse inventory and orders",
      enabled: true,
      installedOnDevice: true,
      transportType: "stdio" as const,
      permissionMode: "write_with_approval" as const,
      stdioConfig: {
        command: "node",
        args: [mockServerScriptPath],
        envVars: {
          ERP_API_KEY: "super-secret-production-key-xyz-98765",
        },
      },
    };
    const savedCustom = await saveMcpConnector(customInput, tempStorePath);
    assert.ok(savedCustom.connectorId, "Custom connector harus memiliki connectorId");
    const customId = savedCustom.connectorId;
    pass("1.3 Simpan Custom MCP Connector", `ID: ${customId}`);

    // 1.4 Verifikasi Masking vs Private Secret Retention
    const publicCustom = (await listMcpConnectors(tempStorePath)).find((c) => c.connectorId === customId);
    assert.ok(publicCustom, "Custom connector harus muncul di listing publik");
    assert.ok(
      publicCustom.stdioConfig?.envVars?.ERP_API_KEY.includes("••••"),
      "ERP_API_KEY harus disensor pada listing publik"
    );

    const privateCustom = await getMcpConnector(customId, tempStorePath, true);
    assert.strictEqual(
      privateCustom?.stdioConfig?.envVars?.ERP_API_KEY,
      "super-secret-production-key-xyz-98765",
      "Kredensial asli harus tersimpan utuh di storage internal untuk eksekusi live"
    );
    pass("1.4 Isolasi Kredensial Publik vs Internal", "Secret aman tersimpan & disensor di publik");

    // 1.5 Update dengan Opsi 'Leave blank to keep current key'
    await saveMcpConnector(
      {
        connectorId: customId,
        name: "Acme Corp Internal ERP (Updated)",
        category: "custom",
        badgeType: "MCP · Custom",
        description: "Updated description",
        enabled: true,
        installedOnDevice: true,
        transportType: "stdio",
        permissionMode: "write_with_approval",
        stdioConfig: {
          command: "node",
          args: [mockServerScriptPath],
          envVars: {
            // Kosongkan untuk mempertahankan key lama
          },
        },
      },
      tempStorePath
    );
    const updatedPrivate = await getMcpConnector(customId, tempStorePath, true);
    assert.strictEqual(
      updatedPrivate?.stdioConfig?.envVars?.ERP_API_KEY,
      "super-secret-production-key-xyz-98765",
      "Key lama tidak boleh terhapus jika diisi kosong (Leave blank to keep current key)"
    );
    pass("1.5 Preservasi Kredensial saat Update", "Key lama dipertahankan");

    // 1.6 Toggle On/Off
    const toggledOff = await toggleMcpConnector(customId, false, tempStorePath);
    assert.strictEqual(toggledOff.enabled, false, "Konektor harus berstatus nonaktif");
    const toggledOn = await toggleMcpConnector(customId, true, tempStorePath);
    assert.strictEqual(toggledOn.enabled, true, "Konektor harus kembali aktif");
    pass("1.6 Toggle On/Off Konektor", "Status aktif/nonaktif bekerja mulus");

    // -------------------------------------------------------------------------
    // TEST 2: Real Stdio MCP Handshake & Tool Discovery
    // -------------------------------------------------------------------------
    console.log(`\n${colors.yellow}--- [TEST 2] Real Stdio MCP Handshake & Tool Discovery ---${colors.reset}`);

    // Siapkan mock MCP stdio server script
    const serverScriptContent = `
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const req = JSON.parse(line);
    if (req.method === 'initialize') {
      const resp = {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'acme-mock-mcp-server', version: '1.2.0' }
        }
      };
      process.stdout.write(JSON.stringify(resp) + '\\n');
    } else if (req.method === 'notifications/initialized') {
      // no response required
    } else if (req.method === 'tools/list') {
      const resp = {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          tools: [
            {
              name: 'get_warehouse_stock',
              description: 'Inspect live stock levels in warehouse',
              inputSchema: { type: 'object', properties: { sku: { type: 'string' } } },
              isMutating: false
            },
            {
              name: 'create_purchase_order',
              description: 'Create and submit a purchase order to supplier',
              inputSchema: { type: 'object', properties: { sku: { type: 'string' }, quantity: { type: 'number' } }, required: ['sku', 'quantity'] },
              isMutating: true
            },
            {
              name: 'purge_cache_records',
              description: 'Purge temporary cache records',
              inputSchema: { type: 'object' },
              isMutating: true
            }
          ]
        }
      };
      process.stdout.write(JSON.stringify(resp) + '\\n');
    } else if (req.method === 'resources/list') {
      const resp = {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          resources: [
            { uri: 'warehouse://inventory/schema', name: 'Inventory Schema', mimeType: 'application/json' }
          ]
        }
      };
      process.stdout.write(JSON.stringify(resp) + '\\n');
    } else if (req.method === 'tools/call') {
      if (req.params.name === 'get_warehouse_stock') {
        const resp = {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ sku: req.params.arguments?.sku || 'SKU-001', stock: 450, unit: 'kg' }) }]
          }
        };
        process.stdout.write(JSON.stringify(resp) + '\\n');
      } else if (req.params.name === 'create_purchase_order') {
        const resp = {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [{ type: 'text', text: \`PO created successfully: \${req.params.arguments?.sku} qty \${req.params.arguments?.quantity}\` }]
          }
        };
        process.stdout.write(JSON.stringify(resp) + '\\n');
      } else {
        const resp = {
          jsonrpc: '2.0',
          id: req.id,
          result: { content: [{ type: 'text', text: 'OK' }] }
        };
        process.stdout.write(JSON.stringify(resp) + '\\n');
      }
    }
  } catch (err) {
    // ignore parse error
  }
});
`;
    await fs.writeFile(mockServerScriptPath, serverScriptContent, "utf-8");

    // Jalankan test & discover ke real child process stdio
    const discoveryResult = await testAndDiscoverMcpConnector(customId, tempStorePath);
    assert.strictEqual(discoveryResult.ok, true, "Handshake dan discovery harus berhasil");
    assert.strictEqual(discoveryResult.connectionStatus, "connected");
    assert.ok(discoveryResult.latencyMs >= 0, "Latensi koneksi harus terukur");
    assert.strictEqual(discoveryResult.discoveredTools.length, 3, "Harus menemukan 3 tools");
    assert.strictEqual(discoveryResult.discoveredResources.length, 1, "Harus menemukan 1 resource");

    // Verifikasi deteksi mutasi tool
    const readTool = discoveryResult.discoveredTools.find((t) => t.name === "get_warehouse_stock");
    const writeTool = discoveryResult.discoveredTools.find((t) => t.name === "create_purchase_order");
    const purgeTool = discoveryResult.discoveredTools.find((t) => t.name === "purge_cache_records");

    assert.ok(readTool && readTool.isMutating === false, "get_warehouse_stock harus ditandai non-mutating");
    assert.ok(writeTool && writeTool.isMutating === true, "create_purchase_order harus ditandai mutating");
    assert.ok(purgeTool && purgeTool.isMutating === true, "purge_cache_records harus ditandai mutating");
    pass("2.1 Real Stdio MCP Handshake", `initialize, tools/list, resources/list (Latensi: ${discoveryResult.latencyMs}ms)`);

    // -------------------------------------------------------------------------
    // TEST 3: Outbound Action Execution & Safety Gate Engine (Arah Tulis)
    // -------------------------------------------------------------------------
    console.log(`\n${colors.yellow}--- [TEST 3] Outbound Action Execution & Safety Gate Engine ---${colors.reset}`);

    // 3.1 Panggilan Tool Non-Mutasi (Otomatis Lolos tanpa Approval)
    const readExecResult = await executeMcpConnectorTool(
      {
        connectorId: customId,
        toolName: "get_warehouse_stock",
        args: { sku: "TEPUNG-CAKRA-25KG" },
      },
      tempStorePath
    );
    assert.strictEqual(readExecResult.status, "SUCCESS", "Panggilan tool read-only harus sukses");
    assert.ok(
      JSON.stringify(readExecResult.result).includes("TEPUNG-CAKRA-25KG"),
      "Hasil tool harus memuat data dari mock MCP server"
    );
    pass("3.1 Eksekusi Read-Only Tool", "Lolos langsung tanpa hambatan approval");

    // 3.2 Panggilan Tool Mutasi Tanpa Approval (Wajib Dicegat Safety Gate)
    const blockedExecResult = await executeMcpConnectorTool(
      {
        connectorId: customId,
        toolName: "create_purchase_order",
        args: { sku: "GULA-PASIR-50KG", quantity: 10 },
        userApproved: false,
      },
      tempStorePath
    );
    assert.strictEqual(
      blockedExecResult.status,
      "PENDING_HUMAN_APPROVAL",
      "Tool mutatif wajib berstatus PENDING_HUMAN_APPROVAL jika belum disetujui pengguna"
    );
    assert.ok(blockedExecResult.approvalPayloadPreview, "Harus menyertakan pratinjau payload yang ditahan");
    assert.strictEqual(blockedExecResult.approvalPayloadPreview?.toolName, "create_purchase_order");
    pass("3.2 Safety Gate Interception", "Operasi mutasi ditahan dengan PENDING_HUMAN_APPROVAL");

    // 3.3 Panggilan Tool Mutasi Dengan Persetujuan Pengguna (userApproved: true)
    const approvedExecResult = await executeMcpConnectorTool(
      {
        connectorId: customId,
        toolName: "create_purchase_order",
        args: { sku: "GULA-PASIR-50KG", quantity: 10 },
        userApproved: true,
      },
      tempStorePath
    );
    assert.strictEqual(approvedExecResult.status, "SUCCESS", "Tool mutatif harus berhasil dieksekusi setelah disetujui");
    assert.ok(
      JSON.stringify(approvedExecResult.result).includes("PO created successfully"),
      "Balikan eksekusi mutasi harus sukses"
    );
    pass("3.3 Eksekusi Mutasi dengan Approval", "Tool dijalankan dan mutasi berhasil diaplikasikan");

    // 3.4 Penolakan Mutasi pada Konektor Mode 'read_only'
    const readOnlyInput = {
      name: "Strict Audit DB MCP",
      category: "database" as const,
      badgeType: "MCP · Custom" as const,
      description: "Read only audit database",
      enabled: true,
      installedOnDevice: true,
      transportType: "stdio" as const,
      permissionMode: "read_only" as const,
      stdioConfig: {
        command: "node",
        args: [mockServerScriptPath],
      },
    };
    const readOnlyConn = await saveMcpConnector(readOnlyInput, tempStorePath);
    const rejectedResult = await executeMcpConnectorTool(
      {
        connectorId: readOnlyConn.connectorId,
        toolName: "create_purchase_order",
        args: { sku: "TEST-01", quantity: 1 },
        userApproved: true, // Sekalipun user approved, mode read_only wajib menolak mutasi
      },
      tempStorePath
    );
    assert.strictEqual(rejectedResult.status, "REJECTED", "Konektor read_only wajib menolak mutasi secara mutlak");
    pass("3.4 Strict Read-Only Mode Guard", "Mutasi ditolak mutlak walau userApproved true");

    // -------------------------------------------------------------------------
    // TEST 4: Inbound Context Enrichment (Arah Baca ke Universal Blueprint)
    // -------------------------------------------------------------------------
    console.log(`\n${colors.yellow}--- [TEST 4] Inbound Context Enrichment into Universal Blueprint ---${colors.reset}`);

    // 4.1 Deteksi URL dan Kata Kunci Eksternal
    const promptWithExternalRef =
      "Rancang arsitektur sistem kasir dan inventaris toko kue Nay's Cake berdasarkan desain Figma di https://figma.com/file/FigmaCake123/NayCakeUI dan skema database postgres.";
    const gatheredContexts = await gatherMcpExternalContext(promptWithExternalRef, {
      customStorePath: tempStorePath,
    });
    assert.ok(gatheredContexts.length >= 2, "Harus mendeteksi minimal Figma dan Postgres");
    const hasFigma = gatheredContexts.some((c) => c.connectorId === "figma-mcp");
    const hasPostgres = gatheredContexts.some((c) => c.connectorId === "postgres-mcp");
    assert.ok(hasFigma, "Konteks Figma harus diekstrak");
    assert.ok(hasPostgres, "Konteks PostgreSQL harus diekstrak");
    pass("4.1 Deteksi Referensi Eksternal MCP", `Terdeteksi ${gatheredContexts.length} sumber kontekstual`);

    // 4.2 Formatting Context untuk LLM
    const formattedMarkdown = formatMcpContextForPrompt(gatheredContexts);
    assert.ok(formattedMarkdown.includes("Figma"), "Markdown harus memuat konteks Figma");
    assert.ok(
      formattedMarkdown.includes("PostgreSQL") || formattedMarkdown.includes("postgres"),
      "Markdown harus memuat konteks PostgreSQL"
    );
    pass("4.2 Formatter Konteks MCP Grounding", "Konteks terstruktur siap diinjeksi ke LLM");

    // 4.3 Integrasi Universal Blueprint Async dengan Grounding MCP
    const blueprintResult = await synthesizeUniversalBlueprintAsync({
      prompt: promptWithExternalRef,
      forceOfflineFallback: true, // Deterministic tier fallback dengan MCP context
    });
    assert.ok(blueprintResult.blueprint, "Blueprint harus berhasil disintesis");
    assert.strictEqual(blueprintResult.consistencyValid, true, "Validasi konsistensi 100% lulus");
    assert.ok(
      blueprintResult.blueprint.renderedMasterPrompt.includes("ERD") ||
      blueprintResult.blueprint.diagrams.length > 0,
      "Diagram arsitektur harus tercipta"
    );
    if (blueprintResult.metadata) {
      assert.strictEqual(blueprintResult.metadata.mcpEnriched, true, "Metadata harus menandai mcpEnriched = true");
      assert.ok(
        blueprintResult.metadata.mcpConnectors && blueprintResult.metadata.mcpConnectors.length > 0,
        "Metadata harus mencatat konektor MCP yang memperkaya prompt"
      );
    }
    pass("4.3 Sintesis Blueprint Tergrounding MCP", "Blueprint 10-Bagian terintegrasi dengan konteks eksternal");

    // 4.4 Hapus Custom Connector
    const deleteSuccess = await deleteMcpConnector(customId, tempStorePath);
    assert.strictEqual(deleteSuccess, true, "Custom connector harus berhasil dihapus");
    pass("4.4 Pembersihan Toko Konektor", "Konektor kustom berhasil dihapus");

    console.log(`\n${colors.green}${colors.bold}========================================================================${colors.reset}`);
    console.log(`${colors.green}${colors.bold}🎉 SELURUH PENGUJIAN UNIVERSAL MCP CONNECTOR HUB & SAFETY GATE LULUS!${colors.reset}`);
    console.log(`${colors.green}${colors.bold}========================================================================${colors.reset}\n`);
    process.exit(0);
  } catch (error: any) {
    fail("Eksekusi Test Suite MCP Hub", error);
    process.exit(1);
  } finally {
    // Cleanup temporary files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

runMcpConnectorHubTests();
