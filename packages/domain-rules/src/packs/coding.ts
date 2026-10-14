import { DomainRulePack } from "../types.js";

/**
 * Domain Pack: Coding (Pengembangan Perangkat Lunak)
 * Selaras dengan fixture PIW-BL-001 (Software development).
 */
export const codingPack: DomainRulePack = {
  domainId: "coding",
  name: "Pengembangan Perangkat Lunak / Coding",
  description:
    "Aturan khusus untuk prompt terkait penulisan kode, pengembangan fitur, scripting, dan implementasi teknis.",
  ruleVersion: "1.0.0",
  compatibleEngineVersion: ">=1.0.0",
  focusCategories: ["Tujuan", "Konteks", "Batasan", "Keluaran", "Bukti"],
  analyzerDirectives: [
    "Periksa apakah bahasa pemrograman atau framework target sudah disebutkan secara eksplisit.",
    "Periksa apakah spesifikasi input dan output (parameter fungsi, return value, tipe data) sudah didefinisikan.",
    "Identifikasi apakah penanganan error, edge cases, dan validasi input sudah dibahas.",
    "Periksa apakah batasan keamanan, akses API, atau perizinan (CORS, auth, rate limit) sudah ditentukan.",
    "Periksa apakah format kode yang diharapkan sudah jelas (fungsi tunggal, class, modul, CLI script, dll.).",
    "Periksa apakah lingkungan target sudah disebutkan (Node.js, browser, Python 3.x, dll.).",
    "Identifikasi jika ada URL, nama tabel, atau selector CSS yang diklaim tanpa bukti.",
  ],
  optimizerDirectives: [
    "Gunakan placeholder [BAHASA_PEMROGRAMAN_TARGET] jika bahasa belum disebutkan.",
    "Gunakan placeholder [MASUKKAN_URL_TARGET] jika URL sumber data belum tersedia.",
    "Gunakan placeholder [STRUKTUR_DATA_INPUT] dan [FORMAT_OUTPUT_DIHARAPKAN] untuk spesifikasi I/O.",
    "Tambahkan instruksi eksplisit tentang penanganan error dan edge cases jika belum ada.",
    "Jangan mengarang nama library, dependency, atau versi framework yang tidak disebut pengguna.",
    "Sertakan batasan operasional: lingkungan eksekusi, limitasi memory/CPU, atau batasan API jika relevan.",
  ],
  evaluationCriteriaNotes: [
    "Verifikasi bahwa Optimizer TIDAK mengarang URL, selector CSS, nama tabel database, atau kode sumber yang tidak ada di prompt asli.",
    "Pastikan placeholder terstruktur digunakan untuk informasi teknis yang belum disediakan pengguna.",
    "Periksa bahwa instruksi kode tidak memperluas scope di luar permintaan asli (misal: diminta fungsi tunggal, jangan buat seluruh aplikasi).",
  ],
};
