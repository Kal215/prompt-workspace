import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import {
  CustomEndpointConfig,
  CustomEndpointInput,
  CustomEndpointInputSchema,
} from "@prompt-workspace/prompt-contracts";
import { LLMProviderAdapter, ProviderAdapterError } from "./types.js";
import { CustomEndpointAdapter } from "./custom-endpoint-adapter.js";
import { createProviderAdapter } from "./registry.js";
import { listCatalogProviders } from "./catalog.js";

export interface StoredCustomEndpointRecord extends CustomEndpointConfig {
  savedApiKey?: string;
}

export interface RegistryStoreData {
  version: string;
  customEndpoints: StoredCustomEndpointRecord[];
}

/**
 * Menentukan path file penyimpanan ~/.piew/providers.json
 */
export function resolveProvidersConfigPath(customPath?: string): string {
  if (customPath && customPath.trim()) {
    return path.resolve(customPath.trim());
  }
  if (process.env.PIEW_PROVIDERS_CONFIG_PATH && process.env.PIEW_PROVIDERS_CONFIG_PATH.trim()) {
    return path.resolve(process.env.PIEW_PROVIDERS_CONFIG_PATH.trim());
  }
  return path.join(os.homedir(), ".piew", "providers.json");
}

/**
 * Generator slug unik untuk providerId dari name
 * Contoh: "Lyra PC" -> "lyra-pc", "Local Vision" -> "local-vision"
 */
export function slugifyProviderName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "custom-provider";
}

/**
 * Mendeteksi apakah endpoint mengarah ke localhost atau jaringan privat / Tailscale
 */
export function isLocalEndpointUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      hostname.startsWith("100.") || // Tailscale Carrier-Grade NAT
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.20.") ||
      hostname.startsWith("172.21.") ||
      hostname.startsWith("172.22.") ||
      hostname.startsWith("172.23.") ||
      hostname.startsWith("172.24.") ||
      hostname.startsWith("172.25.") ||
      hostname.startsWith("172.26.") ||
      hostname.startsWith("172.27.") ||
      hostname.startsWith("172.28.") ||
      hostname.startsWith("172.29.") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Membaca data registry dari disk.
 * Jika file belum ada, kembalikan store kosong.
 */
export async function readRegistryStore(storePath?: string): Promise<RegistryStoreData> {
  const filePath = resolveProvidersConfigPath(storePath);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    if (data && Array.isArray(data.customEndpoints)) {
      return {
        version: data.version || "1.0",
        customEndpoints: data.customEndpoints,
      };
    }
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      // Jika terjadi error selain file not found, jangan biarkan crash
      console.warn(`[RegistryStore] Warning membaca ${filePath}: ${err.message}`);
    }
  }
  return {
    version: "1.0",
    customEndpoints: [],
  };
}

/**
 * Menyimpan data registry ke disk dengan permission aman (0o600).
 */
export async function writeRegistryStore(
  data: RegistryStoreData,
  storePath?: string
): Promise<void> {
  const filePath = resolveProvidersConfigPath(storePath);
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });
  const content = JSON.stringify(data, null, 2);

  await fs.writeFile(filePath, content, {
    encoding: "utf-8",
    mode: 0o600, // Read/write hanya untuk pemilik akun (Zero secret leakage)
  });
}

/**
 * Resolve nilai API key sebenarnya dari envKeyRef atau savedApiKey.
 * Digunakan internal saat runtime komunikasi LLM saja.
 */
export function resolveActualApiKey(
  record: StoredCustomEndpointRecord,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  if (record.savedApiKey && record.savedApiKey.trim()) {
    return record.savedApiKey.trim();
  }
  if (record.envKeyRef && record.envKeyRef.trim()) {
    const rawRef = record.envKeyRef.trim();
    // Parse ${VAR_NAME} atau VAR_NAME
    const match = rawRef.match(/^\$\{?([A-Za-z0-9_]+)\}?$/);
    const varName = match ? match[1] : rawRef;
    const envVal = env[varName];
    if (envVal && envVal.trim()) {
      return envVal.trim();
    }
  }
  return undefined;
}

