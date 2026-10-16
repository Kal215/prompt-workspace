import { z } from "zod";
import {
  TaskSpecificationMap,
  TaskSpecificationMapSchema,
} from "./task-spec.js";

// ──────────────────────────────────────────────
// PILAR 1: Agent Blueprint, Policy & Runtime Contracts (Bab 5, 6, & 10)
// ──────────────────────────────────────────────

export const AgentRunStatusEnum = z.enum([
  "created",
  "validating",
  "understanding",
  "planning",
  "retrieving_context",
  "running_action",
  "evaluating",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
  "budget_exhausted",
]);
export type AgentRunStatus = z.infer<typeof AgentRunStatusEnum>;

export const AutonomyLevelEnum = z.enum([
  "L0_assist",
  "L1_approved_execution",
  "L2_bounded_autonomy",
  "L3_controlled_learning",
]);
export type AutonomyLevel = z.infer<typeof AutonomyLevelEnum>;

export const AgentBudgetSchema = z.object({
  maxSteps: z.number().int().positive().default(12),
  maxPromptRevisions: z.number().int().nonnegative().default(3),
  maxDurationMs: z.number().int().positive().default(300000),
  maxProviderCalls: z.number().int().positive().default(20),
  maxCostMicrounits: z.number().int().nonnegative().optional(),
});
export type AgentBudget = z.infer<typeof AgentBudgetSchema>;

export const IntentSpecSchema = z.object({
  goal: z.string().min(1, "Goal is required"),
  hardConstraints: z.array(z.string()).default([]),
  softPreferences: z.array(z.string()).default([]),
  prohibitedOutcomes: z.array(z.string()).default([]),
  outputContract: z.record(z.unknown()).optional(),
  assumptions: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).default([]),
});
export type IntentSpec = z.infer<typeof IntentSpecSchema>;

/**
 * Mapper/Adapter dua arah antara IntentSpec dan TaskSpecificationMap
 */
export function intentSpecToTaskSpec(
  intent: IntentSpec,
  options?: {
    archetype?: "software_engineering" | "debugging_investigation" | "research_comparison" | "education_curriculum" | "data_analysis" | "ui_ux_design" | "business_strategy" | "general_operational";
    complexity?: "simple" | "moderate" | "complex";
  }
): TaskSpecificationMap {
  return {
    primaryGoal: intent.goal,
    detectedArchetype: options?.archetype || "software_engineering",
    complexity: options?.complexity || "moderate",
    explicitRequirements: intent.acceptanceCriteria.length > 0 ? intent.acceptanceCriteria : [intent.goal],
    negativeConstraints: [...intent.hardConstraints, ...intent.prohibitedOutcomes],
    operationalExpansions: intent.softPreferences,
    logicalTensions: [],
    openDecisions: intent.assumptions.map((a) => ({
      topic: a.slice(0, 40),
      handlingStrategy: "document_assumption",
      guidance: a,
    })),
    requiredDeliverables: intent.outputContract ? Object.keys(intent.outputContract) : ["PRIMARY_ARTIFACT"],
    verificationScenarios: intent.acceptanceCriteria,
    definitionOfDone: [
      "Seluruh hard constraints terbukti dipatuhi tanpa pelanggaran",
      "Kriteria penerimaan (acceptance criteria) terpenuhi 100%",
    ],
  };
}

export function taskSpecToIntentSpec(taskSpec: TaskSpecificationMap): IntentSpec {
  return {
    goal: taskSpec.primaryGoal,
    hardConstraints: taskSpec.negativeConstraints,
    softPreferences: taskSpec.operationalExpansions,
    prohibitedOutcomes: taskSpec.negativeConstraints.map((nc) => `Pelanggaran: ${nc}`),
    outputContract: {
      deliverables: taskSpec.requiredDeliverables,
    },
    assumptions: taskSpec.openDecisions.map((od) => od.guidance || od.topic),
    acceptanceCriteria: taskSpec.verificationScenarios.length > 0
      ? taskSpec.verificationScenarios
      : taskSpec.explicitRequirements,
  };
}

export const AgentActionProposalSchema = z.object({
  actionId: z.string().min(1),
  toolId: z.string().min(1),
  arguments: z.record(z.unknown()).default({}),
  purpose: z.string().min(1),
  resourceScope: z.array(z.string()).default([]),
  estimatedCost: z.number().nonnegative().optional(),
  idempotencyKey: z.string().optional(),
});
export type AgentActionProposal = z.infer<typeof AgentActionProposalSchema>;

