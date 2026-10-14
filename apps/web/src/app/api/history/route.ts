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
 * GET /api/history
 * Mengambil riwayat prompt tersimpan dari database SQLite via Prisma.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100)
      : 50;

    const history = await getHistory(limit);

    return NextResponse.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error: unknown) {
    logSanitizedError("GET", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal memuat riwayat prompt dari database.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/history
 * Menyimpan prompt yang di-accept oleh user ke database SQLite.
 * Dilengkapi dengan validasi ketat, idempotensi, batasan ukuran, dan sanitasi error.
 */
export async function POST(request: Request) {
  try {
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

    // 3. Validasi Field Wajib & Input Kosong
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

    // 4. Validasi Batas Maksimum Karakter Prompt
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

    // 5. Validasi Rentang Nilai Score (0 - 100)
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

    // 6. Idempotensi & Validasi Duplikasi ID
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
            { status: 200 }
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
            { status: 200 }
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
      { status: 201 }
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
 */
export async function DELETE(request: Request) {
  try {
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
      await deletePrompt(cleanId);
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr?.code === "P2025") {
        return NextResponse.json(
          {
            success: false,
            error: "Prompt dengan ID tersebut tidak ditemukan di database.",
          },
          { status: 404 }
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
