import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import {
  initAutonomousProject,
  initAutonomousProjectAsync,
  getProjectStatus,
  getProjectSession,
  auditAndAdvancePhase,
  applyHumanOverride,
  exportHandoverBundle,
  listProjectSessions,
} from "@prompt-workspace/prompt-engine";
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
 * GET /api/supervision
 * Mengambil daftar seluruh sesi proyek supervisi otonom aktif di disk/memory.
 */
export async function GET(_request: Request) {
  try {
    const sessions = listProjectSessions();
    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || "Gagal mengambil daftar sesi supervisi";
    console.error("[API_SUPERVISION_GET_ERROR]", err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * POST /api/supervision
 * Endpoint multi-aksi untuk supervisi otonom (start, status, submit, override, export).
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

    const action = body.action;
    if (!action || typeof action !== "string") {
      return NextResponse.json(
        { success: false, error: "Field 'action' wajib disertakan (start | status | submit | override | export)." },
        { status: 400 }
      );
    }

    switch (action) {
      case "start": {
        const goal = (body.goal || body.prompt || "").trim();
        if (!goal) {
          return NextResponse.json(
            { success: false, error: "Field 'goal' atau 'prompt' wajib diisi untuk memulai proyek." },
            { status: 400 }
          );
        }

        const constraints = Array.isArray(body.constraints) ? body.constraints : [];
        let promptText = goal;
        if (constraints.length > 0) {
          promptText += `\nBatasan mutlak:\n${constraints.map((c: string) => `- ${c}`).join("\n")}`;
        }

        const result = await initAutonomousProjectAsync({
          prompt: promptText,
          domainId: body.domainId,
          subtopicId: body.subtopicId,
          audienceLevel: body.audienceLevel || "specialist",
          context: body.context || null,
        });

        return NextResponse.json({
          success: true,
          sessionId: result.session.sessionId,
          session: result.session,
          dispatchPrompt: result.dispatchPrompt,
          blueprint: result.session.masterBlueprint,
        });
      }

      case "status": {
        const sessionId = body.sessionId;
        if (!sessionId || typeof sessionId !== "string") {
          return NextResponse.json(
            { success: false, error: "Field 'sessionId' wajib diisi." },
            { status: 400 }
          );
        }

        const statusReport = getProjectStatus(sessionId);
        const session = getProjectSession(sessionId);
        return NextResponse.json({
          success: true,
          statusReport,
          session,
        });
      }

      case "submit": {
        const sessionId = body.sessionId;
        const phaseIndex = typeof body.phaseIndex === "number" ? body.phaseIndex : Number(body.phaseIndex);
        if (!sessionId || isNaN(phaseIndex) || phaseIndex < 0) {
          return NextResponse.json(
            { success: false, error: "Field 'sessionId' dan 'phaseIndex' valid wajib diisi." },
            { status: 400 }
          );
        }

        // Normalisasi format deliveredArtifacts
        const rawArtifacts = Array.isArray(body.artifacts)
          ? body.artifacts
          : Array.isArray(body.deliveredArtifacts)
          ? body.deliveredArtifacts
          : [];

        const deliveredArtifacts = rawArtifacts.map((art: unknown) => {
          if (typeof art === "string") {
            return { name: art, type: "artifact", summary: `Artefak ${art}` };
          }
          if (art && typeof art === "object") {
            const a = art as Record<string, unknown>;
            return {
              name: String(a.name || "unnamed-artifact"),
              type: String(a.type || "artifact"),
              summary: typeof a.summary === "string" ? a.summary : undefined,
              contentSnippet: typeof a.contentSnippet === "string" ? a.contentSnippet : undefined,
            };
          }
          return { name: "unknown-artifact", type: "artifact" };
        });

        const submission = {
          sessionId,
          phaseIndex,
          summaryOfWork: body.workSummary || body.summaryOfWork || "Menyelesaikan deliverable fase.",
          deliveredArtifacts,
          verificationOutput: body.testOutput || body.verificationOutput || "Verifikasi pengujian dilaporkan.",
          verificationCommand: body.verificationCommand || undefined,
          workingDirectory: body.workingDirectory || undefined,
          knownIssues: Array.isArray(body.knownIssues) ? body.knownIssues : [],
        };

        const auditResult = auditAndAdvancePhase(submission);
        return NextResponse.json({
          success: true,
          auditResult,
        });
      }

      case "override": {
        const sessionId = body.sessionId;
        if (!sessionId || typeof sessionId !== "string") {
          return NextResponse.json(
            { success: false, error: "Field 'sessionId' wajib diisi." },
            { status: 400 }
          );
        }

        const rawAction = body.overrideAction || body.action || "INJECT_CONSTRAINT";
        let engineAction: "INJECT_CONSTRAINT" | "FORCE_ADVANCE" | "FORCE_ROLLBACK" | "RESET_RETRIES" | "HALT" | "RESUME" = "INJECT_CONSTRAINT";
        if (rawAction === "FORCE_VERIFY_PHASE" || rawAction === "FORCE_ADVANCE") {
          engineAction = "FORCE_ADVANCE";
        } else if (rawAction === "ABORT_PROJECT" || rawAction === "HALT") {
          engineAction = "HALT";
        } else if (rawAction === "RESUME_PROJECT" || rawAction === "RESUME") {
          engineAction = "RESUME";
        } else if (rawAction === "RESET_RETRIES") {
          engineAction = "RESET_RETRIES";
        } else if (rawAction === "FORCE_ROLLBACK" || rawAction === "ROLLBACK") {
          engineAction = "FORCE_ROLLBACK";
        } else {
          engineAction = "INJECT_CONSTRAINT";
        }

        const overrideInput = {
          sessionId,
          action: engineAction,
          additionalConstraint:
            body.additionalConstraint ||
            (Array.isArray(body.injectedConstraints) ? body.injectedConstraints.join("; ") : body.instruction || "Batasan tambahan operator"),
          reason: body.instruction || body.reason || "Intervensi human-in-control",
          targetPhaseIndex: typeof body.targetPhaseIndex === "number" ? body.targetPhaseIndex : undefined,
        };

        const result = applyHumanOverride(overrideInput as any);
        return NextResponse.json({
          success: true,
          result,
        });
      }

      case "export": {
        const sessionId = body.sessionId;
        if (!sessionId || typeof sessionId !== "string") {
          return NextResponse.json(
            { success: false, error: "Field 'sessionId' wajib diisi." },
            { status: 400 }
          );
        }

        const exportRes = exportHandoverBundle(sessionId, body.targetDirectory);
        const session = getProjectSession(sessionId);
        let certMarkdown = "";
        let jsonContent = "";
        let blueprintMarkdown = "";

        if (session) {
          blueprintMarkdown = session.masterBlueprint.renderedMasterPrompt || "";
        }
        try {
          if (exportRes.success && exportRes.markdownPath && fs.existsSync(exportRes.markdownPath)) {
            certMarkdown = fs.readFileSync(exportRes.markdownPath, "utf-8");
          }
          if (exportRes.success && exportRes.jsonPath && fs.existsSync(exportRes.jsonPath)) {
            jsonContent = fs.readFileSync(exportRes.jsonPath, "utf-8");
          }
        } catch {}

        return NextResponse.json({
          success: exportRes.success,
          exportRes,
          certMarkdown,
          jsonContent,
          blueprintMarkdown,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Aksi '${action}' tidak dikenali.` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const errorMsg = (err as Error)?.message || "Gagal memproses aksi supervisi otonom";
    console.error("[API_SUPERVISION_ERROR]", err);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
