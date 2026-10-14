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
