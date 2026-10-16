import { CatalogProviderItem } from "@prompt-workspace/prompt-contracts";
import { maskKey } from "./redact.js";

export interface CatalogProviderDefinition {
  providerId: string;
  displayName: string;
  description: string;
  getKeyUrl: string;
  defaultModel: string;
  availableModels: string[];
  envKeyNames: string[];
  isLocal?: boolean;
}

export const BUILT_IN_CATALOG: CatalogProviderDefinition[] = [
  {
    providerId: "groq",
    displayName: "Groq Cloud (Fast LPUs)",
    description: "Inferensi ultra-cepat berbasis LPU dengan throughput tinggi untuk eksekusi real-time.",
    getKeyUrl: "https://console.groq.com/keys",
    defaultModel: "llama-3.3-70b-versatile",
    availableModels: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "openai/gpt-oss-120b",
      "qwen/qwen-2.5-coder-32b",
    ],
    envKeyNames: ["GROQ_API_KEY", "GROQ_API_KEYS", "GROQ_API_KEY_1"],
  },
  {
    providerId: "openrouter",
    displayName: "OpenRouter (Unified Gateway)",
    description: "Gateway agregator global yang menghubungkan ke ratusan model frontier dan open-source.",
    getKeyUrl: "https://openrouter.ai/keys",
    defaultModel: "meta-llama/llama-3.3-70b-instruct",
    availableModels: [
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
    ],
    envKeyNames: ["OPENROUTER_API_KEY"],
  },
  {
    providerId: "fireworks",
    displayName: "Fireworks AI",
    description: "Platform inferensi model open-source berkecepatan tinggi dengan latensi rendah.",
    getKeyUrl: "https://fireworks.ai/api-keys",
    defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    availableModels: [
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/deepseek-v3",
      "accounts/fireworks/models/qwen2p5-coder-32b-instruct",
    ],
    envKeyNames: ["FIREWORKS_API_KEY"],
  },
  {
    providerId: "anthropic",
    displayName: "Anthropic Claude",
    description: "Model frontier Claude dengan standar penalaran arsitektur dan coding tertinggi.",
    getKeyUrl: "https://console.anthropic.com/settings/keys",
    defaultModel: "claude-3-5-sonnet-20241022",
    availableModels: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    envKeyNames: ["ANTHROPIC_API_KEY"],
  },
  {
    providerId: "xai",
    displayName: "xAI (Grok)",
    description: "Platform AI frontier dari xAI dengan pemahaman konteks mendalam.",
    getKeyUrl: "https://console.x.ai/",
    defaultModel: "grok-2-1212",
    availableModels: [
      "grok-2-1212",
      "grok-2-vision-1212",
      "grok-beta",
    ],
    envKeyNames: ["XAI_API_KEY"],
  },
  {
    providerId: "deepseek",
    displayName: "DeepSeek",
    description: "Model reasoning dan coding open-weights terdepan dengan efisiensi biaya maksimal.",
    getKeyUrl: "https://platform.deepseek.com/api_keys",
    defaultModel: "deepseek-chat",
    availableModels: [
      "deepseek-chat",
      "deepseek-reasoner",
    ],
    envKeyNames: ["DEEPSEEK_API_KEY"],
  },
  {
    providerId: "minimax",
    displayName: "MiniMax (Global)",
    description: "Model multimodal dan teks frontier berskala besar dari MiniMax Global.",
    getKeyUrl: "https://platform.minimax.io/",
    defaultModel: "MiniMax-Text-01",
    availableModels: [
      "MiniMax-Text-01",
      "abab6.5s-chat",
    ],
    envKeyNames: ["MINIMAX_API_KEY"],
  },
  {
    providerId: "minimax-cn",
    displayName: "MiniMax (China)",
    description: "Endpoint MiniMax domestik China untuk pemrosesan berkecepatan tinggi di Asia.",
    getKeyUrl: "https://platform.minimaxi.com/",
    defaultModel: "abab6.5s-chat",
    availableModels: [
      "abab6.5s-chat",
      "MiniMax-Text-01",
    ],
    envKeyNames: ["MINIMAX_CN_API_KEY"],
  },
  {
    providerId: "opencode-zen",
    displayName: "OpenCode Zen",
    description: "Spesialis model pemrograman teroptimasi untuk coding assist dan rekayasa software.",
    getKeyUrl: "https://opencode.net/",
    defaultModel: "opencode-zen-coder-32b",
    availableModels: [
      "opencode-zen-coder-32b",
      "opencode-zen-coder-7b",
    ],
    envKeyNames: ["OPENCODE_ZEN_API_KEY"],
  },
  {
    providerId: "gemini",
    displayName: "Google Gemini",
    description: "Model multimodal canggih dari Google dengan jendela konteks 2M token.",
    getKeyUrl: "https://aistudio.google.com/app/apikey",
    defaultModel: "gemini-2.5-flash",
    availableModels: [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
    ],
    envKeyNames: ["GEMINI_API_KEY", "GEMINI_API_KEYS", "GEMINI_API_KEY_1"],
  },
  {
    providerId: "ollama",
    displayName: "Ollama (Lokal / Self-Hosted)",
    description: "Eksekusi model open-weights di mesin lokal tanpa biaya API dan privasi 100%.",
    getKeyUrl: "",
    defaultModel: "llama3.2",
    availableModels: [
      "llama3.2",
      "qwen2.5-coder",
      "mistral",
      "deepseek-r1:latest",
    ],
    envKeyNames: ["OLLAMA_BASE_URL", "OLLAMA_ENABLED"],
    isLocal: true,
  },
];

