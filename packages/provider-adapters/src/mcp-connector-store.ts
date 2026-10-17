import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  McpConnectorConfig,
  McpConnectorConfigSchema,
  McpConnectorInput,
  McpConnectorInputSchema,
  McpTool,
  McpResource,
  McpConnectionStatus,
} from "@prompt-workspace/prompt-contracts";
import { BUILTIN_MCP_CONNECTORS_CATALOG } from "./mcp-catalog.js";
import { maskKey } from "./redact.js";

export interface StoredMcpConnectorRecord extends McpConnectorConfig {
  savedApiKeyOrToken?: string;
  savedEnvSecrets?: Record<string, string>;
}

export interface McpConnectorsStoreData {
  version: string;
  connectors: StoredMcpConnectorRecord[];
}

/**
 * Menentukan path file konfigurasi ~/.piew/mcp-connectors.json
 */
export function resolveMcpConnectorsConfigPath(customPath?: string): string {
  if (customPath && customPath.trim()) {
    return path.resolve(customPath.trim());
  }
  if (
    process.env.PIEW_MCP_CONNECTORS_PATH &&
    process.env.PIEW_MCP_CONNECTORS_PATH.trim()
  ) {
    return path.resolve(process.env.PIEW_MCP_CONNECTORS_PATH.trim());
  }
  return path.join(os.homedir(), ".piew", "mcp-connectors.json");
}

/**
 * Slugify nama konektor
 * Contoh: "Docker Custom" -> "docker-custom"
 */
export function slugifyConnectorName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "custom-mcp";
}

/**
 * Redaksi rahasia pada konfigurasi konektor untuk tampilan publik/UI (Zero Secret Leakage)
 */
export function redactMcpConnectorSecrets(
  connector: McpConnectorConfig
): McpConnectorConfig {
  const cloned: McpConnectorConfig = JSON.parse(JSON.stringify(connector));

  // Redaksi HTTP API Key / Token
  if (cloned.httpConfig?.apiKeyOrToken) {
    cloned.httpConfig.apiKeyOrToken = maskKey(cloned.httpConfig.apiKeyOrToken);
  }

  // Redaksi Env Vars yang berisi token/kunci
  if (cloned.stdioConfig?.envVars) {
    const maskedEnv: Record<string, string> = {};
    for (const [key, val] of Object.entries(cloned.stdioConfig.envVars)) {
      if (
        /token|key|secret|password|auth|pat/i.test(key) &&
        val &&
        !val.startsWith("${")
      ) {
        maskedEnv[key] = maskKey(val);
      } else {
        maskedEnv[key] = val;
      }
    }
    cloned.stdioConfig.envVars = maskedEnv;
  }

  return cloned;
}

/**
 * Membaca data mentah dari file penyimpanan ~/.piew/mcp-connectors.json
 */
export async function readMcpConnectorsStore(
  customPath?: string
): Promise<McpConnectorsStoreData> {
  const filePath = resolveMcpConnectorsConfigPath(customPath);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.connectors)) {
      // Pembersihan otomatis konektor usang/tidak relevan dari katalog lama
      const deprecatedBuiltinIds = new Set([
        "spotify-custom-mcp",
        "airtable-mcp",
        "asana-mcp",
        "algolia-mcp",
      ]);
      const activeConnectors = data.connectors.filter(
        (c: any) => !deprecatedBuiltinIds.has(c.connectorId)
      );

      // Sinkronisasi otomatis konektor katalog enterprise baru jika belum tercatat
      const existingIds = new Set(activeConnectors.map((c: any) => c.connectorId));
      let hasChanges = activeConnectors.length !== data.connectors.length;

      for (const builtin of BUILTIN_MCP_CONNECTORS_CATALOG) {
        if (!existingIds.has(builtin.connectorId)) {
          activeConnectors.push({ ...builtin });
          hasChanges = true;
        }
      }

      const syncedStore: McpConnectorsStoreData = {
        version: data.version || "1.0.0",
        connectors: activeConnectors,
      };

      if (hasChanges) {
        await writeMcpConnectorsStore(syncedStore, customPath);
      }

      return syncedStore;
    }
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      console.warn(`[MCP-Store] Gagal membaca ${filePath}:`, error.message);
    }
  }

  // Fallback inisialisasi default dari katalog bawaan
  const initialStore: McpConnectorsStoreData = {
    version: "1.0.0",
    connectors: BUILTIN_MCP_CONNECTORS_CATALOG.map((c) => ({ ...c })),
  };

  await writeMcpConnectorsStore(initialStore, customPath);
  return initialStore;
}

