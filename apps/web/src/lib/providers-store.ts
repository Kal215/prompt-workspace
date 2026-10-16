import fs from "fs";
import path from "path";
import os from "os";

export interface CustomEndpointConfig {
  id: string;
  name: string;
  providerId: string;
  endpointUrl: string;
  apiMode: "Auto-detect" | "Chat Completions" | "Responses API" | "Anthropic Messages";
  defaultModel: string;
  context: string;
  apiKey?: string;
  apiKeyRef?: string;
  useForNewChats: boolean;
  discoverModels: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CloudProviderMeta {
  providerId: string;
  name: string;
  hasKey: boolean;
  maskedKey: string | null;
  description: string;
  docUrl: string;
  envVarName: string;
}

export interface StoredProvidersData {
  cloudKeys: Record<string, string>;
  customEndpoints: CustomEndpointConfig[];
  activeEndpointId: string | null;
}

export const CLOUD_PROVIDERS_CATALOG: Omit<CloudProviderMeta, "hasKey" | "maskedKey">[] = [
  {
    providerId: "fireworks",
    name: "Fireworks AI",
    description: "Inference ultra-cepat untuk open source models & LoRA",
    docUrl: "https://fireworks.ai/account/api-keys",
    envVarName: "FIREWORKS_API_KEY",
  },
  {
    providerId: "openrouter",
    name: "OpenRouter",
    description: "Aggregator for hundreds of frontier models",
    docUrl: "https://openrouter.ai/keys",
    envVarName: "OPENROUTER_API_KEY",
  },
  {
    providerId: "anthropic",
    name: "Anthropic",
    description: "Akses resmi Claude 3.5 Sonnet, Claude 3 Opus, dan Haiku",
    docUrl: "https://console.anthropic.com/settings/keys",
    envVarName: "ANTHROPIC_API_KEY",
  },
  {
    providerId: "xai",
    name: "xAI",
    description: "Model Grok generasi mutakhir oleh xAI",
    docUrl: "https://console.x.ai/",
    envVarName: "XAI_API_KEY",
  },
  {
    providerId: "deepseek",
    name: "DeepSeek",
    description: "Model penalaran mendalam DeepSeek V3 & DeepSeek R1",
    docUrl: "https://platform.deepseek.com/api_keys",
    envVarName: "DEEPSEEK_API_KEY",
  },
  {
    providerId: "minimax",
    name: "MiniMax",
    description: "Model teks & multimodal berkecepatan tinggi MiniMax-Text-01",
    docUrl: "https://intl.minimaxi.com/user-center/basic-information/interface-key",
    envVarName: "MINIMAX_API_KEY",
  },
  {
    providerId: "minimax-cn",
    name: "MiniMax (China)",
    description: "Gerbang endpoint domestik Cina untuk integrasi MiniMax",
    docUrl: "https://api.minimax.chat/",
    envVarName: "MINIMAX_CN_API_KEY",
  },
  {
    providerId: "opencode-zen",
    name: "OpenCode Zen",
    description: "Model kecerdasan kode pemrograman & rekayasa perangkat lunak",
    docUrl: "https://opencode.ai/keys",
    envVarName: "OPENCODE_ZEN_API_KEY",
  },
  {
    providerId: "groq",
    name: "Groq Cloud",
    description: "Ultra-low latency LPU inference untuk Llama 3 & open models",
    docUrl: "https://console.groq.com/keys",
    envVarName: "GROQ_API_KEY_1",
  },
  {
    providerId: "gemini",
    name: "Google Gemini",
    description: "Google Gemini 2.0 Flash & Gemini 1.5 Pro multimodal models",
    docUrl: "https://aistudio.google.com/app/apikey",
    envVarName: "GEMINI_API_KEY",
  },
];

const DEFAULT_CUSTOM_ENDPOINT: CustomEndpointConfig = {
  id: "lyra-pc",
  name: "lyra pc",
  providerId: "lyra-pc",
  endpointUrl: "http://100.127.180.57:20128/v1",
  apiMode: "Chat Completions",
  defaultModel: "hermes-agent",
  context: "Auto",
  apiKeyRef: "${HERMES_CUSTOM_LYRA_PC_API_KEY}",
  apiKey: "",
  useForNewChats: true,
  discoverModels: true,
  isActive: true,
  createdAt: "2026-10-16T10:00:00.000Z",
  updatedAt: "2026-10-16T10:00:00.000Z",
};

function getStorageFilePath(): string {
  try {
    const piewDir = path.join(os.homedir(), ".piew");
    if (!fs.existsSync(piewDir)) {
      fs.mkdirSync(piewDir, { recursive: true });
    }
    return path.join(piewDir, "providers-config.json");
  } catch {
    return path.join(process.cwd(), ".providers-config.json");
  }
}

export function maskApiKey(rawKey?: string | null): string | null {
  if (!rawKey || typeof rawKey !== "string" || rawKey.trim().length === 0) {
    return null;
  }
  const trimmed = rawKey.trim();
  if (trimmed.length <= 8) {
    return "••••••••";
  }
  return `••••••••••••${trimmed.slice(-4)}`;
}

export function loadRawProvidersData(): StoredProvidersData {
  const filePath = getStorageFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        cloudKeys: parsed.cloudKeys && typeof parsed.cloudKeys === "object" ? parsed.cloudKeys : {},
        customEndpoints: Array.isArray(parsed.customEndpoints) ? parsed.customEndpoints : [DEFAULT_CUSTOM_ENDPOINT],
        activeEndpointId: typeof parsed.activeEndpointId === "string" ? parsed.activeEndpointId : "lyra-pc",
      };
    }
  } catch (err) {
    console.warn("[PROVIDERS_STORE_LOAD_WARN]", (err as Error).message);
  }

  return {
    cloudKeys: {},
    customEndpoints: [DEFAULT_CUSTOM_ENDPOINT],
    activeEndpointId: "lyra-pc",
  };
}