/**
 * Mencari apakah sebuah provider memiliki key terkonfigurasi di env.
 * Mengembalikan maskedKeyHint (misal "${GROQ_API_KEY}" atau "••••9a2f") tanpa pernah membocorkan key asli.
 */
function resolveConfiguredHint(
  def: CatalogProviderDefinition,
  env: NodeJS.ProcessEnv
): { configured: boolean; maskedKeyHint?: string } {
  if (def.isLocal) {
    const isConfigured =
      env.OLLAMA_ENABLED === "true" ||
      Boolean(env.OLLAMA_BASE_URL && env.OLLAMA_BASE_URL.trim());
    return {
      configured: isConfigured,
      maskedKeyHint: isConfigured ? "Local Daemon Active" : undefined,
    };
  }

  for (const envName of def.envKeyNames) {
    const rawVal = env[envName];
    if (rawVal && rawVal.trim()) {
      return {
        configured: true,
        maskedKeyHint: `\${${envName}} (${maskKey(rawVal.trim())})`,
      };
    }
  }

  return {
    configured: false,
    maskedKeyHint: undefined,
  };
}

/**
 * Mengembalikan seluruh item katalog provider bawaan dengan status configured & masked hint.
 * Zero naked secret leakage.
 */
export function listCatalogProviders(
  env: NodeJS.ProcessEnv = process.env
): CatalogProviderItem[] {
  return BUILT_IN_CATALOG.map((def) => {
    const { configured, maskedKeyHint } = resolveConfiguredHint(def, env);
    return {
      providerId: def.providerId,
      displayName: def.displayName,
      description: def.description,
      getKeyUrl: def.getKeyUrl,
      configured,
      maskedKeyHint,
      defaultModel: def.defaultModel,
      availableModels: [...def.availableModels],
    };
  });
}

/**
 * Mengambil satu katalog provider berdasarkan ID.
 */
export function getCatalogProvider(
  providerId: string,
  env: NodeJS.ProcessEnv = process.env
): CatalogProviderItem | undefined {
  const normalized = String(providerId).trim().toLowerCase();
  const list = listCatalogProviders(env);
  return list.find((p) => p.providerId.toLowerCase() === normalized);
}
