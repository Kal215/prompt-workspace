/**
 * Prompt Intelligence Engine — Safe Logger with Privacy Redaction
 * Sesuai Blueprint v1.0 Bagian 15.2 (Data Minimization)
 */

export interface LogContext {
  [key: string]: any;
}

const GROQ_KEY_REGEX = /gsk_[a-zA-Z0-9_-]{20,}/g;
const OPENAI_KEY_REGEX = /sk-[a-zA-Z0-9_-]{20,}/g;
const BEARER_REGEX = /Bearer\s+[a-zA-Z0-9._\-]+/gi;

/**
 * Menyensor API Key dari string teks apapun.
 */
export function redactApiKey(text: string): string {
  if (typeof text !== "string") return text;
  return text
    .replace(GROQ_KEY_REGEX, "[REDACTED_GROQ_KEY]")
    .replace(OPENAI_KEY_REGEX, "[REDACTED_OPENAI_KEY]")
    .replace(BEARER_REGEX, "Bearer [REDACTED_TOKEN]");
}

/**
 * Menyensor isi prompt pengguna sesuai Blueprint 15.2 Data Minimization.
 * Menghasilkan token seperti: [REDACTED_PROMPT_44_CHARS]
 */
export function redactPrompt(prompt: string, snippetLength: number = 0): string {
  if (typeof prompt !== "string") return String(prompt);
  const trimmed = prompt.trim();
  const len = trimmed.length;

  if (snippetLength > 0 && len > snippetLength) {
    const snippet = trimmed.slice(0, snippetLength).replace(/[\r\n]+/g, " ");
    return `[REDACTED_PROMPT_${len}_CHARS: "${snippet}..."]`;
  }

  return `[REDACTED_PROMPT_${len}_CHARS]`;
}

/**
 * Menyensor secara rekursif objek data sebelum dicetak ke log console.
 */
export function sanitizeForLog(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return redactApiKey(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLog(item));
  }

  if (typeof data === "object") {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Mask prompt fields
      if (
        lowerKey === "prompt" ||
        lowerKey === "originalprompt" ||
        lowerKey === "badprompt" ||
        lowerKey === "userprompt"
      ) {
        clean[key] = typeof value === "string" ? redactPrompt(value) : "[REDACTED_PROMPT]";
      } else if (lowerKey === "optimizedprompt") {
        clean[key] =
          typeof value === "string" ? `[OPTIMIZED_PROMPT_${value.length}_CHARS]` : "[OPTIMIZED_PROMPT]";
      } else if (
        lowerKey === "apikey" ||
        lowerKey === "key" ||
        lowerKey === "authorization" ||
        lowerKey.includes("secret") ||
        lowerKey.includes("token")
      ) {
        clean[key] = "[REDACTED_CREDENTIAL]";
      } else {
        clean[key] = sanitizeForLog(value);
      }
    }
    return clean;
  }

  return data;
}

export class SafeLogger {
  private readonly prefix: string;

  constructor(prefix: string = "PromptEngine") {
    this.prefix = prefix;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const safeMsg = redactApiKey(message);
    const base = `[${timestamp}] [${level}] [${this.prefix}] ${safeMsg}`;

    if (context && Object.keys(context).length > 0) {
      const sanitizedContext = sanitizeForLog(context);
      return `${base} | ${JSON.stringify(sanitizedContext)}`;
    }

    return base;
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage("INFO", message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("WARN", message, context));
  }

  error(message: string, err?: unknown, context?: LogContext): void {
    const errContext: LogContext = { ...context };
    if (err instanceof Error) {
      errContext.errorName = err.name;
      errContext.errorMessage = redactApiKey(err.message);
      if ("code" in err) {
        errContext.errorCode = (err as any).code;
      }
    } else if (err) {
      errContext.errorDetails = redactApiKey(String(err));
    }
    console.error(this.formatMessage("ERROR", message, errContext));
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.DEBUG === "true" || process.env.NODE_ENV === "development") {
      console.debug(this.formatMessage("DEBUG", message, context));
    }
  }
}

export const safeLogger = new SafeLogger();
