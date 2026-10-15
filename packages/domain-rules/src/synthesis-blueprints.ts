import { TaskArchetype } from "@prompt-workspace/prompt-contracts";

export interface DomainSynthesisBlueprint {
  archetype: TaskArchetype;
  name: string;
  description: string;
  structuralSections: string[];
  operationalDirectives: string[];
  negativeConstraintGuidance: string[];
  openDecisionPrinciples: string[];
  verificationGuidelines: string[];
  deliverableRequirements: string[];
  definitionOfDoneGuidelines: string[];
}

export const SOFTWARE_ENGINEERING_BLUEPRINT: DomainSynthesisBlueprint = {
  archetype: "software_engineering",
  name: "Software & Web Engineering Synthesis Blueprint",
  description:
    "Cetak biru sintesis untuk pembuatan website, modul aplikasi, skrip sistem, dan rekayasa perangkat lunak.",
  structuralSections: [
    "1. Peran dan Tujuan",
    "2. Persyaratan Utama",
    "3. Batasan Mutlak",
    "4. Tahap Pertama: Pemeriksaan Proyek dan Perencanaan",
    "5. Tahap Perancangan Modul dan Data Inti",
    "6. Tahap Mekanisme Pendukung dan Integrasi Antar-Fitur",
    "7. Tahap Pelaporan dan Perhitungan Aktual",
    "8. Tahap Antarmuka dan Pengalaman Pengguna",
    "9. Tahap Pengujian dan Verifikasi Perilaku",
    "10. Deliverables",
    "11. Definition of Done",
  ],
  operationalDirectives: [
    "Dilarang menambah fitur baru di luar permintaan pengguna (seperti autentikasi JWT/session, visualisasi grafik Chart.js, ekspor PDF/CSV, atau kolom lokasi_gudang) kecuali diminta secara eksplisit.",
    "Periksa konsistensi antara kuantitas produk, harga yang digunakan untuk perhitungan, dan nilai penjualan yang tersimpan. Jangan membiarkan stok berubah secara tidak konsisten akibat proses pencatatan yang berulang atau gagal di tengah jalan. Jangan mengarang integrasi pembayaran eksternal apabila tidak diminta.",
    "Pada tahap laporan, tentukan definisi setiap metrik dengan jelas. Jangan menyamakan omzet dengan keuntungan. Jika modal, harga pokok penjualan (HPP), dan biaya belum tersedia, jangan menghasilkan angka keuntungan seolah-olah sudah dapat dihitung dengan benar.",
    "Sediakan penanganan untuk kondisi tanpa data, tanggal yang tidak valid, dan rentang laporan yang tidak menghasilkan penjualan.",
    "Dilarang menggunakan data statis/hardcoded untuk laporan atau kalkulasi; gunakan data aktual yang tercatat.",
  ],
  negativeConstraintGuidance: [
    "Jika pengguna melarang suatu modul (seperti 'Jangan buat POS'), kunci larangan tersebut di bagian Batasan Mutlak.",
    "Jelaskan rincian apa saja yang dilarang (alur kasir/checkout terpadu, penerimaan pembayaran kasir, antarmuka checkout POS).",
    "Selesaikan ketegangan logis: sediakan mekanisme alternatif yang paling sederhana (misal: formulir pencatatan penjualan langsung untuk kebutuhan laporan) tanpa melanggar batasan.",
  ],
  openDecisionPrinciples: [
    "Dilarang memaksa framework, database, atau nama tabel kaku jika belum ditentukan pengguna. Arahkan AI target untuk memeriksa arsitektur/model data proyek yang sudah ada terlebih dahulu dan tidak menambahkan banyak field/modul tambahan tanpa manfaat yang jelas.",
    "Instruksikan AI/agent di Tahap 1 untuk memeriksa repositori dan konfigurasi proyek existing terlebih dahulu.",
    "Jika proyek baru atau belum ada fondasi, berikan rekomendasi proporsional dan dokumentasikan asumsi desain secara jujur.",
  ],
  verificationGuidelines: [
    "Sertakan 10 skenario pengujian perilaku nyata (penolakan produk tidak valid, akurasi perubahan stok, konsistensi rentang tanggal laporan, penanganan kondisi tanpa data, transaksi gagal tidak merusak konsistensi stok, verifikasi tidak ada alur POS/checkout yang ditambahkan, dan fungsi lama tetap bekerja).",
    "Sertakan skenario verifikasi bahwa batasan mutlak (misal: fitur POS) benar-benar TIDAK dibangun.",
  ],
  deliverableRequirements: [
    "Kode implementasi fungsional yang dapat dijalankan (bukan sekadar placeholder).",
    "Skema data / model relasi yang sesuai dengan arsitektur proyek.",
    "Jangan menyajikan mockup atau data statis sebagai implementasi penuh apabila fungsi yang diminta belum bekerja.",
  ],
  definitionOfDoneGuidelines: [
    "Semua persyaratan fungsional utama terpenuhi dan teruji.",
    "Batasan mutlak terjaga 100% tanpa kompromi (tidak ada fitur kasir/POS tersembunyi).",
    "Tidak ada placeholder token kosong yang tertinggal dalam kode.",
    "Kejujuran pelaporan pengujian: Jalankan tes yang tersedia di proyek, pemeriksaan tipe, lint, atau verifikasi lainnya yang sesuai dengan toolchain aktual. Laporkan pengujian yang benar-benar dijalankan dan hasilnya. Jangan menyatakan semua tes lulus apabila ada tes yang belum dijalankan.",
  ],
};

