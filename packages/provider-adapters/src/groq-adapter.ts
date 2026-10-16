import Groq from "groq-sdk";
import {
  ChatMessage,
  ChatResponse,
  GroqAdapterOptions,
  GroqAdapterError,
  GroqErrorCode,
  LLMProviderAdapter,
} from "./types.js";

export interface KeyEntry {
  id: string; // e.g. "GROQ_API_KEY_1"
  key: string;
  client: Groq;
  cooldownUntil: number; // timestamp ms
}

export class GroqAdapter implements LLMProviderAdapter {
  public readonly providerId = "groq";
  private keys: KeyEntry[] = [];
  private currentKeyIndex = 0;
  public readonly defaultModel = "llama-3.3-70b-versatile";
  private readonly defaultTimeoutMs = 30_000;

  constructor(providedKeys?: string[]) {
    this.initializeKeys(providedKeys);
  }

  private initializeKeys(explicitKeys?: string[]) {
    const rawKeys: { id: string; key: string }[] = [];

    if (explicitKeys && explicitKeys.length > 0) {
      explicitKeys.forEach((key, idx) => {
        if (key && key.trim()) {
          rawKeys.push({ id: `EXPLICIT_KEY_${idx + 1}`, key: key.trim() });
        }
      });
    } else {
      // 1. Scan GROQ_API_KEY_1 through GROQ_API_KEY_6 (and higher if present)
      for (let i = 1; i <= 20; i++) {
        const key = process.env[`GROQ_API_KEY_${i}`];
        if (key && key.trim()) {
          rawKeys.push({ id: `GROQ_API_KEY_${i}`, key: key.trim() });
        }
      }

      // 2. Scan fallback single GROQ_API_KEY
      if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
        const key = process.env.GROQ_API_KEY.trim();
        if (!rawKeys.some((k) => k.key === key)) {
          rawKeys.push({ id: "GROQ_API_KEY", key });
        }
      }

      // 3. Scan comma-separated GROQ_API_KEYS if present
      if (process.env.GROQ_API_KEYS) {
        const parts: string[] = process.env.GROQ_API_KEYS.split(",").map((k: string) => k.trim());
        parts.forEach((k: string, idx: number) => {
          if (k && !rawKeys.some((item) => item.key === k)) {
            rawKeys.push({ id: `GROQ_API_KEYS_${idx + 1}`, key: k });
          }
        });
      }
    }

    if (rawKeys.length === 0) {
      throw new GroqAdapterError(
        "No Groq API keys found in environment. Please define GROQ_API_KEY_1 through GROQ_API_KEY_6 in .env",
        "AUTH_ERROR"
      );
    }

    this.keys = rawKeys.map((item) => ({
      id: item.id,
      key: item.key,
      client: new Groq({
        apiKey: item.key,
        timeout: this.defaultTimeoutMs,
      }),
      cooldownUntil: 0,
    }));
  }

  public getAvailableKeyCount(): number {
    return this.keys.length;
  }

  private maskKey(id: string, key: string): string {
    const last4 = key.slice(-4);
    return `${id} (***${last4})`;
  }

  private pickNextKeyIndex(): number {
    const now = Date.now();
    // Try round-robin from current index
    for (let attempts = 0; attempts < this.keys.length; attempts++) {
      const idx = (this.currentKeyIndex + attempts) % this.keys.length;
      if (this.keys[idx].cooldownUntil <= now) {
        this.currentKeyIndex = (idx + 1) % this.keys.length;
        return idx;
      }
    }
    // If all are in cooldown, pick the one with earliest cooldown expiry
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
    options?: GroqAdapterOptions
  ): Promise<ChatResponse> {
    if (!messages || messages.length === 0) {
      throw new GroqAdapterError("Messages array cannot be empty", "INVALID_REQUEST");
    }

    let model = options?.model || process.env.GROQ_MODEL || this.defaultModel;
    const timeoutMs = options?.timeoutMs || this.defaultTimeoutMs;
    const maxAttempts = this.keys.length;

    let lastError: unknown = null;
    let lastErrorCode: GroqErrorCode = "UNKNOWN";

    const startTime = Date.now();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const keyIdx = this.pickNextKeyIndex();
      const currentEntry = this.keys[keyIdx];
      const maskedKeyId = this.maskKey(currentEntry.id, currentEntry.key);

      try {
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

        const completion = await currentEntry.client.chat.completions.create(
          {
            model,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: options?.temperature ?? 0.2,
            max_tokens: options?.maxTokens ?? 2048,
            ...(options?.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
          },
          { signal: controller.signal }
        ).finally(() => {
          clearTimeout(timeoutHandle);
        });

        const latencyMs = Date.now() - startTime;
        const choice = completion.choices?.[0];
        const content = choice?.message?.content || "";

        return {
          content,
          model: completion.model || model,
          usage: completion.usage
            ? {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens,
              }
            : undefined,
          keyUsed: maskedKeyId,
          latencyMs,
        };
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.statusCode;
        const errorMsg = String(err?.message || err);

        // Classify error
        if (status === 429 || errorMsg.includes("rate limit") || errorMsg.includes("429")) {
          lastErrorCode = "RATE_LIMIT";
          // Cooldown for 60 seconds on rate limit
          currentEntry.cooldownUntil = Date.now() + 60_000;
          console.warn(
            `[GroqAdapter] Key ${maskedKeyId} rate limited (429). Rotating to next key...`
          );
          continue; // failover to next key
        } else if (
          status === 401 ||
          status === 403 ||
          errorMsg.includes("Unauthorized") ||
          errorMsg.includes("invalid_api_key")
        ) {
          lastErrorCode = "AUTH_ERROR";
          // Long cooldown on auth failure
          currentEntry.cooldownUntil = Date.now() + 3_600_000;
          console.warn(
            `[GroqAdapter] Key ${maskedKeyId} authentication error (${status}). Rotating to next key...`
          );
          continue; // failover to next key
        } else if (err?.name === "AbortError" || errorMsg.includes("timeout")) {
          lastErrorCode = "TIMEOUT";
          console.warn(`[GroqAdapter] Key ${maskedKeyId} timed out. Rotating to next key...`);
          continue;
        } else if (
          (status === 404 || errorMsg.includes("model_not_found")) &&
          model === this.defaultModel
        ) {
          lastErrorCode = "INVALID_REQUEST";
          console.warn(
            `[GroqAdapter] Model "${model}" not available on Groq API. Auto-falling back to "openai/gpt-oss-120b"...`
          );
          model = "openai/gpt-oss-120b";
          continue;
        } else {
          lastErrorCode = "NETWORK_ERROR";
          console.warn(
            `[GroqAdapter] Key ${maskedKeyId} encountered error (${errorMsg}). Trying next key...`
          );
          continue;
        }
      }
    }

    throw new GroqAdapterError(
      `All ${this.keys.length} Groq API keys failed. Last error: ${(lastError as any)?.message || lastError}`,
      lastErrorCode,
      undefined,
      lastError
    );
  }
}