/**
 * Menulis data ke file penyimpanan ~/.piew/mcp-connectors.json dengan izin 0600
 */
export async function writeMcpConnectorsStore(
  store: McpConnectorsStoreData,
  customPath?: string
): Promise<void> {
  const filePath = resolveMcpConnectorsConfigPath(customPath);
  const dirPath = path.dirname(filePath);

  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });

  try {
    await fs.chmod(filePath, 0o600);
  } catch {
    // Abaikan jika OS tidak mendukung chmod (Windows)
  }
}

/**
 * Mendapatkan seluruh daftar MCP Connectors publik (Secrets telah diredaksi 100%)
 */
export async function listMcpConnectors(
  customPath?: string
): Promise<McpConnectorConfig[]> {
  const store = await readMcpConnectorsStore(customPath);
  return store.connectors.map((c) => redactMcpConnectorSecrets(c));
}

/**
 * Mengambil satu MCP Connector berdasarkan ID.
 * @param includeSecrets Jika true, mengembalikan kredensial asli untuk eksekutor internal (JANGAN di-expose ke API publik)
 */
export async function getMcpConnector(
  connectorId: string,
  customPath?: string,
  includeSecrets = false
): Promise<StoredMcpConnectorRecord | null> {
  const store = await readMcpConnectorsStore(customPath);
  const found = store.connectors.find((c) => c.connectorId === connectorId);
  if (!found) return null;

  if (includeSecrets) {
    return JSON.parse(JSON.stringify(found));
  }
  return redactMcpConnectorSecrets(found);
}

/**
 * Menambahkan atau memperbarui MCP Connector kustom
 */
export async function saveMcpConnector(
  input: McpConnectorInput,
  customPath?: string
): Promise<McpConnectorConfig> {
  const validated = McpConnectorInputSchema.parse(input);
  const store = await readMcpConnectorsStore(customPath);

  const connectorId =
    validated.connectorId?.trim() || slugifyConnectorName(validated.name);

  const existingIndex = store.connectors.findIndex(
    (c) => c.connectorId === connectorId
  );
  const existing = existingIndex >= 0 ? store.connectors[existingIndex] : null;

  // Pertahankan secret lama jika input baru kosong (Leave blank to keep current key)
  let preservedApiKey = existing?.savedApiKeyOrToken;
  if (validated.httpConfig?.apiKeyOrToken) {
    const rawKey = validated.httpConfig.apiKeyOrToken.trim();
    if (rawKey && !rawKey.includes("••••")) {
      preservedApiKey = rawKey;
    }
  }

  let preservedEnvSecrets = existing?.savedEnvSecrets || {};
  if (validated.stdioConfig?.envVars) {
    const incomingEnv = validated.stdioConfig.envVars;
    for (const [k, v] of Object.entries(incomingEnv)) {
      if (v && !v.includes("••••")) {
        preservedEnvSecrets[k] = v;
      }
    }
  }

  const now = new Date().toISOString();
  const record: StoredMcpConnectorRecord = {
    connectorId,
    name: validated.name.trim(),
    category: validated.category,
    badgeType: validated.badgeType,
    description: validated.description.trim(),
    enabled: validated.enabled,
    installedOnDevice: validated.installedOnDevice,
    transportType: validated.transportType,
    stdioConfig: validated.stdioConfig
      ? {
          command: validated.stdioConfig.command.trim(),
          args: validated.stdioConfig.args || [],
          envVars: {
            ...(validated.stdioConfig.envVars || {}),
            ...preservedEnvSecrets,
          },
        }
      : undefined,
    httpConfig: validated.httpConfig
      ? {
          endpointUrl: validated.httpConfig.endpointUrl.trim(),
          authHeaderType: validated.httpConfig.authHeaderType,
          apiKeyOrToken: preservedApiKey,
          customHeaders: validated.httpConfig.customHeaders || {},
        }
      : undefined,
    permissionMode: validated.permissionMode,
    discoveredTools: existing?.discoveredTools || [],
    discoveredResources: existing?.discoveredResources || [],
    lastTestedAt: existing?.lastTestedAt,
    latencyMs: existing?.latencyMs,
    connectionStatus: existing?.connectionStatus || "unused",
    errorMessage: existing?.errorMessage,
    icon: validated.icon || existing?.icon,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    savedApiKeyOrToken: preservedApiKey,
    savedEnvSecrets: preservedEnvSecrets,
  };

  if (existingIndex >= 0) {
    store.connectors[existingIndex] = record;
  } else {
    store.connectors.push(record);
  }

  await writeMcpConnectorsStore(store, customPath);
  return redactMcpConnectorSecrets(record);
}

