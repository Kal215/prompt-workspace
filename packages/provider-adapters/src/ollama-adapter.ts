import {
  ChatMessage,
  ChatResponse,
  LLMProviderAdapter,
  ProviderAdapterError,
  ProviderAdapterOptions,
} from "./types.js";
import { redactApiKey } from "./redact.js";

export interface OllamaAdapterOptions extends ProviderAdapterOptions {
  baseURL?: string;
  fetchFn?: typeof fetch;
}

export class OllamaAdapter implements LLMProviderAdapter {
  public readonly providerId = "ollama";
  public readonly defaultModel = "llama3.2";
  private readonly baseURL: string;
  private readonly defaultTimeoutMs = 60_000;
  private readonly fetchFn: typeof fetch;

  constructor(options: OllamaAdapterOptions = {}) {
    this.baseURL = (options.baseURL || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(
      /\/+$/,
      ""
    );
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
        "ollama"
      );
    }

    const model = options?.model || this.defaultModel;
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const startTime = Date.now();

    const payload: Record<string, any> = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.2,
      },
    };

    if (options?.responseFormat === "json") {
      payload.format = "json";
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await this.fetchFn(`${this.baseURL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
          errorText = errJson.error || JSON.stringify(errJson);
        } catch {
          errorText = await response.text();
        }

        const safeError = redactApiKey(errorText);

        if (status === 404 || safeError.toLowerCase().includes("not found")) {
          throw new ProviderAdapterError(
            `Model Ollama '${model}' tidak ditemukan di ${this.baseURL}. Jalankan 'ollama pull ${model}' terlebih dahulu.`,
            "INVALID_REQUEST",
            404,
            "ollama"
          );
        }

        throw new ProviderAdapterError(
          `Ollama API error (${status}): ${safeError}`,
          "PROVIDER_UNAVAILABLE",
          status,
          "ollama"
        );
      }

      let data: any;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new ProviderAdapterError(
          "Ollama API error: Format keluaran bukan JSON valid.",
          "MALFORMED_OUTPUT",
          502,
          "ollama",
          jsonErr
        );
      }

      const text = data.message?.content;
      if (text === undefined || text === null) {
        throw new ProviderAdapterError(
          "Ollama API error: Format keluaran tidak memiliki konten pesan (message.content kosong).",
          "MALFORMED_OUTPUT",
          502,
          "ollama",
          data
        );
      }

      return {
        content: text,
        model: data.model || model,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
        },
        keyUsed: "LOCAL_ENDPOINT (NO_KEY)",
        latencyMs,
      };
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      if (err instanceof ProviderAdapterError) {
        throw err;
      }

      if (err?.name === "AbortError" || String(err).includes("timeout")) {
        throw new ProviderAdapterError(
          `Permintaan ke Ollama lokal di ${this.baseURL} melebihi batas waktu (timeout).`,
          "TIMEOUT",
          504,
          "ollama",
          err
        );
      }

      const errMsg = String(err?.message || err);
      if (
        err?.code === "ECONNREFUSED" ||
        errMsg.includes("ECONNREFUSED") ||
        errMsg.includes("fetch failed")
      ) {
        throw new ProviderAdapterError(
          `Layanan Ollama lokal tidak terdeteksi di ${this.baseURL}. Pastikan service Ollama berjalan di background ('ollama serve') dan model sudah di-pull ('ollama pull ${model}').`,
          "PROVIDER_UNAVAILABLE",
          503,
          "ollama",
          err
        );
      }

      throw new ProviderAdapterError(
        `Ollama API error: ${redactApiKey(errMsg)}`,
        "PROVIDER_UNAVAILABLE",
        503,
        "ollama",
        err
      );
    }
  }
}
