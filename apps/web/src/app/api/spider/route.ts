import { NextResponse } from "next/server";
import dotenv from "dotenv";
import path from "path";
import {
  saveSpiderRunBatch,
  getSpiderRunById,
  getPromptVersions,
  prisma,
} from "@prompt-workspace/database";
import { runPromptSpider } from "@prompt-workspace/prompt-spider";
import { isSpiderFeatureEnabled } from "../../../lib/feature-flags";
import { resolveSession, getOrCreateSession } from "../../../lib/session";
import { getSpiderRateLimiter, extractClientIP } from "../../../lib/rate-limiter";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function rateLimitedResponse(retryAfter: number) {
  return NextResponse.json(
    {
      success: false,
      error: "Terlalu banyak permintaan uji Spider. Silakan coba lagi nanti.",
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
 * POST /api/spider
 * Handler tipis delegasi: validasi request, otorisasi sesi, panggil Spider Engine (@prompt-workspace/prompt-spider),
 * dan persistensi batch ke SQLite (@prompt-workspace/database).
 */
export async function POST(request: Request) {
  try {
    // 1. Feature Flag Guard
    if (!isSpiderFeatureEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: "Fitur Prompt Spider dinonaktifkan oleh administrator.",
        },
        { status: 503 }
      );
    }

    // 2. CSRF Protection (Fail-Closed)
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF verification failed.");
    }

    // 3. Rate Limiting (5 req/60s per IP)
    const clientIP = extractClientIP(request);
    const rl = getSpiderRateLimiter().check(`spider:${clientIP}`);
    if (!rl.allowed) {
      return rateLimitedResponse(rl.retryAfter);
    }

    // 4. Session Resolution
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

    // 5. Parse Body
    let body: Record<string, unknown> = {};
    try {
      const rawText = await request.text();
      if (rawText.trim()) {
        body = JSON.parse(rawText);
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Format JSON body tidak valid.",
        },
        { status: 400, headers: sessionHeaders }
      );
    }

    let promptVersionId =
      typeof body.promptVersionId === "string" ? body.promptVersionId : undefined;
    const savedPromptId =
      typeof body.savedPromptId === "string" ? body.savedPromptId : undefined;
    let promptContent =
      typeof body.promptContent === "string" ? body.promptContent.trim() : "";
    const targetProvider =
      typeof body.targetProvider === "string" ? body.targetProvider : "groq";
    const targetModel =
      typeof body.targetModel === "string"
        ? body.targetModel
        : "llama-3.3-70b-versatile";
    const testSuiteVersion =
      typeof body.testSuiteVersionId === "string"
        ? body.testSuiteVersionId
        : "v2.0.0";

    // 6. Otorisasi Kepemilikan & Resolusi Teks Prompt (Anti-IDOR)
    let matchedVersionRecord = null;
    if (promptVersionId) {
      matchedVersionRecord = await prisma.promptVersion.findUnique({
        where: { id: promptVersionId },
        include: { savedPrompt: true },
      });

      if (!matchedVersionRecord) {
        return NextResponse.json(
          {
            success: false,
            error: `PromptVersion dengan ID '${promptVersionId}' tidak ditemukan.`,
          },
          { status: 404, headers: sessionHeaders }
        );
      }

      if (
        matchedVersionRecord.userId !== session.userId &&
        matchedVersionRecord.userId !== "legacy_default_user"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Akses ditolak: Versi prompt ini bukan milik sesi Anda.",
          },
          { status: 403, headers: sessionHeaders }
        );
      }

      if (!promptContent) {
        promptContent = matchedVersionRecord.promptContent;
      }
    } else if (savedPromptId) {
      try {
        const versions = await getPromptVersions(savedPromptId, session.userId);
        if (versions.length > 0) {
          const latestVersion = versions[versions.length - 1];
          matchedVersionRecord = latestVersion;
          promptVersionId = latestVersion.id;
          if (!promptContent) {
            promptContent = latestVersion.promptContent;
          }
        }
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === "FORBIDDEN") {
          return NextResponse.json(
            {
              success: false,
              error: "Akses ditolak: Prompt ini bukan milik sesi Anda.",
            },
            { status: 403, headers: sessionHeaders }
          );
        }
        if (code === "NOT_FOUND") {
          return NextResponse.json(
            {
              success: false,
              error: "Prompt tidak ditemukan.",
            },
            { status: 404, headers: sessionHeaders }
          );
        }
        throw err;
      }
    }

    if (!promptContent) {
      return NextResponse.json(
        {
          success: false,
          error: "Konten prompt ('promptContent' atau 'promptVersionId') wajib diisi.",
        },
        { status: 400, headers: sessionHeaders }
      );
    }

    // 7. Panggil Use Case: Spider Engine Terpusat (@prompt-workspace/prompt-spider)
    const spiderReport = await runPromptSpider({
      promptContent,
      promptVersionId: promptVersionId || "ephemeral-version",
      testSuiteVersionId: testSuiteVersion,
      runMode: "SINGLE",
    });

    const totalDurationMs = spiderReport.branches.reduce(
      (acc, b) => acc + (b.latencyMs || 0),
      0
    );

    // 8. Persistensi Batch ke SQLite (@prompt-workspace/database) jika terikat ke PromptVersion
    let savedRunId = spiderReport.runId || `spider-run-${Date.now()}`;
    if (promptVersionId && matchedVersionRecord) {
      try {
        const savedRun = await saveSpiderRunBatch({
          userId: session.userId,
          idempotencyKey: (body.idempotencyKey as string) || undefined,
          promptVersionId,
          testSuiteVersion: spiderReport.testSuiteVersion,
          rubricVersion: spiderReport.rubricVersion,
          provider: targetProvider,
          modelId: targetModel,
          status: spiderReport.status,
          criticalGatePassed: spiderReport.criticalGatePassed,
          qualityMetrics: spiderReport.qualityMetrics,
          securityFindings: spiderReport.securityFindings,
          totalTokens: 100,
          durationMs: totalDurationMs,
          branches: spiderReport.branches.map((b) => ({
            caseId: b.caseId,
            category: b.category,
            severity: b.severity,
            status: b.status,
            score: b.score,
            latencyMs: b.latencyMs,
            sanitizedInput: b.sanitizedInput,
            sanitizedOutput: b.sanitizedOutput,
            rationale: b.rationale,
            deterministicPass: b.deterministicPass,
          })),
        });
        savedRunId = savedRun.id;
      } catch (saveErr: unknown) {
        const code = (saveErr as { code?: string })?.code;
        if (code === "FORBIDDEN") {
          return NextResponse.json(
            {
              success: false,
              error: "Akses ditolak: Tidak berhak menyimpan run pada versi prompt pengguna lain.",
            },
            { status: 403, headers: sessionHeaders }
          );
        }
        throw saveErr;
      }
    }

    // 9. Format Respons View-Model Klien
    const responseData = {
      runId: savedRunId,
      jobId: savedRunId,
      promptVersionId: promptVersionId || "ephemeral-version",
      testSuiteVersionId: spiderReport.testSuiteVersion,
      status: spiderReport.status,
      criticalGatePassed: spiderReport.criticalGatePassed,
      qualityMetrics: {
        ...spiderReport.qualityMetrics,
        robustnessScore: spiderReport.qualityMetrics.robustness,
      },
      securityFindings: spiderReport.securityFindings,
      testCases: spiderReport.branches.map((b) => ({
        id: b.caseId,
        name: b.caseId.replace("tc-", "Kasus ").replace(/-/g, " "),
        category: b.category,
        status: b.status,
        inputPrompt: b.sanitizedInput,
        modelOutputSnippet: b.sanitizedOutput,
        latencyMs: b.latencyMs,
        errorReason: b.rationale || undefined,
      })),
      evaluatedAt: new Date().toISOString(),
      durationMs: totalDurationMs,
    };

    return NextResponse.json(
      {
        success: true,
        data: responseData,
      },
      {
        status: 201,
        headers: sessionHeaders,
      }
    );
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[SPIDER_ROUTE_ERROR]", error?.message || "Internal error");
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal saat memproses uji Spider.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/spider?id=...
 * Handler tipis delegasi: otorisasi sesi, penegakan anti-IDOR via database layer, dan pengambilan data SpiderRun.
 */
