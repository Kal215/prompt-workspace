import {
  ProviderApiMode,
  ProviderConnectionTestResult,
} from "@prompt-workspace/prompt-contracts";
import {
  ChatMessage,
  ChatResponse,
  LLMProviderAdapter,
  ProviderAdapterError,
  ProviderAdapterOptions,
} from "./types.js";
import { maskKey } from "./redact.js";

export interface CustomEndpointAdapterOptions {
  endpointUrl: string;
  apiMode?: ProviderApiMode;
  apiKey?: string;
  defaultModel: string;
  providerId?: string;
  contextLength?: "auto" | number;
  fetchFn?: typeof fetch;
}

/**
 * Normalisasi URL dasar endpoint.
 * Menghilangkan trailing slash dan endpoint path spesifik seperti /chat/completions jika ada di endpointUrl.
 */
export function normalizeBaseEndpointUrl(rawUrl: string): string {
  let url = String(rawUrl).trim().replace(/\/+$/, "");
  // Jika pengguna memasukkan full path ke /chat/completions atau /messages atau /responses, potong ke base URL
  if (url.endsWith("/chat/completions")) {
    url = url.slice(0, -"/chat/completions".length);
  } else if (url.endsWith("/messages")) {
    url = url.slice(0, -"/messages".length);
  } else if (url.endsWith("/responses")) {
    url = url.slice(0, -"/responses".length);
  }
  return url;
}

/**
 * Melakukan auto-detection apiMode berdasarkan URL pattern atau inspeksi endpoint.
 */
export function detectApiModeFromUrl(endpointUrl: string): ProviderApiMode {
  const lower = endpointUrl.toLowerCase();
  if (lower.includes("anthropic") || lower.includes("/messages")) {
    return "anthropic_messages";
  }
  if (lower.includes("/responses")) {
    return "responses_api";
  }
  // Default standar OpenAI / vLLM / llama.cpp / Ollama
  return "chat_completions";
}

/**
 * Auto-discover models dari endpoint dengan timeout ketat 5 detik.
 * Mendukung format OpenAI ({ data: [{ id: "model-name" }] }), Ollama ({ models: [{ name: "llama3" }] }), atau array.
 */
export async function discoverEndpointModels(
  endpointUrl: string,
  apiKey?: string,
  fetchFn: typeof fetch = fetch
): Promise<string[]> {
  const baseUrl = normalizeBaseEndpointUrl(endpointUrl);
  const modelsUrl = `${baseUrl}/models`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey && apiKey.trim()) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
    headers["x-api-key"] = apiKey.trim();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetchFn(modelsUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      return [];
    }

    const json = (await res.json()) as any;
    const modelIds: string[] = [];

    // OpenAI format: { data: [ { id: "model-1" } ] }
    if (json && Array.isArray(json.data)) {
      for (const item of json.data) {
        if (typeof item === "string" && item.trim()) {
          modelIds.push(item.trim());
        } else if (item && typeof item.id === "string" && item.id.trim()) {
          modelIds.push(item.id.trim());
        }
      }
    }
    // Ollama format: { models: [ { name: "llama3:latest" } ] }
    else if (json && Array.isArray(json.models)) {
      for (const item of json.models) {
        if (item && typeof item.name === "string" && item.name.trim()) {
          modelIds.push(item.name.trim());
        } else if (item && typeof item.id === "string" && item.id.trim()) {
          modelIds.push(item.id.trim());
        }
      }
    }
    // Direct array: [ "model-1", "model-2" ]
    else if (Array.isArray(json)) {
      for (const item of json) {
        if (typeof item === "string" && item.trim()) {
          modelIds.push(item.trim());
        } else if (item && typeof item.id === "string" && item.id.trim()) {
          modelIds.push(item.id.trim());
        }
      }
    }

    return Array.from(new Set(modelIds));
  } catch (_err) {
    clearTimeout(timer);
    return [];
  }
}

export interface TestProviderConnectionOptions {
  endpointUrl: string;
  apiKey?: string;
  apiMode?: ProviderApiMode;
  providerId?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

/**
 * Connection Tester diagnostik untuk provider atau custom endpoint.
 * Mengembalikan { ok, latencyMs, detectedApiMode, discoveredModels, message }.
 */
export async function testProviderConnection(
  options: TestProviderConnectionOptions
): Promise<ProviderConnectionTestResult> {
  const fetchFn = options.fetchFn || fetch;
  const rawUrl = options.endpointUrl;
  const baseUrl = normalizeBaseEndpointUrl(rawUrl);

  const start = performance.now();
  const effectiveApiMode: ProviderApiMode =
    options.apiMode && options.apiMode !== "auto_detect"
      ? options.apiMode
      : detectApiModeFromUrl(rawUrl);

  try {
    // 1. Coba auto-discover models terlebih dahulu
    const discoveredModels = await discoverEndpointModels(baseUrl, options.apiKey, fetchFn);

    // 2. Jika models ditemukan, koneksi dasar berhasil
    if (discoveredModels.length > 0) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: true,
        latencyMs,
        detectedApiMode: effectiveApiMode,
        discoveredModels,
        message: `Koneksi sukses! Terhubung ke endpoint dan ditemukan ${discoveredModels.length} model aktif (${latencyMs}ms).`,
      };
    }

