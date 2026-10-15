import { z } from "zod";
import {
  UniversalBlueprintSpecSchema,
  AudienceLevelEnum,
} from "./task-spec.js";

// ──────────────────────────────────────────────
// Status & Verdict Enums
// ──────────────────────────────────────────────

export const ProjectPhaseStatusEnum = z.enum([
  "TODO",
  "IN_PROGRESS",
  "REJECTED_NEEDS_REPAIR",
  "VERIFIED",
]);
export type ProjectPhaseStatus = z.infer<typeof ProjectPhaseStatusEnum>;

export const PhaseAuditVerdictEnum = z.enum([
  "VERIFIED_PROCEED",
  "REJECTED_NEEDS_REPAIR",
  "PROJECT_COMPLETED",
]);
export type PhaseAuditVerdict = z.infer<typeof PhaseAuditVerdictEnum>;

export const AutonomousProjectSessionOverallStatusEnum = z.enum([
  "ACTIVE",
  "COMPLETED",
  "HALTED_MAX_RETRIES",
]);
export type AutonomousProjectSessionOverallStatus = z.infer<
  typeof AutonomousProjectSessionOverallStatusEnum
>;

// ──────────────────────────────────────────────
// 1. ProjectPhaseStateSchema
// ──────────────────────────────────────────────

export const ProjectPhaseStateSchema = z.object({
  /** ID unik fase (misal "PHASE_0", "PHASE_1") */
  phaseId: z.string().min(1, "phaseId wajib diisi"),
  /** Urutan indeks fase (0, 1, 2, dst.) */
  phaseIndex: z.number().int().min(0, "phaseIndex harus >= 0"),
  /** Judul fase */
  title: z.string().min(1, "title fase wajib diisi"),
  /** Sasaran/tujuan utama fase ini */
  objective: z.string().min(1, "objective fase wajib diisi"),
  /** Daftar deliverables/artefak yang wajib dihasilkan */
  requiredDeliverables: z.array(z.string().min(1)).min(1, "Minimal 1 deliverable wajib"),
  /** Kriteria penerimaan hasil fase */
  acceptanceCriteria: z.array(z.string().min(1)).min(1, "Minimal 1 kriteria penerimaan wajib"),
  /** Status fase */
  status: ProjectPhaseStatusEnum.default("TODO"),
  /** Jumlah percobaan audit fase ini */
  attemptCount: z.number().int().min(0).default(0),
  /** Ringkasan hasil audit terakhir */
  lastAuditSummary: z.string().nullable().default(null),
});
export type ProjectPhaseState = z.infer<typeof ProjectPhaseStateSchema>;

// ──────────────────────────────────────────────
// 2. DeliveredArtifact & PhaseSubmissionInputSchema
// ──────────────────────────────────────────────

export const DeliveredArtifactSchema = z.object({
  name: z.string().min(1, "Nama artefak wajib diisi"),
  type: z.string().optional().default("artifact"),
  summary: z.string().optional(),
  contentSnippet: z.string().optional(),
});
export type DeliveredArtifact = z.infer<typeof DeliveredArtifactSchema>;

export const DeliveredArtifactInputSchema = z
  .union([z.string().min(1), DeliveredArtifactSchema])
  .transform((val): DeliveredArtifact => {
    if (typeof val === "string") {
      return { name: val, type: "artifact" };
    }
    return val;
  });

export const PhaseSubmissionInputSchema = z.object({
  /** ID sesi proyek */
  sessionId: z.string().min(1, "sessionId wajib diisi"),
  /** Indeks fase yang dilaporkan */
  phaseIndex: z.number().int().min(0, "phaseIndex harus >= 0"),
  /** Ringkasan pekerjaan yang telah diselesaikan oleh Agent */
  summaryOfWork: z.string().min(1, "summaryOfWork wajib diisi"),
  /** Artefak/dokumen/kode yang telah dibuat beserta cuplikan */
  deliveredArtifacts: z.array(DeliveredArtifactInputSchema).min(1, "Minimal 1 deliverable wajib dilaporkan"),
  /** Bukti nyata eksekusi (test output, build logs, typecheck result) */
  verificationOutput: z.string().min(1, "verificationOutput wajib diisi (Evidence over Claims)"),
  /** Kendala atau isu yang diketahui (opsional) */
  knownIssues: z.array(z.string()).optional().default([]),
});
export type PhaseSubmissionInput = z.infer<typeof PhaseSubmissionInputSchema>;