export const DEBUGGING_INVESTIGATION_BLUEPRINT: DomainSynthesisBlueprint = {
  archetype: "debugging_investigation",
  name: "Debugging & Investigation Synthesis Blueprint",
  description:
    "Cetak biru sintesis untuk diagnosis akar masalah, perbaikan bug, dan pencegahan regresi.",
  structuralSections: [
    "1. Peran dan Sasaran Investigasi",
    "2. Ruang Lingkup Masalah dan Gejala",
    "3. Batasan Mutlak",
    "4. Tahap 1: Pemeriksaan Implementasi dan Penelusuran Jalur Eksekusi/Log",
    "5. Tahap 2: Reproduksi Masalah dan Isolasi Kondisi Pemicu",
    "6. Tahap 3: Pembuktian Akar Penyebab (Root Cause Analysis)",
    "7. Tahap 4: Perbaikan Terarah Minimal (Minimal Targeted Fix)",
    "8. Tahap 5: Pengujian Regresi dan Verifikasi",
    "9. Deliverables dan Definition of Done",
  ],
  operationalDirectives: [
    "Tegakkan prinsip perbaikan minimal terarah (minimal targeted fix); jangan merombak modul lain yang tidak terkait.",
    "Telusuri rantai kegagalan dari gejala ke kondisi pemicu aktual (race condition, timeout, expired session, unhandled error).",
    "Wajib mendokumentasikan bukti sebelum dan sesudah perbaikan.",
  ],
  negativeConstraintGuidance: [
    "Dilarang menebak-nebak akar penyebab tanpa bukti log atau reproduksi terverifikasi.",
    "Dilarang merombak seluruh modul autentikasi atau arsitektur utama secara membabi buta.",
  ],
  openDecisionPrinciples: [
    "Periksa lingkungan runtime, versi library, dan log eksekusi aktual sebelum mengambil kesimpulan.",
  ],
  verificationGuidelines: [
    "Skenario uji sebelum perbaikan (harus gagal membuktikan reproduksi).",
    "Skenario uji setelah perbaikan (harus lulus membuktikan bug teratasi).",
    "Uji regresi terhadap alur kerja normal di sekitarnya.",
  ],
  deliverableRequirements: [
    "Laporan diagnosis akar penyebab (RCA) berbasis bukti.",
    "Diff/patch perbaikan terarah minimal.",
    "Kasus uji otomatis atau prosedur reproduksi verifikasi.",
  ],
  definitionOfDoneGuidelines: [
    "Bug berhasil direproduksi dan terbukti terselesaikan secara definitif.",
    "Tidak ada regresi fungsi sampingan.",
  ],
};

