import {
  ProviderCapability,
  ProviderId,
} from "@prompt-workspace/prompt-contracts";
import {
  LLMProviderAdapter,
  ProviderAdapterError,
} from "./types.js";
import { GroqAdapter } from "./groq-adapter.js";
import { GeminiAdapter } from "./gemini-adapter.js";
import { OpenRouterAdapter } from "./openrouter-adapter.js";
import { OllamaAdapter } from "./ollama-adapter.js";
import {
  CascadeCandidate,
  CascadeFailoverAdapter,
  FailoverEvent,
} from "./cascade-failover-adapter.js";

/**
 * Memeriksa apakah provider tertentu telah terkonfigurasi (tersedia API key/endpoint)
 * TANPA pernah mengembalikan atau membocorkan string nilai API key.
 */
export function isProviderConfigured(
  providerId: ProviderId | string,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const pid = String(providerId).toLowerCase();
  switch (pid) {
    case "groq": {
      if (env.GROQ_API_KEY && env.GROQ_API_KEY.trim()) return true;
      if (env.GROQ_API_KEYS && env.GROQ_API_KEYS.trim()) return true;
      for (let i = 1; i <= 6; i++) {
        if (env[`GROQ_API_KEY_${i}`] && env[`GROQ_API_KEY_${i}`]!.trim()) return true;
      }
      return false;
    }
    case "gemini": {
      if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim()) return true;
      if (env.GEMINI_API_KEYS && env.GEMINI_API_KEYS.trim()) return true;
      for (let i = 1; i <= 6; i++) {
        if (env[`GEMINI_API_KEY_${i}`] && env[`GEMINI_API_KEY_${i}`]!.trim()) return true;
      }
      return false;
    }
    case "openrouter": {
      return Boolean(env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.trim());
    }
    case "ollama": {
      return (
        env.OLLAMA_ENABLED === "true" ||
        Boolean(env.OLLAMA_BASE_URL && env.OLLAMA_BASE_URL.trim())
      );
    }
    default:
      return false;
  }
}

/**
 * Mengembalikan daftar kapabilitas seluruh provider yang didukung.
 * Nilai status configured bersifat boolean aman tanpa membocorkan secret API key.
 */
export function listProviderCapabilities(
  env: NodeJS.ProcessEnv = process.env
): ProviderCapability[] {
  return [
    {
      providerId: "groq",
      displayName: "Groq Cloud (Fast LPUs)",
      defaultModel: "llama-3.3-70b-versatile",
      availableModels: [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "openai/gpt-oss-120b",
      ],
      supportsJsonMode: true,
      isLocal: false,
      configured: isProviderConfigured("groq", env),
      description:
        "Inferensi super cepat berbasis LPU dengan rotasi multi-key otomatis untuk keandalan tinggi.",
    },
    {
      providerId: "gemini",
      displayName: "Google Gemini",
      defaultModel: "gemini-2.5-flash",
      availableModels: [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-2.0-flash",
      ],
      supportsJsonMode: true,
      isLocal: false,
      configured: isProviderConfigured("gemini", env),
      description:
        "Model multimodal canggih dari Google dengan jendela konteks luas dan penalaran tajam.",
    },
    {
      providerId: "openrouter",
      displayName: "OpenRouter (Unified Gateway)",
      defaultModel: "meta-llama/llama-3.3-70b-instruct",
      availableModels: [
        "meta-llama/llama-3.3-70b-instruct",
        "deepseek/deepseek-chat",
        "anthropic/claude-3.5-sonnet",
        "openai/gpt-4o-mini",
      ],
      supportsJsonMode: true,
      isLocal: false,
      configured: isProviderConfigured("openrouter", env),
      description:
        "Gateway multi-model global yang menghubungkan ke ratusan model open-source dan proprietary.",
    },
    {
      providerId: "ollama",
      displayName: "Ollama (Lokal / Self-Hosted)",
      defaultModel: "llama3.2",
      availableModels: [
        "llama3.2",
        "qwen2.5-coder",
        "mistral",
      ],
      supportsJsonMode: true,
      isLocal: true,
      configured: isProviderConfigured("ollama", env),
      description:
        "Eksekusi LLM secara mandiri di mesin lokal tanpa biaya API eksternal dan privasi total.",
    },
  ];
}

/**
 * Mencari kapabilitas provider tertentu berdasarkan ID.
 */
export function getProviderCapability(
  providerId: ProviderId | string,
  env: NodeJS.ProcessEnv = process.env
): ProviderCapability | undefined {
  const list = listProviderCapabilities(env);
  const target = String(providerId).toLowerCase();
  return list.find((p) => p.providerId === target);
}

export interface CreateProviderAdapterOptions {
  providerId?: ProviderId | string | null;
  targetModel?: string | null;
  env?: NodeJS.ProcessEnv;
  fetchFn?: typeof fetch;
  enableCascade?: boolean;
  onFailover?: (event: FailoverEvent) => void;
}

export interface CreateCascadeAdapterOptions {
  primaryProviderId?: ProviderId | string | null;
  targetModel?: string | null;
  env?: NodeJS.ProcessEnv;
  fetchFn?: typeof fetch;
  includeLocalOllama?: boolean;
  maxCascadeHops?: number;
  onFailover?: (event: FailoverEvent) => void;
}

