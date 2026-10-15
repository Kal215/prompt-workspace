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
