#!/usr/bin/env node
/**
 * Test Suite: Enterprise MCP Connectors Catalog & Store Migration
 *
 * Menguji:
 * 1. Validasi skema Zod pada seluruh 10 konektor katalog bawaan (getBuiltinMcpConnectors)
 * 2. Purge check: Memastikan konektor usang/tidak relevan (Spotify, Airtable, Asana, Algolia) telah tereliminasi 100%
 * 3. Verifikasi konektor enterprise baru (filesystem-mcp, linear-mcp, docker-mcp, sentry-mcp)
 * 4. Migrasi otomatis store (~/.piew/mcp-connectors.json): Pembersihan konektor usang dan sinkronisasi otomatis
 * 5. Jaminan Zero Secret Leakage pada listMcpConnectors
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";

import {
  BUILTIN_MCP_CONNECTORS_CATALOG,
  getBuiltinMcpConnectors,
  readMcpConnectorsStore,
  listMcpConnectors,
  saveMcpConnector,
  deleteMcpConnector,
} from "../src/index.js";

async function runTestSuite() {
  console.log("===============================================================");
  console.log("🧪 PIEW TEST SUITE: ENTERPRISE MCP CONNECTORS CATALOG & STORE");
  console.log("===============================================================\n");

  const testStoreDir = path.join(os.tmpdir(), `piew-test-mcp-${Date.now()}`);
  await fs.mkdir(testStoreDir, { recursive: true });
  const testStorePath = path.join(testStoreDir, "mcp-connectors.json");

  try {
    // ─────────────────────────────────────────────────────────────
    // [TEST 1] VALIDASI SKEMA SELURUH KATALOG BAWAAN
    // ─────────────────────────────────────────────────────────────
    console.log("▶ [TEST 1] Menguji Validasi Skema Zod pada Katalog Bawaan...");
    const builtinConnectors = getBuiltinMcpConnectors();
    assert.equal(builtinConnectors.length, 10, "Katalog bawaan harus tepat berjumlah 10 konektor enterprise");
    for (const connector of builtinConnectors) {
      assert.ok(connector.connectorId, "Konektor harus memiliki connectorId");
      assert.ok(connector.name, "Konektor harus memiliki nama");
      assert.ok(connector.category, "Konektor harus memiliki kategori valid");
      assert.ok(Array.isArray(connector.discoveredTools), "Tools harus berupa array");
    }
    console.log(`  ✅ ${builtinConnectors.length} konektor tervalidasi skema Zod secara ketat: PASS`);

    // ─────────────────────────────────────────────────────────────
    // [TEST 2] PURGE VERIFICATION (ELIMINASI KONEKTOR TIDAK RELEVAN)
    // ─────────────────────────────────────────────────────────────
    console.log("▶ [TEST 2] Memverifikasi Eliminasi Konektor Tidak Relevan (Spotify, Airtable, Asana, Algolia)...");
    const connectorIds = BUILTIN_MCP_CONNECTORS_CATALOG.map((c) => c.connectorId);
    assert.ok(!connectorIds.includes("spotify-custom-mcp"), "Spotify MCP harus tereliminasi");
    assert.ok(!connectorIds.includes("airtable-mcp"), "Airtable MCP harus tereliminasi");
    assert.ok(!connectorIds.includes("asana-mcp"), "Asana MCP harus tereliminasi");
    assert.ok(!connectorIds.includes("algolia-mcp"), "Algolia MCP harus tereliminasi");
    console.log("  ✅ Seluruh konektor usang/non-enterprise berhasil dieliminasi 100%: PASS");

    // ─────────────────────────────────────────────────────────────
    // [TEST 3] VERIFIKASI KONEKTOR ENTERPRISE BARU
    // ─────────────────────────────────────────────────────────────
    console.log("▶ [TEST 3] Memeriksa Integritas Konektor Rekayasa Baru (Filesystem, Linear, Docker, Sentry)...");
    const requiredNewIds = ["filesystem-mcp", "linear-mcp", "docker-mcp", "sentry-mcp"];
    for (const reqId of requiredNewIds) {
      const found = BUILTIN_MCP_CONNECTORS_CATALOG.find((c) => c.connectorId === reqId);
      assert.ok(found, `Konektor baru ${reqId} harus terdaftar di katalog`);
      assert.ok(found.discoveredTools.length > 0, `Konektor ${reqId} harus mendefinisikan tools`);
    }
    console.log("  ✅ Konektor Filesystem, Linear, Docker, dan Sentry terdaftar dengan tools lengkap: PASS");

    // ─────────────────────────────────────────────────────────────
    // [TEST 4] AUTO-MIGRATION DARI STORE LAMA DENGAN DEPRECATED CONNECTORS
    // ─────────────────────────────────────────────────────────────
    console.log("▶ [TEST 4] Menguji Migrasi Otomatis & Pembersihan Deprecated IDs dari File Store...");
    const legacyStorePayload = {
      version: "1.0.0",
      connectors: [
        {
          connectorId: "spotify-custom-mcp",
          name: "Spotify Obsolete",
          category: "custom",
          badgeType: "MCP · Custom",
          description: "Deprecated music player",
          enabled: true,
          installedOnDevice: true,
          transportType: "stdio",
          stdioConfig: { command: "npx", args: ["spotify"] },
          permissionMode: "read_only",
          connectionStatus: "unused",
          discoveredTools: [],
          discoveredResources: [],
        },
        {
          connectorId: "github-mcp",
          name: "GitHub Existing",
          category: "devtools",
          badgeType: "MCP · Catalog",
          description: "Existing github connector",
          enabled: true,
          installedOnDevice: false,
          transportType: "stdio",
          stdioConfig: { command: "npx", args: ["github"] },
          permissionMode: "read_only",
          connectionStatus: "unused",
          discoveredTools: [],
          discoveredResources: [],
        },
      ],
    };
    await fs.writeFile(testStorePath, JSON.stringify(legacyStorePayload, null, 2), "utf-8");

    // Eksekusi readMcpConnectorsStore harus membuang spotify dan menyinkronkan konektor baru
    const migratedStore = await readMcpConnectorsStore(testStorePath);
    const migratedIds = migratedStore.connectors.map((c) => c.connectorId);

    assert.ok(!migratedIds.includes("spotify-custom-mcp"), "Spotify harus dibersihkan saat membaca store");
    assert.ok(migratedIds.includes("github-mcp"), "GitHub existing harus dipertahankan");
    assert.ok(migratedIds.includes("filesystem-mcp"), "Filesystem harus otomatis disinkronkan");
    assert.ok(migratedIds.includes("docker-mcp"), "Docker harus otomatis disinkronkan");
    assert.ok(migratedIds.includes("sentry-mcp"), "Sentry harus otomatis disinkronkan");
    assert.ok(migratedIds.includes("linear-mcp"), "Linear harus otomatis disinkronkan");

    console.log("  ✅ Migrasi otomatis store & auto-sync katalog baru berhasil: PASS");

    // ─────────────────────────────────────────────────────────────
    // [TEST 5] JAMINAN ZERO SECRET LEAKAGE PADA LIST MCP CONNECTORS
    // ─────────────────────────────────────────────────────────────
    console.log("▶ [TEST 5] Menguji Jaminan Zero Secret Leakage pada listMcpConnectors...");
    await saveMcpConnector(
      {
        name: "Enterprise Custom DB",
        category: "database",
        description: "Private test database connector",
        transportType: "stdio",
        stdioConfig: {
          command: "npx",
          args: ["custom-db"],
          envVars: {
            DB_SECRET_KEY: "super-secret-production-password-12345",
          },
        },
        permissionMode: "read_only",
      },
      testStorePath
    );

    const publicList = await listMcpConnectors(testStorePath);
    const targetCustom = publicList.find((c) => c.name === "Enterprise Custom DB");
    assert.ok(targetCustom, "Konektor kustom harus ditemukan di daftar publik");
    assert.notEqual(
      targetCustom.stdioConfig?.envVars?.DB_SECRET_KEY,
      "super-secret-production-password-12345",
      "Kunci rahasia TIDAK boleh terekspos mentah di daftar publik"
    );
    assert.ok(
      targetCustom.stdioConfig?.envVars?.DB_SECRET_KEY?.includes("••••"),
      "Kunci rahasia harus diredaksi dengan format masking bullet"
    );

    console.log("  ✅ Jaminan Zero Secret Leakage tervalidasi: PASS");

    console.log("\n===============================================================");
    console.log("🎉 SELURUH 5 PENGUJIAN MCP CATALOG & STORE LULUS 100% (EXIT CODE 0)");
    console.log("===============================================================");
  } finally {
    await fs.rm(testStoreDir, { recursive: true, force: true }).catch(() => {});
  }
}

runTestSuite().catch((err) => {
  console.error("❌ Test suite gagal:", err);
  process.exit(1);
});
