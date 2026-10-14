import { ProviderId } from "@prompt-workspace/prompt-contracts";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  keyUsed?: string;
  latencyMs?: number;
}

export interface ProviderAdapterOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  responseFormat?: "text" | "json";
}

export interface LLMProviderAdapter {
  readonly providerId: ProviderId | string;
  readonly defaultModel: string;
  chatCompletion(
    messages: ChatMessage[],
    options?: ProviderAdapterOptions
  ): Promise<ChatResponse>;
}

export type ProviderErrorCode =
  | "AUTH_ERROR"
  | "UNAUTHORIZED"
  | "RATE_LIMIT"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "MALFORMED_OUTPUT"
  | "INVALID_REQUEST"
  | "UNKNOWN";

export class ProviderAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: ProviderErrorCode,
    public readonly statusCode: number = 500,
    public readonly providerId?: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "ProviderAdapterError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface GroqAdapterOptions extends ProviderAdapterOptions {}

export type GroqErrorCode =
  | "RATE_LIMIT"
  | "AUTH_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_REQUEST"
  | "UNKNOWN";

export class GroqAdapterError extends ProviderAdapterError {
  constructor(
    message: string,
    code: GroqErrorCode | ProviderErrorCode,
    public readonly keyIdentifier?: string,
    originalError?: unknown
  ) {
    const statusCode =
      code === "RATE_LIMIT" || code === "RATE_LIMITED"
        ? 429
        : code === "AUTH_ERROR" || code === "UNAUTHORIZED"
        ? 401
        : code === "TIMEOUT"
        ? 504
        : code === "PROVIDER_UNAVAILABLE"
        ? 503
        : 500;
    super(message, code as ProviderErrorCode, statusCode, "groq", originalError);
    this.name = "GroqAdapterError";
  }
}
