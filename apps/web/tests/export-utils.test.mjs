import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSafeExportPayload,
  buildMarkdownReport,
  sanitizeExportFilename,
} from "../src/lib/export-utils.ts";

test("Export Utilities Unit Suite (Stage 7 - Task #32)", async (t) => {
  const sampleResult = {
    requestId: "req-stage7-test-abc-123",
    originalPrompt: "Buatkan email penawaran produk kue basah Nay's Cake",
    optimizedPrompt:
      "Tuliskan draf email penawaran profesional untuk aneka kue basah tradisional Nay's Cake dengan rincian paket, ketentuan minimum pemesanan, dan batas konfirmasi H-1.",
    detectedIntent: {
      category: "marketing_copywriting",
      confidence: 0.94,
      explanation: "Permintaan pembuatan materi promosi email bisnis kue",
      preserved: true,
      reasoning: "Maksud promosi email bisnis dipertahankan sepenuhnya tanpa penambahan instruksi asing",
      preservedSummary: "Inti penawaran produk kuliner tetap presisi",
    },
    findings: [
      {
        id: "FND-01",
        category: "clarity",
        severity: "medium",
        title: "Instruksi Kurang Spesifik",
        description: "Prompt awal belum merinci struktur penawaran dan tenggat waktu pemesanan.",
        suggestion: "Tambahkan panduan paket, ketentuan order, dan call-to-action yang jelas.",
      },
    ],
    changes: [
      {
        type: "addition",
        field: "action_items",
        description: "Menambahkan klausul batas pemesanan H-1 dan minimum order",
      },
    ],
    evaluation: {
      score: 91,
      overallScore: 91,
      rubricVersion: "v1.1.0-stage7",
      dimensionScores: {
        clarity: 92,
        specificity: 90,
        intentPreservation: 95,
        constraintRigor: 88,
      },
      notice: "Evaluasi statis berbasis rubrik semantik; hasil eksekusi model aktual dapat bervariasi.",
    },
    metadata: {
      engineVersion: "v1.1.0-stage7",
      appliedDomainRule: "marketing-business-pack",
      providerId: "groq",
      model: "llama-3.3-70b-versatile",
      modelTarget: "llama-3.3-70b-versatile",
      processingTimeMs: 820,
      createdAt: "2026-10-14T14:00:00.000Z",
    },
    metrics: {
      clarityScore: 92,
      latencyMs: 820,
      constraintCoverage: 90,
    },
    providerId: "groq",
    model: "llama-3.3-70b-versatile",
    appliedDomainRule: "marketing-business-pack",
  };

  await t.test("buildSafeExportPayload creates valid reproducible JSON payload", () => {
    const payload = buildSafeExportPayload(sampleResult);

    assert.equal(payload.requestId, "req-stage7-test-abc-123");
    assert.equal(payload.metadata.engineVersion, "v1.1.0-stage7");
    assert.equal(payload.metadata.rubricVersion, "v1.1.0-stage7");
    assert.equal(
      typeof payload.metadata.appliedDomainRule === "object"
        ? payload.metadata.appliedDomainRule.domainId
        : payload.metadata.appliedDomainRule,
      "marketing-business-pack"
    );
    assert.equal(payload.metadata.providerId, "groq");
    assert.equal(payload.metadata.model, "llama-3.3-70b-versatile");
    assert.equal(payload.originalPrompt, sampleResult.originalPrompt);
    assert.equal(payload.optimizedPrompt, sampleResult.optimizedPrompt);
    assert.equal(payload.detectedIntent?.category, "marketing_copywriting");
    assert.equal(payload.evaluation.overallScore, 91);
    assert.ok(payload.evaluation.staticEvaluationNotice);
    assert.ok(payload.provenance.reproducibilityGuaranteed);

    // Security & Zero-Leakage check: no secret keys or internal paths
    const jsonStr = JSON.stringify(payload);
    assert.ok(!jsonStr.includes("API_KEY"));
    assert.ok(!jsonStr.includes("password"));
    assert.ok(!jsonStr.includes("secret"));
    assert.ok(!jsonStr.includes("gsk_"));
  });

  await t.test("buildMarkdownReport creates comprehensive Indonesian report", () => {
    const md = buildMarkdownReport(sampleResult);

    assert.ok(typeof md === "string");
    assert.ok(md.includes("Laporan Analisis & Rekayasa Prompt Terverifikasi"));
    assert.ok(md.includes("req-stage7-test-abc-123"));
    assert.ok(md.includes("v1.1.0-stage7"));
    assert.ok(md.includes("groq"));
    assert.ok(md.includes("llama-3.3-70b-versatile"));
    assert.ok(md.includes("Intent Guard"));
    assert.ok(md.includes("Perbandingan Prompt"));
    assert.ok(md.includes("Temuan Analisis Semantik"));
    assert.ok(md.includes("Evaluasi Rubrik"));
    assert.ok(md.includes("91/100"));
    assert.ok(md.includes("Nay's Cake"));
  });

  await t.test("sanitizeExportFilename protects against path traversal and special chars", () => {
    const safeName1 = sanitizeExportFilename("req-123/../../etc/passwd", "json");
    assert.ok(!safeName1.includes(".."));
    assert.ok(!safeName1.includes("/"));
    assert.ok(safeName1.endsWith(".json"));

    const safeName2 = sanitizeExportFilename("test id with spaces * & ?", "md");
    assert.ok(!safeName2.includes(" "));
    assert.ok(!safeName2.includes("*"));
    assert.ok(!safeName2.includes("?"));
    assert.ok(safeName2.endsWith(".md"));
  });
});
