import { NextResponse } from "next/server";
import dotenv from "dotenv";
import path from "path";
import {
  getHistory,
  savePrompt,
  getPromptById,
  deletePrompt,
  type SavePromptInput,
} from "@prompt-workspace/database";
import { getOrCreateSession, resolveSession, clearSessionCookie } from "../../../lib/session";
import {
  getHistoryRateLimiter,
  extractClientIP,
} from "../../../lib/rate-limiter";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";

// Pastikan konfigurasi .env root dimuat untuk DATABASE_URL dan konfigurasi lainnya
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const MAX_PROMPT_CHARS = 50000;
const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB

/**
 * Helper untuk sanitasi error logging: tidak mengekspos prompt mentah, secret, atau stack trace.
 */
function logSanitizedError(operation: string, error: unknown) {
  const err = error as { name?: string; message?: string; code?: string };
  console.error(`[API_HISTORY_${operation}_ERROR]`, {
    name: err?.name || "Error",
    code: err?.code || "UNKNOWN",
  });
}

/**
 * Helper: Membuat response rate-limited 429.
 */
function rateLimitedResponse(retryAfter: number) {
  return NextResponse.json(
    {
      success: false,
      error: "Terlalu banyak request. Silakan coba lagi nanti.",
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
 * GET /api/history
 * Mengambil riwayat prompt tersimpan dari database SQLite via Prisma.
 * Hanya mengembalikan prompt milik pengguna yang terautentikasi + prompt legacy.
 */
export async function GET(request: Request) {
  try {
    // Rate limiting
    const clientIP = extractClientIP(request);
    const rl = getHistoryRateLimiter().check(`history:${clientIP}`);
    if (!rl.allowed) {
      return rateLimitedResponse(rl.retryAfter);
    }

    // Session identity
    const session = getOrCreateSession(request);
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100)
      : 50;

    const history = await getHistory(limit, session.userId);

    const headers: Record<string, string> = {};
    if (session.isNew) {
      headers["Set-Cookie"] = session.cookieHeaderValue;
    }

    return NextResponse.json(
      {
        success: true,
        data: history,
        count: history.length,
      },
      { headers }
    );
  } catch (error: unknown) {
    logSanitizedError("GET", error);
    return NextResponse.json(
      {
        success: true,
        data: [],
        count: 0,
        warning: "Database riwayat sedang tidak aktif pada runtime serverless ini.",
      },
      { status: 200 }
    );
  }
}

/**
 * POST /api/history
 * Menyimpan prompt yang di-accept oleh user ke database SQLite.
 * Dilengkapi dengan validasi ketat, idempotensi, batasan ukuran, CSRF, rate limit, dan ownership.
 */
export async function POST(request: Request) {
  try {
    // CSRF check
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    // Rate limiting
    const clientIP = extractClientIP(request);
    const rl = getHistoryRateLimiter().check(`history:${clientIP}`);
    if (!rl.allowed) {
      return rateLimitedResponse(rl.retryAfter);
    }

    // Session identity & token validation
    const sessionRes = resolveSession(request);
    if (sessionRes.status === "invalid") {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Token sesi tidak valid atau telah dimanipulasi.",
        },
        {
          status: 401,
          headers: {
            "Set-Cookie": clearSessionCookie(),
          },
        }
      );
    }
    const session = sessionRes.session || getOrCreateSession(request);
    const sessionHeaders: Record<string, string> = {};
    if (session.isNew) {
      sessionHeaders["Set-Cookie"] = session.cookieHeaderValue;
    }

    // 1. Validasi Ukuran Content-Length Header
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Ukuran payload melebihi batas maksimum 256 KB.",
        },
        { status: 413 }
      );
    }

    // 2. Baca Body dengan Batas Ukuran Streaming (Cegah chunked bypass sebelum parsing mahal)
    let rawText = "";
    if (request.body && typeof request.body.getReader === "function") {
      const reader = request.body.getReader();
      const decoder = new TextDecoder();
      let totalBytes = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.length;
          if (totalBytes > MAX_PAYLOAD_BYTES) {
            await reader.cancel();
            return NextResponse.json(
              {
                success: false,
                error: "Ukuran payload melebihi batas maksimum 256 KB.",
              },
              { status: 413 }
            );
          }
          rawText += decoder.decode(value, { stream: true });
        }
        rawText += decoder.decode();
      } catch (streamErr: unknown) {
        logSanitizedError("POST_STREAM", streamErr);
        return NextResponse.json(
          {
            success: false,
            error: "Gagal membaca body request.",
          },
          { status: 400 }
        );
      }
    } else {
      rawText = await request.text();
      if (rawText.length > MAX_PAYLOAD_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: "Ukuran payload melebihi batas maksimum 256 KB.",
          },
          { status: 413 }
        );
      }
    }

    // 3. Validasi Format JSON
    let body: unknown;
    try {
      if (!rawText.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: "Format JSON tidak valid atau body kosong.",
          },
          { status: 400 }
        );
      }
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Format JSON tidak valid atau body kosong.",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Payload body harus berupa JSON object.",
        },
        { status: 400 }
      );
    }

    const { originalPrompt, optimizedPrompt, intentSummary, score, id } =
      body as Record<string, unknown>;

    // 4. Validasi Field Wajib & Input Kosong
    if (typeof originalPrompt !== "string" || !originalPrompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Field 'originalPrompt' wajib diisi string dan tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    if (typeof optimizedPrompt !== "string" || !optimizedPrompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Field 'optimizedPrompt' wajib diisi string dan tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    // 5. Validasi Batas Maksimum Karakter Prompt
    if (
      originalPrompt.length > MAX_PROMPT_CHARS ||
      optimizedPrompt.length > MAX_PROMPT_CHARS
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Ukuran prompt melebihi batas maksimum ${MAX_PROMPT_CHARS.toLocaleString("id-ID")} karakter.`,
        },
        { status: 400 }
      );
    }

    // 6. Validasi Rentang Nilai Score (0 - 100)
    let parsedScore = 80;
    if (score !== undefined && score !== null) {
      if (typeof score !== "number" || isNaN(score) || score < 0 || score > 100) {
        return NextResponse.json(
          {
            success: false,
            error: "Nilai 'score' harus berupa angka numerik di antara 0 dan 100.",
          },
          { status: 400 }
        );
      }
      parsedScore = Math.round(score);
    }

    const cleanOriginal = originalPrompt.trim();
    const cleanOptimized = optimizedPrompt.trim();
    const cleanIntent =
      typeof intentSummary === "string" ? intentSummary.trim() : null;
    const cleanId =
      typeof id === "string" && id.trim() ? id.trim() : undefined;

    // 7. Idempotensi & Validasi Duplikasi ID
    if (cleanId) {
      const existing = await getPromptById(cleanId);
      if (existing) {
        // Cek apakah data payload identik (Idempotent Request)
        const isIdentical =
          existing.originalPrompt === cleanOriginal &&
          existing.optimizedPrompt === cleanOptimized;

        if (isIdentical) {
          return NextResponse.json(
            {
              success: true,
              message: "Prompt sudah tersimpan sebelumnya (idempotent).",
              data: existing,
            },
            { status: 200, headers: sessionHeaders }
          );
        }

        // Jika ID sama tetapi payload berbeda -> Conflict
        return NextResponse.json(
          {
            success: false,
            error: "Conflict: ID prompt sudah terdaftar dengan data berbeda.",
          },
          { status: 409 }
        );
      }
    }

    const payload: SavePromptInput = {
      id: cleanId,
      userId: session.userId,
      originalPrompt: cleanOriginal,
      optimizedPrompt: cleanOptimized,
      intentSummary: cleanIntent,
      score: parsedScore,
    };

    let saved;
    try {
      saved = await savePrompt(payload);
    } catch (saveErr: unknown) {
      const prismaErr = saveErr as { code?: string };
      if (prismaErr?.code === "P2002" && cleanId) {
        // Race condition: concurrent request paralel baru saja menyimpan ID ini
        const racedRecord = await getPromptById(cleanId);
        if (
          racedRecord &&
          racedRecord.originalPrompt === cleanOriginal &&
          racedRecord.optimizedPrompt === cleanOptimized
        ) {
          return NextResponse.json(
            {
              success: true,
              message: "Prompt sudah tersimpan sebelumnya (idempotent - race resolved).",
              data: racedRecord,
            },
            { status: 200, headers: sessionHeaders }
          );
        }
        return NextResponse.json(
          {
            success: false,
            error: "Conflict: ID prompt sudah terdaftar dengan data berbeda.",
          },
          { status: 409 }
        );
      }
      throw saveErr;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Prompt berhasil disimpan ke riwayat database.",
        data: saved,
      },
      { status: 201, headers: sessionHeaders }
    );
  } catch (error: unknown) {
    logSanitizedError("POST", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menyimpan prompt ke database.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/history?id=...
 * Menghapus prompt tertentu dari riwayat database SQLite.
 * Hanya pemilik (userId match) atau data legacy yang dapat dihapus.
 */
export async function DELETE(request: Request) {
  try {
    // CSRF check untuk DELETE
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    // Rate limiting
    const clientIP = extractClientIP(request);
    const rl = getHistoryRateLimiter().check(`history:${clientIP}`);
    if (!rl.allowed) {
      return rateLimitedResponse(rl.retryAfter);
    }

    // Session identity: DELETE WAJIB membawa sesi aktif yang sah
    const sessionRes = resolveSession(request);
    if (sessionRes.status !== "authenticated" || !sessionRes.session) {
      return NextResponse.json(
        {
          success: false,
          error: sessionRes.error
            ? `Unauthorized: ${sessionRes.error}`
            : "Unauthorized: Operasi DELETE memerlukan sesi aktif yang valid.",
        },
        {
          status: 401,
          headers: sessionRes.status === "invalid" ? { "Set-Cookie": clearSessionCookie() } : {},
        }
      );
    }
    const session = sessionRes.session;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !id.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Parameter 'id' wajib disertakan untuk menghapus prompt.",
        },
        { status: 400 }
      );
    }

    const cleanId = id.trim();

    try {
      await deletePrompt(cleanId, session.userId);
    } catch (err: unknown) {
      const errObj = err as { code?: string };
      if (errObj?.code === "P2025" || errObj?.code === "NOT_FOUND") {
        return NextResponse.json(
          {
            success: false,
            error: "Prompt dengan ID tersebut tidak ditemukan di database.",
          },
          { status: 404 }
        );
      }
      if (errObj?.code === "FORBIDDEN") {
        return NextResponse.json(
          {
            success: false,
            error: "Anda tidak berhak menghapus prompt milik pengguna lain.",
          },
          { status: 403 }
        );
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      message: "Prompt berhasil dihapus dari database.",
    });
  } catch (error: unknown) {
    logSanitizedError("DELETE", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menghapus prompt dari database.",
      },
      { status: 500 }
    );
  }
}
