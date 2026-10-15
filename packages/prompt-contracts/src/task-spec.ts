import { z } from "zod";

// ──────────────────────────────────────────────
// MEGA TASK #44: Master Prompt Synthesis Contracts
// ──────────────────────────────────────────────

export const TaskArchetypeEnum = z.enum([
  "software_engineering",
  "debugging_investigation",
  "research_comparison",
  "education_curriculum",
  "data_analysis",
  "ui_ux_design",
  "business_strategy",
  "general_operational",
]);
export type TaskArchetype = z.infer<typeof TaskArchetypeEnum>;

export const TaskComplexityEnum = z.enum(["simple", "moderate", "complex"]);
export type TaskComplexity = z.infer<typeof TaskComplexityEnum>;

export const OpenDecisionStrategyEnum = z.enum([
  "inspect_existing_project",
  "propose_open_recommendation",
  "document_assumption",
  "ask_clarification_if_blocking",
]);
export type OpenDecisionStrategy = z.infer<typeof OpenDecisionStrategyEnum>;

export const OpenDecisionItemSchema = z.object({
  topic: z.string(),
  handlingStrategy: OpenDecisionStrategyEnum,
  guidance: z.string(),
});
export type OpenDecisionItem = z.infer<typeof OpenDecisionItemSchema>;

export const LogicalTensionItemSchema = z.object({
  tension: z.string(),
  resolutionStrategy: z.string(),
});
export type LogicalTensionItem = z.infer<typeof LogicalTensionItemSchema>;

export const TaskSpecificationMapSchema = z.object({
  primaryGoal: z.string(),
  detectedArchetype: TaskArchetypeEnum,
  complexity: TaskComplexityEnum,
  explicitRequirements: z.array(z.string()),
  negativeConstraints: z.array(z.string()),
  operationalExpansions: z.array(z.string()),
  logicalTensions: z.array(LogicalTensionItemSchema),
  openDecisions: z.array(OpenDecisionItemSchema),
  requiredDeliverables: z.array(z.string()),
  verificationScenarios: z.array(z.string()),
  definitionOfDone: z.array(z.string()),
});
export type TaskSpecificationMap = z.infer<typeof TaskSpecificationMapSchema>;

export const MasterPromptValidationResultSchema = z.object({
  passed: z.boolean(),
  overallSynthesisScore: z.number().min(0).max(100),
  checks: z.object({
    intentPreserved: z.boolean(),
    explicitRequirementsCovered: z.boolean(),
    negativeConstraintsEnforced: z.boolean(),
    notShallowRewrite: z.boolean(),
    notPlaceholderDumping: z.boolean(),
    hasOperationalStages: z.boolean(),
    hasVerificationAndDoD: z.boolean(),
    noDeceptiveTechFabrication: z.boolean(),
  }),
  missingRequirements: z.array(z.string()),
  violatedNegativeConstraints: z.array(z.string()),
  failureReasons: z.array(z.string()),
  repairPassesTriggered: z.number().int().nonnegative(),
});
export type MasterPromptValidationResult = z.infer<
  typeof MasterPromptValidationResultSchema
>;

// ──────────────────────────────────────────────
// MEGA TASK #48: Engine v2.2 Budget Mode, Style Presets & AutoPilot Contracts
// ──────────────────────────────────────────────

export const TokenBudgetModeEnum = z.enum(["eco", "balanced", "deep_audit"]);
export type TokenBudgetMode = z.infer<typeof TokenBudgetModeEnum>;

export const SynthesisStylePresetEnum = z.enum([
  "comprehensive_blueprint",
  "concise_tactical",
  "conversational_expert",
]);
export type SynthesisStylePreset = z.infer<typeof SynthesisStylePresetEnum>;

// ──────────────────────────────────────────────
// MEGA TASK ADR-003: Universal Meta-Blueprint & Audience Calibration Contracts
// ──────────────────────────────────────────────

export const AudienceLevelEnum = z.enum([
  "student",
  "academic",
  "professional",
  "specialist",
]);
export type AudienceLevel = z.infer<typeof AudienceLevelEnum>;

export const DiagramTypeEnum = z.enum([
  "erd",
  "flowchart",
  "dfd",
  "mindmap",
  "gantt",
  "wireframe_spec",
]);
export type DiagramType = z.infer<typeof DiagramTypeEnum>;

export const DiagramSpecificationSchema = z.object({
  id: z.string(),
  type: DiagramTypeEnum,
  title: z.string(),
  mermaidCode: z.string(),
  description: z.string(),
  entities: z.array(z.string()).default([]),
});
export type DiagramSpecification = z.infer<typeof DiagramSpecificationSchema>;

export const ExecutionPhaseSchema = z.object({
  phaseNumber: z.number().int().nonnegative(),
  name: z.string(),
  description: z.string().optional(),
  tasks: z.array(z.string()).min(1),
  deliverables: z.array(z.string()).min(1),
});
export type ExecutionPhase = z.infer<typeof ExecutionPhaseSchema>;

export const UniversalBlueprintSpecSchema = z.object({
  title: z.string(),
  domain: z.string(),
  audienceLevel: AudienceLevelEnum,
  roles: z.array(z.string()).min(1),
  contextParameters: z.record(z.string()),
  smartAssumptions: z.array(z.string()),
  primaryObjectives: z.array(z.string()).min(1),
  coreSpecification: z.string(),
  diagrams: z.array(DiagramSpecificationSchema).min(1),
  executionPhases: z.array(ExecutionPhaseSchema).min(1),
  negativeConstraints: z.array(z.string()).min(1),
  executionProtocol: z.array(z.string()).min(1),
  workManagement: z.object({
    statusModel: z.array(z.string()),
    trackingRules: z.array(z.string()),
  }),
  definitionOfDone: z.array(z.string()).min(1),
  renderedMasterPrompt: z.string(),
});
export type UniversalBlueprintSpec = z.infer<typeof UniversalBlueprintSpecSchema>;

export const AutoPilotRequestSchema = z.object({
  prompt: z.string().min(1, "prompt tidak boleh kosong"),
  context: z.string().nullable().optional(),
  referenceUrls: z.array(z.string()).max(2).optional(),
  taskType: z.string().optional(),
  stylePreset: SynthesisStylePresetEnum.optional(),
  budgetMode: TokenBudgetModeEnum.optional(),
  audienceLevel: AudienceLevelEnum.optional(),
});
export type AutoPilotRequest = z.infer<typeof AutoPilotRequestSchema>;

export const AutoPilotResultSchema = z.object({
  optimizedPrompt: z.string(),
  taskSpec: TaskSpecificationMapSchema,
  synthesisValidation: MasterPromptValidationResultSchema,
  stylePreset: SynthesisStylePresetEnum,
  budgetMode: TokenBudgetModeEnum,
  audienceLevel: AudienceLevelEnum.optional(),
  universalBlueprint: UniversalBlueprintSpecSchema.optional(),
  groundingFacts: z.array(z.any()).default([]),
  spiderReport: z.any().optional().nullable(),
  changes: z.array(z.string()),
  warnings: z.array(z.string()),
  cacheHit: z.boolean().default(false),
  processingTimeMs: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});
export type AutoPilotResult = z.infer<typeof AutoPilotResultSchema>;
