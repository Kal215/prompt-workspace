import { SynthesisStylePreset, TokenBudgetMode } from "@prompt-workspace/prompt-contracts";

export interface PiewConfig {
  defaultStylePreset?: SynthesisStylePreset;
  defaultBudgetMode?: TokenBudgetMode;
  allowedDomains?: string[];
  storagePath?: string;
}

const DEFAULT_CONFIG: Required<PiewConfig> = {
  defaultStylePreset: "comprehensive_blueprint",
  defaultBudgetMode: "balanced",
  allowedDomains: [],
  storagePath: ".piew",
};

/**
 * Mencari dan memuat konfigurasi PIEW dari file lokal (piew.config.json / .piewrc.json)
 * atau variabel lingkungan PIEW_CONFIG_PATH.
 * Aman untuk browser environment (tidak membundel node:fs di client bundle Turbopack).
 */
export function loadPiewConfig(explicitPath?: string): Required<PiewConfig> {
  let loadedConfig: Partial<PiewConfig> = {};

  // Deteksi lingkungan server-side / Node.js
  if (typeof window === "undefined" && typeof process !== "undefined" && process.versions?.node) {
    try {
      // Menggunakan dynamic require agar bundler client (Next.js Turbopack) tidak memaksakan modul node:fs
      const nodeRequire = eval("require");
      const fs = nodeRequire("node:fs");
      const pathMod = nodeRequire("node:path");

      const candidates = [
        explicitPath,
        process.env.PIEW_CONFIG_PATH,
        pathMod.resolve(process.cwd(), "piew.config.json"),
        pathMod.resolve(process.cwd(), ".piewrc.json"),
      ].filter(Boolean) as string[];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          const raw = fs.readFileSync(candidate, "utf-8");
          loadedConfig = JSON.parse(raw);
          break;
        }
      }
    } catch {
      // Lewati jika require gagal atau environment non-Node
    }
  }

  const envDomains =
    typeof process !== "undefined" && process.env?.PIEW_ALLOWED_DOMAINS
      ? process.env.PIEW_ALLOWED_DOMAINS.split(",").map((d) => d.trim()).filter(Boolean)
      : [];

  const mergedDomains = Array.from(
    new Set([...(loadedConfig.allowedDomains || []), ...envDomains])
  );

  return {
    defaultStylePreset:
      loadedConfig.defaultStylePreset ||
      (typeof process !== "undefined"
        ? (process.env?.PIEW_DEFAULT_STYLE as SynthesisStylePreset)
        : undefined) ||
      DEFAULT_CONFIG.defaultStylePreset,
    defaultBudgetMode:
      loadedConfig.defaultBudgetMode ||
      (typeof process !== "undefined"
        ? (process.env?.PIEW_DEFAULT_BUDGET as TokenBudgetMode)
        : undefined) ||
      DEFAULT_CONFIG.defaultBudgetMode,
    allowedDomains: mergedDomains,
    storagePath:
      loadedConfig.storagePath ||
      (typeof process !== "undefined" ? process.env?.PIEW_STORAGE_PATH : undefined) ||
      DEFAULT_CONFIG.storagePath,
  };
}
