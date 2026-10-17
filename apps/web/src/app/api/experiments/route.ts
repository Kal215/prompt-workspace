import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getScientificExperimentRunner } from "../../../lib/agent-engine-bridge";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";
import {
  BaselineLevel,
  DatasetSplit,
  ExperimentDataset,
} from "@prompt-workspace/prompt-contracts";

const CANONICAL_BENCHMARK_DATASET: ExperimentDataset = {
  datasetId: "piew-eval-v1",
  version: "1.0.0",
  sha256Hash: "d8e8fca2dc6451ef9c81e82d8c3685f0ef3524b0717282cb8d6268802951dc89",
  createdAt: "2026-10-16T00:00:00.000Z",
  testCases: [
    {
      id: "tc-tuning-01",
      domain: "software_engineering",
      prompt: "Buat modul autentikasi JWT di Fastify dengan refresh token rotasi.",
      hardConstraints: ["Wajib HTTPS", "Gunakan argon2 untuk hashing password"],
      expectedBehaviors: ["Menyertakan interface TypeScript", "Menerapkan rotasi refresh token"],
      split: "tuning",
    },
    {
      id: "tc-holdout-01",
      domain: "software_engineering",
      prompt: "Rancang arsitektur backend REST API transaksi pembayaran skala enterprise.",
      hardConstraints: ["Jangan buat POS", "Wajib idempotency key pada endpoint mutasi"],
      expectedBehaviors: ["Menjelaskan ACID compliance", "Menyertakan penanganan retry idempotency"],
      split: "holdout",
    },
    {
      id: "tc-holdout-02",
      domain: "database_design",
      prompt: "Susun skema relasional e-commerce PostgreSQL dengan skema multi-tenant.",
      hardConstraints: ["Wajib isolasi tenant_id", "Gunakan foreign key constraints"],
      expectedBehaviors: ["Indeks pada tenant_id", "Kueri aman dari SQL injection"],
      split: "holdout",
    },
  ],
};

/**
 * GET /api/experiments
 * Mengambil daftar laporan eksperimen immutable atau detail artefak (?sha256=...)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sha256 = url.searchParams.get("sha256");
    const runner = getScientificExperimentRunner();

    if (sha256) {
      const artifact = runner.getArtifact(sha256);
      if (!artifact) {
        return NextResponse.json(
          { success: false, error: `Artefak eksperimen dengan hash '${sha256}' tidak ditemukan.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, artifact }, { status: 200 });
    }

    const artifacts = runner.listArtifacts(20);
    return NextResponse.json(
      {
        success: true,
        count: artifacts.length,
        artifacts,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[API_EXPERIMENTS_GET_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil laporan eksperimen." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/experiments
 * Menjalankan Scientific Paired Experiment membandingkan B0..B4 pada partisi tuning vs holdout.
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

    const split = (body.split as DatasetSplit) || "holdout";
    const baselines = (body.baselines as BaselineLevel[]) || ["B0", "B1", "B2", "B3", "B4"];
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "operator-local";

    let dataset: ExperimentDataset = CANONICAL_BENCHMARK_DATASET;
    if (body.testCases && Array.isArray(body.testCases) && body.testCases.length > 0) {
      const cases = body.testCases.map((tc: any, idx: number) => ({
        id: tc.id || `tc-custom-${idx + 1}`,
        domain: tc.domain || "software_engineering",
        prompt: String(tc.prompt || ""),
        hardConstraints: Array.isArray(tc.hardConstraints) ? tc.hardConstraints : [],
        expectedBehaviors: Array.isArray(tc.expectedBehaviors) ? tc.expectedBehaviors : [],
        split: tc.split === "tuning" ? ("tuning" as const) : ("holdout" as const),
      }));

      const rawJson = JSON.stringify(cases);
      const hash = crypto.createHash("sha256").update(rawJson).digest("hex");

      dataset = {
        datasetId: body.datasetId || `dataset-${Date.now()}`,
        version: "1.0.0",
        sha256Hash: hash,
        createdAt: new Date().toISOString(),
        testCases: cases,
      };
    } else if (body.dataset && typeof body.dataset === "object") {
      dataset = body.dataset;
    }

    const runner = getScientificExperimentRunner();
    const report = await runner.runPairedPromptExperiment({
      dataset,
      split,
      baselines,
      ownerId,
      fastDeterministicMode: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Eksperimen ${report.experimentId} berhasil dievaluasi. Winner: ${report.winnerBaseline}`,
        report,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[API_EXPERIMENTS_POST_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: (err as Error).message || "Gagal menjalankan eksperimen ilmiah." },
      { status: 500 }
    );
  }
}
