import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { synthesizeUniversalBlueprint, synthesizeUniversalBlueprintAsync } from "@prompt-workspace/prompt-engine";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";

// Pastikan konfigurasi .env dimuat
[
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(process.cwd(), "../../.env"),
].forEach((p) => {
  try {
    if (fs.existsSync(p)) dotenv.config({ path: p });
  } catch {}
});

/**
 * POST /api/blueprint
 * Menerima kebutuhan proyek dan menghasilkan 10-Bagian Universal Meta-Blueprint
 * lengkap dengan diagram Mermaid deklaratif (ERD & Flowchart transaksi).
 */
export async function POST(request: Request) {
  try {
    // CSRF check
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Payload request tidak valid (harus JSON object)." },
        { status: 400 }
      );
    }

    const goal = typeof body.goal === "string" ? body.goal.trim() : "";
    if (!goal) {
      return NextResponse.json(
        { success: false, error: "Field 'goal' wajib diisi dan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const constraints = Array.isArray(body.constraints)
      ? body.constraints.filter((c: unknown) => typeof c === "string" && c.trim().length > 0)
      : [];

    const domain = typeof body.domain === "string" ? body.domain.trim() : undefined;
    const validLevels = ["student", "academic", "professional", "specialist"] as const;
    type AudienceLevelType = (typeof validLevels)[number];
    const audienceLevel: AudienceLevelType =
      typeof body.audienceLevel === "string" && validLevels.includes(body.audienceLevel as AudienceLevelType)
        ? (body.audienceLevel as AudienceLevelType)
        : "specialist";

    // Gabungkan goal dan batasan ke format prompt
    let promptText = goal;
    if (constraints.length > 0) {
      promptText += `\nBatasan mutlak:\n${constraints.map((c: string) => `- ${c}`).join("\n")}`;
    }

    let result;
    try {
      result = await synthesizeUniversalBlueprintAsync({
        prompt: promptText,
        domain,
        audienceLevel,
        context: typeof body.context === "string" ? body.context : null,
        negativeConstraints: constraints,
      });
    } catch {
      result = synthesizeUniversalBlueprint({
        prompt: promptText,
        domain,
        audienceLevel,
        context: typeof body.context === "string" ? body.context : null,
      });
    }

    return NextResponse.json({
      success: true,
      blueprint: result.blueprint,
      mermaidDiagrams: result.blueprint.diagrams || [],
      metadata: {
        title: result.blueprint.title,
        domain: result.blueprint.domain,
        audienceLevel: result.blueprint.audienceLevel,
        consistencyScore: result.consistencyScore,
        consistencyValid: result.consistencyValid,
        warnings: result.warnings,
        synthesisMode: result.metadata?.synthesisMode,
        providerId: result.metadata?.providerId,
        model: result.metadata?.model,
        latencyMs: result.metadata?.latencyMs,
        mcpEnriched: result.metadata?.mcpEnriched,
        mcpConnectors: result.metadata?.mcpConnectors,
      },
      phases: result.blueprint.executionPhases || [],
    });
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || "Gagal menghasilkan Universal Blueprint";
    console.error("[API_BLUEPRINT_ERROR]", err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
