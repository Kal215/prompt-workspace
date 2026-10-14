import { DomainRulePack } from "../types.js";

/**
 * Domain Pack: Debugging (Debugging & Code Review)
 * Selaras dengan fixture PIW-BL-004 (Debugging perangkat lunak).
 */
export const debuggingPack: DomainRulePack = {
  domainId: "debugging",
  name: "Debugging & Code Review",
  description:
    "Aturan khusus untuk prompt terkait pencarian bug, perbaikan error, analisis log, dan code review.",
  ruleVersion: "1.0.0",
  compatibleEngineVersion: ">=1.0.0",
  focusCategories: ["Bukti", "Konteks", "Tujuan", "Batasan"],
  analyzerDirectives: [
    "Periksa apakah gejala error atau pesan error yang muncul sudah dilampirkan secara verbatim.",
    "Periksa apakah stack trace atau log output relevan sudah disertakan.",
    "Periksa apakah potongan kode sumber minimal yang dapat mereproduksi masalah (reproducible snippet) sudah diberikan.",
    "Identifikasi apakah perilaku yang diharapkan (expected behavior) vs perilaku aktual (actual behavior) sudah dijelaskan.",
    "Periksa apakah lingkungan eksekusi (OS, versi runtime, versi dependency) sudah disebutkan.",
    "Identifikasi apakah langkah-langkah reproduksi (steps to reproduce) sudah dituliskan.",
  ],
  optimizerDirectives: [
    "Gunakan placeholder [LAMPIRKAN_KODE_YANG_ERROR_DISINI] jika kode sumber belum disertakan.",
    "Gunakan placeholder [TEMPEL_PESAN_ERROR_ATAU_TRACE_DISINI] jika error message belum ada.",
    "Gunakan placeholder [PERILAKU_YANG_DIHARAPKAN] dan [PERILAKU_AKTUAL_SAAT_INI] untuk kontras ekspektasi vs realita.",
    "Gunakan placeholder [LINGKUNGAN_EKSEKUSI: OS, Runtime, Versi] jika environment belum disebut.",
    "Jangan mengarang penyebab bug, nama variabel, atau solusi spesifik tanpa bukti dari prompt asli.",
    "Strukturkan prompt debugging menjadi: Gejala → Konteks Lingkungan → Kode → Ekspektasi → Batasan Perbaikan.",
  ],
  evaluationCriteriaNotes: [
    "Verifikasi bahwa Optimizer TIDAK mengklaim sudah menemukan akar penyebab bug tanpa bukti dari prompt asli.",
    "Pastikan placeholder untuk evidence (kode, error, trace) disediakan jika belum dilampirkan.",
    "Periksa bahwa Optimizer tidak memperluas scope perbaikan di luar bug yang dilaporkan.",
  ],
};
