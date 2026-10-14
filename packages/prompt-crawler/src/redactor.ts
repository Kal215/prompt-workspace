/**
 * Secret Redaction Module for Prompt Crawler
 * Mencegah kebocoran credential yang tidak sengaja terbawa dari repository publik.
 */

export interface RedactionResult {
  redactedText: string;
  secretsFoundCount: number;
  redactedPatterns: string[];
}

export const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: "Groq API Key",
    regex: /gsk_[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: "OpenAI API Key",
    regex: /sk-[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: "GitHub Token",
    regex: /ghp_[A-Za-z0-9]{20,}/g,
  },
  {
    name: "Google API Key",
    regex: /AIza[0-9A-Za-z-_]{30,45}/g,
  },
  {
    name: "Bearer Token",
    regex: /Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gi,
  },
  {
    name: "PEM Private Key",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
];

/**
 * Sensor otomatis seluruh pola rahasia yang terdeteksi di dalam teks.
 */
export function redactSecrets(text: string): RedactionResult {
  let redacted = text;
  let totalCount = 0;
  const foundPatterns: string[] = [];

  for (const { name, regex } of SECRET_PATTERNS) {
    const matches = redacted.match(regex);
    if (matches && matches.length > 0) {
      totalCount += matches.length;
      foundPatterns.push(`${name} (${matches.length})`);
      redacted = redacted.replace(regex, "[REDACTED_SECRET]");
    }
  }

  return {
    redactedText: redacted,
    secretsFoundCount: totalCount,
    redactedPatterns: foundPatterns,
  };
}