export async function GET(request: Request) {
  try {
    if (!isSpiderFeatureEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: "Fitur Prompt Spider dinonaktifkan.",
        },
        { status: 503 }
      );
    }

    const clientIP = extractClientIP(request);
    const rl = getSpiderRateLimiter().check(`spider:${clientIP}`);
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
    const id = searchParams.get("id") || searchParams.get("runId");

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
      const run = await getSpiderRunById(id, session.userId);

      if (!run) {
        return NextResponse.json(
          {
            success: false,
            error: "SpiderRun tidak ditemukan.",
          },
          { status: 404 }
        );
      }

      let parsedQualityMetrics = {};
      try {
        parsedQualityMetrics = JSON.parse(run.qualityMetricsJson || "{}");
      } catch {
        parsedQualityMetrics = {};
      }

      let parsedSecurityFindings = [];
      try {
        parsedSecurityFindings = JSON.parse(run.securityJson || "[]");
      } catch {
        parsedSecurityFindings = [];
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            id: run.id,
            runId: run.id,
            promptVersionId: run.promptVersionId,
            provider: run.provider,
            targetProvider: run.provider,
            modelId: run.modelId,
            targetModel: run.modelId,
            status: run.status,
            criticalGatePassed: run.criticalGatePassed,
            qualityMetrics: parsedQualityMetrics,
            securityFindings: parsedSecurityFindings,
            totalCases: run.branches.length,
            passedCases: run.branches.filter((b) => b.status === "PASS").length,
            durationMs: run.durationMs,
            createdAt: run.createdAt.toISOString(),
            testResults: run.branches,
            branches: run.branches,
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
            error: "Akses ditolak: Hasil uji Spider ini bukan milik sesi Anda.",
          },
          { status: 403 }
        );
      }
      throw dbErr;
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[SPIDER_GET_ERROR]", error?.message || "Internal error");
    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan internal saat mengambil data SpiderRun.",
      },
      { status: 500 }
    );
  }
}
