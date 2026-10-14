// ──────────────────────────────────────────────────────────────────
// @prompt-workspace/domain-rules — Interface & Kontrak Domain Rule Pack
// Blueprint v1.0 Bagian 11.4: Domain-aware, not domain-locked
// ──────────────────────────────────────────────────────────────────

/**
 * Kategori taksonomi temuan yang diperketat oleh domain pack.
 * Selaras dengan FindingCategoryEnum di prompt-contracts.
 */
export type FocusCategory =
  | "Tujuan"
  | "Konteks"
  | "Ambiguitas"
  | "Kontradiksi"
  | "Batasan"
  | "Keluaran"
  | "Keberhasilan"
  | "Bukti";

/**
 * Kontrak stabil untuk satu Domain Rule Pack.
 *
 * Setiap domain pack mendefinisikan aturan-aturan pemeriksaan spesifik
 * yang diinjeksikan ke Analyzer, Optimizer, dan Evaluator saat pipeline
 * dijalankan untuk domain terkait.
 */
export interface DomainRulePack {
  /** ID unik domain (backward-compatible dengan taskType di prompt-contracts) */
  readonly domainId: string;

  /** Label domain dalam Bahasa Indonesia untuk ditampilkan di UI */
  readonly name: string;

  /** Penjelasan ringkas domain dalam Bahasa Indonesia */
  readonly description: string;

  /** Versi aturan domain (SemVer) */
  readonly ruleVersion: string;

  /** Versi engine yang kompatibel (SemVer range) */
  readonly compatibleEngineVersion: string;

  /**
   * Kategori taksonomi temuan yang diprioritaskan/diperketat pada domain ini.
   * Analyzer akan memberikan bobot lebih tinggi pada kategori-kategori ini.
   */
  readonly focusCategories: readonly FocusCategory[];

  /**
   * Aturan pemeriksaan spesifik yang harus dicari Analyzer pada prompt di domain ini.
   * Diinjeksikan sebagai instruksi tambahan ke system prompt Analyzer.
   */
  readonly analyzerDirectives: readonly string[];

  /**
   * Aturan penyempurnaan & guardrails khusus untuk Optimizer.
   * Termasuk placeholder wajib jika informasi kunci tidak ada.
   * Prinsip Preserve Intent tetap berlaku mutlak.
   */
  readonly optimizerDirectives: readonly string[];

  /**
   * Panduan tambahan untuk Evaluator/Rubric pada domain tersebut.
   * Memperkuat kriteria audit spesifik domain.
   */
  readonly evaluationCriteriaNotes: readonly string[];
}
