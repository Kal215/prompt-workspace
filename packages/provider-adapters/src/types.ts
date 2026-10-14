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

export interface GroqAdapterOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export type GroqErrorCode =
  | "RATE_LIMIT"
  | "AUTH_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_REQUEST"
  | "UNKNOWN";

export class GroqAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: GroqErrorCode,
    public readonly keyIdentifier?: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "GroqAdapterError";
  }
}