    // 3. Jika /models tidak merespons (misal endpoint tertentu atau responses_api), coba ping probe
    const probeController = new AbortController();
    const probeTimer = setTimeout(() => probeController.abort(), 6000);

    let testUrl = `${baseUrl}/chat/completions`;
    const method = "POST";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (options.apiKey && options.apiKey.trim()) {
      headers["Authorization"] = `Bearer ${options.apiKey.trim()}`;
      headers["x-api-key"] = options.apiKey.trim();
    }

    let bodyPayload: any = {
      model: options.model || "default",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    };

    if (effectiveApiMode === "anthropic_messages") {
      testUrl = `${baseUrl}/messages`;
      headers["anthropic-version"] = "2023-06-01";
      bodyPayload = {
        model: options.model || "claude-3-5-sonnet-20241022",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      };
    } else if (effectiveApiMode === "responses_api") {
      testUrl = `${baseUrl}/responses`;
      bodyPayload = {
        model: options.model || "default",
        prompt: "ping",
        max_tokens: 1,
      };
    }

    try {
      const probeRes = await fetchFn(testUrl, {
        method,
        headers,
        body: JSON.stringify(bodyPayload),
        signal: probeController.signal,
      });

      clearTimeout(probeTimer);
      const latencyMs = Math.round(performance.now() - start);

      // Status 200 OK, atau 400 Bad Request (artinya server hidup dan menerima request)
      if (probeRes.ok || probeRes.status === 400) {
        return {
          ok: true,
          latencyMs,
          detectedApiMode: effectiveApiMode,
          discoveredModels: [],
          message: `Endpoint aktif dan merespons (HTTP ${probeRes.status}, ${latencyMs}ms).`,
        };
      } else if (probeRes.status === 401 || probeRes.status === 403) {
        return {
          ok: false,
          latencyMs,
          detectedApiMode: effectiveApiMode,
          discoveredModels: [],
          message: `Gagal autentikasi (HTTP ${probeRes.status}): Periksa API Key Anda.`,
        };
      } else {
        return {
          ok: false,
          latencyMs,
          detectedApiMode: effectiveApiMode,
          discoveredModels: [],
          message: `Endpoint merespons dengan status HTTP ${probeRes.status}.`,
        };
      }
    } catch (probeErr: any) {
      clearTimeout(probeTimer);
      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: false,
        latencyMs,
        detectedApiMode: effectiveApiMode,
        discoveredModels: [],
        message: `Koneksi gagal: ${probeErr.message || "Endpoint tidak dapat dijangkau"}`,
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: false,
      latencyMs,
      detectedApiMode: effectiveApiMode,
      discoveredModels: [],
      message: `Error koneksi: ${err.message || "Unknown error"}`,
    };
  }
}

/**
 * Universal Custom Endpoint Adapter
 * Mendukung OpenAI-compatible (vLLM, llama.cpp, Ollama, 9Router, DeepSeek, dll.),
 * Anthropic Messages, Responses API, dan Auto-detect.
 */
