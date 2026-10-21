import { NextResponse } from "next/server";
import { getAgentMemoryStore } from "../../../lib/agent-engine-bridge";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";
import {
  MemoryScope,
  MemoryStatus,
  MemoryType,
  MemoryValidationMethod,
} from "@prompt-workspace/prompt-contracts";

/**
 * GET /api/memory
 * Mengambil daftar memory dengan proteksi Anti-IDOR (pre-filtering by ownerId & scope).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ownerId = url.searchParams.get("ownerId") || "operator-local";
    const scope = (url.searchParams.get("scope") as MemoryScope) || undefined;
    const type = (url.searchParams.get("type") as MemoryType) || undefined;
    const status = (url.searchParams.get("status") as MemoryStatus) || undefined;
    const query = url.searchParams.get("query") || undefined;
    const onlyValidatedParam = url.searchParams.get("onlyValidated");
    const isAll = url.searchParams.get("all") === "true";

    const store = getAgentMemoryStore();

    if (isAll) {
      const records = store.listAllMemories({
        ownerId,
        scope,
        type,
        status,
      });
      return NextResponse.json(
        { success: true, count: records.length, memories: records },
        { status: 200 }
      );
    }

    const onlyValidated = onlyValidatedParam === null ? undefined : onlyValidatedParam === "true";

    const records = store.queryMemories({
      ownerId,
      scope,
      type,
      status,
      onlyValidated: onlyValidated ?? false,
      query,
      limit: 50,
    });

    return NextResponse.json(
      { success: true, count: records.length, memories: records },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[API_MEMORY_GET_ERROR]", (err as Error).message);
    return NextResponse.json(
      {
        success: true,
        count: 0,
        memories: [],
        warning: "Penyimpanan memori sedang tidak aktif pada runtime serverless ini.",
      },
      { status: 200 }
    );
  }
}

/**
 * POST /api/memory
 * Mengusulkan memory baru (Otomatis divalidasi oleh Anti-Poisoning Guard).
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

    const {
      type,
      scope,
      ownerId = "operator-local",
      content,
      sourceRunId = "direct_user_action",
      confidence = 0.95,
      validationMethod = "human",
    } = body;

    if (!type || !scope || !content || typeof content !== "string") {
      return NextResponse.json(
        { success: false, error: "Parameter type, scope, dan content wajib diisi." },
        { status: 400 }
      );
    }

    const store = getAgentMemoryStore();
    let record;
    try {
      record = store.proposeMemory({
        type: type as MemoryType,
        scope: scope as MemoryScope,
        ownerId,
        content,
        sourceRunId,
        confidence: Number(confidence) || 0.95,
        validationMethod: validationMethod as MemoryValidationMethod,
      });
    } catch (err: unknown) {
      const errMsg = (err as Error).message || "";
      const isPoison =
        errMsg.includes("ANTI_MEMORY_POISONING") || errMsg.includes("Anti-Poisoning");
      return NextResponse.json(
        {
          success: false,
          error: errMsg || "Gagal mengusulkan memory (Anti-Poisoning Guard aktif).",
        },
        { status: isPoison ? 422 : 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Memory berhasil diusulkan dan disimpan ke Vault.",
        memory: record,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[API_MEMORY_POST_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: (err as Error).message || "Gagal memproses pembuatan memory." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/memory
 * action: 'validate' -> Memvalidasi memory (proposed -> validated)
 * action: 'correct'  -> Mengoreksi isi memory (recalculate SHA-256)
 * action: 'stale'    -> Menandai memory kedaluwarsa (stale)
 */
export async function PUT(request: Request) {
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

    const {
      action = "validate",
      id,
      ownerId = "operator-local",
      validationMethod = "human",
      content,
    } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Parameter id memory wajib disertakan." },
        { status: 400 }
      );
    }

    const store = getAgentMemoryStore();

    if (action === "validate") {
      const existing = store.getMemory(id, ownerId);
      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Memory tidak ditemukan atau pelanggaran hak akses (Anti-IDOR)." },
          { status: 404 }
        );
      }
      const validated = store.validateMemoryRecord(
        id,
        validationMethod as MemoryValidationMethod
      );
      if (!validated) {
        return NextResponse.json(
          { success: false, error: "Gagal memvalidasi memory." },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Memory '${id}' berhasil divalidasi.`,
        memory: validated,
      });
    }

    if (action === "reject") {
      const existing = store.getMemory(id, ownerId);
      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Memory tidak ditemukan atau pelanggaran hak akses (Anti-IDOR)." },
          { status: 404 }
        );
      }
      const rejected = store.validateMemoryRecord(id, {
        passed: false,
        validationMethod: (validationMethod as MemoryValidationMethod) || "human",
      });
      if (!rejected) {
        return NextResponse.json(
          { success: false, error: "Gagal menolak memory." },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Memory '${id}' berhasil ditolak.`,
        memory: rejected,
      });
    }

    if (action === "correct") {
      if (!content || typeof content !== "string") {
        return NextResponse.json(
          { success: false, error: "Parameter content baru wajib disertakan untuk koreksi." },
          { status: 400 }
        );
      }
      const corrected = store.correctMemory(id, content, ownerId);
      if (!corrected) {
        return NextResponse.json(
          { success: false, error: "Gagal mengoreksi memory. ID tidak ditemukan atau terdeteksi poisoning." },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Memory '${id}' berhasil dikoreksi.`,
        memory: corrected,
      });
    }

    if (action === "stale") {
      const ok = store.markMemoryStale(id, ownerId);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: "Gagal menandai memory stale. ID tidak ditemukan atau pelanggaran IDOR." },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Memory '${id}' ditandai sebagai stale.`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Action '${action}' tidak dikenali.` },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[API_MEMORY_PUT_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: (err as Error).message || "Gagal memperbarui memory." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/memory
 * Menghapus memory dari disk dan in-memory cache dengan verifikasi hak milik (Anti-IDOR).
 */
export async function DELETE(request: Request) {
  try {
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    const url = new URL(request.url);
    let id = url.searchParams.get("id");
    let ownerId = url.searchParams.get("ownerId") || "operator-local";

    if (!id) {
      const body = await request.json().catch(() => null);
      if (body && typeof body === "object") {
        id = body.id;
        if (body.ownerId) ownerId = body.ownerId;
      }
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Parameter id memory wajib disertakan untuk penghapusan." },
        { status: 400 }
      );
    }

    const store = getAgentMemoryStore();
    const deleted = store.deleteMemory(id, ownerId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Memory tidak ditemukan atau tidak memiliki hak akses untuk menghapus." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Memory '${id}' berhasil dihapus dari Vault.`,
    });
  } catch (err: unknown) {
    console.error("[API_MEMORY_DELETE_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: (err as Error).message || "Gagal menghapus memory." },
      { status: 500 }
    );
  }
}
