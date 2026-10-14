import { NextResponse } from "next/server";
import dotenv from "dotenv";
import path from "path";
import { getHistory, savePrompt, deletePrompt, type SavePromptInput } from "@prompt-workspace/database";

// Pastikan konfigurasi .env root dimuat untuk DATABASE_URL dan konfigurasi lainnya
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * GET /api/history
 * Mengambil riwayat prompt tersimpan dari database SQLite via Prisma.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100) : 50;

    const history = await getHistory(limit);

    return NextResponse.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    console.error("[API_HISTORY_GET_ERROR]", error);
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
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { originalPrompt, optimizedPrompt, intentSummary, score, id } = body;

    if (!originalPrompt || typeof originalPrompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Field 'originalPrompt' wajib diisi (string)." },
        { status: 400 }
      );
    }

    if (!optimizedPrompt || typeof optimizedPrompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Field 'optimizedPrompt' wajib diisi (string)." },
        { status: 400 }
      );
    }

    const payload: SavePromptInput = {
      id: typeof id === "string" && id.trim() ? id.trim() : undefined,
      originalPrompt: originalPrompt.trim(),
      optimizedPrompt: optimizedPrompt.trim(),
      intentSummary: typeof intentSummary === "string" ? intentSummary.trim() : null,
      score: typeof score === "number" && !isNaN(score) ? Math.round(score) : 80,
    };

    const saved = await savePrompt(payload);

    return NextResponse.json(
      {
        success: true,
        message: "Prompt berhasil disimpan ke riwayat database.",
        data: saved,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API_HISTORY_POST_ERROR]", error);
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
 * Menghapus prompt tertentu dari riwayat database (opsional).
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Parameter 'id' wajib disertakan untuk menghapus prompt." },
        { status: 400 }
      );
    }

    try {
      await deletePrompt(id);
    } catch (err: any) {
      if (err?.code === "P2025") {
        return NextResponse.json(
          { success: false, error: "Prompt dengan ID tersebut tidak ditemukan di database." },
          { status: 404 }
        );
      }
      throw err;
    }

    return NextResponse.json({
      success: true,
      message: "Prompt berhasil dihapus dari database.",
    });
  } catch (error) {
    console.error("[API_HISTORY_DELETE_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal menghapus prompt dari database.",
      },
      { status: 500 }
    );
  }
}
