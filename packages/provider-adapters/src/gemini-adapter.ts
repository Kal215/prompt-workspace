import {
  ChatMessage,
  ChatResponse,
  LLMProviderAdapter,
  ProviderAdapterError,
  ProviderAdapterOptions,
} from "./types.js";
import { maskKey, redactApiKey } from "./redact.js";

export interface GeminiKeyEntry {
  id: string;
  key: string;
  cooldownUntil: number;
}

export interface GeminiAdapterOptions extends ProviderAdapterOptions {
  apiKey?: string;
  apiKeys?: string[];
  fetchFn?: typeof fetch;
}

export class GeminiAdapter implements LLMProviderAdapter {
  public readonly providerId = "gemini";
  public readonly defaultModel = "gemini-2.5-flash";
  private keys: GeminiKeyEntry[] = [];
  private currentKeyIndex = 0;
  private readonly defaultTimeoutMs = 30_000;
  private readonly fetchFn: typeof fetch;

  constructor(options: GeminiAdapterOptions = {}) {
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.initializeKeys(options);
  }

  private initializeKeys(options: GeminiAdapterOptions) {
    const rawKeys: { id: string; key: string }[] = [];

    if (options.apiKey && options.apiKey.trim()) {
      rawKeys.push({ id: "CONFIG_API_KEY", key: options.apiKey.trim() });
    }

    if (options.apiKeys && options.apiKeys.length > 0) {
      options.apiKeys.forEach((k, idx) => {
        if (k && k.trim() && !rawKeys.some((item) => item.key === k.trim())) {
          rawKeys.push({ id: `CONFIG_API_KEYS_${idx + 1}`, key: k.trim() });
        }
      });
    }

    if (rawKeys.length === 0) {
      // 1. Scan GEMINI_API_KEY_1 through GEMINI_API_KEY_6
      for (let i = 1; i <= 6; i++) {
        const k = process.env[`GEMINI_API_KEY_${i}`];
        if (k && k.trim() && !rawKeys.some((item) => item.key === k.trim())) {
          rawKeys.push({ id: `GEMINI_API_KEY_${i}`, key: k.trim() });
        }
      }

      // 2. Scan GEMINI_API_KEY
      const singleKey = process.env.GEMINI_API_KEY;
      if (singleKey && singleKey.trim() && !rawKeys.some((item) => item.key === singleKey.trim())) {
        rawKeys.push({ id: "GEMINI_API_KEY", key: singleKey.trim() });
      }

      // 3. Scan comma-separated GEMINI_API_KEYS
      const commaKeys = process.env.GEMINI_API_KEYS;
      if (commaKeys && commaKeys.trim()) {
        const parts = commaKeys.split(",").map((p) => p.trim());
        parts.forEach((k, idx) => {
          if (k && !rawKeys.some((item) => item.key === k)) {
            rawKeys.push({ id: `GEMINI_API_KEYS_${idx + 1}`, key: k });
          }
        });
      }
    }

    this.keys = rawKeys.map((item) => ({
      id: item.id,
      key: item.key,
      cooldownUntil: 0,
    }));
  }

  public getAvailableKeyCount(): number {
    return this.keys.length;
  }

