import crypto from "node:crypto";
import {
  validateTargetUrl,
  normalizeTargetUrl,
  verifyHostDnsSafe,
  CrawlerSecurityError,
} from "./ssrf-guard.js";
import { redactSecrets, RedactionResult } from "./redactor.js";

export const MAX_CRAWLER_BYTES = 512 * 1024; // 512 KiB = 524,288 bytes
export const CRAWLER_TIMEOUT_MS = 5000; // 5 detik

export class CrawlerPayloadTooLargeError extends Error {
  public code: string = "PAYLOAD_TOO_LARGE";
  constructor(bytesRead: number, maxBytes: number = MAX_CRAWLER_BYTES) {
    super(`Content stream exceeded maximum allowed size of ${maxBytes} bytes (read ${bytesRead} bytes). Aborted.`);
    this.name = "CrawlerPayloadTooLargeError";
  }
}

export class CrawlerFetchError extends Error {
  public code: string;
  public status?: number;
  constructor(message: string, code: string = "FETCH_FAILED", status?: number) {
    super(message);
    this.name = "CrawlerFetchError";
    this.code = code;
    this.status = status;
  }
}

export interface BoundedFetchResult {
  sourceUrl: string;
  normalizedUrl: string;
  content: string;
  contentType: string;
  bytesRead: number;
  contentSha256: string;
  redaction: RedactionResult;
  fetchedAt: string;
}

export interface FetcherOptions {
  customFetch?: typeof fetch;
  skipDnsCheckForTesting?: boolean;
  customAllowedDomains?: string[];
}

/**
 * Mengambil konten web secara aman dengan batasan ukuran stream 512 KiB,
 * timeout 5000ms, anti-SSRF allowlist, proteksi DNS rebinding, dan secret redaction.
 */
export async function streamBoundedFetch(
  rawUrl: string,
  options: FetcherOptions = {}
): Promise<BoundedFetchResult> {
  const fetchFn = options.customFetch ?? globalThis.fetch;
  if (typeof fetchFn !== "function") {
    throw new CrawlerFetchError("Global fetch API or customFetch is required", "FETCH_UNAVAILABLE");
  }

  // 1. Normalisasi URL GitHub blob -> raw
  const { normalizedUrl } = normalizeTargetUrl(rawUrl);

  // 2. Validasi URL target terhadap skema HTTPS, port, dan allowlist domain
  const validatedUrl = validateTargetUrl(normalizedUrl, options.customAllowedDomains);

  // 3. Verifikasi DNS host publik (Anti-DNS Rebinding) kecuali eksplisit skip saat testing lokal terisolasi
  if (!options.skipDnsCheckForTesting) {
    await verifyHostDnsSafe(validatedUrl.hostname);
  }

  // 4. Siapkan signal timeout 5 detik
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Crawler request timed out after ${CRAWLER_TIMEOUT_MS}ms`));
  }, CRAWLER_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchFn(validatedUrl.toString(), {
      signal: controller.signal,
      redirect: "manual", // Cegah redirect otomatis liar
      headers: {
        "User-Agent": "PIEW-PromptCrawler/2.0 (+https://github.com/Kal215/prompt-workspace)",
        Accept: "text/plain, text/markdown, application/json, text/html;q=0.8",
      },
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError" || controller.signal.aborted) {
      throw new CrawlerFetchError(`Request timed out after ${CRAWLER_TIMEOUT_MS}ms`, "TIMEOUT");
    }
    throw new CrawlerFetchError(`Network error while fetching: ${(err as Error).message}`, "NETWORK_ERROR");
  }

  // Tangani HTTP Redirects (301, 302, 307, 308) secara manual & aman (maks 1 hop)
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    clearTimeout(timeoutId);
    const location = response.headers.get("location");
    if (!location) {
      throw new CrawlerFetchError(`Redirect status ${response.status} received without Location header`, "REDIRECT_INVALID");
    }

    // Resolusi redirect target terhadap URL asal
    let redirectedUrl: URL;
    try {
      redirectedUrl = new URL(location, validatedUrl);
    } catch {
      throw new CrawlerFetchError(`Invalid redirect Location: "${location}"`, "REDIRECT_MALFORMED");
    }

    // Validasi ulang redirect target terhadap allowlist dan skema https
    validateTargetUrl(redirectedUrl.toString());
    if (!options.skipDnsCheckForTesting) {
      await verifyHostDnsSafe(redirectedUrl.hostname);
    }

    // Rekursif fetch target redirect (dengan skipDns jika opsi aktif)
    return await streamBoundedFetch(redirectedUrl.toString(), options);
  }

  if (!response.ok) {
    clearTimeout(timeoutId);
    throw new CrawlerFetchError(
      `Remote server returned HTTP ${response.status}: ${response.statusText}`,
      "HTTP_ERROR",
      response.status
    );
  }

  const contentType = response.headers.get("content-type") || "text/plain";

  // Cek apakah Content-Length awal sudah melampaui batas
  const headerContentLength = response.headers.get("content-length");
  if (headerContentLength) {
    const parsedLength = parseInt(headerContentLength, 10);
    if (!isNaN(parsedLength) && parsedLength > MAX_CRAWLER_BYTES) {
      clearTimeout(timeoutId);
      controller.abort();
      throw new CrawlerPayloadTooLargeError(parsedLength, MAX_CRAWLER_BYTES);
    }
  }

  // 5. Baca body menggunakan stream reader dengan bounded accumulator
  const body = response.body;
  if (!body) {
    clearTimeout(timeoutId);
    return {
      sourceUrl: rawUrl,
      normalizedUrl: validatedUrl.toString(),
      content: "",
      contentType,
      bytesRead: 0,
      contentSha256: crypto.createHash("sha256").update("").digest("hex"),
      redaction: { redactedText: "", secretsFoundCount: 0, redactedPatterns: [] },
      fetchedAt: new Date().toISOString(),
    };
  }

  const chunks: Uint8Array[] = [];
  let accumulatedBytes = 0;
  const reader = body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        accumulatedBytes += value.byteLength;
        if (accumulatedBytes > MAX_CRAWLER_BYTES) {
          controller.abort();
          throw new CrawlerPayloadTooLargeError(accumulatedBytes, MAX_CRAWLER_BYTES);
        }
        chunks.push(value);
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // 6. Gabungkan buffer dan hitung SHA-256
  const totalBuffer = Buffer.concat(chunks);
  const contentSha256 = crypto.createHash("sha256").update(totalBuffer).digest("hex");
  const rawText = totalBuffer.toString("utf-8");

  // 7. Sensor kredensial / secrets
  const redaction = redactSecrets(rawText);

  return {
    sourceUrl: rawUrl,
    normalizedUrl: validatedUrl.toString(),
    content: redaction.redactedText,
    contentType,
    bytesRead: accumulatedBytes,
    contentSha256,
    redaction,
    fetchedAt: new Date().toISOString(),
  };
}
