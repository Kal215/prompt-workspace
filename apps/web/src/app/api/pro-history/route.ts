import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";

function getProHistoryDir(): string {
  const dir = path.join(os.homedir(), ".piew", "pro-history");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export interface ProHistoryRecord {
  id: string;
  title: string;
  prompt: string;
  domain: string;
  audienceLevel: string;
  customConstraints?: string[];
  activeMcpConnectors?: string[];
  groundingData?: {
    sourceUrl: string;
    facts: string[];
    combinedText: string;
  } | null;
  selectedModelA?: string;
  selectedModelB?: string;
  arenaMode?: "single" | "arena";
  synthesisResult?: any;
  resultA?: any;
  resultB?: any;
  score?: number;
  createdAt: string;
}

/**
 * GET /api/pro-history
 * Mengambil daftar riwayat Pro Studio atau record tunggal (?id=...)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const dir = getProHistoryDir();

    if (id) {
      const safeId = path.basename(id);
      const filePath = path.join(dir, `${safeId}.json`);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          { success: false, error: "Riwayat Pro tidak ditemukan." },
          { status: 404 }
        );
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      const record = JSON.parse(raw);
      return NextResponse.json({ success: true, data: record }, { status: 200 });
    }

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    const records: ProHistoryRecord[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(dir, file);
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.prompt) {
          records.push(parsed);
        }
      } catch {
        // Abaikan file rusak
      }
    }

    // Urutkan terbaru dulu
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(
      {
        success: true,
        data: records.slice(0, 50),
        count: records.length,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[API_PRO_HISTORY_GET_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Gagal memuat riwayat Pro Studio." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pro-history
 * Menyimpan sesi Pro Studio ke disk ~/.piew/pro-history/
 */
export async function POST(request: Request) {
  try {
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Payload JSON tidak valid." },
        { status: 400 }
      );
    }

    const promptText = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!promptText) {
      return NextResponse.json(
        { success: false, error: "Prompt tidak boleh kosong." },
        { status: 400 }
      );
    }

    const id = body.id && typeof body.id === "string" ? path.basename(body.id) : `pro-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const dir = getProHistoryDir();
    const filePath = path.join(dir, `${id}.json`);

    const record: ProHistoryRecord = {
      id,
      title: body.title || promptText.slice(0, 60),
      prompt: promptText,
      domain: body.domain || "software_engineering",
      audienceLevel: body.audienceLevel || "implementation_engineer",
      customConstraints: Array.isArray(body.customConstraints) ? body.customConstraints : [],
      activeMcpConnectors: Array.isArray(body.activeMcpConnectors) ? body.activeMcpConnectors : [],
      groundingData: body.groundingData || null,
      selectedModelA: body.selectedModelA,
      selectedModelB: body.selectedModelB,
      arenaMode: body.arenaMode || "arena",
      synthesisResult: body.synthesisResult || null,
      resultA: body.resultA || null,
      resultB: body.resultB || null,
      score: typeof body.score === "number" ? body.score : body.synthesisResult?.score || 85,
      createdAt: body.createdAt || new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), "utf-8");

    return NextResponse.json(
      { success: true, data: record },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[API_PRO_HISTORY_POST_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan riwayat Pro Studio." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pro-history
 * Menghapus record tunggal (?id=...) atau seluruh riwayat (?all=true)
 */
export async function DELETE(request: Request) {
  try {
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const clearAll = url.searchParams.get("all") === "true";
    const dir = getProHistoryDir();

    if (clearAll) {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(dir, file));
        } catch {}
      }
      return NextResponse.json(
        { success: true, message: "Seluruh riwayat Pro Studio berhasil dibersihkan." },
        { status: 200 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Parameter 'id' atau 'all=true' wajib disertakan." },
        { status: 400 }
      );
    }

    const safeId = path.basename(id);
    const filePath = path.join(dir, `${safeId}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json(
        { success: true, message: `Riwayat ${safeId} berhasil dihapus.` },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Berkas riwayat tidak ditemukan di server." },
      { status: 404 }
    );
  } catch (err: unknown) {
    console.error("[API_PRO_HISTORY_DELETE_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus riwayat Pro Studio." },
      { status: 500 }
    );
  }
}