export const PolicyDecisionSchema = z.object({
  decision: z.enum(["allow", "deny", "require_approval"]),
  policyVersion: z.string().default("1.0.0"),
  reasonCodes: z.array(z.string()).default([]),
  riskClass: z.enum(["low", "medium", "high", "critical"]),
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

export const AgentErrorCodeEnum = z.enum([
  "VALIDATION_ERROR",
  "POLICY_DENIED",
  "APPROVAL_REQUIRED",
  "PROVIDER_RATE_LIMIT",
  "PROVIDER_TIMEOUT",
  "TOOL_TIMEOUT",
  "BUDGET_EXHAUSTED",
  "EVALUATION_INDETERMINATE",
  "PERSISTENCE_ERROR",
  "INTERNAL_ERROR",
]);
export type AgentErrorCode = z.infer<typeof AgentErrorCodeEnum>;

// ──────────────────────────────────────────────
// PILAR 2: Hybrid Memory Service v1 Contracts (Bab 7 & 12)
// ──────────────────────────────────────────────

export const MemoryTypeEnum = z.enum([
  "working",
  "episodic",
  "semantic",
  "procedural",
  "experimental",
]);
export type MemoryType = z.infer<typeof MemoryTypeEnum>;

export const MemoryScopeEnum = z.enum([
  "user",
  "project",
  "workspace",
  "global",
]);
export type MemoryScope = z.infer<typeof MemoryScopeEnum>;

export const MemoryStatusEnum = z.enum([
  "proposed",
  "validated",
  "rejected",
  "stale",
]);
export type MemoryStatus = z.infer<typeof MemoryStatusEnum>;

export const MemoryValidationMethodEnum = z.enum([
  "rule",
  "test",
  "human",
  "judge",
]);
export type MemoryValidationMethod = z.infer<
  typeof MemoryValidationMethodEnum
>;

export const MemoryRecordSchema = z.object({
  id: z.string().min(1),
  type: MemoryTypeEnum,
  scope: MemoryScopeEnum,
  ownerId: z.string().min(1),
  content: z.string().min(1),
  sourceRunId: z.string().default("direct_user_action"),
  sourceArtifactIds: z.array(z.string()).default([]),
  status: MemoryStatusEnum.default("proposed"),
  confidence: z.number().min(0).max(1),
  validationMethod: MemoryValidationMethodEnum,
  createdAt: z.string(),
  reviewAfter: z.string().optional(),
  contentHash: z.string().min(1), // SHA-256
});
export type MemoryRecord = z.infer<typeof MemoryRecordSchema>;

// ──────────────────────────────────────────────
// PILAR 3: Declarative Skill Registry v1 Contracts (Bab 8 & 12.1)
// ──────────────────────────────────────────────

export const SkillStatusEnum = z.enum([
  "DRAFT",
  "SCHEMA_VALIDATED",
  "TESTED",
  "HOLDOUT_EVALUATED",
  "ELIGIBLE_FOR_REVIEW",
  "APPROVED",
  "AUTO_ACTIVATED_LOW_RISK",
  "ACTIVE",
  "MONITORED",
  "ROLLED_BACK",
  "DISABLED",
  "REVOKED",
]);
export type SkillStatus = z.infer<typeof SkillStatusEnum>;

export const SkillManifestSchema = z
  .object({
    schemaVersion: z.literal("1"),
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/, "Versi wajib SemVer valid"),
    summary: z.string().min(5),
    kind: z.enum(["declarative", "prompt", "executable"]),
    riskClass: z.enum(["low", "medium", "high"]),
    scope: z.array(z.string()).default(["global"]),
    inputs: z.record(z.unknown()).default({}),
    outputs: z.record(z.unknown()).default({}),
    permissions: z.array(z.string()).default([]),
    network: z.literal("none"),
    filesystem: z.literal("none"),
    sideEffects: z.literal("none"),
    limits: z.object({
      maxInvocationsPerRun: z.number().int().positive().default(5),
    }).default({ maxInvocationsPerRun: 5 }),
    validation: z.object({
      requiredTests: z.array(z.string()).default([]),
    }).default({ requiredTests: [] }),
    activation: z.union([
      z.string(),
      z.object({
        condition: z.string().optional(),
        autoActivate: z.boolean().default(false),
      }),
    ]).default({ autoActivate: false }),
    rollback: z.object({
      target: z.string().optional(),
    }).default({}),
    provenance: z.object({
      sourceRunIds: z.array(z.string()).default([]),
      evidenceArtifactIds: z.array(z.string()).default([]),
    }).default({ sourceRunIds: [], evidenceArtifactIds: [] }),
    content: z.string().optional(),
  })
  .strict();
export type SkillManifest = z.infer<typeof SkillManifestSchema>;

// ──────────────────────────────────────────────
// PILAR 4: Scientific Experiment & Paired Evaluation Contracts (Bab 9)
// ──────────────────────────────────────────────

export const BaselineLevelEnum = z.enum(["B0", "B1", "B2", "B3", "B4"]);
export type BaselineLevel = z.infer<typeof BaselineLevelEnum>;

export const DatasetSplitEnum = z.enum(["tuning", "holdout"]);
export type DatasetSplit = z.infer<typeof DatasetSplitEnum>;

export const ExperimentTestCaseSchema = z.object({
  id: z.string().min(1),
  split: DatasetSplitEnum,
  prompt: z.string().min(1),
  hardConstraints: z.array(z.string()).default([]),
  expectedBehaviors: z.array(z.string()).default([]),
  domain: z.string().default("general"),
});
export type ExperimentTestCase = z.infer<typeof ExperimentTestCaseSchema>;

export const ExperimentDatasetSchema = z.object({
  datasetId: z.string().min(1),
  version: z.string().min(1),
  sha256Hash: z.string().min(1),
  testCases: z.array(ExperimentTestCaseSchema).min(1),
  createdAt: z.string(),
});
export type ExperimentDataset = z.infer<typeof ExperimentDatasetSchema>;

export const CandidateEvaluationVerdictEnum = z.enum([
  "PASSED",
  "GATE_FAILED",
  "BLOCKED",
]);
export type CandidateEvaluationVerdict = z.infer<
  typeof CandidateEvaluationVerdictEnum
>;

export const CaseEvaluationResultSchema = z.object({
  caseId: z.string(),
  baseline: BaselineLevelEnum,
  candidatePrompt: z.string().default(""),
  score: z.number().min(0).max(100),
  hardConstraintsPassed: z.boolean(),
  securityStatus: z.enum(["PASS", "FAIL", "ERROR", "INDETERMINATE"]),
  verdict: CandidateEvaluationVerdictEnum,
  latencyMs: z.number().int().nonnegative(),
  tokensUsed: z.number().int().nonnegative(),
  estimatedCostMicrounits: z.number().int().nonnegative().optional(),
  failureReasons: z.array(z.string()).default([]),
});
export type CaseEvaluationResult = z.infer<typeof CaseEvaluationResultSchema>;

export const BaselineAggregateMetricsSchema = z.object({
  baseline: BaselineLevelEnum,
  totalCases: z.number().int().nonnegative(),
  passedCases: z.number().int().nonnegative(),
  gateFailedCases: z.number().int().nonnegative(),
  averageScore: z.number().min(0).max(100),
  medianLatencyMs: z.number().nonnegative(),
  p95LatencyMs: z.number().nonnegative(),
  totalTokensUsed: z.number().int().nonnegative(),
  improvementPerToken: z.number(),
  hardConstraintsEnforcedRate: z.number().min(0).max(1),
});
export type BaselineAggregateMetrics = z.infer<
  typeof BaselineAggregateMetricsSchema
>;

export const PairedExperimentReportSchema = z.object({
  experimentId: z.string().min(1),
  datasetId: z.string().min(1),
  datasetHash: z.string().min(1),
  split: DatasetSplitEnum,
  baselinesEvaluated: z.array(BaselineLevelEnum),
  caseResults: z.array(CaseEvaluationResultSchema),
  aggregateMetrics: z.record(BaselineLevelEnum, BaselineAggregateMetricsSchema),
  winnerBaseline: BaselineLevelEnum,
  immutableArtifactSha256: z.string().min(1),
  generatedAt: z.string(),
});
export type PairedExperimentReport = z.infer<
  typeof PairedExperimentReportSchema
>;
