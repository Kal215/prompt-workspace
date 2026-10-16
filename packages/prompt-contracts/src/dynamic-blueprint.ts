import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Dynamic Blueprint Knowledge Graph Schemas (Zod)
// Kontrak ekstraksi AI dinamis untuk seluruh domain & disiplin ilmu
// ─────────────────────────────────────────────────────────────

export const KnowledgeGraphExpertCouncilMemberSchema = z.object({
  role: z.string().min(1, "Nama peran pakar wajib diisi"),
  focus: z.string().min(1, "Fokus keahlian pakar wajib diisi"),
  concreteResponsibility: z.string().min(1, "Tanggung jawab konkret wajib diisi"),
});
export type KnowledgeGraphExpertCouncilMember = z.infer<
  typeof KnowledgeGraphExpertCouncilMemberSchema
>;

export const KnowledgeGraphParameterItemSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  rationale: z.string().min(1),
});
export type KnowledgeGraphParameterItem = z.infer<
  typeof KnowledgeGraphParameterItemSchema
>;

export const KnowledgeGraphOpenDecisionSchema = z.object({
  decision: z.string().min(1),
  chosenPath: z.string().min(1),
  tradeOff: z.string().min(1),
});
export type KnowledgeGraphOpenDecision = z.infer<
  typeof KnowledgeGraphOpenDecisionSchema
>;

export const KnowledgeGraphQualityObjectiveSchema = z.object({
  objective: z.string().min(1),
  metric: z.string().min(1),
  targetCriteria: z.string().min(1),
});
export type KnowledgeGraphQualityObjective = z.infer<
  typeof KnowledgeGraphQualityObjectiveSchema
>;

export const KnowledgeGraphCoreSpecificationSchema = z.object({
  architectureOverview: z.string().min(1),
  functionalCapabilities: z.array(z.string()).min(2),
  technicalStackOrMethodology: z.array(z.string()).min(2),
  dataOrOperationalFlow: z.string().min(1),
});
export type KnowledgeGraphCoreSpecification = z.infer<
  typeof KnowledgeGraphCoreSpecificationSchema
>;

// Entity-Relationship diagram schemas (relational data models)
export const KnowledgeGraphEntityFieldSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  isPrimaryKey: z.boolean().default(false),
  isForeignKey: z.boolean().default(false),
  description: z.string().optional(),
});
export type KnowledgeGraphEntityField = z.infer<
  typeof KnowledgeGraphEntityFieldSchema
>;

export const KnowledgeGraphEntitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(KnowledgeGraphEntityFieldSchema).min(2),
});
export type KnowledgeGraphEntity = z.infer<typeof KnowledgeGraphEntitySchema>;

export const KnowledgeGraphRelationshipSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  cardinality: z.enum([
    "one_to_one",
    "one_to_many",
    "many_to_one",
    "many_to_many",
  ]),
  label: z.string().min(1),
});
export type KnowledgeGraphRelationship = z.infer<
  typeof KnowledgeGraphRelationshipSchema
>;

// Workflow / Process flowchart schemas
export const KnowledgeGraphWorkflowNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z
    .enum(["start", "process", "decision", "storage", "end"])
    .default("process"),
});
export type KnowledgeGraphWorkflowNode = z.infer<
  typeof KnowledgeGraphWorkflowNodeSchema
>;

export const KnowledgeGraphWorkflowEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});
export type KnowledgeGraphWorkflowEdge = z.infer<
  typeof KnowledgeGraphWorkflowEdgeSchema
>;

export const KnowledgeGraphWorkflowStructureSchema = z.object({
  diagramTitle: z.string().default("Alur Kerja Operasional"),
  flowDirection: z.enum(["TD", "LR"]).default("TD"),
  nodes: z.array(KnowledgeGraphWorkflowNodeSchema).default([]),
  edges: z.array(KnowledgeGraphWorkflowEdgeSchema).default([]),
  decisionPoints: z.array(z.string()).optional(),
});
export type KnowledgeGraphWorkflowStructure = z.infer<
  typeof KnowledgeGraphWorkflowStructureSchema
>;

// Gantt / Timeline structure for non-IT or business phases
export const KnowledgeGraphGanttTaskSchema = z.object({
  taskName: z.string().min(1),
  phase: z.string().min(1),
  durationDays: z.number().int().positive().default(7),
  dependencies: z.array(z.string()).optional(),
});
export type KnowledgeGraphGanttTask = z.infer<
  typeof KnowledgeGraphGanttTaskSchema
>;

