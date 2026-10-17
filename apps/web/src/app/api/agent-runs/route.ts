import { NextResponse } from "next/server";
import { getBoundedAgentRuntime } from "../../../lib/agent-engine-bridge";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";
import {
  AgentBudget,
  AutonomyLevel,
  IntentSpec,
} from "@prompt-workspace/prompt-contracts";

/**
 * GET /api/agent-runs
 * Mengambil daftar riwayat AgentRun atau detail run tunggal (?runId=...)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const runId = url.searchParams.get("runId");
    const runtime = getBoundedAgentRuntime();

    if (runId) {
      const run = runtime.getRun(runId);
      if (!run) {
        return NextResponse.json(
          { success: false, error: `Run dengan ID '${runId}' tidak ditemukan.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, run }, { status: 200 });
    }

    const runs = runtime.listRuns(50);
    return NextResponse.json(
      {
        success: true,
        runs,
        total: runs.length,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[API_AGENT_RUNS_GET_ERROR]", (err as Error).message);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil data riwayat agent run.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent-runs
 * action: 'start_run' -> Memulai eksekusi BoundedAgentRuntime
 * action: 'cancel_run' -> Mengaktifkan Operator Kill-Switch untuk membatalkan run
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

    const runtime = getBoundedAgentRuntime();
    const action = body.action || "start_run";

    if (action === "cancel_run") {
      const { runId } = body;
      if (!runId || typeof runId !== "string") {
        return NextResponse.json(
          { success: false, error: "Parameter runId wajib disertakan untuk pembatalan." },
          { status: 400 }
        );
      }
      const cancelledRun = runtime.cancelRun(runId);
      if (!cancelledRun) {
        return NextResponse.json(
          { success: false, error: `Run '${runId}' tidak ditemukan untuk dibatalkan.` },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Run '${runId}' berhasil dihentikan oleh operator (Kill-Switch).`,
        run: cancelledRun,
      });
    }

    if (action === "start_run") {
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      const profile = (body.profile as "eco" | "balanced" | "deep") || "balanced";
      const autonomyLevel = (body.autonomyLevel as AutonomyLevel) || "L2_bounded_autonomy";
      const ownerId = typeof body.ownerId === "string" ? body.ownerId : "operator-local";

      if (!prompt && (!body.intent || typeof body.intent.goal !== "string")) {
        return NextResponse.json(
          { success: false, error: "Parameter prompt atau intent.goal wajib diisi." },
          { status: 400 }
        );
      }

      const intent: IntentSpec = body.intent || {
        goal: prompt,
        hardConstraints: Array.isArray(body.hardConstraints) ? body.hardConstraints : [],
        softPreferences: Array.isArray(body.softPreferences) ? body.softPreferences : [],
        prohibitedOutcomes: Array.isArray(body.prohibitedOutcomes) ? body.prohibitedOutcomes : [],
        assumptions: [],
        acceptanceCriteria: [],
      };

      const profileBudgets: Record<string, Partial<AgentBudget>> = {
        eco: { maxSteps: 6, maxPromptRevisions: 2, maxDurationMs: 60000, maxProviderCalls: 10 },
        balanced: { maxSteps: 12, maxPromptRevisions: 3, maxDurationMs: 180000, maxProviderCalls: 20 },
        deep: { maxSteps: 24, maxPromptRevisions: 6, maxDurationMs: 600000, maxProviderCalls: 40 },
      };
      const mergedBudget: Partial<AgentBudget> = {
        ...(profileBudgets[profile] || profileBudgets.balanced),
        ...(body.budget || {}),
      };

      const run = await runtime.executeBoundedAgentRun({
        intent,
        autonomyLevel,
        ownerId,
        budget: mergedBudget,
        prompt: prompt || intent.goal,
      });

      return NextResponse.json(
        {
          success: true,
          message: `Agent run '${run.runId}' selesai dieksekusi dengan status ${run.status}.`,
          run,
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Action '${action}' tidak dikenali.` },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("[API_AGENT_RUNS_POST_ERROR]", (err as Error).message);
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || "Gagal memproses eksekusi agent run.",
      },
      { status: 500 }
    );
  }
}
