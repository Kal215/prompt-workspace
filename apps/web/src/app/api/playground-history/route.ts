import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";

function getPlaygroundHistoryDir(): string {
  const dir = path.join(os.homedir(), ".piew", "playground-history");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export interface PlaygroundModelResult {
  id: string;
  name: string;
  providerId: string;
  model: string;
  output?: string;
  latencyMs?: number;
  tokensUsed?: number;
  error?: string;
}

export interface PlaygroundHistoryRecord {
  id: string;
  title: string;
  prompt: string;
  systemPrompt?: string;
  mode: "single" | "arena";
  modelA: PlaygroundModelResult;
  modelB?: PlaygroundModelResult | null;
  parameters: {
    temperature: number;
    topP: number;
    maxTokens: number;
  };
  winner?: "A" | "B" | "tie" | null;
  isBlind?: boolean;
  createdAt: string;
}

/**
 * GET /api/playground-history
 * Mengambil daftar riwayat Playground atau record tunggal (?id=...)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const query = url.searchParams.get("q")?.toLowerCase();
    const dir = getPlaygroundHistoryDir();

    if (id) {
      const safeId = path.basename(id);
      const filePath = path.join(dir, `${safeId}.json`);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          { success: false, error: "Riwayat Playground tidak ditemukan." },
          { status: 404 }
        );
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      const record = JSON.parse(raw);
      return NextResponse.json({ success: true, data: record }, { status: 200 });
    }

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    const records: PlaygroundHistoryRecord[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(dir, file);
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.prompt) {
          if (!query || parsed.prompt.toLowerCase().includes(query) || (parsed.title && parsed.title.toLowerCase().includes(query))) {
            records.push(parsed);
          }
        }
      } catch {
        // Abaikan file korup
      }
    }

    // Urutkan dari yang paling baru
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
    console.error("[API_PLAYGROUND_HISTORY_GET_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Gagal memuat riwayat Playground." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/playground-history
 * Menyimpan sesi Playground ke disk ~/.piew/playground-history/
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

    const dir = getPlaygroundHistoryDir();
    const id = body.id && typeof body.id === "string" && body.id.startsWith("play_")
      ? path.basename(body.id)
      : `play_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Buat judul ringkas dari prompt
    const cleanTitle = promptText.length > 55 ? `${promptText.substring(0, 52)}...` : promptText;

    const record: PlaygroundHistoryRecord = {
      id,
      title: body.title || cleanTitle,
      prompt: promptText,
      systemPrompt: typeof body.systemPrompt === "string" ? body.systemPrompt : undefined,
      mode: body.mode === "arena" ? "arena" : "single",
      modelA: body.modelA || {
        id: "default",
        name: "Model A",
        providerId: "groq",
        model: "llama-3.3-70b-versatile",
      },
      modelB: body.modelB || null,
      parameters: {
        temperature: typeof body.parameters?.temperature === "number" ? body.parameters.temperature : 0.7,
        topP: typeof body.parameters?.topP === "number" ? body.parameters.topP : 0.9,
        maxTokens: typeof body.parameters?.maxTokens === "number" ? body.parameters.maxTokens : 2048,
      },
      winner: body.winner || null,
      isBlind: Boolean(body.isBlind),
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const filePath = path.join(dir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(record, null, 2), "utf-8");

    return NextResponse.json(
      {
        success: true,
        data: record,
        message: "Sesi Playground berhasil disimpan.",
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[API_PLAYGROUND_HISTORY_POST_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan riwayat Playground." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/playground-history
 * Menghapus rekaman riwayat (?id=...) atau seluruh riwayat (?all=true)
 */
export async function DELETE(request: Request) {
  try {
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const all = url.searchParams.get("all");
    const dir = getPlaygroundHistoryDir();

    if (all === "true") {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(dir, file));
        } catch {}
      }
      return NextResponse.json(
        { success: true, message: "Seluruh riwayat Playground berhasil dihapus." },
        { status: 200 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Parameter id atau all=true diperlukan." },
        { status: 400 }
      );
    }

    const safeId = path.basename(id);
    const filePath = path.join(dir, `${safeId}.json`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: "Riwayat Playground tidak ditemukan." },
        { status: 404 }
      );
    }

    fs.unlinkSync(filePath);
    return NextResponse.json(
      { success: true, message: `Riwayat ${safeId} berhasil dihapus.` },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[API_PLAYGROUND_HISTORY_DELETE_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus riwayat Playground." },
      { status: 500 }
    );
  }
}