/**
 * Sanitasi record custom endpoint untuk konsumsi publik (Zero Secret Leakage).
 * Plaintext API key TIDAK PERNAH dikembalikan ke client / log.
 */
export function sanitizeEndpointForPublic(record: StoredCustomEndpointRecord): CustomEndpointConfig {
  const { savedApiKey, ...safeConfig } = record;
  return {
    ...safeConfig,
    hasSavedKey: Boolean(savedApiKey && savedApiKey.trim()),
  };
}

/**
 * Mengambil seluruh custom endpoint yang terdaftar.
 * Default: Zero secret leakage (API key disembunyikan/dihapus).
 */
export async function listCustomEndpoints(options?: {
  storePath?: string;
  includeSecrets?: boolean;
}): Promise<CustomEndpointConfig[]> {
  const store = await readRegistryStore(options?.storePath);
  if (options?.includeSecrets) {
    return store.customEndpoints.map((rec) => ({
      ...rec,
      hasSavedKey: Boolean(rec.savedApiKey && rec.savedApiKey.trim()),
    }));
  }
  return store.customEndpoints.map(sanitizeEndpointForPublic);
}

/**
 * Mengambil satu custom endpoint berdasarkan ID atau providerId.
 */
export async function getCustomEndpoint(
  idOrProviderId: string,
  options?: { storePath?: string; includeSecrets?: boolean }
): Promise<CustomEndpointConfig | null> {
  const store = await readRegistryStore(options?.storePath);
  const found = store.customEndpoints.find(
    (e) => e.id === idOrProviderId || e.providerId === idOrProviderId
  );
  if (!found) return null;
  if (options?.includeSecrets) {
    return {
      ...found,
      hasSavedKey: Boolean(found.savedApiKey && found.savedApiKey.trim()),
    };
  }
  return sanitizeEndpointForPublic(found);
}

/**
 * Menyimpan / memperbarui custom endpoint (CRUD Upsert).
 * Mendukung perilaku "Leave blank to keep current key".
 */
export async function saveCustomEndpoint(
  input: CustomEndpointInput,
  options?: { storePath?: string }
): Promise<CustomEndpointConfig> {
  const validated = CustomEndpointInputSchema.parse(input);
  const store = await readRegistryStore(options?.storePath);

  const existingIdx = validated.id
    ? store.customEndpoints.findIndex((e) => e.id === validated.id)
    : -1;

  let existingRecord: StoredCustomEndpointRecord | undefined;
  if (existingIdx >= 0) {
    existingRecord = store.customEndpoints[existingIdx];
  }

  // Generate unik slug providerId
  let targetSlug = validated.providerId ? slugifyProviderName(validated.providerId) : slugifyProviderName(validated.name);
  // Pastikan slug unik jika endpoint baru atau berbeda
  let candidateSlug = targetSlug;
  let counter = 2;
  while (
    store.customEndpoints.some(
      (e) => e.providerId === candidateSlug && (!existingRecord || e.id !== existingRecord.id)
    )
  ) {
    candidateSlug = `${targetSlug}-${counter}`;
    counter++;
  }
  targetSlug = candidateSlug;

  const now = new Date().toISOString();
  const id = existingRecord?.id || validated.id || crypto.randomUUID();

  // Perilaku "Leave blank to keep current key":
  // Jika apiKey tidak diberikan atau kosong string, dan existingRecord memiliki savedApiKey, pertahankan!
  let savedApiKey = existingRecord?.savedApiKey;
  if (validated.apiKey !== undefined && validated.apiKey.trim().length > 0) {
    savedApiKey = validated.apiKey.trim();
  }

  const isLocal =
    validated.isLocal !== undefined
      ? validated.isLocal
      : isLocalEndpointUrl(validated.endpointUrl);

  const newRecord: StoredCustomEndpointRecord = {
    id,
    name: validated.name.trim(),
    providerId: targetSlug,
    endpointUrl: validated.endpointUrl.trim(),
    apiMode: validated.apiMode,
    defaultModel: validated.defaultModel.trim(),
    contextLength: validated.contextLength,
    envKeyRef: validated.envKeyRef?.trim() || undefined,
    savedApiKey,
    hasSavedKey: Boolean(savedApiKey && savedApiKey.trim()),
    useForNewChats: validated.useForNewChats ?? false,
    discoverModels: validated.discoverModels ?? true,
    isActive: validated.isActive ?? true,
    isLocal,
    createdAt: existingRecord?.createdAt || now,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    store.customEndpoints[existingIdx] = newRecord;
  } else {
    store.customEndpoints.push(newRecord);
  }

  await writeRegistryStore(store, options?.storePath);
  return sanitizeEndpointForPublic(newRecord);
}