/**
 * Factory untuk instansiasi CascadeFailoverAdapter secara otomatis.
 * Memindai environment dan menyusun prioritas failover lintas-provider.
 */
export function createCascadeAdapter(
  options: CreateCascadeAdapterOptions = {}
): CascadeFailoverAdapter {
  const env = options.env || process.env;
  const primaryId = (options.primaryProviderId || "groq").trim().toLowerCase();
  const targetModel = options.targetModel?.trim() || undefined;

  const candidates: CascadeCandidate[] = [];
  const supportedProviders: string[] = ["groq", "gemini", "openrouter", "ollama"];

  // Urutan hierarki failover default yang cerdas:
  // Mulai dari primary -> provider cloud lainnya -> local ollama
  const providerSequence: string[] = [primaryId];
  for (const pid of supportedProviders) {
    if (pid !== primaryId) {
      providerSequence.push(pid);
    }
  }

  let currentPriority = 1;
  for (const pid of providerSequence) {
    if (isProviderConfigured(pid, env)) {
      try {
        const adapter = createProviderAdapter({
          providerId: pid,
          targetModel: pid === primaryId ? targetModel : undefined,
          env,
          fetchFn: options.fetchFn,
          enableCascade: false, // Jangan rekursif di dalam child
        });

        candidates.push({
          providerId: pid,
          adapter,
          priority: currentPriority++,
          model: pid === primaryId ? targetModel : undefined,
        });
      } catch {
        // Lewati provider jika gagal instansiasi
      }
    }
  }

  // Jika tidak ada provider yang terkonfigurasi selain primary (atau tidak ada sama sekali),
  // pastikan setidaknya primary adapter terdaftar (agar melempar error konfigurasi asli saat dipanggil)
  if (candidates.length === 0) {
    const fallbackAdapter = createProviderAdapter({
      providerId: primaryId,
      targetModel,
      env,
      fetchFn: options.fetchFn,
      enableCascade: false,
    });
    candidates.push({
      providerId: primaryId,
      adapter: fallbackAdapter,
      priority: 1,
      model: targetModel,
    });
  }

  return new CascadeFailoverAdapter({
    primaryProviderId: primaryId,
    targetModel,
    candidates,
    maxCascadeHops: options.maxCascadeHops,
    onFailover: options.onFailover,
    env,
    fetchFn: options.fetchFn,
  });
}

/**
 * Factory untuk instansiasi adapter provider yang sesuai.
 * Melempar error terstruktur jika provider tidak didukung atau belum dikonfigurasi.
 */
export function createProviderAdapter(
  options: CreateProviderAdapterOptions = {}
): LLMProviderAdapter {
  const env = options.env || process.env;
  const rawId = (options.providerId || "groq").trim().toLowerCase();
  const targetModel = options.targetModel?.trim() || undefined;

  // Jika diminta mode cascade failover
  if (rawId === "cascade" || options.enableCascade === true) {
    return createCascadeAdapter({
      primaryProviderId: rawId === "cascade" ? "groq" : rawId,
      targetModel,
      env,
      fetchFn: options.fetchFn,
      onFailover: options.onFailover,
    });
  }

  switch (rawId) {
    case "groq": {
      if (!isProviderConfigured("groq", env)) {
        throw new ProviderAdapterError(
          "Kunci API Groq belum dikonfigurasi di file .env server.",
          "AUTH_ERROR",
          401,
          "groq"
        );
      }
      const explicitKeys: string[] = [];
      for (let i = 1; i <= 6; i++) {
        if (env[`GROQ_API_KEY_${i}`]) explicitKeys.push(env[`GROQ_API_KEY_${i}`]!.trim());
      }
      if (env.GROQ_API_KEY) explicitKeys.push(env.GROQ_API_KEY.trim());
      if (env.GROQ_API_KEYS) {
        explicitKeys.push(...env.GROQ_API_KEYS.split(",").map((k) => k.trim()));
      }
      return new GroqAdapter(explicitKeys.length > 0 ? explicitKeys : undefined);
    }
    case "gemini": {
      if (!isProviderConfigured("gemini", env)) {
        throw new ProviderAdapterError(
          "Kunci API Google Gemini (GEMINI_API_KEY) belum dikonfigurasi di file .env server.",
          "AUTH_ERROR",
          401,
          "gemini"
        );
      }
      return new GeminiAdapter({
        model: targetModel,
        fetchFn: options.fetchFn,
        apiKey: env.GEMINI_API_KEY,
      });
    }
    case "openrouter": {
      if (!isProviderConfigured("openrouter", env)) {
        throw new ProviderAdapterError(
          "Kunci API OpenRouter (OPENROUTER_API_KEY) belum dikonfigurasi di file .env server.",
          "AUTH_ERROR",
          401,
          "openrouter"
        );
      }
      return new OpenRouterAdapter({
        model: targetModel,
        fetchFn: options.fetchFn,
        apiKey: env.OPENROUTER_API_KEY,
      });
    }
    case "ollama": {
      return new OllamaAdapter({
        model: targetModel,
        baseURL: env.OLLAMA_BASE_URL,
        fetchFn: options.fetchFn,
      });
    }
    default: {
      throw new ProviderAdapterError(
        `Provider '${rawId}' tidak didukung. Provider yang tersedia: groq, gemini, openrouter, ollama.`,
        "INVALID_REQUEST",
        400
      );
    }
  }
}