export const RESEARCH_COMPARISON_BLUEPRINT: DomainSynthesisBlueprint = {
  archetype: "research_comparison",
  name: "Research & Comparison Synthesis Blueprint",
  description:
    "Cetak biru sintesis untuk studi literatur, riset teknis, dan perbandingan komparatif kandidat.",
  structuralSections: [
    "1. Tujuan Kajian dan Konteks Penggunaan",
    "2. Kriteria Perbandingan Terstruktur",
    "3. Batasan Kejujuran Epistemik",
    "4. Analisis Kompromi (Trade-offs) per Kandidat",
    "5. Matriks Rekomendasi Berdasarkan Skenario Kebutuhan",
    "6. Deliverables dan Kriteria Kelengkapan",
  ],
  operationalDirectives: [
    "Gunakan kriteria perbandingan objektif: performa, kompleksitas operasional, skema data, skala, biaya/lisensi.",
    "Bahas kompromi nyata (trade-offs) tanpa memihak secara subjektif.",
  ],
  negativeConstraintGuidance: [
    "Dilarang mengarang harga terkini atau angka benchmark palsu tanpa sumber terverifikasi.",
    "Pisahkan fakta terverifikasi dari asumsi dan opini.",
  ],
  openDecisionPrinciples: [
    "Dokumentasikan konteks beban kerja, skala proyek, dan batasan tim yang menjadi basis rekomendasi.",
  ],
  verificationGuidelines: [
    "Verifikasi konsistensi logika antara kelemahan kandidat dan matriks rekomendasi skenario.",
  ],
  deliverableRequirements: [
    "Matriks perbandingan terstruktur komprehensif.",
    "Panduan keputusan berbasis skenario kontekstual.",
  ],
  definitionOfDoneGuidelines: [
    "Semua kandidat dibandingkan secara adil dengan kriteria yang konsisten.",
    "Zero fabricated benchmark/pricing.",
  ],
};

export const EDUCATION_CURRICULUM_BLUEPRINT: DomainSynthesisBlueprint = {
  archetype: "education_curriculum",
  name: "Education & Curriculum Synthesis Blueprint",
  description:
    "Cetak biru sintesis untuk pengajaran, kurikulum bertahap, dan panduan belajar pemula.",
  structuralSections: [
    "1. Tujuan Pembelajaran dan Pemetaan Tingkat Awal",
    "2. Peta Urutan Materi Bertahap",
    "3. Penjelasan Konsep, Analogi dan Contoh Konkret",
    "4. Latihan Praktis dan Studi Kasus Kecil",
    "5. Pemeriksaan Pemahaman (Checkpoints) dan Kesalahan Umum",
    "6. Kriteria Kemajuan Belajar dan Definition of Done",
  ],
  operationalDirectives: [
    "Susun alur belajar dari intuisi dasar menuju konsep teknis tanpa lompatan materi yang membingungkan.",
    "Gunakan analogi dunia nyata dan contoh kode/ilustrasi minimal yang bisa langsung dicoba.",
  ],
  negativeConstraintGuidance: [
    "Hindari jargon abstrak tanpa penjelasan kontekstual.",
    "Dilarang mengasumsikan pengetahuan lanjutan sebelum konsep prasyarat dijelaskan.",
  ],
  openDecisionPrinciples: [
    "Petakan titik awal pembaca dan tawarkan pilihan jalur sesuai minat/tujuan akhir pembelajar.",
  ],
  verificationGuidelines: [
    "Checkpoints pemahaman di akhir tiap modul.",
    "Latihan terbimbing dengan kunci refleksi mandiri.",
  ],
  deliverableRequirements: [
    "Silabus terstruktur bertahap.",
    "Bahan penjelasan konsep, analogi, dan latihan praktis.",
  ],
  definitionOfDoneGuidelines: [
    "Materi dapat diikuti secara runtut oleh pemula.",
    "Terdapat evaluasi mandiri yang jelas.",
  ],
};