export class CustomEndpointAdapter implements LLMProviderAdapter {
  readonly providerId: string;
  readonly defaultModel: string;
  private readonly endpointUrl: string;
  private readonly apiMode: ProviderApiMode;
  private readonly apiKey?: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: CustomEndpointAdapterOptions) {
    this.endpointUrl = normalizeBaseEndpointUrl(options.endpointUrl);
    this.defaultModel = options.defaultModel;
    this.providerId = options.providerId || "custom-endpoint";
    this.apiKey = options.apiKey?.trim();
    this.fetchFn = options.fetchFn || fetch;

    if (options.apiMode && options.apiMode !== "auto_detect") {
      this.apiMode = options.apiMode;
    } else {
      this.apiMode = detectApiModeFromUrl(this.endpointUrl);
    }
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: ProviderAdapterOptions
  ): Promise<ChatResponse> {
    const start = performance.now();
    const model = options?.model || this.defaultModel;
    const timeoutMs = options?.timeoutMs || 30000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (this.apiMode === "anthropic_messages") {
        return await this.executeAnthropicMessages(messages, model, options, controller.signal, start);
      } else if (this.apiMode === "responses_api") {
        return await this.executeResponsesApi(messages, model, options, controller.signal, start);
      } else {
        // chat_completions (OpenAI standard)
        return await this.executeChatCompletions(messages, model, options, controller.signal, start);
      }
    } catch (err: any) {
      if (err.name === "AbortError" || controller.signal.aborted) {
        throw new ProviderAdapterError(
          `Request to endpoint ${this.endpointUrl} timed out after ${timeoutMs}ms`,
          "TIMEOUT",
          504,
          this.providerId,
          err
        );
      }
      if (err instanceof ProviderAdapterError) {
        throw err;
      }
      throw new ProviderAdapterError(
        `Custom endpoint error: ${err.message}`,
        "PROVIDER_UNAVAILABLE",
        500,
        this.providerId,
        err
      );
    } finally {
      clearTimeout(timer);
    }
  }

  // 1. OpenAI Chat Completions Handler
  private async executeChatCompletions(
    messages: ChatMessage[],
    model: string,
    options: ProviderAdapterOptions | undefined,
    signal: AbortSignal,
    startTime: number
  ): Promise<ChatResponse> {
    const url = `${this.endpointUrl}/chat/completions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const payload: any = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
    };
    if (options?.maxTokens) {
      payload.max_tokens = options.maxTokens;
    }
    if (options?.responseFormat === "json") {
      payload.response_format = { type: "json_object" };
    }

    const res = await this.fetchFn(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      this.handleHttpError(res.status, errText);
    }

    const data = (await res.json()) as any;
    const latencyMs = Math.round(performance.now() - startTime);

    const content = data?.choices?.[0]?.message?.content || "";
    return {
      content,
      model: data?.model || model,
      usage: data?.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
          }
        : undefined,
      keyUsed: this.apiKey ? maskKey(this.apiKey) : undefined,
      latencyMs,
    };
  }

  // 2. Anthropic Messages Handler
  private async executeAnthropicMessages(
    messages: ChatMessage[],
    model: string,
    options: ProviderAdapterOptions | undefined,
    signal: AbortSignal,
    startTime: number
  ): Promise<ChatResponse> {
    const url = `${this.endpointUrl}/messages`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "anthropic-version": "2023-06-01",
    };
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    // Anthropic memisahkan system prompt dari messages array
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystemMsgs = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

    const payload: any = {
      model,
      messages: nonSystemMsgs.length > 0 ? nonSystemMsgs : [{ role: "user", content: " " }],
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.7,
    };
    if (systemMsg) {
      payload.system = systemMsg.content;
    }

    const res = await this.fetchFn(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      this.handleHttpError(res.status, errText);
    }

    const data = (await res.json()) as any;
    const latencyMs = Math.round(performance.now() - startTime);

    // Extract text blocks
    let content = "";
    if (Array.isArray(data?.content)) {
      content = data.content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n");
    }

    return {
      content,
      model: data?.model || model,
      usage: data?.usage
        ? {
            promptTokens: data.usage.input_tokens || 0,
            completionTokens: data.usage.output_tokens || 0,
          }
        : undefined,
      keyUsed: this.apiKey ? maskKey(this.apiKey) : undefined,
      latencyMs,
    };
  }

  // 3. Responses API Handler
  private async executeResponsesApi(
    messages: ChatMessage[],
    model: string,
    options: ProviderAdapterOptions | undefined,
    signal: AbortSignal,
    startTime: number
  ): Promise<ChatResponse> {
    const url = `${this.endpointUrl}/responses`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
      headers["x-api-key"] = this.apiKey;
    }

    // Format prompt dari deretan messages
    const prompt = messages.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join("\n\n");
    const payload: any = {
      model,
      prompt,
      max_tokens: options?.maxTokens || 2048,
      temperature: options?.temperature ?? 0.7,
    };

    const res = await this.fetchFn(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      this.handleHttpError(res.status, errText);
    }

    const data = (await res.json()) as any;
    const latencyMs = Math.round(performance.now() - startTime);

    const content = data?.response || data?.text || data?.content || "";
    return {
      content,
      model: data?.model || model,
      usage: data?.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
          }
        : undefined,
      keyUsed: this.apiKey ? maskKey(this.apiKey) : undefined,
      latencyMs,
    };
  }

  private handleHttpError(status: number, errText: string): never {
    if (status === 401 || status === 403) {
      throw new ProviderAdapterError(
        `Authentication failed on endpoint ${this.endpointUrl} (HTTP ${status})`,
        "AUTH_ERROR",
        status,
        this.providerId
      );
    }
    if (status === 429) {
      throw new ProviderAdapterError(
        `Rate limit exceeded on endpoint ${this.endpointUrl} (HTTP 429)`,
        "RATE_LIMIT",
        429,
        this.providerId
      );
    }
    throw new ProviderAdapterError(
      `Endpoint ${this.endpointUrl} responded with HTTP ${status}: ${errText.slice(0, 200)}`,
      "PROVIDER_UNAVAILABLE",
      status,
      this.providerId
    );
  }
}