  private pickNextKeyIndex(): number {
    if (this.keys.length === 0) {
      throw new ProviderAdapterError(
        "Kunci API Gemini tidak ditemukan di environment. Pastikan GEMINI_API_KEY tersedia di file .env.",
        "AUTH_ERROR",
        401,
        "gemini"
      );
    }

    const now = Date.now();
    for (let attempts = 0; attempts < this.keys.length; attempts++) {
      const idx = (this.currentKeyIndex + attempts) % this.keys.length;
      if (this.keys[idx].cooldownUntil <= now) {
        this.currentKeyIndex = (idx + 1) % this.keys.length;
        return idx;
      }
    }

    // Semua cooldown, pilih yang terdekat berakhirnya
    let earliestIdx = 0;
    let earliestTime = this.keys[0].cooldownUntil;
    for (let i = 1; i < this.keys.length; i++) {
      if (this.keys[i].cooldownUntil < earliestTime) {
        earliestTime = this.keys[i].cooldownUntil;
        earliestIdx = i;
      }
    }
    this.currentKeyIndex = (earliestIdx + 1) % this.keys.length;
    return earliestIdx;
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
        "gemini"
      );
    }

    if (this.keys.length === 0) {
      throw new ProviderAdapterError(
        "Kunci API Gemini tidak ditemukan di environment. Konfigurasikan GEMINI_API_KEY di file .env.",
        "AUTH_ERROR",
        401,
        "gemini"
      );
    }

    const model = options?.model || this.defaultModel;
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const maxAttempts = this.keys.length;

    const systemMsg = messages.find((m) => m.role === "system");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    if (contents.length === 0 && systemMsg) {
      contents.push({ role: "user", parts: [{ text: systemMsg.content }] });
    }

    const payload: Record<string, any> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.1,
        maxOutputTokens: options?.maxTokens ?? 2048,
      },
    };

    if (systemMsg && contents.length > 0) {
      payload.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    if (options?.responseFormat === "json") {
      payload.generationConfig.responseMimeType = "application/json";
    }

    let lastError: unknown = null;
    let lastStatusCode = 500;
    const startTime = Date.now();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const keyIdx = this.pickNextKeyIndex();
      const currentEntry = this.keys[keyIdx];
      const maskedKeyId = maskKey(currentEntry.id, currentEntry.key);

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(currentEntry.key)}`;

      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await this.fetchFn(endpoint, {
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
          lastStatusCode = status;
          let errorText = "";
          try {
            const errJson = await response.json();
            errorText = errJson.error?.message || JSON.stringify(errJson);
          } catch {
            errorText = await response.text();
          }

          const safeErrorText = redactApiKey(errorText);

          if (status === 401 || status === 403 || safeErrorText.includes("API_KEY_INVALID")) {
            currentEntry.cooldownUntil = Date.now() + 3_600_000;
            lastError = new ProviderAdapterError(
              `Google Gemini API error: Autentikasi gagal atau API key tidak valid (${status}).`,
              "AUTH_ERROR",
              401,
              "gemini"
            );
            continue;
          }

          if (status === 429 || safeErrorText.includes("RESOURCE_EXHAUSTED") || safeErrorText.includes("rate limit")) {
            currentEntry.cooldownUntil = Date.now() + 60_000;
            lastError = new ProviderAdapterError(
              `Google Gemini API error: Kuota permintaan terlampaui (429 Rate Limit).`,
              "RATE_LIMIT",
              429,
              "gemini"
            );
            continue;
          }

          if (status >= 500) {
            lastError = new ProviderAdapterError(
              `Google Gemini API error: Layanan Gemini sedang tidak tersedia (${status}).`,
              "PROVIDER_UNAVAILABLE",
              status,
              "gemini"
            );
            continue;
          }

          throw new ProviderAdapterError(
            `Google Gemini API error (${status}): ${safeErrorText}`,
            "UNKNOWN",
            status,
            "gemini"
          );
        }

        let data: any;
        try {
          data = await response.json();
        } catch (jsonErr) {
          throw new ProviderAdapterError(
            "Google Gemini API error: Respons bukan JSON valid.",
            "MALFORMED_OUTPUT",
            502,
            "gemini",
            jsonErr
          );
        }

        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (text === undefined || text === null) {
          throw new ProviderAdapterError(
            "Google Gemini API error: Format respons tidak memiliki teks kandidat.",
            "MALFORMED_OUTPUT",
            502,
            "gemini",
            data
          );
        }

        return {
          content: text,
          model: data.modelVersion || model,
          usage: data.usageMetadata
            ? {
                promptTokens: data.usageMetadata.promptTokenCount || 0,
                completionTokens: data.usageMetadata.candidatesTokenCount || 0,
              }
            : undefined,
          keyUsed: maskedKeyId,
          latencyMs,
        };
      } catch (err: any) {
        clearTimeout(timeoutHandle);
        if (err instanceof ProviderAdapterError) {
          if (err.code === "AUTH_ERROR" || err.code === "RATE_LIMIT" || err.code === "PROVIDER_UNAVAILABLE") {
            lastError = err;
            continue;
          }
          throw err;
        }

        if (err?.name === "AbortError" || String(err).includes("timeout")) {
          lastError = new ProviderAdapterError(
            "Google Gemini API error: Permintaan melebihi batas waktu (timeout).",
            "TIMEOUT",
            504,
            "gemini",
            err
          );
          continue;
        }

        lastError = new ProviderAdapterError(
          `Google Gemini API network error: ${redactApiKey(err?.message || String(err))}`,
          "PROVIDER_UNAVAILABLE",
          lastStatusCode || 503,
          "gemini",
          err
        );
      }
    }

    if (lastError instanceof ProviderAdapterError) {
      throw lastError;
    }

    throw new ProviderAdapterError(
      `Semua kunci API Gemini (${this.keys.length}) gagal digunakan.`,
      "PROVIDER_UNAVAILABLE",
      503,
      "gemini",
      lastError
    );
  }
}
