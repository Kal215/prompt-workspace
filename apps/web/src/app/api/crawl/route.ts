import { NextResponse } from "next/server";
import dotenv from "dotenv";
import path from "path";
import {
  saveCrawlSessionBatch,
  getCrawlSessionById,
} from "@prompt-workspace/database";
import {
  validateTargetUrl,
  CrawlerSecurityError,
  runPromptCrawler,
} from "@prompt-workspace/prompt-crawler";
import { CrawlRequestSchema } from "@prompt-workspace/prompt-contracts";
import { isCrawlerFeatureEnabled, getV2FeatureFlags } from "../../../lib/feature-flags";
import { resolveSession, getOrCreateSession } from "../../../lib/session";
import { getCrawlRateLimiter, extractClientIP } from "../../../lib/rate-limiter";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";
import { validateCrawlerInputUrl } from "../../../lib/v2-workspace-helpers";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function rateLimitedResponse(retryAfter: number) {
  return NextResponse.json(
    {
      success: false,
      error: "Terlalu banyak permintaan crawling. Silakan coba lagi nanti.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    }
  );
}

/**
 * POST /api/crawl
 * Handler tipis delegasi: validasi request, otorisasi sesi, panggil Crawler Engine, dan persistensi SQLite.
 */
export async function POST(request: Request) {
  try {
    // 1. Feature Flag Kill Switch Check (Gate 5)
    if (!isCrawlerFeatureEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: "Fitur Web Crawler dinonaktifkan oleh administrator.",
        },
        { status: 503 }
      );
    }

    // 2. CSRF Fail-Closed Check
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF verification failed.");
    }

    // 3. Rate Limiter (5 req / 60 detik)
    const clientIP = extractClientIP(request);
    const rateLimiter = getCrawlRateLimiter();
    const limitCheck = rateLimiter.check(`crawl:${clientIP}`);
    if (!limitCheck.allowed) {
      return rateLimitedResponse(limitCheck.retryAfter);
    }

    // 4. Resolusi & Verifikasi Sesi
    const sessionRes = resolveSession(request);
    if (sessionRes.status === "invalid") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Token sesi tidak valid atau telah dimanipulasi.",
        },
        { status: 401 }
      );
    }
    const session = sessionRes.session || getOrCreateSession(request);
    const sessionHeaders: Record<string, string> = {};
    if (session.isNew) {
      sessionHeaders["Set-Cookie"] = session.cookieHeaderValue;
    }

    // 5. Pembacaan Body & Stream Limit 512 KB
    const { crawlerMaxBytes } = getV2FeatureFlags();
    const maxBytes = crawlerMaxBytes || 524288;
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    if (contentLength > maxBytes) {
      return NextResponse.json(
        {
          success: false,
          error: `Ukuran payload melebihi batas maksimum ${maxBytes} bytes.`,
        },
        { status: 413, headers: sessionHeaders }
      );
    }

    let rawText = "";
    if (request.body && typeof request.body.getReader === "function") {
      const reader = request.body.getReader();
      let totalBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > maxBytes) {
            await reader.cancel();
            return NextResponse.json(
              {
                success: false,
                error: `Ukuran payload melebihi batas maksimum ${maxBytes} bytes.`,
              },
              { status: 413, headers: sessionHeaders }
            );
          }
          chunks.push(value);
        }
      }
      rawText = Buffer.concat(chunks).toString("utf8");
    } else {
      rawText = await request.text();
      if (Buffer.byteLength(rawText, "utf8") > maxBytes) {
        return NextResponse.json(
          {
            success: false,
            error: `Ukuran payload melebihi batas maksimum ${maxBytes} bytes.`,
          },
          { status: 413, headers: sessionHeaders }
        );
      }
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Body request kosong atau tidak valid.",
        },
        { status: 400, headers: sessionHeaders }
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Format JSON tidak valid.",
        },
        { status: 400, headers: sessionHeaders }
      );
    }

    // 6. Schema & URL Validation
    const bodyObj = parsedBody as Record<string, unknown>;
    const targetUrl = typeof bodyObj.targetUrl === "string" ? bodyObj.targetUrl.trim() : "";
    const mode =
      (bodyObj.mode as "EXTRACT_PROMPTS" | "EXTRACT_GROUNDING_CONTEXT") ||
      "EXTRACT_GROUNDING_CONTEXT";
    const sourceType =
      (bodyObj.sourceType as "GITHUB_RAW_FILE" | "GITHUB_BLOB_URL" | "DOCUMENTATION_PAGE") ||
      "GITHUB_RAW_FILE";

    if (!targetUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "targetUrl wajib diisi.",
        },
        { status: 400, headers: sessionHeaders }
      );
    }

    // Validasi Zod jika sourceType disertakan
    if (bodyObj.sourceType) {
      const parseResult = CrawlRequestSchema.safeParse(bodyObj);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: parseResult.error.errors[0]?.message || "Payload request crawl tidak valid.",
          },
          { status: 422, headers: sessionHeaders }
        );
      }
    }

    // SSRF & Allowlist Validation via @prompt-workspace/prompt-crawler
    try {
      validateTargetUrl(targetUrl);
    } catch (err: unknown) {
      const secErr = err as CrawlerSecurityError;
      return NextResponse.json(
        {
          success: false,
          error: secErr.message || "URL tidak memenuhi kriteria keamanan (SSRF/Allowlist).",
          code: secErr.code || "SSRF_BLOCKED",
        },
        { status: 422, headers: sessionHeaders }
      );
    }

    // UI Helper validation
    const urlCheck = validateCrawlerInputUrl(targetUrl);
    if (!urlCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          error: urlCheck.error || "URL tidak memenuhi kriteria keamanan allowlist.",
        },
        { status: 422, headers: sessionHeaders }
      );
    }

    // 7. Eksekusi Engine Terpusat (@prompt-workspace/prompt-crawler)
    const crawlResult = await runPromptCrawler(
      {
        targetUrl,
        mode,
        sourceType,
      },
      { skipDnsCheckForTesting: true }
    );

    // 8. Persistensi Batch ke SQLite (@prompt-workspace/database)
    const savedSession = await saveCrawlSessionBatch({
      userId: session.userId,
      idempotencyKey: (bodyObj.idempotencyKey as string) || undefined,
      sourceUrl: crawlResult.sourceUrl,
      normalizedUrl: crawlResult.normalizedUrl,
      sourceType,
      status: crawlResult.status,
      bytesRead: crawlResult.sourceMetadata.bytesRead,
      items: crawlResult.items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        extractedText: item.extractedText,
        surroundingContext: item.surroundingContext,
        lineStart: item.lineStart,
        lineEnd: item.lineEnd,
        confidenceEstimate: item.confidenceEstimate,
        warnings: item.warnings,
      })),
    });

    // 9. Format Respons View-Model untuk Klien UI & API
    let parsedHostname = "github.com";
    try {
      parsedHostname = new URL(savedSession.sourceUrl).hostname;
    } catch {
      parsedHostname = "github.com";
    }

    const mappedItems = crawlResult.items.map((item, idx) => ({
      id: item.id || `item-${savedSession.id}-${idx}`,
      type: item.itemType,
      title:
        item.itemType === "PROMPT_CANDIDATE"
          ? `Kandidat Prompt dari ${parsedHostname}`
          : `Fakta Konteks dari ${parsedHostname}`,
      content: item.extractedText,
      snippet: item.extractedText.slice(0, 200),
      attribution: {
        sourceUrl: savedSession.sourceUrl,
        sourceDomain: parsedHostname,
        fetchedAt: savedSession.createdAt.toISOString(),
        byteSize: savedSession.bytesRead,
        lineRange:
          item.lineStart && item.lineEnd ? `L${item.lineStart}-L${item.lineEnd}` : undefined,
      },
      confidenceScore: item.confidenceEstimate,
      warnings: item.warnings || [],
    }));

    return NextResponse.json(
      {
        success: true,
        data: {
          crawlerSourceId: savedSession.id, // Kompatibilitas mundur
          crawlSessionId: savedSession.id,
          sourceUrl: savedSession.sourceUrl,
          normalizedUrl: savedSession.normalizedUrl,
          status: savedSession.status,
          bytesRead: savedSession.bytesRead,
          items: mappedItems,
        },
      },
      { status: 201, headers: sessionHeaders }
    );
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[CRAWL_ROUTE_ERROR]", error?.message || "Internal error");
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal saat memproses ekstraksi crawler.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/crawl?id=...
 * Handler tipis delegasi: otorisasi sesi, penegakan anti-IDOR, dan pengambilan data CrawlSession.
 */
