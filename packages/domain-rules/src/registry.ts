// ──────────────────────────────────────────────────────────────────
// @prompt-workspace/domain-rules — Registry & Public Helpers
// Blueprint v1.0 Bagian 11.4: "Domain-aware, not domain-locked"
// ──────────────────────────────────────────────────────────────────

import { DomainRulePack } from "./types.js";
import { generalPack } from "./packs/general.js";
import { codingPack } from "./packs/coding.js";
import { debuggingPack } from "./packs/debugging.js";
import { academicWritingPack } from "./packs/academic-writing.js";
import { businessStrategyPack } from "./packs/business-strategy.js";

// ── Internal Registry ─────────────────────────────────────────────

/** Immutable registry of all domain packs keyed by domainId */
const DOMAIN_PACKS: ReadonlyMap<string, DomainRulePack> = new Map<
  string,
  DomainRulePack
>([
  [generalPack.domainId, generalPack],
  [codingPack.domainId, codingPack],
  [debuggingPack.domainId, debuggingPack],
  [academicWritingPack.domainId, academicWritingPack],
  [businessStrategyPack.domainId, businessStrategyPack],
]);

/**
 * Alias mapping for backward compatibility with legacy/alternate taskType values.
 * Maps alternate names → canonical domainId.
 */
const DOMAIN_ALIASES: ReadonlyMap<string, string> = new Map<string, string>([
  // Aliases untuk coding
  ["software_development", "coding"],
  ["programming", "coding"],
  ["development", "coding"],
  ["code", "coding"],

  // Aliases untuk debugging
  ["debug", "debugging"],
  ["code_review", "debugging"],
  ["bugfix", "debugging"],
  ["troubleshooting", "debugging"],

  // Aliases untuk academic_writing
  ["writing", "academic_writing"],
  ["academic", "academic_writing"],
  ["research", "academic_writing"],
  ["essay", "academic_writing"],

  // Aliases untuk business_strategy
  ["business", "business_strategy"],
  ["strategy", "business_strategy"],
  ["market_research", "business_strategy"],
  ["product_planning", "business_strategy"],
  ["planning", "business_strategy"],

  // Alias identitas (self-mapping)
  ["general", "general"],
  ["coding", "coding"],
  ["debugging", "debugging"],
  ["academic_writing", "academic_writing"],
  ["business_strategy", "business_strategy"],
]);

// ── Public API ────────────────────────────────────────────────────

/**
 * Resolusi domainId dari taskType input.
 * Menormalisasi ke lowercase, memeriksa alias mapping, lalu fallback ke "general".
 *
 * @param taskType - Nilai taskType dari request (bisa null/undefined/string apa saja)
 * @returns Canonical domainId string
 */
export function resolveDomainId(taskType?: string | null): string {
  if (!taskType || taskType.trim().length === 0) {
    return "general";
  }

  const normalized = taskType.trim().toLowerCase();

  // Cek langsung di registry
  if (DOMAIN_PACKS.has(normalized)) {
    return normalized;
  }

  // Cek alias mapping
  const aliased = DOMAIN_ALIASES.get(normalized);
  if (aliased && DOMAIN_PACKS.has(aliased)) {
    return aliased;
  }

  // Fallback aman ke general — tidak memicu breaking change
  return "general";
}

/**
 * Mengambil domain rule pack berdasarkan taskType.
 * Melakukan resolusi domain, lalu mengembalikan pack yang sesuai.
 * Jika taskType kosong, tidak dikenal, atau null → fallback ke generalPack.
 *
 * @param taskType - Nilai taskType dari request (bisa null/undefined/string apa saja)
 * @returns DomainRulePack yang sesuai
 */
export function getDomainPack(taskType?: string | null): DomainRulePack {
  const domainId = resolveDomainId(taskType);
  return DOMAIN_PACKS.get(domainId) ?? generalPack;
}

/**
 * Mengembalikan daftar seluruh domain packs yang tersedia di registry.
 * Berguna untuk ditampilkan di UI (selector domain) atau introspeksi.
 *
 * @returns Array seluruh DomainRulePack
 */
export function listDomainPacks(): DomainRulePack[] {
  return Array.from(DOMAIN_PACKS.values());
}
