import { DomainRulePack } from "../types.js";

/**
 * Domain Pack: Business Strategy (Bisnis, Riset Pasar & Perencanaan Produk)
 * Selaras dengan fixture PIW-BL-003 (Bisnis dan riset pasar) & PIW-BL-005 (Perencanaan produk).
 */
export const businessStrategyPack: DomainRulePack = {
  domainId: "business_strategy",
  name: "Bisnis, Riset Pasar & Perencanaan Produk",
  description:
    "Aturan khusus untuk prompt terkait analisis bisnis, riset pasar, perencanaan produk, roadmap, dan strategi.",
  ruleVersion: "1.0.0",
  compatibleEngineVersion: ">=1.0.0",
  focusCategories: [
    "Tujuan",
    "Konteks",
    "Ambiguitas",
    "Keberhasilan",
    "Batasan",
    "Bukti",
  ],
  analyzerDirectives: [
    "Periksa apakah ada pemisahan tegas antara fakta, asumsi, dan hipotesis dalam prompt.",
    "Periksa apakah target pasar atau segmen pelanggan sudah didefinisikan.",
    "Identifikasi apakah metrik keberhasilan (KPI) atau definisi 'sukses' sudah ditetapkan secara terukur.",
    "Periksa apakah batasan anggaran, waktu, atau sumber daya sudah disebutkan.",
    "Periksa apakah format deliverable (laporan, slide deck, spreadsheet, roadmap) sudah ditentukan.",
    "Identifikasi klaim kepastian bisnis tanpa bukti (misal: 'bisnis ini pasti sukses') — tandai sebagai Ambiguitas/Bukti.",
    "Periksa apakah jenis bisnis, industri, dan wilayah geografis sudah disebutkan.",
  ],
  optimizerDirectives: [
    "Gunakan placeholder [TENTUKAN_JENIS_BISNIS_DAN_LOKASI] jika jenis bisnis dan wilayah belum ada.",
    "Gunakan placeholder [TARGET_PASAR_DAN_SEGMEN_PELANGGAN] jika segmen belum didefinisikan.",
    "Gunakan placeholder [ANGGARAN_DAN_SUMBER_DAYA_TERSEDIA] jika batasan anggaran belum disebut.",
    "Gunakan placeholder [KPI_ATAU_DEFINISI_SUKSES] jika metrik keberhasilan belum ditentukan.",
    "Tambahkan instruksi: 'Pisahkan dengan jelas antara: (a) Fakta terverifikasi, (b) Asumsi yang perlu diuji, (c) Hipotesis spekulatif.'",
    "Jangan menyatakan bisnis pasti berhasil atau gagal tanpa bukti yang memadai — gunakan frasa kondisional.",
    "Instruksikan format deliverable terstruktur: Executive Summary → Analisis → Rekomendasi → Risiko.",
  ],
  evaluationCriteriaNotes: [
    "Verifikasi bahwa Optimizer TIDAK mengarang data pasar, statistik, angka penjualan, atau proyeksi tanpa bukti dari prompt asli.",
    "Pastikan ada instruksi eksplisit untuk memisahkan fakta vs asumsi vs hipotesis.",
    "Periksa bahwa klaim kepastian bisnis (pasti sukses/gagal) ditolak atau dibungkus dalam frasa kondisional.",
    "Verifikasi bahwa placeholder untuk informasi bisnis krusial (jenis bisnis, segmen, KPI) disediakan.",
  ],
};
