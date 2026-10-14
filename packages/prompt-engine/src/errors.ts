/**
 * Prompt Intelligence Engine — Error Taxonomy
 * Sesuai Blueprint v1.0 Bagian 14 & 15
 */

export type EngineErrorCode =
  | "PROVIDER_RATE_LIMIT"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "SCHEMA_VALIDATION_ERROR"
  | "INTENT_PRESERVATION_ERROR"
  | "INTERNAL_ENGINE_ERROR";

export class EngineError extends Error {
  public readonly code: EngineErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: EngineErrorCode,
    statusCode: number = 500,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * Dilempar ketika semua API key provider terkena rate-limit (HTTP 429).
 */
export class ProviderRateLimitError extends EngineError {
  constructor(message = "All provider API keys have exceeded rate limits (429)", details?: unknown) {
    super(message, "PROVIDER_RATE_LIMIT", 429, details);
  }
}

/**
 * Dilempar ketika panggilan LLM melebihi batas waktu (timeout).
 */
export class ProviderTimeoutError extends EngineError {
  constructor(message = "Provider request timed out after configured threshold", details?: unknown) {
    super(message, "PROVIDER_TIMEOUT", 504, details);
  }
}

/**
 * Dilempar ketika provider gagal total (network error, auth error, semua key habis/down).
 */
export class ProviderUnavailableError extends EngineError {
  constructor(message = "Provider service is currently unavailable or exhausted", details?: unknown) {
    super(message, "PROVIDER_UNAVAILABLE", 503, details);
  }
}

/**
 * Dilempar ketika output LLM atau input request tidak valid sesuai skema Zod.
 */
export class SchemaValidationError extends EngineError {
  constructor(message = "Schema validation failed for request or LLM response", details?: unknown) {
    super(message, "SCHEMA_VALIDATION_ERROR", 422, details);
  }
}

/**
 * Dilempar ketika hasil optimasi melanggar aturan keras Preserve Intent (Blueprint 5.5).
 */
export class IntentPreservationError extends EngineError {
  constructor(message = "Optimization output violates Intent Preservation constraints", details?: unknown) {
    super(message, "INTENT_PRESERVATION_ERROR", 422, details);
  }
}