// ──────────────────────────────────────────────
// 3. PhaseAuditResultSchema
// ──────────────────────────────────────────────

export const PhaseAuditResultSchema = z.object({
  /** Keputusan audit dari supervisor */
  verdict: PhaseAuditVerdictEnum,
  /** Skor kualitas dan kelengkapan (0–100) */
  score: z.number().min(0).max(100),
  /** Daftar deliverables wajib yang belum ada/belum lengkap */
  missingDeliverables: z.array(z.string()).default([]),
  /** Ketidaksinkronan terhadap Diagram Mermaid atau Core Specification */
  consistencyViolations: z.array(z.string()).default([]),
  /** Pelanggaran atas negative constraints atau fabrikasi mock/fake data */
  scopeCreepOrForbiddenViolations: z.array(z.string()).default([]),
  /** Apakah bukti nyata eksekusi valid dan memadai */
  evidenceCheckPassed: z.boolean(),
  /**
   * Prompt instruksi tindakan berikutnya:
   * - REJECTED_NEEDS_REPAIR -> Self-Healing Corrective Prompt
   * - VERIFIED_PROCEED -> Next-Phase Dispatch Prompt
   * - PROJECT_COMPLETED -> Final Handover & Audit Certificate
   */
  nextActionPrompt: z.string().min(1, "nextActionPrompt wajib disediakan"),
  /** Indeks fase yang diaudit (opsional) */
  phaseIndex: z.number().int().min(0).optional(),
  /** Timestamp audit */
  auditTimestamp: z.string().optional(),
});
export type PhaseAuditResult = z.infer<typeof PhaseAuditResultSchema>;

// ──────────────────────────────────────────────
// 4. PhaseAuditHistoryEntry & AutonomousProjectSessionSchema
// ──────────────────────────────────────────────

export const PhaseAuditHistoryEntrySchema = z.object({
  phaseIndex: z.number().int().min(0),
  attemptNumber: z.number().int().min(1),
  submissionSummary: z.string(),
  auditResult: PhaseAuditResultSchema,
  timestamp: z.string(),
});
export type PhaseAuditHistoryEntry = z.infer<typeof PhaseAuditHistoryEntrySchema>;

export const AutonomousProjectSessionSchema = z.object({
  /** ID unik sesi proyek */
  sessionId: z.string().min(1, "sessionId wajib diisi"),
  /** Prompt asli dari pengguna */
  originalPrompt: z.string().min(1, "originalPrompt wajib diisi"),
  /** Domain terklasifikasi */
  domainId: z.string().min(1, "domainId wajib diisi"),
  /** Subtopik terdeteksi */
  subtopicId: z.string().min(1, "subtopicId wajib diisi"),
  /** Level audiens target */
  audienceLevel: AudienceLevelEnum,
  /** Master Blueprint acuan hasil sintesis */
  masterBlueprint: UniversalBlueprintSpecSchema,
  /** Seluruh tahapan/fase eksekusi proyek */
  phases: z.array(ProjectPhaseStateSchema).min(1, "Minimal 1 fase proyek harus ada"),
  /** Indeks fase aktif saat ini */
  currentPhaseIndex: z.number().int().min(0),
  /** Status keseluruhan proyek */
  overallStatus: AutonomousProjectSessionOverallStatusEnum.default("ACTIVE"),
  /** Riwayat seluruh audit yang pernah dilakukan */
  auditHistory: z.array(PhaseAuditHistoryEntrySchema).default([]),
  /** Waktu pembuatan sesi */
  createdAt: z.string(),
  /** Waktu pembaruan terakhir */
  updatedAt: z.string(),
});
export type AutonomousProjectSession = z.infer<
  typeof AutonomousProjectSessionSchema
>;

// ──────────────────────────────────────────────
// 5. MCP Tool Call Helper Schemas
// ──────────────────────────────────────────────

export const InitProjectSessionInputSchema = z.object({
  prompt: z.string().min(1, "prompt wajib diisi"),
  context: z.string().nullable().optional(),
  domainId: z.string().optional(),
  subtopicId: z.string().optional(),
  audienceLevel: AudienceLevelEnum.optional(),
  maxAttemptsPerPhase: z.number().int().min(1).optional().default(3),
});
export type InitProjectSessionInput = z.input<typeof InitProjectSessionInputSchema>;

export const GetCurrentPhaseInputSchema = z.object({
  sessionId: z.string().min(1, "sessionId wajib diisi"),
});
export type GetCurrentPhaseInput = z.infer<typeof GetCurrentPhaseInputSchema>;
