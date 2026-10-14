import { z } from "zod";
import { JobStatusEnum } from "./crawler.js";

/**
 * ==============================================================================
 * PROMPT INTELLIGENCE ENGINEERING WORKSPACE (PIEW) v2.0
 * Prompt Contracts — Prompt Spider & Robustness Matrix Schemas
 * ==============================================================================
 */

/**
 * Kategori kasus uji ketahanan dalam matriks Prompt Spider.
 */
export const SpiderCaseCategoryEnum = z.enum([
  "BASELINE_HAPPY_PATH",
  "EDGE_EMPTY_OR_NOISE",
  "AMBIGUOUS_CONFLICT",
  "ADVERSARIAL_INJECTION",
  "STRICT_FORMAT_TRAP",
]);
export type SpiderCaseCategory = z.infer<typeof SpiderCaseCategoryEnum>;

/**
 * Status individual eksekusi kasus uji Spider.
 * Catatan penting: Sesuai ADR-002, status 'ERROR', 'INDETERMINATE', atau 'SKIPPED' TIDAK PERNAH dianggap 'PASS'.
 */
export const SpiderCaseStatusEnum = z.enum([
  "PASS",
  "FAIL",
  "INDETERMINATE",
  "ERROR",
  "SKIPPED",
]);
export type SpiderCaseStatus = z.infer<typeof SpiderCaseStatusEnum>;

/**
 * Tingkat keparahan temuan keamanan atau risiko kegagalan.
 */
export const SpiderSeverityEnum = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);
export type SpiderSeverity = z.infer<typeof SpiderSeverityEnum>;

/**
 * Skema permintaan eksekusi Prompt Spider (SpiderRequest).
 */
export const SpiderRequestSchema = z.object({
  promptVersionId: z.string().min(1, "promptVersionId is required"),
  compareWithVersionId: z.string().optional(),
  testSuiteVersionId: z.string().min(1, "testSuiteVersionId is required"),
  runMode: z.enum(["SINGLE", "COMPARE"]),
  idempotencyKey: z.string().optional(),
});
export type SpiderRequest = z.infer<typeof SpiderRequestSchema>;

/**
 * Metrik kualitas prompt hasil benchmarking Spider (0 - 100).
 */
export const SpiderQualityMetricsSchema = z.object({
  taskAdherence: z
    .number()
    .min(0, "taskAdherence must be >= 0")
    .max(100, "taskAdherence must be <= 100"),
  constraintAdherence: z
    .number()
    .min(0, "constraintAdherence must be >= 0")
    .max(100, "constraintAdherence must be <= 100"),
  formatCompliance: z
    .number()
    .min(0, "formatCompliance must be >= 0")
    .max(100, "formatCompliance must be <= 100"),
  robustness: z
    .number()
    .min(0, "robustness must be >= 0")
    .max(100, "robustness must be <= 100"),
});
export type SpiderQualityMetrics = z.infer<typeof SpiderQualityMetricsSchema>;

/**
 * Temuan keamanan spesifik (injeksi prompt, bypass instruksi, kebocoran sistem).
 */
export const SpiderSecurityFindingSchema = z.object({
  severity: SpiderSeverityEnum,
  category: z.string(),
  caseId: z.string(),
  sanitizedEvidence: z.string(),
  remediationHint: z.string(),
});
export type SpiderSecurityFinding = z.infer<typeof SpiderSecurityFindingSchema>;

/**
 * Hasil eksekusi cabang uji ketahanan individual (SpiderBranchResult).
 */
export const SpiderBranchResultSchema = z.object({
  caseId: z.string(),
  category: SpiderCaseCategoryEnum,
  severity: SpiderSeverityEnum,
  status: SpiderCaseStatusEnum,
  score: z.number().min(0).max(100).optional(),
  latencyMs: z.number().nonnegative(),
  sanitizedInput: z.string(),
  sanitizedOutput: z.string(),
  rationale: z.string().optional(),
  deterministicPass: z.boolean(),
});
export type SpiderBranchResult = z.infer<typeof SpiderBranchResultSchema>;

/**
 * Metadata target model yang dievaluasi.
 */
export const SpiderModelMetadataSchema = z
  .object({
    provider: z.string(),
    model: z.string(),
    parameters: z.record(z.unknown()).optional(),
  })
  .passthrough();
export type SpiderModelMetadata = z.infer<typeof SpiderModelMetadataSchema>;

/**
 * Ringkasan cakupan eksekusi kasus uji.
 */
export const SpiderCoverageSummarySchema = z
  .object({
    totalCases: z.number().int().nonnegative(),
    executedCases: z.number().int().nonnegative(),
    passedCases: z.number().int().nonnegative(),
    failedCases: z.number().int().nonnegative(),
    indeterminateCases: z.number().int().nonnegative().optional(),
    errorCases: z.number().int().nonnegative().optional(),
    skippedCases: z.number().int().nonnegative().optional(),
  })
  .passthrough();
export type SpiderCoverageSummary = z.infer<typeof SpiderCoverageSummarySchema>;

/**
 * Laporan komprehensif Prompt Spider (SpiderReport).
 */
export const SpiderReportSchema = z.object({
  runId: z.string(),
  status: JobStatusEnum,
  promptVersionId: z.string(),
  testSuiteVersion: z.string(),
  rubricVersion: z.string(),
  modelMetadata: SpiderModelMetadataSchema,
  coverageSummary: SpiderCoverageSummarySchema,
  qualityMetrics: SpiderQualityMetricsSchema,
  securityFindings: z.array(SpiderSecurityFindingSchema),
  criticalGatePassed: z.boolean(),
  branches: z.array(SpiderBranchResultSchema),
  limitations: z.array(z.string()).default([]),
});
export type SpiderReport = z.infer<typeof SpiderReportSchema>;

/**
 * Helper validator murni untuk menentukan apakah gerbang kritis lulus.
 * Mengembalikan true HANYA JIKA:
 * 1. Terdapat minimal 1 cabang (branches.length > 0).
 * 2. Seluruh cabang dengan severity CRITICAL (atau seluruh cabang jika tidak ada CRITICAL) berstatus 'PASS'.
 * Jika ada cabang kritis yang berstatus 'FAIL', 'ERROR', 'INDETERMINATE', atau 'SKIPPED',
 * atau jika array cabang kosong, WAJIB mengembalikan false.
 */
export function computeCriticalGatePassed(
  branches: Array<{
    severity?: z.infer<typeof SpiderSeverityEnum> | string;
    status: z.infer<typeof SpiderCaseStatusEnum> | string;
  }>
): boolean {
  if (!Array.isArray(branches) || branches.length === 0) {
    return false;
  }

  const criticalBranches = branches.filter((b) => b.severity === "CRITICAL");
  const branchesToEvaluate = criticalBranches.length > 0 ? criticalBranches : branches;

  return branchesToEvaluate.every((b) => b.status === "PASS");
}