export const DATA_ANALYSIS_BLUEPRINT: DomainSynthesisBlueprint = {
  archetype: "data_analysis",
  name: "Data Analysis Synthesis Blueprint",
  description:
    "Cetak biru sintesis untuk inspeksi data, identifikasi pola, agregasi statistik, dan visualisasi.",
  structuralSections: [
    "1. Tujuan Analisis dan Pertanyaan Utama",
    "2. Tahap 1: Pemeriksaan Kualitas, Skema Kolom dan Kelengkapan Data",
    "3. Tahap 2: Pemilihan Metode Eksplorasi dan Agregasi yang Tepat",
    "4. Tahap 3: Identifikasi Pola Berbasis Bukti Data Nyata",
    "5. Batasan Metodologis",
    "6. Penyajian Temuan, Keterbatasan Data dan Rekomendasi",
  ],
  operationalDirectives: [
    "Periksa missing values, pencilan (outliers), dan inkonsistensi tipe data sebelum analisis.",
    "Gunakan metrik ringkasan yang tepat (median vs mean untuk distribusi miring).",
  ],
  negativeConstraintGuidance: [
    "Dilarang mengarang angka, ringkasan statistik, atau memanipulasi data.",
    "Dilarang mengklaim korelasi sebagai hubungan sebab-akibat (kausalitas) tanpa uji kausal yang valid.",
  ],
  openDecisionPrinciples: [
    "Identifikasi variabel atau kolom yang belum diketahui dan jelaskan bagaimana data tersebut diperiksa.",
  ],
  verificationGuidelines: [
    "Verifikasi kesesuaian formula agregasi dan validitas sampel data.",
  ],
  deliverableRequirements: [
    "Skrip eksplorasi / pembersihan data.",
    "Ringkasan temuan pola berbasis bukti faktual.",
    "Pernyataan keterbatasan data.",
  ],
  definitionOfDoneGuidelines: [
    "Temuan terhubung langsung ke bukti data aktual.",
    "Keterbatasan analisis dinyatakan secara jujur.",
  ],
};

export const UI_UX_DESIGN_BLUEPRINT: DomainSynthesisBlueprint = {
  archetype: "ui_ux_design",
  name: "UI/UX Design Synthesis Blueprint",
  description:
    "Cetak biru sintesis untuk perancangan antarmuka, hierarki visual, dan pengalaman interaksi pengguna.",
  structuralSections: [
    "1. Tujuan Produk dan Kebutuhan Pengguna",
    "2. Arsitektur dan Hierarki Informasi",
    "3. Spesifikasi Komponen dan Interaksi Utama",
    "4. Penanganan Keadaan Sistem (Empty, Loading, Error, Partial State)",
    "5. Responsivitas dan Aksesibilitas",
    "6. Kriteria Evaluasi Visual dan Fungsional",
  ],
  operationalDirectives: [
    "Terjemahkan istilah subjektif (seperti 'modern', 'keren') menjadi spesifikasi konkret: kontras, tipografi, grid, spacing.",
    "Definisikan seluruh varian state komponen (default, hover, active, focus, disabled).",
  ],
  negativeConstraintGuidance: [
    "Dilarang mengabaikan keadaan ekstrem (data sangat panjang, ketiadaan data, error jaringan).",
    "Dilarang merancang visual yang melanggar rasio kontras aksesibilitas WCAG.",
  ],
  openDecisionPrinciples: [
    "Gunakan fondasi design system atau token yang sudah ada dalam repositori jika tersedia.",
  ],
  verificationGuidelines: [
    "Pengujian tata letak pada breakpoint mobile, tablet, dan desktop.",
    "Audit navigasi keyboard dan keterbacaan kontras teks.",
  ],
  deliverableRequirements: [
    "Spesifikasi tata letak, komponen UI, dan hierarki navigasi.",
    "Definisi status interaksi dan panduan aksesibilitas.",
  ],
  definitionOfDoneGuidelines: [
    "Semua alur utama dan edge states antarmuka terpetakan secara tuntas.",
  ],
};

