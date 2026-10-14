/**
 * Utilitas redaksi secret/API key dan prompt untuk proteksi privasi
 * Sesuai Blueprint v1.0 Bagian 15.2 (Data Minimization) & Zero-Leakage Policy
 */

const GROQ_KEY_REGEX = /gsk_[a-zA-Z0-9_-]{20,}/g;
const OPENAI_KEY_REGEX = /sk-[a-zA-Z0-9_-]{20,}/g;
const GEMINI_KEY_REGEX = /AIza[0-9A-Za-z_-]{25,}/g;
const OPENROUTER_KEY_REGEX = /sk-or-[a-zA-Z0-9_-]{20,}/g;
const BEARER_REGEX = /Bearer\s+[a-zA-Z0-9._\-]+/gi;

export function redactApiKey(text: string): string {
  if (typeof text !== "string") return String(text);
  return text
    .replace(GROQ_KEY_REGEX, "[REDACTED_GROQ_KEY]")
    .replace(OPENROUTER_KEY_REGEX, "[REDACTED_OPENROUTER_KEY]")
    .replace(OPENAI_KEY_REGEX, "[REDACTED_OPENAI_KEY]")
    .replace(GEMINI_KEY_REGEX, "[REDACTED_GEMINI_KEY]")
    .replace(BEARER_REGEX, "Bearer [REDACTED_TOKEN]");
}

export function maskKey(id: string, key: string): string {
  if (!key) return `${id} (EMPTY)`;
  const last4 = key.slice(-4);
  return `${id} (***${last4})`;
}
