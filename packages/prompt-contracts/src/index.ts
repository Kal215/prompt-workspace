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
