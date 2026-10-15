// ──────────────────────────────────────────────────────────────────
// @prompt-workspace/domain-rules — Public API
// ──────────────────────────────────────────────────────────────────

// Interface & types
export type { DomainRulePack, FocusCategory } from "./types.js";

// Individual packs (untuk akses langsung jika diperlukan)
export { generalPack } from "./packs/general.js";
export { codingPack } from "./packs/coding.js";
export { debuggingPack } from "./packs/debugging.js";
export { academicWritingPack } from "./packs/academic-writing.js";
export { businessStrategyPack } from "./packs/business-strategy.js";

// Registry helpers (API utama)
export {
  getDomainPack,
  listDomainPacks,
  resolveDomainId,
} from "./registry.js";

// Task #44: Intelligent Task Router & Synthesis Blueprints
export {
  detectTaskArchetypeAndDomain,
  type TaskRouteResult,
} from "./router.js";

export {
  getSynthesisBlueprint,
  listSynthesisBlueprints,
  type DomainSynthesisBlueprint,
  SOFTWARE_ENGINEERING_BLUEPRINT,
  DEBUGGING_INVESTIGATION_BLUEPRINT,
  RESEARCH_COMPARISON_BLUEPRINT,
  EDUCATION_CURRICULUM_BLUEPRINT,
  DATA_ANALYSIS_BLUEPRINT,
  UI_UX_DESIGN_BLUEPRINT,
  BUSINESS_STRATEGY_BLUEPRINT,
  GENERAL_OPERATIONAL_BLUEPRINT,
} from "./synthesis-blueprints.js";