/**
 * Menghapus custom endpoint berdasarkan ID atau providerId.
 */
export async function deleteCustomEndpoint(
  idOrProviderId: string,
  options?: { storePath?: string }
): Promise<boolean> {
  const store = await readRegistryStore(options?.storePath);
  const initialLength = store.customEndpoints.length;
  store.customEndpoints = store.customEndpoints.filter(
    (e) => e.id !== idOrProviderId && e.providerId !== idOrProviderId
  );
  if (store.customEndpoints.length !== initialLength) {
    await writeRegistryStore(store, options?.storePath);
    return true;
  }
  return false;
}

/**
 * Mengubah status aktif/nonaktif custom endpoint.
 */
export async function setActiveCustomEndpoint(
  idOrProviderId: string,
  isActive: boolean,
  options?: { storePath?: string }
): Promise<CustomEndpointConfig | null> {
  const store = await readRegistryStore(options?.storePath);
  const found = store.customEndpoints.find(
    (e) => e.id === idOrProviderId || e.providerId === idOrProviderId
  );
  if (!found) return null;

  found.isActive = isActive;
  found.updatedAt = new Date().toISOString();
  await writeRegistryStore(store, options?.storePath);
  return sanitizeEndpointForPublic(found);
}

/**
 * Factory & Resolver Universal:
 * Menyelesaikan providerId atau customEndpointId menjadi instance LLMProviderAdapter yang siap pakai.
 * Memeriksa Custom Endpoints terlebih dahulu, kemudian fallback ke Built-in Catalog.
 */
export async function resolveProviderAdapter(
  providerOrEndpointId: string,
  options?: {
    targetModel?: string;
    storePath?: string;
    env?: NodeJS.ProcessEnv;
    fetchFn?: typeof fetch;
  }
): Promise<LLMProviderAdapter> {
  const env = options?.env || process.env;
  const store = await readRegistryStore(options?.storePath);

  // 1. Cek apakah cocok dengan Custom Endpoint
  const custom = store.customEndpoints.find(
    (e) =>
      (e.id === providerOrEndpointId || e.providerId === providerOrEndpointId) &&
      e.isActive !== false
  );

  if (custom) {
    const actualKey = resolveActualApiKey(custom, env);
    return new CustomEndpointAdapter({
      endpointUrl: custom.endpointUrl,
      apiMode: custom.apiMode,
      apiKey: actualKey,
      defaultModel: options?.targetModel || custom.defaultModel,
      providerId: custom.providerId,
      fetchFn: options?.fetchFn,
    });
  }

  // 2. Cek apakah cocok dengan Built-in Provider Catalog
  const catalogList = listCatalogProviders(env);
  const builtIn = catalogList.find(
    (c) => c.providerId.toLowerCase() === providerOrEndpointId.toLowerCase()
  );

  if (builtIn) {
    // Gunakan factory bawaan
    return createProviderAdapter(builtIn.providerId as any);
  }

  throw new ProviderAdapterError(
    `Provider atau Custom Endpoint "${providerOrEndpointId}" tidak ditemukan atau tidak aktif.`,
    "PROVIDER_UNAVAILABLE",
    404,
    providerOrEndpointId
  );
}