/**
 * Mengubah status aktif (enabled: true/false) konektor
 */
export async function toggleMcpConnector(
  connectorId: string,
  enabled: boolean,
  customPath?: string
): Promise<McpConnectorConfig> {
  const store = await readMcpConnectorsStore(customPath);
  const found = store.connectors.find((c) => c.connectorId === connectorId);
  if (!found) {
    throw new Error(`MCP Connector dengan ID '${connectorId}' tidak ditemukan.`);
  }

  found.enabled = enabled;
  found.updatedAt = new Date().toISOString();

  await writeMcpConnectorsStore(store, customPath);
  return redactMcpConnectorSecrets(found);
}

/**
 * Menghapus custom connector dari store
 */
export async function deleteMcpConnector(
  connectorId: string,
  customPath?: string
): Promise<boolean> {
  const store = await readMcpConnectorsStore(customPath);
  const index = store.connectors.findIndex((c) => c.connectorId === connectorId);
  if (index < 0) return false;

  const target = store.connectors[index];
  if (target.badgeType === "MCP · Catalog") {
    // Untuk katalog bawaan, cukup di-disable daripada dihapus permanen
    target.enabled = false;
    target.updatedAt = new Date().toISOString();
  } else {
    store.connectors.splice(index, 1);
  }

  await writeMcpConnectorsStore(store, customPath);
  return true;
}

/**
 * Memperbarui hasil tool discovery dan status koneksi connector
 */
export async function updateConnectorDiscoveryResult(
  connectorId: string,
  data: {
    connectionStatus: McpConnectionStatus;
    latencyMs?: number;
    discoveredTools?: McpTool[];
    discoveredResources?: McpResource[];
    errorMessage?: string;
  },
  customPath?: string
): Promise<void> {
  const store = await readMcpConnectorsStore(customPath);
  const found = store.connectors.find((c) => c.connectorId === connectorId);
  if (!found) return;

  found.connectionStatus = data.connectionStatus;
  if (data.latencyMs !== undefined) found.latencyMs = data.latencyMs;
  if (data.discoveredTools) found.discoveredTools = data.discoveredTools;
  if (data.discoveredResources) found.discoveredResources = data.discoveredResources;
  if (data.errorMessage !== undefined) found.errorMessage = data.errorMessage;
  found.lastTestedAt = new Date().toISOString();
  found.updatedAt = new Date().toISOString();

  await writeMcpConnectorsStore(store, customPath);
}
