import { z } from "zod";

export * from "./task-spec.js";
export * from "./supervision.js";
export * from "./provider-registry.js";
export * from "./dynamic-blueprint.js";
import {
  TokenBudgetModeEnum,
  SynthesisStylePresetEnum,
  TaskSpecificationMapSchema,
  MasterPromptValidationResultSchema,
  TaskArchetypeEnum,
  TaskComplexityEnum,
  OpenDecisionStrategyEnum,
  OpenDecisionItemSchema,
  LogicalTensionItemSchema,
} from "./task-spec.js";

// ──────────────────────────────────────────────
// Blueprint v1.0 Bagian 5.2 — Provider ID
// ──────────────────────────────────────────────

export const ProviderIdEnum = z.enum(["groq", "gemini", "openrouter", "ollama"]);
export const ProviderIdSchema = ProviderIdEnum;
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const ProviderCapabilitySchema = z.object({
  providerId: ProviderIdSchema,
  displayName: z.string(),
  defaultModel: z.string(),
  availableModels: z.array(z.string()),
  supportsJsonMode: z.boolean(),
  isLocal: z.boolean(),
  configured: z.boolean(),
  description: z.string(),
});
export type ProviderCapability = z.infer<typeof ProviderCapabilitySchema>;

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

  /** ID provider LLM target (groq, gemini, openrouter, ollama) */
  providerId: ProviderIdSchema.nullable().optional(),

  /** Model spesifik yang diminta pengguna (opsional) */
  targetModel: z.string().nullable().optional(),

  /** Mode hemat token (v2.2): eco, balanced, deep_audit */
  budgetMode: TokenBudgetModeEnum.optional(),

  /** Preset gaya bahasa Master Prompt (v2.2) */
  stylePreset: SynthesisStylePresetEnum.optional(),

  /** URL referensi untuk grounding crawler (v2.2, maks 2 URL) */
  referenceUrls: z.array(z.string()).max(2).optional(),
});

/** TypeScript type yang di-infer dari schema Zod */
export type PromptOptimizationRequest = z.infer<
  typeof PromptOptimizationRequestSchema
>;

// ──────────────────────────────────────────────
// Blueprint v1.0 Bagian 5.2 — Finding Taxonomy
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
// Blueprint v1.0 Bagian 11.4 & Bagian 3 — Domain Rule Metadata
// ──────────────────────────────────────────────

export const AppliedDomainRuleSchema = z.object({
  /** ID unik domain rule pack */
  domainId: z.string(),
  /** Versi aturan domain */
  ruleVersion: z.string(),
  /** Label nama domain */
  name: z.string(),
});
export type AppliedDomainRule = z.infer<typeof AppliedDomainRuleSchema>;

export const PromptAnalysisSchema = z.object({
  /** Daftar temuan kelemahan prompt berdasarkan taksonomi */
  findings: z.array(FindingSchema),

  /** Skor kesehatan prompt (0 - 100) */
  score: z.number().optional().default(0),

  /** Status analisis prompt */
  status: z.string().optional().default("analyzed"),

  /** Spesifikasi tugas master prompt synthesis (Task #44) */
  taskSpec: TaskSpecificationMapSchema.optional(),
});
export type PromptAnalysis = z.infer<typeof PromptAnalysisSchema>;

export const PromptMetadataSchema = z
  .object({
    modelTarget: z.string().optional(),
    providerId: ProviderIdSchema.optional(),
    model: z.string().optional(),
    processingTimeMs: z.number().optional(),
    latencyMs: z.number().optional(),
    tokensUsed: z
      .object({
        promptTokens: z.number().default(0),
        completionTokens: z.number().default(0),
        totalTokens: z.number().default(0),
      })
      .optional(),
    confidenceScore: z.number().optional(),
    estimatedTokenSavings: z.string().optional(),
    appliedDomainRule: AppliedDomainRuleSchema.optional(),
  })
  .passthrough();

export type PromptMetadata = z.infer<typeof PromptMetadataSchema>;

// ──────────────────────────────────────────────
// Blueprint v1.0 Gate 3 — QA Evaluation Schema
// ──────────────────────────────────────────────