export function saveRawProvidersData(data: StoredProvidersData): void {
  const filePath = getStorageFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[PROVIDERS_STORE_SAVE_ERROR]", (err as Error).message);
  }
}

export function getSanitizedProvidersConfig() {
  const rawData = loadRawProvidersData();

  // Susun daftar metadata cloud providers dengan masking
  const cloudKeys: CloudProviderMeta[] = CLOUD_PROVIDERS_CATALOG.map((cat) => {
    // Periksa kunci dari store atau environment process.env
    const storedKey = rawData.cloudKeys[cat.providerId];
    const envKey = process.env[cat.envVarName];
    const activeKey = storedKey || envKey || null;

    return {
      ...cat,
      hasKey: Boolean(activeKey && activeKey.trim().length > 0),
      maskedKey: maskApiKey(activeKey),
    };
  });

  // Susun custom endpoints ter-sanitasi tanpa membocorkan raw plaintext key
  const customEndpoints = rawData.customEndpoints.map((ep) => {
    const isAct = ep.id === rawData.activeEndpointId || ep.isActive;
    return {
      id: ep.id,
      name: ep.name,
      providerId: ep.providerId,
      endpointUrl: ep.endpointUrl,
      apiMode: ep.apiMode,
      defaultModel: ep.defaultModel,
      context: ep.context,
      apiKeyRef: ep.apiKeyRef || (ep.apiKey ? "${CUSTOM_ENDPOINT_KEY}" : undefined),
      hasKey: Boolean(ep.apiKey && ep.apiKey.trim().length > 0),
      maskedKey: maskApiKey(ep.apiKey),
      useForNewChats: ep.useForNewChats,
      discoverModels: ep.discoverModels,
      isActive: isAct,
      createdAt: ep.createdAt,
      updatedAt: ep.updatedAt,
    };
  });

  return {
    cloudKeys,
    customEndpoints,
    activeEndpointId: rawData.activeEndpointId,
  };
}

export function saveCloudProviderKey(providerId: string, apiKey: string): { success: boolean; message: string } {
  const rawData = loadRawProvidersData();
  const catalogEntry = CLOUD_PROVIDERS_CATALOG.find((c) => c.providerId === providerId);
  if (!catalogEntry) {
    return { success: false, message: `Penyedia ${providerId} tidak dikenali.` };
  }

  const trimmed = apiKey.trim();
  if (trimmed.length > 0) {
    rawData.cloudKeys[providerId] = trimmed;
    process.env[catalogEntry.envVarName] = trimmed;
  } else {
    delete rawData.cloudKeys[providerId];
  }

  saveRawProvidersData(rawData);
  return { success: true, message: `Kunci penyedia ${catalogEntry.name} berhasil diperbarui.` };
}