export const KnowledgeGraphDiagramStructuresSchema = z.object({
  primaryDiagramType: z.enum([
    "erDiagram",
    "flowchart_td",
    "flowchart_lr",
    "gantt",
  ]),
  // Relational Entities & Relationships (minimal 4-6 entitas untuk topik perangkat lunak/data)
  entities: z.array(KnowledgeGraphEntitySchema).default([]),
  relationships: z.array(KnowledgeGraphRelationshipSchema).default([]),
  // Workflow / SOP Process Structure
  workflow: KnowledgeGraphWorkflowStructureSchema.optional(),
  // Gantt Timeline (opsional untuk operasional/bisnis)
  ganttTasks: z.array(KnowledgeGraphGanttTaskSchema).optional(),
});
export type KnowledgeGraphDiagramStructures = z.infer<
  typeof KnowledgeGraphDiagramStructuresSchema
>;

export const KnowledgeGraphDeliverableSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});
export type KnowledgeGraphDeliverable = z.infer<
  typeof KnowledgeGraphDeliverableSchema
>;

export const KnowledgeGraphPhaseSchema = z.object({
  phaseIndex: z.number().int().min(0),
  phaseName: z.string().min(1),
  goal: z.string().min(1),
  concreteActions: z.array(z.string()).min(2),
  deliverables: z.array(KnowledgeGraphDeliverableSchema).min(1),
});
export type KnowledgeGraphPhase = z.infer<typeof KnowledgeGraphPhaseSchema>;

export const KnowledgeGraphGuardrailSchema = z.object({
  negativeConstraintsHonored: z.array(z.string()),
  antiPatternsForbidden: z.array(z.string()),
  consequenceOfViolation: z.string(),
});
export type KnowledgeGraphGuardrail = z.infer<
  typeof KnowledgeGraphGuardrailSchema
>;

/**
 * SKEMA UTAMA KNOWLEDGE GRAPH SINTESIS DINAMIS LLM
 * Menghasilkan struktur pengetahuan 100% kontekstual dan anti-halusinasi untuk topik apa pun.
 */
export const DynamicBlueprintKnowledgeGraphSchema = z.object({
  projectTitle: z.string().min(2, "Judul proyek wajib diisi"),
  domainClassification: z.enum([
    "software_engineering",
    "scientific_research",
    "academic_thesis",
    "enterprise_business",
    "crypto_web3",
    "student_education",
    "general_operations",
  ]),
  domainContextSummary: z.string().min(10, "Ringkasan konteks wajib spesifik"),

  // 1. Dewan Pakar (4-6 Peran Pakar Spesifik)
  expertCouncil: z.array(KnowledgeGraphExpertCouncilMemberSchema).default([]),

  // 2. Parameter Inti & Asumsi Cerdas
  coreParameters: z.array(KnowledgeGraphParameterItemSchema).default([]),
  explicitFacts: z.array(z.string()).default([]),
  smartAssumptions: z.array(z.string()).default([]),
  openDecisions: z.array(KnowledgeGraphOpenDecisionSchema).default([]),

  // 3. Standar Mutu Spesifik (6-8 KPI Mutu)
  qualityObjectives: z.array(KnowledgeGraphQualityObjectiveSchema).default([]),

  // 4. Spesifikasi Teknis/Operasional Mendalam
  coreSpecification: KnowledgeGraphCoreSpecificationSchema,

  // 5. Struktur Diagram Dinamis (ERD / Flowchart / Gantt)
  diagramStructures: KnowledgeGraphDiagramStructuresSchema,

  // 6. 6-8 Fase Pengerjaan dari Phase 0 hingga Phase Final
  executionPhases: z.array(KnowledgeGraphPhaseSchema).default([]),

  // 7. Domain Guardrails (Penegakan Larangan Pengguna)
  domainGuardrails: KnowledgeGraphGuardrailSchema,
});
export type DynamicBlueprintKnowledgeGraph = z.infer<
  typeof DynamicBlueprintKnowledgeGraphSchema
>;

/**
 * Metadata Hasil Sintesis Blueprint
 */
export const DynamicSynthesisMetadataSchema = z.object({
  synthesisMode: z.enum(["live_llm_dynamic", "deterministic_fallback"]),
  providerId: z.string(),
  model: z.string(),
  latencyMs: z.number().int().nonnegative(),
  tokensUsed: z
    .object({
      promptTokens: z.number().optional(),
      completionTokens: z.number().optional(),
    })
    .optional(),
  generatedAt: z.string(),
  activeNegativeConstraints: z.array(z.string()),
  mcpEnriched: z.boolean().optional(),
  mcpConnectors: z.array(z.string()).optional(),
});
export type DynamicSynthesisMetadata = z.infer<
  typeof DynamicSynthesisMetadataSchema
>;