export const BUSINESS_STRATEGY_BLUEPRINT: DomainSynthesisBlueprint = {
  archetype: "business_strategy",
  name: "Business Strategy Synthesis Blueprint",
  description:
    "Cetak biru sintesis untuk analisis pasar, model bisnis, dan roadmap strategis.",
  structuralSections: [
    "1. Tujuan Strategis dan Ruang Lingkup Keputusan",
    "2. Kerangka Analisis Pasar dan Kelayakan",
    "3. Batasan Validasi Bukti",
    "4. Analisis Risiko dan Skenario Alternatif",
    "5. Roadmap Eksekusi Bertahap",
    "6. Deliverables dan Indikator Keberhasilan",
  ],
  operationalDirectives: [
    "Pisahkan fakta pasar yang terverifikasi dari asumsi dan hipotesis bisnis.",
    "Susun tahapan milestone peluncuran yang terukur dengan KPI yang jelas.",
  ],
  negativeConstraintGuidance: [
    "Dilarang menyatakan bisnis pasti sukses tanpa data uji validasi pasar.",
    "Jangan menyembunyikan risiko operasional atau regulasi yang relevan.",
  ],
  openDecisionPrinciples: [
    "Dokumentasikan keterbatasan modal, kanal distribusi, dan kapasitas tim.",
  ],
  verificationGuidelines: [
    "Uji sensitivitas model terhadap perubahan biaya dan harga pasar.",
  ],
  deliverableRequirements: [
    "Laporan analisis kelayakan dan peta risiko.",
    "Roadmap eksekusi berfase.",
  ],
  definitionOfDoneGuidelines: [
    "Asumsi bisnis diidentifikasi dan dipisahkan dari fakta.",
  ],
};

export const GENERAL_OPERATIONAL_BLUEPRINT: DomainSynthesisBlueprint = {
  archetype: "general_operational",
  name: "General Operational Synthesis Blueprint",
  description:
    "Cetak biru sintesis umum untuk tugas operasional terstruktur dan eksekusi instruksi adaptif.",
  structuralSections: [
    "1. Peran dan Sasaran Tugas",
    "2. Persyaratan Utama dan Batasan Operasional",
    "3. Tahap 1: Analisis Kebutuhan dan Konteks Awal",
    "4. Tahap 2: Langkah Eksekusi Sistematis",
    "5. Tahap 3: Pengujian dan Verifikasi Hasil",
    "6. Deliverables dan Definition of Done",
  ],
  operationalDirectives: [
    "Petakan urutan eksekusi secara runtut dan terukur.",
    "Sediakan kriteria verifikasi yang jelas untuk setiap langkah.",
  ],
  negativeConstraintGuidance: [
    "Patuhi semua batasan yang diberikan pengguna tanpa kompromi.",
  ],
  openDecisionPrinciples: [
    "Dokumentasikan asumsi yang digunakan bila informasi awal belum lengkap.",
  ],
  verificationGuidelines: [
    "Verifikasi keselarasan hasil akhir terhadap instruksi pengguna.",
  ],
  deliverableRequirements: [
    "Hasil eksekusi tugas atau dokumen kerja yang lengkap.",
  ],
  definitionOfDoneGuidelines: [
    "Seluruh instruksi diselesaikan dengan standar kualitas tinggi.",
  ],
};

const BLUEPRINT_MAP: Record<TaskArchetype, DomainSynthesisBlueprint> = {
  software_engineering: SOFTWARE_ENGINEERING_BLUEPRINT,
  debugging_investigation: DEBUGGING_INVESTIGATION_BLUEPRINT,
  research_comparison: RESEARCH_COMPARISON_BLUEPRINT,
  education_curriculum: EDUCATION_CURRICULUM_BLUEPRINT,
  data_analysis: DATA_ANALYSIS_BLUEPRINT,
  ui_ux_design: UI_UX_DESIGN_BLUEPRINT,
  business_strategy: BUSINESS_STRATEGY_BLUEPRINT,
  general_operational: GENERAL_OPERATIONAL_BLUEPRINT,
};

export function getSynthesisBlueprint(
  archetype: TaskArchetype
): DomainSynthesisBlueprint {
  return BLUEPRINT_MAP[archetype] || GENERAL_OPERATIONAL_BLUEPRINT;
}

export function listSynthesisBlueprints(): DomainSynthesisBlueprint[] {
  return Object.values(BLUEPRINT_MAP);
}