export function deleteCloudProviderKey(providerId: string): { success: boolean; message: string } {
  const rawData = loadRawProvidersData();
  const catalogEntry = CLOUD_PROVIDERS_CATALOG.find((c) => c.providerId === providerId);
  delete rawData.cloudKeys[providerId];
  if (catalogEntry) {
    delete process.env[catalogEntry.envVarName];
  }
  saveRawProvidersData(rawData);
  return { success: true, message: `Kunci penyedia berhasil dihapus.` };
}

export function saveCustomEndpoint(input: Partial<CustomEndpointConfig> & { name: string; endpointUrl: string }) {
  const rawData = loadRawProvidersData();
  const now = new Date().toISOString();

  const id = (input.id || input.providerId || input.name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")).trim();
  const providerId = (input.providerId || id).trim();

  const existingIndex = rawData.customEndpoints.findIndex((e) => e.id === id);
  let finalApiKey = input.apiKey ?? "";

  // Jika sedang mengedit dan field apiKey kosong ("Leave blank to keep current key"), pertahankan kunci lama
  if (existingIndex >= 0 && (!finalApiKey || finalApiKey.trim().length === 0)) {
    finalApiKey = rawData.customEndpoints[existingIndex].apiKey || "";
  }

  const endpointItem: CustomEndpointConfig = {
    id,
    name: input.name.trim(),
    providerId,
    endpointUrl: input.endpointUrl.trim(),
    apiMode: input.apiMode || "Chat Completions",
    defaultModel: input.defaultModel?.trim() || "default",
    context: input.context?.trim() || "Auto",
    apiKey: finalApiKey,
    apiKeyRef: input.apiKeyRef || (finalApiKey ? `\${CUSTOM_${id.toUpperCase().replace(/-/g, "_")}_KEY}` : undefined),
    useForNewChats: Boolean(input.useForNewChats),
    discoverModels: input.discoverModels !== false,
    isActive: Boolean(input.isActive || input.useForNewChats),
    createdAt: existingIndex >= 0 ? rawData.customEndpoints[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    rawData.customEndpoints[existingIndex] = endpointItem;
  } else {
    rawData.customEndpoints.push(endpointItem);
  }

  if (endpointItem.useForNewChats || endpointItem.isActive) {
    rawData.activeEndpointId = endpointItem.id;
    rawData.customEndpoints.forEach((ep) => {
      ep.isActive = ep.id === endpointItem.id;
    });
  }

  saveRawProvidersData(rawData);
  return { success: true, endpoint: endpointItem, activeEndpointId: rawData.activeEndpointId };
}

export function deleteCustomEndpoint(id: string): { success: boolean; message: string } {
  const rawData = loadRawProvidersData();
  rawData.customEndpoints = rawData.customEndpoints.filter((e) => e.id !== id);
  if (rawData.activeEndpointId === id) {
    rawData.activeEndpointId = rawData.customEndpoints[0]?.id || null;
    if (rawData.customEndpoints[0]) {
      rawData.customEndpoints[0].isActive = true;
    }
  }
  saveRawProvidersData(rawData);
  return { success: true, message: `Endpoint ${id} berhasil dihapus.` };
}

export function setActiveCustomEndpoint(id: string): { success: boolean; activeEndpointId: string | null } {
  const rawData = loadRawProvidersData();
  const target = rawData.customEndpoints.find((e) => e.id === id);
  if (!target) {
    return { success: false, activeEndpointId: rawData.activeEndpointId };
  }
  rawData.activeEndpointId = id;
  rawData.customEndpoints.forEach((ep) => {
    ep.isActive = ep.id === id;
  });
  saveRawProvidersData(rawData);
  return { success: true, activeEndpointId: id };
}

export function getRawCustomEndpoint(id: string): CustomEndpointConfig | null {
  const rawData = loadRawProvidersData();
  return rawData.customEndpoints.find((e) => e.id === id) || null;
}