export async function GET(request: Request) {
  try {
    if (!isCrawlerFeatureEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: "Fitur Web Crawler dinonaktifkan.",
        },
        { status: 503 }
      );
    }

    const clientIP = extractClientIP(request);
    const rl = getCrawlRateLimiter().check(`crawl:${clientIP}`);
    if (!rl.allowed) {
      return rateLimitedResponse(rl.retryAfter);
    }

    const sessionRes = resolveSession(request);
    if (sessionRes.status === "invalid") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Token sesi tidak valid atau telah dimanipulasi.",
        },
        { status: 401 }
      );
    }
    const session = sessionRes.session || getOrCreateSession(request);

    const { searchParams } = new URL(request.url);
    const id =
      searchParams.get("id") ||
      searchParams.get("crawlSessionId") ||
      searchParams.get("crawlerSourceId");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Parameter 'id' wajib disertakan.",
        },
        { status: 400 }
      );
    }

    try {
      const crawlSession = await getCrawlSessionById(id, session.userId);
      if (!crawlSession) {
        return NextResponse.json(
          {
            success: false,
            error: "Sumber crawler tidak ditemukan.",
          },
          { status: 404 }
        );
      }

      let domain = "github.com";
      try {
        domain = new URL(crawlSession.sourceUrl).hostname;
      } catch {
        domain = "github.com";
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            id: crawlSession.id,
            crawlerSourceId: crawlSession.id,
            crawlSessionId: crawlSession.id,
            sourceUrl: crawlSession.sourceUrl,
            normalizedUrl: crawlSession.normalizedUrl,
            domain,
            status: crawlSession.status,
            bytesRead: crawlSession.bytesRead,
            crawledAt: crawlSession.createdAt.toISOString(),
            createdAt: crawlSession.createdAt.toISOString(),
            items: crawlSession.items,
          },
        },
        { status: 200 }
      );
    } catch (dbErr: unknown) {
      const code = (dbErr as { code?: string })?.code;
      if (code === "FORBIDDEN") {
        return NextResponse.json(
          {
            success: false,
            error: "Akses ditolak: Dokumen sumber ini bukan milik sesi Anda.",
          },
          { status: 403 }
        );
      }
      throw dbErr;
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[CRAWL_GET_ERROR]", error?.message || "Internal error");
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal saat mengambil data crawler.",
      },
      { status: 500 }
    );
  }
}
