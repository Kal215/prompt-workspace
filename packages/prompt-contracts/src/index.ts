import { z } from "zod";

// ──────────────────────────────────────────────
// Blueprint v1.0 Bagian 5.2 — Core Request Schema
// ──────────────────────────────────────────────

/**
 * Schema Zod untuk PromptOptimizationRequest.
 *
 * Kontrak ini menjadi sumber kebenaran (single source of truth)
 * antara Engine (backend) dan Web (frontend).
 */
export const PromptOptimizationRequestSchema = z.object({
  /** Prompt asli yang ingin dioptimasi (wajib, tidak boleh kosong) */
  prompt: z.string().min(1, "Prompt is required"),

  /** Konteks tambahan untuk membantu engine memahami intent */
  context: z.string().nullable().default(null),

  /** Tipe task: coding, writing, analysis, dll. */
  taskType: z.string().nullable().default(null),

  /** Batasan/constraint tambahan dari user */
  constraints: z.array(z.string()).optional().default([]),

  /** ID unik per request untuk traceability */
  requestId: z.string().min(1, "requestId is required"),
});

/** TypeScript type yang di-infer dari schema Zod */
export type PromptOptimizationRequest = z.infer<
  typeof PromptOptimizationRequestSchema
>;

// ──────────────────────────────────────────────
// Blueprint v1.0 Bagian 5.4 — Taksonomi Temuan
// ──────────────────────────────────────────────

export const FindingCategoryEnum = z.enum([
  "Tujuan",
  "Konteks",
  "Ambiguitas",
  "Kontradiksi",
  "Batasan",
  "Keluaran",
  "Keberhasilan",
  "Bukti",
]);

export const FindingCategorySchema = FindingCategoryEnum.or(z.string());
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

export const FindingSeveritySchema = z.enum([
  "critical",
  "major",
  "minor",
  "info",
  "warning",
]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const FindingSchema = z.object({
  /** Kategori taksonomi temuan (Tujuan, Konteks, Ambiguitas, dll.) */
  category: FindingCategorySchema,

  /** Tingkat keparahan masalah */
  severity: FindingSeveritySchema,

  /** Bagian dari prompt atau bukti spesifik yang bermasalah */
  evidence: z.string(),

  /** Rekomendasi perbaikan konkret untuk mengatasi temuan */
  recommendation: z.string(),

  /** Alias untuk kompatibilitas frontend jika diperlukan */
  type: z.string().optional(),

  /** Pesan ringkas temuan */
  message: z.string().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

// ──────────────────────────────────────────────
// Blueprint v1.0 Bagian 5.3 — Core Result Schema
// ──────────────────────────────────────────────

export const PromptAnalysisSchema = z.object({
  /** Daftar temuan kelemahan prompt berdasarkan taksonomi */
  findings: z.array(FindingSchema),

  /** Skor kesehatan prompt (0 - 100) */
  score: z.number().optional().default(0),

  /** Status analisis prompt */
  status: z.string().optional().default("analyzed"),
});
export type PromptAnalysis = z.infer<typeof PromptAnalysisSchema>;

export const PromptOptimizationResultSchema = z.object({
  /** ID request terkait */
  requestId: z.string().min(1, "requestId is required"),

  /** Prompt asli sebelum dioptimasi */
  originalPrompt: z.string(),

  /** Maksud/tujuan inti pengguna yang berhasil dideteksi */
  detectedIntent: z.string(),

  /** Hasil analisis terstruktur (findings, score, status) */
  analysis: PromptAnalysisSchema,

  /** Prompt baru hasil rekonstruksi & optimasi (Preserve Intent) */
  optimizedPrompt: z.string(),

  /** Daftar perubahan konkret yang dilakukan pada prompt */
  changes: z.array(z.string()),

  /** Peringatan asumsi atau informasi yang masih kurang */
  warnings: z.array(z.string()),

  /** Metadata tambahan (model target, waktu pemrosesan, token, dll.) */
  metadata: z
    .object({
      modelTarget: z.string().optional(),
      processingTimeMs: z.number().optional(),
      confidenceScore: z.number().optional(),
      estimatedTokenSavings: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export type PromptOptimizationResult = z.infer<
  typeof PromptOptimizationResultSchema
>;