export const OptimizationEvaluationSchema = z.object({
  /** Skor audit 1 - 100 */
  score: z.number().min(0).max(100),

  /** Status kelulusan audit (passed jika score >= 70 dan tidak ada halusinasi/pelanggaran intent) */
  passed: z.boolean(),

  /** Catatan penilaian objektif dari auditor */
  auditorNotes: z.string(),

  /** Detail evaluasi per kriteria (opsional) */
  intentPreserved: z.boolean().optional(),
  deceptiveCertaintyAvoided: z.boolean().optional(),
  clarityAndStructureScore: z.number().optional(),
});
export type OptimizationEvaluation = z.infer<typeof OptimizationEvaluationSchema>;

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

  /** Domain rule pack yang diterapkan (opsional, transparansi UI) */
  appliedDomainRule: AppliedDomainRuleSchema.optional(),

  /** Provider yang digunakan untuk optimasi (opsional, transparansi UI) */
  providerId: ProviderIdSchema.optional(),

  /** Model aktual yang mengeksekusi optimasi */
  model: z.string().optional(),

  /** Hasil audit evaluasi kualitas / LLM-as-a-Judge (opsional) */
  evaluation: OptimizationEvaluationSchema.optional(),

  /** Hasil validasi deterministik Master Prompt Synthesis (Task #44) */
  synthesisValidation: MasterPromptValidationResultSchema.optional(),

  /** Metadata tambahan (model target, waktu pemrosesan, token, dll.) */
  metadata: PromptMetadataSchema.optional(),
});

export type PromptOptimizationResult = z.infer<
  typeof PromptOptimizationResultSchema
>;

// ──────────────────────────────────────────────
// Blueprint v1.0 Bagian 5.6 & 11.2 — Fitur C3: Target Model Execution Playground
// ──────────────────────────────────────────────

export const PromptPlaceholderValuesSchema = z
  .record(z.string(), z.string())
  .optional()
  .default({});
export type PromptPlaceholderValues = z.infer<
  typeof PromptPlaceholderValuesSchema
>;

export const PromptExecutionParametersSchema = z.object({
  /** Tingkat kreativitas/keacakan output (default: 0.3 untuk menekan nondeterminism) */
  temperature: z.number().min(0).max(2).default(0.3),

  /** Batas maksimum token output (biaya & batas komputasi) */
  maxOutputTokens: z.number().int().min(64).max(2048).default(1024),
});
export type PromptExecutionParameters = z.input<
  typeof PromptExecutionParametersSchema
>;

export const PromptExecutionRequestSchema = z.object({
  /** Teks prompt yang akan dijalankan (biasanya optimizedPrompt) */
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(12000, "Prompt exceeds 12000 characters limit"),

  /** Prompt asli sebelum optimasi (opsional, untuk perbandingan) */
  originalPrompt: z.string().max(12000).optional().nullable(),

  /** Pemetaan nilai variabel placeholder ([KEY] atau {{key}}) */
  placeholderValues: PromptPlaceholderValuesSchema,

  /** Contoh input / kasus uji tambahan (test case input) */
  testInput: z.string().max(4000).optional().nullable(),

  /** ID provider LLM target (groq, gemini, openrouter, ollama) */
  providerId: ProviderIdSchema.optional().default("groq"),

  /** Model spesifik target eksekusi */
  targetModel: z.string().optional().nullable(),

  /** Parameter eksekusi (temperature, maxOutputTokens) */
  parameters: PromptExecutionParametersSchema.optional(),
});
export type PromptExecutionRequest = z.input<
  typeof PromptExecutionRequestSchema
>;
export type PromptExecutionRequestOutput = z.infer<
  typeof PromptExecutionRequestSchema
>;

export const PromptExecutionResultSchema = z.object({
  /** ID unik sesi eksekusi */
  executionId: z.string().min(1),

  /** Prompt final setelah resolusi placeholder & penggabungan testInput */
  resolvedPrompt: z.string(),

  /** Daftar placeholder yang belum diisi nilainya oleh pengguna */
  unresolvedPlaceholders: z.array(z.string()),

  /** Teks respons nyata dari model target */
  output: z.string(),

  /** Provider yang mengeksekusi prompt */
  providerId: ProviderIdSchema,

  /** Nama model yang mengeksekusi prompt */
  model: z.string(),

  /** Parameter yang digunakan pada eksekusi */
  parameters: z.object({
    temperature: z.number(),
    maxOutputTokens: z.number(),
  }),

  /** Waktu respons dalam milidetik */
  latencyMs: z.number(),

  /** Rincian token yang dikonsumsi */
  usage: z.object({
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    totalTokens: z.number().optional(),
  }),

  /** Catatan transparansi bahwa keluaran LLM probabilistik */
  nondeterminismNotice: z.string(),

  /** Timestamp waktu eksekusi ISO 8601 */
  createdAt: z.string(),
});
export type PromptExecutionResult = z.infer<
  typeof PromptExecutionResultSchema
>;

// ──────────────────────────────────────────────
// Blueprint v2.0 (ADR-002) — Crawler & Spider Contracts
// ──────────────────────────────────────────────
export * from "./crawler.js";
export * from "./spider.js";


