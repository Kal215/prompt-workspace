import { DomainRulePack } from "../types.js";

/**
 * Domain Pack: Academic Writing (Penulisan Akademik & Riset)
 * Selaras dengan fixture PIW-BL-002 (Penulisan akademik).
 */
export const academicWritingPack: DomainRulePack = {
  domainId: "academic_writing",
  name: "Penulisan Akademik & Riset",
  description:
    "Aturan khusus untuk prompt terkait esai, makalah, tesis, tinjauan pustaka, dan penulisan ilmiah.",
  ruleVersion: "1.0.0",
  compatibleEngineVersion: ">=1.0.0",
  focusCategories: ["Tujuan", "Konteks", "Ambiguitas", "Bukti", "Keluaran"],
  analyzerDirectives: [
    "Periksa apakah target audiens akademik (dosen, juri, jurnal, level mahasiswa) sudah ditentukan.",
    "Periksa apakah struktur argumen atau kerangka tulisan (outline) sudah diminta atau dijelaskan.",
    "Identifikasi apakah batasan panjang (jumlah kata/halaman) sudah ditetapkan.",
    "Periksa apakah gaya bahasa formal atau standar penulisan (APA, IEEE, Chicago, dll.) sudah disebutkan.",
    "Identifikasi apakah tuntutan bukti/sitasi yang dapat diverifikasi sudah ditekankan — tandai sebagai Bukti jika tidak.",
    "Periksa apakah topik sudah cukup spesifik atau masih terlalu luas dan ambigu.",
    "Identifikasi kata-kata subjektif tanpa ukuran dalam konteks akademik (misal: 'bagus', 'lengkap', 'mendalam').",
  ],
  optimizerDirectives: [
    "Gunakan placeholder [TARGET_AUDIENS_DAN_LEVEL_AKADEMIK] jika audiens belum ditentukan.",
    "Gunakan placeholder [JUMLAH_KATA_ATAU_HALAMAN] jika batasan panjang belum ada.",
    "Gunakan placeholder [GAYA_SITASI: APA/IEEE/Chicago/Lainnya] jika format referensi belum disebut.",
    "Tambahkan peringatan eksplisit: 'Jangan mengarang referensi, judul buku, nama penulis, atau DOI.'",
    "Instruksikan penggunaan placeholder [REFERENSI_DIISI_OLEH_PENGGUNA] alih-alih mengarang sitasi.",
    "Jangan mengasumsikan aturan tugas akademik (misal: deadline, format pengumpulan) yang tidak disebutkan.",
  ],
  evaluationCriteriaNotes: [
    "Verifikasi MUTLAK: Optimizer TIDAK BOLEH mengarang referensi ilmiah, judul paper, nama penulis, atau DOI — ini adalah pelanggaran anti-halusinasi terparah di domain akademik.",
    "Pastikan placeholder untuk sitasi dan bukti digunakan jika pengguna belum menyediakan referensi.",
    "Periksa bahwa gaya bahasa yang diinstruksikan sesuai konteks akademik (formal, objektif, terukur).",
  ],
};
