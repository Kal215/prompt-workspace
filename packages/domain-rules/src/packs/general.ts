import { DomainRulePack } from "../types.js";

/**
 * Domain Pack: General (Umum / Otomatis)
 * Aturan rekayasa prompt standar lintas domain.
 * Digunakan sebagai fallback jika taskType tidak dispesifikasikan atau tidak dikenali.
 */
export const generalPack: DomainRulePack = {
  domainId: "general",
  name: "Umum / Otomatis",
  description:
    "Aturan rekayasa prompt standar yang berlaku lintas domain. Digunakan secara otomatis jika domain spesifik tidak ditentukan.",
  ruleVersion: "1.0.0",
  compatibleEngineVersion: ">=1.0.0",
  focusCategories: ["Tujuan", "Konteks", "Ambiguitas", "Keluaran"],
  analyzerDirectives: [
    "Periksa apakah tujuan inti prompt sudah jelas dan dapat ditindaklanjuti.",
    "Identifikasi kata-kata subjektif tanpa ukuran (misal: 'bagus', 'lengkap', 'canggih') dan tandai sebagai Ambiguitas.",
    "Periksa apakah konteks atau latar belakang yang diperlukan sudah disediakan.",
    "Periksa apakah format keluaran yang diharapkan sudah didefinisikan.",
    "Periksa apakah batasan ruang lingkup (scope) sudah ditetapkan.",
  ],
  optimizerDirectives: [
    "Tambahkan struktur Peran, Tujuan, Instruksi Kerja, Format Keluaran, dan Batasan jika belum ada.",
    "Gunakan placeholder [MASUKKAN_KONTEKS_TAMBAHAN] untuk informasi yang belum lengkap.",
    "Jangan mempersempit domain secara sepihak jika pengguna tidak menyebutkan domain tertentu.",
  ],
  evaluationCriteriaNotes: [
    "Pastikan intent asli terjaga tanpa penambahan tujuan baru.",
    "Verifikasi bahwa placeholder digunakan untuk informasi yang belum tersedia, bukan fabrikasi fakta.",
    "Periksa kejelasan struktur dan kelengkapan instruksi umum.",
  ],
};
