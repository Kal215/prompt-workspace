import {
  ChatMessage,
  ChatResponse,
  LLMProviderAdapter,
  ProviderAdapterError,
  ProviderAdapterOptions,
} from "./types.js";
import { maskKey, redactApiKey } from "./redact.js";

export interface OpenRouterAdapterOptions extends ProviderAdapterOptions {
  apiKey?: string;
  baseURL?: string;
  fetchFn?: typeof fetch;
}

export class OpenRouterAdapter implements LLMProviderAdapter {
  public readonly providerId = "openrouter";
  public readonly defaultModel = "meta-llama/llama-3.3-70b-instruct";
  private readonly apiKey?: string;
  private readonly baseURL: string;
  private readonly defaultTimeoutMs = 30_000;
  private readonly fetchFn: typeof fetch;

  constructor(options: OpenRouterAdapterOptions = {}) {
    this.apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
    this.baseURL = options.baseURL || process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    this.fetchFn = options.fetchFn || globalThis.fetch;
  }

  public async chatCompletion(
    messages: ChatMessage[],
    options?: ProviderAdapterOptions
  ): Promise<ChatResponse> {
    if (!messages || messages.length === 0) {
      throw new ProviderAdapterError(
        "Daftar pesan (messages) tidak boleh kosong.",
        "INVALID_REQUEST",
        400,
        "openrouter"
      );
    }

    if (!this.apiKey || !this.apiKey.trim()) {
      throw new ProviderAdapterError(
        "Kunci API OpenRouter tidak ditemukan di environment. Konfigurasikan OPENROUTER_API_KEY di file .env.",
        "AUTH_ERROR",
        401,
        "openrouter"
      );
    }

    const model = options?.model || this.defaultModel;
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const startTime = Date.now();
    const maskedKeyId = maskKey("OPENROUTER_KEY", this.apiKey);

    const payload: Record<string, any> = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 2048,
    };

    if (options?.responseFormat === "json") {
      payload.response_format = { type: "json_object" };
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchFn(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://prompt-workspace.local",
          "X-Title": "Prompt Intelligence Engine",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const status = response.status;
        let errorText = "";
        try {
          const errJson = await response.json();
          errorText = errJson.error?.message || JSON.stringify(errJson);
        } catch {
          errorText = await response.text();
        }

        const safeErrorText = redactApiKey(errorText);

        if (status === 401 || status === 403) {
          throw new ProviderAdapterError(
            `OpenRouter API error: Autentikasi gagal atau API key tidak valid (${status}).`,
            "AUTH_ERROR",
            401,
            "openrouter"
          );
        }

        if (status === 429) {
          throw new ProviderAdapterError(
            `OpenRouter API error: Kuota permintaan terlampaui (429 Rate Limit).`,
            "RATE_LIMIT",
            429,
            "openrouter"
          );
        }

        if (status >= 500) {
          throw new ProviderAdapterError(
            `OpenRouter API error: Layanan upstream OpenRouter sedang tidak tersedia (${status}).`,
            "PROVIDER_UNAVAILABLE",
            status,
            "openrouter"
          );
        }

        throw new ProviderAdapterError(
          `OpenRouter API error (${status}): ${safeErrorText}`,
          "UNKNOWN",
          status,
          "openrouter"
        );
      }

      let data: any;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new ProviderAdapterError(
          "OpenRouter API error: Format respons bukan JSON valid.",
          "MALFORMED_OUTPUT",
          502,
          "openrouter",
          jsonErr
        );
      }

      const choice = data.choices?.[0];
      const text = choice?.message?.content;

      if (text === undefined || text === null) {
        throw new ProviderAdapterError(
          "OpenRouter API error: Respons pilihan konten kosong atau tidak ditemukan.",
          "MALFORMED_OUTPUT",
          502,
          "openrouter",
          data
        );
      }

      return {
        content: text,
        model: data.model || model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens || 0,
              completionTokens: data.usage.completion_tokens || 0,
            }
          : undefined,
        keyUsed: maskedKeyId,
        latencyMs,
      };
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      if (err instanceof ProviderAdapterError) {
        throw err;
      }

      if (err?.name === "AbortError" || String(err).includes("timeout")) {
        throw new ProviderAdapterError(
          "OpenRouter API error: Permintaan melebihi batas waktu (timeout).",
          "TIMEOUT",
          504,
          "openrouter",
          err
        );
      }

      throw new ProviderAdapterError(
        `OpenRouter API network error: ${redactApiKey(err?.message || String(err))}`,
        "PROVIDER_UNAVAILABLE",
        503,
        "openrouter",
        err
      );
    }
  }
}
