import {
  UniversalBlueprintSpec,
  AudienceLevel,
  DiagramSpecification,
  ExecutionPhase,
} from "@prompt-workspace/prompt-contracts";
import {
  classifyUniversalDomain,
  synthesizeUniversalDiagrams,
} from "./diagram-synthesizer.js";
import { auditCrossArtifactConsistency } from "./consistency-guard.js";

export interface UniversalSynthesisInput {
  prompt: string;
  context?: string | null;
  audienceLevel?: AudienceLevel;
  domain?: string;
}

export interface UniversalSynthesisResult {
  blueprint: UniversalBlueprintSpec;
  consistencyScore: number;
  consistencyValid: boolean;
  warnings: string[];
}

/**
 * Menghasilkan Master Blueprint 10-Bagian Universal secara polimorfik untuk segala bidang dan kalangan
 */
export function synthesizeUniversalBlueprint(
  input: UniversalSynthesisInput
): UniversalSynthesisResult {
  const rawPrompt = input.prompt.trim();
  const audience: AudienceLevel = input.audienceLevel || "specialist";
  const domainCategory = classifyUniversalDomain(
    input.domain || "",
    rawPrompt
  );

  // 1. Bangkitkan Diagram Spesifik Domain (Mermaid.js)
  const diagrams = synthesizeUniversalDiagrams({
    domain: domainCategory,
    primaryGoal: rawPrompt,
    audienceLevel: audience,
  });

  // 2. Tentukan Dewan Pakar (Role & Responsibilities)
  const roles = getDomainRoles(domainCategory, audience);

  // 3. Tentukan Parameter Konteks & Asumsi Cerdas
  const { contextParameters, smartAssumptions } = getContextAndAssumptions(
    domainCategory,
    rawPrompt,
    audience
  );

  // 4. Standar Kualitas Utama (8-10 Tolok Ukur)
  const primaryObjectives = getPrimaryObjectives(domainCategory, audience);

  // 5. Spesifikasi Teknis / Konseptual Inti
  const coreSpecification = getCoreSpecification(domainCategory, audience);

  // 6. Tahapan Eksekusi End-to-End dengan Deliverables Nyata
  const executionPhases = getExecutionPhases(domainCategory, diagrams, audience);

  // 7. Standar Negatif & Guardrails ("Jangan Lakukan")
  const negativeConstraints = getNegativeConstraints(domainCategory, audience);

  // 8. Protokol Eksekusi AI Coding / Task Agent
  const executionProtocol = [
    "Step 1 — INSPECT: Pelajari seluruh konteks, repositori, data awal, atau dokumen yang tersedia sebelum memulai perubahan.",
    "Step 2 — PLAN: Rancang rencana implementasi bertahap dan petakan ketergantungan antar-task (dependency tree).",
    "Step 3 — IMPLEMENT: Bangun artefak, dokumen, atau modul kode secara modular dan patuhi standar spesifikasi pada Bagian 4.",
    "Step 4 — VERIFY: Uji setiap keluaran menggunakan verifikasi faktual atau automated test suite (Pastikan 100% lulus / Exit Code 0).",
    "Step 5 — REPORT: Laporkan bukti artefak konkret yang selesai, kriteria yang terpenuhi, dan batasan yang terverifikasi.",
  ];

  // 9. Manajemen Kerja & Pelacakan Tugas
  const workManagement = {
    statusModel: ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "VERIFIED"],
    trackingRules: [
      "Setiap task wajib memiliki: Task ID, Deskripsi, Prioritas, Ketergantungan, Kriteria Penerimaan, dan Bukti Verifikasi.",
      "Status DONE hanya berlaku jika dokumen atau kode telah selesai ditulis.",
      "Status VERIFIED hanya boleh diberikan jika kriteria penerimaan telah dibuktikan secara empiris atau lulus pengujian sistem.",
      "Dilarang menandai pekerjaan selesai hanya karena sebagian output visual terlihat bagus.",
    ],
  };

  // 10. Kriteria Kelulusan (Definition of Done)
  const definitionOfDone = getDefinitionOfDone(domainCategory, audience);

  // 11. Render Master Prompt Markdown 10 Bagian Utuh
  const renderedMasterPrompt = renderBlueprintToMarkdown({
    title: getBlueprintTitle(domainCategory, rawPrompt),
    domain: domainCategory,
    audienceLevel: audience,
    roles,
    contextParameters,
    smartAssumptions,
    primaryObjectives,
    coreSpecification,
    diagrams,
    executionPhases,
    negativeConstraints,
    executionProtocol,
    workManagement,
    definitionOfDone,
  });

  const blueprint: UniversalBlueprintSpec = {
    title: getBlueprintTitle(domainCategory, rawPrompt),
    domain: domainCategory,
    audienceLevel: audience,
    roles,
    contextParameters,
    smartAssumptions,
    primaryObjectives,
    coreSpecification,
    diagrams,
    executionPhases,
    negativeConstraints,
    executionProtocol,
    workManagement,
    definitionOfDone,
    renderedMasterPrompt,
  };

  // 12. Audit Konsistensi Antar-Artefak (Cross-Artifact Consistency Guard)
  const audit = auditCrossArtifactConsistency({
    diagrams,
    coreSpecification,
    executionPhases,
    additionalTextContext: rawPrompt,
  });

  return {
    blueprint,
    consistencyScore: audit.score,
    consistencyValid: audit.isConsistent,
    warnings: audit.warnings,
  };
}

function getBlueprintTitle(domain: string, prompt: string): string {
  switch (domain) {
    case "software":
      return "MASTER BLUEPRINT — END-TO-END SOFTWARE & SYSTEM ENGINEERING";
    case "research":
      return "MASTER BLUEPRINT — SCIENTIFIC RESEARCH PROTOCOL & EMPIRICAL STUDY";
    case "academic":
      return "MASTER BLUEPRINT — ACADEMIC THESIS & METHODOLOGICAL FRAMEWORK";
    case "business":
      return "MASTER BLUEPRINT — ENTERPRISE BUSINESS STRATEGY & OPERATIONAL SOP";
    case "education":
      return "MASTER BLUEPRINT — GUIDED LEARNING & LABORATORY EXPERIMENT";
    default:
      return "MASTER BLUEPRINT — UNIVERSAL EXECUTION SPECIFICATION";
  }
}

function getDomainRoles(domain: string, audience: AudienceLevel): string[] {
  switch (domain) {
    case "software":
      return [
        "Senior UI/UX Designer & Accessibility Specialist (WCAG 2.2 AA)",
        "Design System Engineer (Neumorphism / Soft UI Tokens)",
        "Senior Frontend Developer (Next.js App Router & Strict TypeScript)",
        "Senior Backend & API Architect (RESTful & Microservices)",
        "Database Architect & Relational Modeler (PostgreSQL / SQLite WAL)",
        "Software Security & SSRF Defense Specialist",
        "QA Engineer & Automated Test Specialist (Vitest / Playwright)",
        "DevOps & Production Deployment Engineer",
      ];
    case "research":
      return [
        "Principal Investigator (Lead Scientific Researcher)",
        "Research Methodologist & PRISMA Framework Specialist",
        "Biostatistician & Quantitative Data Analyst (ANOVA / Multivariate)",
        "Marine Ecology & Microplastics Domain Specialist",
        "Peer Reviewer & Scientific Rigor Auditor",
        "Research Ethics & Biosafety Compliance Officer",
      ];
    case "academic":
      return [
        "Dosen Pembimbing Akademik Utama (Senior Academic Supervisor)",
        "Metodolog Penelitian Kuantitatif & Model UTAUT / TAM",
        "Analis Statistik Skripsi (Uji Validitas, Reliabilitas & Regresi)",
        "Kajian Pustaka & Literature Gap Specialist",
        "Editor Penulisan Ilmiah & Checklist Anti-Plagiasi",
      ];
    case "business":
      return [
        "Chief Strategy Officer & Business Development Lead",
        "Head of Operations & Standard Operating Procedure (SOP) Architect",
        "Financial & HPP Margin Analyst",
        "Supply Chain & Food Safety Quality Control Specialist",
        "Marketing & Commercial Launch Campaign Manager",
        "Risk & Legal Compliance Officer (P-IRT, BPOM, Sertifikasi Halal)",
      ];
    case "education":
      return [
        "Guru Pembimbing Sains & Biologi Sekolah Menengah",
        "Desainer Kurikulum Edukasi & Pedagogi Visual",
        "Mentor Praktikum Laboratorium Sains Ramah Siswa",
        "Fasilitator Pemahaman Konsep & Analogi Sehari-hari",
        "Petugas Keselamatan Kerja Laboratorium Sekolah",
      ];
    default:
      return ["Executive Project Lead", "Domain Specialist", "Quality Auditor"];
  }
}

function getContextAndAssumptions(
  domain: string,
  prompt: string,
  audience: AudienceLevel
): { contextParameters: Record<string, string>; smartAssumptions: string[] } {
  switch (domain) {
    case "software":
      return {
        contextParameters: {
          "Nama Proyek": "[NAMA APLIKASI WEB TOKO KUE]",
          "Tema Desain": "Premium Neumorphism / Soft UI (Raised, Inset, Level 0-3 Shadows)",
          "Platform Target": "Desktop, Tablet, dan Mobile Responsif",
          "Tech Stack": "Next.js App Router, TypeScript Strict, Tailwind CSS, PostgreSQL / SQLite",
          "Autentikasi & Otorisasi": "Session Management Aman & Role-Based Access Control",
          "Deployment Target": "Vercel / VPS Linux Cloud",
        },
        smartAssumptions: [
          "FAKTA PASTI: Pengguna meminta sistem website toko kue end-to-end dengan estetika neumorphism.",
          "ASUMSI CERDAS: Fitur minimum mencakup katalog produk, manajemen kategori, keranjang pesanan, dan log audit mutasi.",
          "KEPUTUSAN TERBUKA: Pemilihan gateway pembayaran (Midtrans/Xendit) akan ditentukan saat integrasi fase komersial.",
        ],
      };
    case "research":
      return {
        contextParameters: {
          "Judul Riset": "[ANALISIS AKUMULASI MIKROPLASTIK PADA EKOSISTEM LAUT & MANGROVE]",
          "Pendekatan Riset": "Eksperimen Lapangan & Spektroskopi Laboratorium (Empiris)",
          "Target Populasi": "Sedimen Pesisir, Kolom Air, dan Organisme Benthos Mangrove",
          "Metode Analisis": "Spektroskopi FTIR, Mikroskopi Fluoresensi, dan ANOVA Multivariat",
          "Standar Kepatuhan": "Protokol PRISMA, ISO 17025 Laboratorium Pengujian, Etika Biosafety",
        },
        smartAssumptions: [
          "FAKTA PASTI: Fokus riset adalah akumulasi dan identifikasi polimer mikroplastik pada ekosistem laut.",
          "ASUMSI CERDAS: Pengambilan sampel dilakukan pada zona intertidal dengan replikasi minimum 3 titik stasiun.",
          "KEPUTUSAN TERBUKA: Akses instrumentasi FTIR mikroskopik diasumsikan bermitra dengan laboratorium riset terakreditasi.",
        ],
      };
    case "academic":
      return {
        contextParameters: {
          "Judul Skripsi": "[PENGARUH PERSEPSI KEMUDAHAN DAN MANFAAT TERHADAP NIAT ADOPSI AI PADA UMKM KULINER]",
          "Model Teoritis": "Technology Acceptance Model (TAM) & UTAUT",
          "Populasi & Sampel": "Pelaku UMKM Kuliner (Rumus Slovin dengan margin error 5%)",
          "Instrumen Pengumpulan Data": "Kuesioner Terstruktur Skala Likert 5 Poin",
          "Metode Analisis": "Uji Kualitas Data (Validitas & Cronbach Alpha), Uji Asumsi Klasik, Regresi Berganda",
        },
        smartAssumptions: [
          "FAKTA PASTI: Penelitian bertujuan menguji faktor-faktor penentu adopsi AI di sektor UMKM kuliner.",
          "ASUMSI CERDAS: Data primer dikumpulkan dari minimal 100 responden pelaku usaha UMKM kuliner aktif.",
          "KEPUTUSAN TERBUKA: Alat uji statistik menggunakan SPSS atau SmartPLS disesuaikan dengan kurva sebaran data.",
        ],
      };
    case "business":
      return {
        contextParameters: {
          "Nama Produk": "[KOPI SUSU KEMASAN BOTOL SIAP MINUM (READY-TO-DRINK)]",
          "Model Bisnis": "Direct-to-Consumer (D2C) & Distribusi Konsinyasi Outlet Retail",
          "Target Peluncuran": "12 Minggu dari Nol hingga Distribusi Komersial Pertama",
          "Struktur Biaya": "Pemisahan Mutlak antara HPP (Bahan, Botol, Sealing) vs Biaya Operasional & Margin Laba",
          "Sertifikasi & Kepatuhan": "Izin Edar P-IRT / BPOM, Sertifikasi Halal, dan Standar Sanitasi Pangan",
        },
        smartAssumptions: [
          "FAKTA PASTI: Produk berupa minuman kopi kemasan botol siap minum yang membutuhkan alur produksi terstandar.",
          "ASUMSI CERDAS: Umur simpan (shelf-life) ditargetkan minimal 14-21 hari pada suhu chiller (2-4 derajat Celcius).",
          "KEPUTUSAN TERBUKA: Pemilihan supplier kemasan botol kaca vs PET food grade dievaluasi berdasarkan sensitivitas harga pasar.",
        ],
      };
    case "education":
      return {
        contextParameters: {
          "Topik Pembelajaran": "Mekanisme Fotosintesis & Praktikum Pembuktian Oksigen (Ingenhousz)",
          "Tingkat Pendidikan": "Siswa Sekolah Menengah (SMP / SMA Kelas XI)",
          "Waktu Praktikum": "2 Jam Pelajaran (90 Menit di Laboratorium Biologi)",
          "Bahan & Alat": "Tanaman Hydrilla verticillata, Corong Kaca, Tabung Reaksi, Air, NaHCO3 (Bikarbonat)",
          "Standar Keselamatan": "Penanganan Alat Kaca Aman, Pengawasan Guru, Tanpa Penggunaan Bahan Api Berbahaya",
        },
        smartAssumptions: [
          "FAKTA PASTI: Pembelajaran mencakup teori fotosintesis (reaksi terang & gelap) serta praktikum nyata pembuktian oksigen.",
          "ASUMSI CERDAS: Siswa telah memahami konsep dasar sel tumbuhan dan kloroplas sebelum praktikum dimulai.",
          "KEPUTUSAN TERBUKA: Variasi perlakuan cahaya (lampu vs sinar matahari langsung) disesuaikan dengan kondisi cuaca hari praktikum.",
        ],
      };
    default:
      return { contextParameters: {}, smartAssumptions: [] };
  }
}

function getPrimaryObjectives(domain: string, audience: AudienceLevel): string[] {
  switch (domain) {
    case "software":
      return [
        "1. Soft Surfaces: Elemen UI tampak menyatu alami dengan permukaan latar belakang.",
        "2. Raised & Inset Hierarchy: Menggunakan bayangan Level 0-3 untuk elemen timbul dan efek cekung untuk kolom input.",
        "3. Tactile Interaction: Setiap tombol memberikan umpan balik visual saat disentuh atau ditekan (pressed state).",
        "4. Restrained Color Palette: Palet warna netral lembut dengan aksen tajam pada elemen call-to-action.",
        "5. Accessible Contrast: Memenuhi standar WCAG 2.2 AA agar teks tetap terbaca jernih dan ramah pembaca layar.",
        "6. Responsive Multi-Viewport: Tampilan stabil sempurna dari layar smartphone kecil hingga monitor desktop lebar.",
        "7. Production Reliability: Kode modular, penanganan error transparan, dan tidak menggunakan mock data di production.",
        "8. Data Integrity: Mutasi transaksi database bersifat atomik dengan validasi skema Zod ketat.",
      ];
    case "research":
      return [
        "1. Scientific Rigor: Desain metodologi eksperimen memenuhi standar replikasi dan verifikasi peer-reviewed.",
        "2. Controlled Contamination: Memastikan protokol blanko kontrol ketat dalam mencegah kontaminasi mikroplastik bawaan udara.",
        "3. Clear Variable Operationalization: Definisi operasional variabel independen, mediator, dan dependen terukur secara kuantitatif.",
        "4. Validitas Spektral FTIR: Akurasi pencocokan spektral polimer polimer (PP, PE, PET) di atas 85% kecocokan pustaka.",
        "5. Analisis Statistik Berkekuatan Tinggi: Pengujian hipotesis menggunakan uji ANOVA atau regresi dengan nilai p < 0.05 terverifikasi.",
        "6. Kepatuhan Etika Penelitian: Menghormati kelestarian ekosistem sampel dan biosafety laboratorium.",
        "7. Keterbukaan Data (Open Science): Menyiapkan dataset terbuka yang dapat diverifikasi oleh peneliti independen.",
        "8. Struktur Manuskrip Standar IMRaD: Alur laporan terstruktur dari Pendahuluan, Metode, Hasil, hingga Diskusi.",
      ];
    case "academic":
      return [
        "1. Koherensi Antara Latar Belakang dan Rumusan Masalah: Masalah penelitian ditopang oleh data empiris dan gap riset terkini.",
        "2. Landasan Teori Kokoh: Mengadopsi kerangka teori TAM dan UTAUT yang telah tervalidasi secara luas di literatur ilmiah.",
        "3. Validitas & Reliabilitas Instrumen: Kuesioner wajib lolos uji r-hitung > r-tabel dan nilai Cronbach Alpha > 0.70.",
        "4. Pemenuhan Uji Asumsi Klasik: Lolos uji normalitas, multikolinieritas, dan heteroskedastisitas sebelum regresi.",
        "5. Keterwakilan Sampel: Ukuran sampel dihitung secara matematis menggunakan rumus Slovin agar merepresentasikan populasi.",
        "6. Objektivitas Interpretasi: Menghindari cherry-picking data; hipotesis yang ditolak tetap dibahas secara ilmiah.",
        "7. Kepatuhan Bebas Plagiasi: Menjamin sitasi akurat dan skor similaritas di bawah ambang batas kampus.",
        "8. Sistematika Penulisan Bab 1-5: Struktur bab rapi dan siap disidangkan di hadapan dewan penguji.",
      ];
    case "business":
      return [
        "1. Kejelasan Pemisahan HPP vs Laba: Menghitung harga pokok penjualan per botol secara presisi hingga satuan rupiah terkecil.",
        "2. Standar Kualitas Pangan Konsisten: Formulasi rasa, derajat keasaman (pH), dan kadar manis (Brix) terkontrol ketat.",
        "3. Kepatuhan Regulasi Pangan: Memenuhi kelayakan izin edar P-IRT/BPOM, higienitas sanitasi, dan sertifikasi Halal.",
        "4. Standard Operating Procedure (SOP) Jelas: Setiap langkah produksi dan penyimpanan memiliki checklist penanggung jawab.",
        "5. Efisiensi Rantai Pasok: Mencegah overstock bahan baku segar dan mengoptimalkan perputaran persediaan (inventory turnover).",
        "6. Disiplin Eksekusi Timeline: Memastikan peluncuran produk tepat waktu sesuai jadwal Gantt Chart 12 minggu.",
        "7. Mitigasi Risiko Finansial: Menetapkan titik impas (Break-Even Point) dan skenario proteksi arus kas operasional.",
        "8. Metrik Keberhasilan Terukur: Pelacakan Key Performance Indicators (KPI) volume penjualan, repeat order, dan retensi mitra.",
      ];
    case "education":
      return [
        "1. Kejelasan Konsep Dasar: Menjelaskan perbedaan reaksi terang dan reaksi gelap dengan analogi visual yang memikat.",
        "2. Daya Tarik Belajar: Menggunakan bahasa lugas yang membangkitkan rasa ingin tahu ilmiah siswa.",
        "3. Keamanan Praktikum Laboratorium: Menjamin seluruh prosedur eksperimen bebas dari zat beracun dan aman bagi siswa.",
        "4. Bukti Nyata Teramati: Menghubungkan teori produksi gas dengan bukti gelembung oksigen pada corong tanaman Hydrilla.",
        "5. Berpikir Kritis Sains: Mengajak siswa menguji variabel pembanding (tempat teduh vs terkena sinar matahari langsung).",
        "6. Lembar Kerja Praktikum Terstruktur: Menyediakan tabel pengamatan yang mudah diisi selama pengamatan di lab.",
        "7. Penguatan Daya Ingat: Memberikan kuis evaluasi singkat dan rangkuman poin-poin kunci di akhir materi.",
        "8. Penghargaan Terhadap Alam: Menumbuhkan apresiasi terhadap peran krusial tumbuhan bagi pasokan oksigen bumi.",
      ];
    default:
      return ["Kualitas Eksekusi Terukur", "Kepatuhan Terhadap Spesifikasi", "Penyelesaian Tepat Waktu"];
  }
}

function getCoreSpecification(domain: string, audience: AudienceLevel): string {
  switch (domain) {
    case "software":
      return `### SPESIFIKASI SISTEM & DESIGN SYSTEM NEUMORPHISM
1. **Design Tokens & Surface Levels:**
   - Background Utama: #e0e5ec (Soft Neutral Canvas)
   - Raised Surface (Level 1): Bayangan luar halus (box-shadow: 6px 6px 12px #b8b9be, -6px -6px 12px #ffffff)
   - Elevated Card (Level 2): Bayangan luar tegas (box-shadow: 9px 9px 16px #b8b9be, -9px -9px 16px #ffffff)
   - Inset Surface (Inputs/Search): Bayangan cekung (box-shadow: inset 4px 4px 8px #b8b9be, inset -4px -4px 8px #ffffff)
   - Pressed State (Active Buttons): Transisi lembut beralih dari Raised ke Inset saat diklik
   - Aksen Utama: #3b82f6 (Indikator aktif & call-to-action kontras tinggi)
2. **Arsitektur Teknis:**
   - Frontend: Next.js dengan App Router & React Server Components
   - Bahasa: TypeScript dengan mode Strict (Zero 'any')
   - Database & ORM: PostgreSQL / SQLite (Mode WAL) dengan Prisma (Model USER, PRODUCT, CATEGORY, ORDER, ORDER_ITEM, AUDIT_LOG)
   - Alur Transaksi: InputPengguna, ValidasiSkema, CekStok, TransaksiDatabase, NotifikasiBerhasil, RollbackError
   - Validasi: Zod schema validation pada setiap boundary request`;

    case "research":
      return `### SPESIFIKASI METODOLOGI & KERANGKA ANALITIS RISET
1. **Desain Pengambilan Sampel & Kontrol:**
   - Sampling Intertidal: Metode transek garis kuadrat pada kedalaman sedimen 0-5 cm
   - Replikasi: 3 titik stasiun pengamatan dengan masing-masing 5 sub-sampel acak
   - Kontrol Udara (Procedural Blank): Cawan petri terbuka berisi filter ultra-murni untuk mengukur background contamination
2. **Karakterisasi Partikel Spektroskopi:**
   - Instrumen: Fourier Transform Infrared Spectroscopy (µ-FTIR) dengan mode ATR
   - Resolusi Spektra: 4 cm-1 dengan rentang bilangan gelombang 4000-600 cm-1
   - Kriteria Identifikasi: Koefisien kecocokan pustaka (Hit Quality Index) > 85% untuk polimer PP, PE, dan PET`;

    case "academic":
      return `### KERANGKA PEMIKIRAN TEORITIS & SPESIFIKASI PENGUKURAN
1. **Konseptualisasi Variabel (Model TAM & UTAUT):**
   - Variabel Independen X1 (Persepsi Kemudahan): 4 indikator (Mudah dipelajari, fleksibel, jelas, efisien)
   - Variabel Independen X2 (Persepsi Manfaat): 4 indikator (Meningkatkan efisiensi, akurasi, profitabilitas)
   - Variabel Dependen Y (Niat Adopsi AI): 3 indikator (Rencana penggunaan, frekuensi, rekomendasi ke mitra)
2. **Prosedur Pengolahan Statistik:**
   - Skala Pengukuran: Skala Likert 1-5 (Sangat Tidak Setuju hingga Sangat Setuju)
   - Batas Kelayakan Instrumen: r-hitung > r-tabel (Validitas) dan Cronbach Alpha > 0.70 (Reliabilitas)
   - Uji Asumsi Klasik: Uji Kolmogorov-Smirnov (Normalitas) dan VIF < 10 (Bebas Multikolinieritas)`;

    case "business":
      return `### TATA KELOLA OPERASIONAL & SPESIFIKASI FORMULASI PRODUK
1. **Formulasi Produk Kopi Kemasan:**
   - Komposisi Terstandar: Rasio Ekstraksi Kopi Cold Brew 1:8, Susu Segar Pasteurisasi, Gula Aren Organik
   - Parameter Kontrol Mutu: Kadar Manis 9-11 Brix, pH Keasaman 5.8-6.2, Suhu Pengisian Maksimal 10 Derajat Celcius
2. **Struktur Biaya & Unit Economics (HPP per Botol):**
   - Bahan Baku Cair (Kopi, Susu, Gula): Rp 6.200
   - Kemasan (Botol Food Grade 250ml, Tutup, Induction Seal, Label Vinyl): Rp 2.100
   - Tenaga Kerja Langsung & Energi Produksi: Rp 1.200
   - Total HPP Produksi Bersih: Rp 9.500 per botol
   - Harga Jual Eceran yang Disarankan (HET): Rp 18.000 (Margin Kotor 47.2%)`;

    case "education":
      return `### MODEL MENTAL & PANDUAN KONSEP KUNCI FOTOSINTESIS
1. **Analogi Pabrik Tenaga Surya:**
   - Klorofil (Daun) = Panel surya yang menyerap energi foton cahaya matahari.
   - Reaksi Terang (Tilakoid) = Mesin pemecah air (H2O) menghasilkan gas oksigen dan mengisi baterai kimia (ATP & NADPH).
   - Reaksi Gelap / Siklus Calvin (Stroma) = Dapur sintesis yang mencampurkan karbon dioksida (CO2) dengan energi baterai menjadi gula glukosa (C6H12O6).
2. **Prosedur Praktikum Ingenhousz yang Aman:**
   - Masukkan tanaman Hydrilla ke dalam corong kaca terbalik di dalam gelas piala berisi air.
   - Tutup ujung pipa corong dengan tabung reaksi terisi air penuh tanpa gelembung awal.
   - Bandingkan jumlah gelembung udara yang terbentuk antara perlakuan tempat teduh vs tempat disinari cahaya matahari.`;

    default:
      return "Spesifikasi Domain Inti Terstandar";
  }
}

function getExecutionPhases(
  domain: string,
  diagrams: DiagramSpecification[],
  audience: AudienceLevel
): ExecutionPhase[] {
  switch (domain) {
    case "software":
      return [
        {
          phaseNumber: 0,
          name: "Discovery & Requirements Analysis",
          tasks: [
            "Analisis mendalam kebutuhan bisnis aplikasi website toko kue.",
            "Dokumentasikan batasan ruang lingkup dan pencegahan scope creep.",
            "Petakan persona pengguna (Pembeli, Admin Toko, Kasir).",
          ],
          deliverables: ["PROJECT_BRIEF.md", "REQUIREMENTS.md", "ASSUMPTIONS.md"],
        },
        {
          phaseNumber: 1,
          name: "System Architecture & Relational Data Modeling",
          tasks: [
            "Rancang skema relasi database Pengguna, Produk, Kategori, Pesanan, ItemPesanan, dan LogAudit (model USER, PRODUCT, CATEGORY, ORDER, ORDER_ITEM, AUDIT_LOG) sesuai diagram ERD.",
            "Tentukan indeks database, primary key UUID, foreign key, dan constraint referensial.",
            "Petakan alur transaksi atomik: InputPengguna, ValidasiSkema, CekStok, TransaksiDatabase, NotifikasiBerhasil, dan RollbackError sesuai diagram Flowchart.",
          ],
          deliverables: ["DATABASE_SCHEMA.prisma", "ARCHITECTURE.md", "SITEMAP.md"],
        },
        {
          phaseNumber: 2,
          name: "Design System & UI Tokens Engineering",
          tasks: [
            "Definisikan token Neumorphism: warna surface, radius tombol, dan shadow level 0-3.",
            "Bangun komponen antarmuka yang ramah aksesibilitas (WCAG 2.2 AA compliant).",
            "Siapkan komponen form input inset dan tombol raised yang responsif.",
          ],
          deliverables: ["DESIGN_SYSTEM.md", "tailwind.config.ts", "UI_TOKENS.json"],
        },
        {
          phaseNumber: 3,
          name: "Component & Page Development",
          tasks: [
            "Implementasikan halaman katalog produk, keranjang belanja, dan dashboard riwayat pesanan.",
            "Terapkan validasi payload form menggunakan Zod schema.",
            "Pastikan interaksi tombol tactile neumorphism berfungsi mulus tanpa glitch.",
          ],
          deliverables: ["SRC_COMPONENTS/", "SRC_PAGES/", "FORM_VALIDATION.ts"],
        },
        {
          phaseNumber: 4,
          name: "Integration, Quality Assurance & Security Audit",
          tasks: [
            "Jalankan pengujian unit, integrasi API, dan uji regresi sistem secara menyeluruh.",
            "Lakukan audit keamanan terhadap celah SSRF, IDOR, dan injeksi data.",
            "Verifikasi performa halaman dan uji kontras warna pada mode terang/gelap.",
          ],
          deliverables: ["TEST_REPORT.md", "SECURITY_AUDIT.md", "PERFORMANCE_LOG.json"],
        },
        {
          phaseNumber: 5,
          name: "Production Build & Deployment Handover",
          tasks: [
            "Kompilasi build produksi (next build) tanpa error TypeScript atau lint.",
            "Siapkan berkas konfigurasi environment dan panduan pemulihan operasional.",
            "Finalisasi penyerahan dokumentasi kepada tim pengembang.",
          ],
          deliverables: ["PRODUCTION_BUILD", "DEPLOYMENT.md", "RUNBOOK.md"],
        },
      ];

    case "research":
      return [
        {
          phaseNumber: 0,
          name: "Research Problem Formulation & Literature Gap",
          tasks: [
            "Perumusan latar belakang urgensi dampak mikroplastik pada ekosistem laut.",
            "Identifikasi kesenjangan literatur (literature gap) dari jurnal bereputasi 5 tahun terakhir.",
            "Formulasi hipotesis penelitian dan pertanyaan riset terarah.",
          ],
          deliverables: ["RESEARCH_PROPOSAL.md", "LITERATURE_REVIEW.md", "HYPOTHESIS_SPEC.md"],
        },
        {
          phaseNumber: 1,
          name: "Methodological Design & Sampling Protocol",
          tasks: [
            "Desain protokol pengambilan sampel intertidal sedimen dan biota laut sesuai diagram metodologi.",
            "Tetapkan prosedur kontrol sterilisasi alat laboratorium untuk mencegah kontaminasi latar belakang.",
            "Susun dokumen persetujuan etika riset biosafety dan perizinan zonasi konservasi.",
          ],
          deliverables: ["SAMPLING_PROTOCOL.md", "ETHICS_CLEARANCE.pdf", "STATION_COORDINATES.csv"],
        },
        {
          phaseNumber: 2,
          name: "Fieldwork & Laboratory Analytical Extraction",
          tasks: [
            "Pengambilan sampel sedimen dan air laut secara sistematis di lokasi riset.",
            "Ekstraksi densitas menggunakan larutan garam pekat dan pencernaan bahan organik hidrogen peroksida.",
            "Isolasi partikel mikroplastik pada filter membran selulosa nitrat.",
          ],
          deliverables: ["FIELD_LOGBOOK.md", "EXTRACTION_RECORDS.csv", "BLANK_CONTROL_AUDIT.md"],
        },
        {
          phaseNumber: 3,
          name: "Spectroscopic Identification & Data Compilation",
          tasks: [
            "Karakterisasi polimer menggunakan spektroskopi µ-FTIR (identifikasi PP, PE, PET).",
            "Kuantifikasi kelimpahan partikel berdasarkan ukuran, bentuk (fiber/film), dan warna.",
            "Kompilasi dataset numerik ke dalam matriks data riset standar.",
          ],
          deliverables: ["FTIR_SPECTRA_DATASET.json", "PARTICLE_CLASSIFICATION.csv"],
        },
        {
          phaseNumber: 4,
          name: "Statistical Analysis & Scientific Discussion",
          tasks: [
            "Uji signifikansi statistik (ANOVA dan korelasi) antar stasiun pengambilan sampel.",
            "Interpretasi hubungan kausal antara akumulasi mikroplastik dengan kerusakan habitat mangrove.",
            "Sintesis temuan baru terhadap literatur internasional yang ada.",
          ],
          deliverables: ["STATISTICAL_OUTPUT.pdf", "DISCUSSION_SYNTHESIS.md"],
        },
        {
          phaseNumber: 5,
          name: "Manuscript Finalization & Peer-Review Readiness",
          tasks: [
            "Penyusunan naskah artikel ilmiah lengkap berformat IMRaD sesuai pedoman jurnal sasaran.",
            "Penyusunan tabel, grafik data resolusi tinggi, dan daftar referensi terverifikasi bebas halusinasi.",
            "Pemeriksaan akhir kepatuhan peer-review dan keterbukaan data riset.",
          ],
          deliverables: ["MANUSCRIPT_FINAL.docx", "SUPPLEMENTARY_DATA.zip", "SUBMISSION_CHECKLIST.md"],
        },
      ];

    case "academic":
      return [
        {
          phaseNumber: 0,
          name: "Penentuan Topik & Penyusunan Proposal Skripsi",
          tasks: [
            "Identifikasi fenomena bisnis adopsi AI pada sektor UMKM kuliner.",
            "Merumuskan batasan masalah, tujuan penelitian, dan kontribusi akademis.",
            "Menentukan acuan teori utama (TAM / UTAUT) yang relevan.",
          ],
          deliverables: ["PROPOSAL_SKRIPSI.docx", "BAB1_PENDAHULUAN.md", "DAFTAR_PUSTAKA_AWAL.md"],
        },
        {
          phaseNumber: 1,
          name: "Kajian Teori & Kerangka Pemikiran (Bab 2)",
          tasks: [
            "Kompilasi teori persepsi kemudahan, kemanfaatan, dan niat adopsi teknologi.",
            "Gambarkan diagram kerangka pemikiran dan formulasi hipotesis H1 hingga H4.",
            "Rangkum matriks penelitian terdahulu sebagai landasan komparasi.",
          ],
          deliverables: ["BAB2_TINJAUAN_PUSTAKA.docx", "KERANGKA_PEMIKIRAN.png", "TABEL_GAP_RISET.docx"],
        },
        {
          phaseNumber: 2,
          name: "Desain Metodologi & Instrumen Penelitian (Bab 3)",
          tasks: [
            "Tentukan populasi dan ukuran sampel menggunakan rumus Slovin.",
            "Susun kisi-kisi instrumen kuesioner skala Likert 1-5 berdasarkan indikator variabel.",
            "Jalankan uji coba instrumen (pilot test) kepada 30 responden untuk menguji validitas dan reliabilitas.",
          ],
          deliverables: ["BAB3_METODE_PENELITIAN.docx", "KUESIONER_PENELITIAN.pdf", "HASIL_PILOT_TEST.xlsx"],
        },
        {
          phaseNumber: 3,
          name: "Pengumpulan Data Lapangan & Tabulasi",
          tasks: [
            "Sebarkan kuesioner kepada responden pelaku UMKM kuliner yang memenuhi kriteria.",
            "Lakukan tabulasi data mentah dan periksa kelengkapan respon (data screening).",
            "Kompilasi profil demografi responden ke dalam tabel ringkasan.",
          ],
          deliverables: ["DATA_MENTAH_KUESIONER.xlsx", "TABEL_DEMOGRAFI.docx"],
        },
        {
          phaseNumber: 4,
          name: "Analisis Data Statistik & Pembahasan (Bab 4)",
          tasks: [
            "Jalankan uji asumsi klasik: normalitas, multikolinieritas, dan heteroskedastisitas.",
            "Eksekusi analisis regresi linier berganda (koefisien R2, uji F simultan, dan uji t parsial).",
            "Tulis pembahasan hasil temuan: mengapa hipotesis diterima atau ditolak berdasarkan fakta empiris.",
          ],
          deliverables: ["BAB4_HASIL_DAN_PEMBAHASAN.docx", "OUTPUT_STATISTIK_SPSS.pdf"],
        },
        {
          phaseNumber: 5,
          name: "Kesimpulan, Saran & Persiapan Ujian Sidang (Bab 5)",
          tasks: [
            "Tarik kesimpulan esensial yang menjawab rumusan masalah secara lugas.",
            "Rumuskan saran aplikatif bagi pelaku UMKM kuliner dan saran teoritis bagi peneliti selanjutnya.",
            "Periksa format penulisan skripsi, cek plagiasi Turnitin, dan siapkan slide presentasi sidang.",
          ],
          deliverables: ["SKRIPSI_LENGKAP_FINAL.docx", "SLIDE_SIDANG.pptx", "HASIL_TURNITIN.pdf"],
        },
      ];

    case "business":
      return [
        {
          phaseNumber: 0,
          name: "Inisiasi Bisnis, Riset Pasar & Studi Kelayakan",
          tasks: [
            "Riset selera konsumen kopi susu botol dan pemetaan harga kompetitor sejenis.",
            "Hitung estimasi titik impas (Break-Even Point) dan proyeksi modal kerja awal.",
            "Tetapkan proposisi nilai unik (Unique Value Proposition) pembeda produk.",
          ],
          deliverables: ["BUSINESS_CASE.md", "FEASIBILITY_STUDY.xlsx", "COMPETITOR_BENCHMARK.md"],
        },
        {
          phaseNumber: 1,
          name: "R&D Formulasi Rasa & Standard Operating Procedure (SOP)",
          tasks: [
            "Uji coba resep ekstraksi cold brew dan rasio susu gula hingga mencapai rasa konsisten.",
            "Susun SOP alur produksi harian, sanitasi peralatan, dan standar penyimpanan chiller.",
            "Lakukan uji umur simpan (shelf-life test) pada suhu ruang dan suhu dingin.",
          ],
          deliverables: ["SOP_PRODUKSI.md", "RESEP_BAKU.md", "SHELF_LIFE_REPORT.pdf"],
        },
        {
          phaseNumber: 2,
          name: "Perizinan Usaha, Sertifikasi & Pengadaan Fasilitas",
          tasks: [
            "Pendaftaran nomor induk berusaha (NIB), izin edar P-IRT/BPOM, dan audit sertifikasi Halal.",
            "Pengadaan mesin induksi sealer, botol kemasan food grade, dan pendingin komersial.",
            "Penyusunan matriks tanggung jawab tim operasional (RACI matrix).",
          ],
          deliverables: ["DOKUMEN_LEGALITAS.pdf", "INVENTORY_LIST.xlsx", "RACI_MATRIX.md"],
        },
        {
          phaseNumber: 3,
          name: "Branding, Kemasan & Strategi Pemasaran Pra-Rilis",
          tasks: [
            "Finalisasi desain label botol vinyl tahan air mencakup informasi nilai gizi dan barcode.",
            "Pembuatan materi promosi digital dan peluncuran kampanye teaser media sosial.",
            "Buka jalur kemitraan konsinyasi dengan 10 titik kedai dan kantin sasaran.",
          ],
          deliverables: ["DESAIN_LABEL.ai", "MARKETING_CALENDAR.md", "MOU_KONSINYASI.docx"],
        },
        {
          phaseNumber: 4,
          name: "Uji Pasar Terbatas & Umpan Balik Konsumen",
          tasks: [
            "Produksi batch uji coba pertama (100 botol) dan sebar ke konsumen terpilih.",
            "Kumpulkan data indeks kepuasan rasa, kemudahan membuka tutup botol, dan daya tarik kemasan.",
            "Lakukan penyesuaian resep atau packaging jika ditemukan keluhan teknis.",
          ],
          deliverables: ["TEST_MARKET_FEEDBACK.csv", "ACTION_ITEMS_REVISION.md"],
        },
        {
          phaseNumber: 5,
          name: "Grand Launching & Pelaksanaan Operasional Berkelanjutan",
          tasks: [
            "Peluncuran komersial resmi produk secara serentak di seluruh kanal penjualan.",
            "Jalankan sistem pencatatan keuangan harian yang memisahkan rekening pribadi dan omzet usaha.",
            "Evaluasi pencapaian KPI bulanan: repeat order, margin laba bersih, dan utilisasi kapasitas produksi.",
          ],
          deliverables: ["LAUNCH_REPORT.pdf", "FINANCIAL_LEDGER.xlsx", "KPI_DASHBOARD.xlsx"],
        },
      ];

    case "education":
      return [
        {
          phaseNumber: 0,
          name: "Penyusunan Materi Pembelajaran & Pengenalan Konsep",
          tasks: [
            "Jelaskan fungsi klorofil dan organel kloroplas sebagai pabrik energi fotosintesis.",
            "Gunakan analogi visual kehidupan sehari-hari agar siswa mudah mencerna materi.",
            "Sajikan ringkasan perbedaan mendasar antara reaksi terang dan siklus Calvin.",
          ],
          deliverables: ["PANDUAN_MATERI_SISWA.pdf", "SLIDE_PRESENTASI_KELAS.pptx"],
        },
        {
          phaseNumber: 1,
          name: "Visualisasi Alur Proses & Pemetaan Konsep",
          tasks: [
            "Tampilkan diagram alur reaksi kimia fotosintesis yang menghubungkan air, sinar, CO2, dan glukosa.",
            "Bahas mindmap faktor lingkungan yang mempengaruhi laju fotosintesis.",
            "Berikan pertanyaan pemantik diskusi untuk menguji pemahaman awal siswa.",
          ],
          deliverables: ["MINDMAP_FOTOSINTESIS.png", "LEMBAR_DISKUSI_SISWA.docx"],
        },
        {
          phaseNumber: 2,
          name: "Persiapan Praktikum & Pengenalan Keselamatan Lab",
          tasks: [
            "Kenalkan alat praktikum Ingenhousz (gelas piala, corong kaca, tabung reaksi, tanaman Hydrilla).",
            "Jelaskan aturan keselamatan laboratorium: hati-hati saat memegang alat kaca dan hindari tumpahan air.",
            "Bagi siswa ke dalam kelompok kerja praktikum (4-5 siswa per kelompok).",
          ],
          deliverables: ["SOP_KESELAMATAN_LAB.md", "DAFTAR_KELOMPOK_PRAKTIKUM.docx"],
        },
        {
          phaseNumber: 3,
          name: "Pelaksanaan Eksperimen Laboratorium & Pengamatan Gelembung",
          tasks: [
            "Rangkai perangkat percobaan Ingenhousz dengan tanaman Hydrilla dalam posisi corong terbalik.",
            "Letakkan satu perangkat di bawah sinar matahari langsung dan satu perangkat di tempat teduh.",
            "Amati dan hitung jumlah gelembung gas oksigen yang muncul setiap 5 menit selama 30 menit.",
          ],
          deliverables: ["LEMBAR_PENGAMATAN_LAB.pdf", "FOTO_DOKUMENTASI_EKSPERIMEN.jpg"],
        },
        {
          phaseNumber: 4,
          name: "Analisis Data Hasil Pengamatan & Diskusi Kelompok",
          tasks: [
            "Bandingkan data frekuensi gelembung antara perangkat yang disinari dan yang teduh.",
            "Arahkan siswa menyimpulkan bahwa cahaya matahari dan ketersediaan CO2 mempercepat pembentukan oksigen.",
            "Tuliskan laporan praktikum sederhana per kelompok mengikuti format baku sains.",
          ],
          deliverables: ["LAPORAN_PRAKTIKUM_KELOMPOK.docx", "GRAFIK_HASIL_PENGAMATAN.xlsx"],
        },
        {
          phaseNumber: 5,
          name: "Evaluasi Pemahaman & Refleksi Pembelajaran",
          tasks: [
            "Adakan kuis evaluasi singkat (10 soal pilihan ganda dan 2 esai konseptual).",
            "Bahas jawaban kuis bersama di kelas untuk mengoreksi miskonsepsi siswa.",
            "Ajak siswa merefleksikan pentingnya menjaga kelestarian pohon hijau sebagai produsen oksigen dunia.",
          ],
          deliverables: ["KUIS_EVALUASI_SISWA.pdf", "KUNCI_JAWABAN_DAN_PEMBAHASAN.pdf"],
        },
      ];

    default:
      return [];
  }
}

function getNegativeConstraints(domain: string, audience: AudienceLevel): string[] {
  switch (domain) {
    case "software":
      return [
        "1. DILARANG menggunakan mock data di lingkungan production atau mengklaim backend selesai tanpa implementasi nyata.",
        "2. DILARANG menaruh seluruh kode aplikasi ke dalam satu file raksasa (Patuhi Separation of Concerns).",
        "3. DILARANG menggunakan tipe data 'any' tanpa alasan teknis kuat dalam kode TypeScript.",
        "4. DILARANG mengabaikan standar aksesibilitas WCAG 2.2 AA (Pastikan rasio kontras teks terpenuhi).",
        "5. DILARANG menghapus atau mengabaikan penanganan error pada endpoint mutasi data penting.",
        "6. DILARANG memasukkan API key, token rahasia, atau kredensial database ke dalam repository publik.",
      ];
    case "research":
      return [
        "1. DILARANG MENGARANG SITASI ATAU JURNAL FIKTIF (Zero tolerance for hallucinated references).",
        "2. DILARANG melakukan manipulasi data statistik (p-hacking) atau cherry-picking data sampel untuk memaksakan hipotesis.",
        "3. DILARANG mengabaikan prosedur kontaminasi blanko kontrol saat ekstraksi dan identifikasi spektroskopi.",
        "4. DILARANG menggeneralisasi kesimpulan riset melebihi batas cakupan populasi dan metodologi yang diuji.",
        "5. DILARANG menyembunyikan keterbatasan riset atau anomali data lapangan yang ditemukan.",
      ];
    case "academic":
      return [
        "1. DILARANG melakukan plagiarisme atau menyalin kalimat karya ilmiah orang lain tanpa atribusi sitasi yang sah.",
        "2. DILARANG memalsukan jawaban responden kuesioner atau mengisi data kuesioner sendiri secara fiktif.",
        "3. DILARANG memaksakan model regresi jika data gagal memenuhi uji asumsi klasik dasar.",
        "4. DILARANG menggunakan referensi ilmiah yang sudah usang atau bersumber dari blog personal tanpa peer-review.",
        "5. DILARANG mengabaikan koreksi dan saran dosen pembimbing saat melangkah ke bab berikutnya.",
      ];
    case "business":
      return [
        "1. DILARANG MENCAMPURADUKKAN OMZET KOTOR DENGAN LABA BERSIH (Patuhi disiplin pemisahan keuangan).",
        "2. DILARANG meluncurkan produk makanan minuman tanpa label kedaluwarsa jelas dan izin edar resmi yang dipersyaratkan.",
        "3. DILARANG mengasumsikan angka penjualan pasar tanpa didukung riset kompetitor dan uji coba produk nyata.",
        "4. DILARANG membuat SOP tanpa penanggung jawab eksplisit (Setiap tugas harus memiliki pemilik PIC).",
        "5. DILARANG mengorbankan higienitas dan mutu bahan baku hanya demi menekan biaya HPP secara membabi buta.",
      ];
    case "education":
      return [
        "1. DILARANG menggunakan istilah teknis atau rumus kimia yang membingungkan siswa tanpa memberikan analogi yang mudah.",
        "2. DILARANG membiarkan siswa melakukan praktikum tanpa pengawasan keselamatan dan instruksi yang teruji aman.",
        "3. DILARANG memberikan prosedur eksperimen yang membutuhkan zat kimia berbahaya atau api tanpa alat pelindung.",
        "4. DILARANG membatasi proses belajar hanya pada hafalan teks; wajib utamakan pemahaman logika sebab-akibat.",
      ];
    default:
      return ["Dilarang melanggar batasan arsitektur dasar"];
  }
}

function getDefinitionOfDone(domain: string, audience: AudienceLevel): string[] {
  switch (domain) {
    case "software":
      return [
        "1. Seluruh 6 fase eksekusi (Phase 0 hingga Phase 5) telah diselesaikan dengan bukti artefak dokumen nyata.",
        "2. Diagram ERD dan Flowchart transaksi terbukti sinkron 100% dengan skema Prisma dan logika API.",
        "3. Desain antarmuka Neumorphism konsisten dan terbukti memenuhi kriteria aksesibilitas WCAG 2.2 AA.",
        "4. Seluruh rangkaian pengujian (unit, API, dan security linting) lulus 100% dengan Exit Code 0.",
        "5. Kompilasi build produksi (next build) berhasil bersih tanpa ada error TypeScript atau broken dependencies.",
      ];
    case "research":
      return [
        "1. Proposal dan protokol metodologi pengambilan sampel terstandar selesai disusun tanpa ambiguitas.",
        "2. Seluruh diagram kerangka konsep dan alur PRISMA sinkron dengan variabel penelitian yang diuji.",
        "3. Identifikasi spektral FTIR partikel mikroplastik memenuhi standar kecocokan pustaka > 85%.",
        "4. Analisis statistik terbukti signifikan dan seluruh referensi yang digunakan diverifikasi valid serta ada di dunia nyata.",
        "5. Manuskrip artikel ilmiah berformat IMRaD siap diserahkan (submission-ready) ke dewan reviewer jurnal.",
      ];
    case "academic":
      return [
        "1. Seluruh draft bab 1 sampai bab 5 selesai ditulis mengikuti pedoman penulisan skripsi akademik yang sah.",
        "2. Kerangka pemikiran teoritis dan formulasi hipotesis terbukti selaras dengan instrumen kuesioner penelitian.",
        "3. Instrumen penelitian terbukti valid dan reliabel melalui uji empiris pada responden nyata.",
        "4. Seluruh uji asumsi klasik dan regresi berganda selesai dihitung dengan transparansi output statistik.",
        "5. Dokumen skripsi lolos uji anti-plagiasi Turnitin dan materi slide presentasi sidang telah siap diuji.",
      ];
    case "business":
      return [
        "1. Rencana bisnis, analisis kelayakan finansial, dan pemisahan HPP vs Margin terhitung akurat hingga satuan rupiah.",
        "2. Diagram SOP alur produksi dan jadwal peluncuran Gantt Chart 12 minggu selesai disahkan oleh manajemen.",
        "3. Izin legalitas edar dasar dan sertifikasi standar sanitasi pangan terpenuhi sesuai regulasi.",
        "4. Batch uji coba pertama berhasil diproduksi dengan kepuasan konsumen di atas ambang batas penerimaan pasar.",
        "5. Sistem pencatatan kas terpisah dan indikator KPI operasional aktif digunakan untuk memantau performa harian.",
      ];
    case "education":
      return [
        "1. Materi konsep dasar fotosintesis tersaji secara terstruktur, ramah siswa, dan diperkaya analogi kehidupan nyata.",
        "2. Diagram alur reaksi dan mindmap faktor fotosintesis selesai dibuat dan mudah dipahami siswa.",
        "3. Prosedur praktikum Ingenhousz terbukti aman, mudah dipraktikkan, dan menghasilkan indikator gelembung oksigen terukur.",
        "4. Lembar kerja siswa dan format laporan praktikum kelompok siap digunakan saat jam pelajaran laboratorium.",
        "5. Kuis evaluasi pemahaman dan kunci pembahasan tersedia untuk mengukur ketercapaian kompetensi siswa.",
      ];
    default:
      return ["Pekerjaan dinyatakan selesai jika seluruh kriteria penerimaan terpenuhi"];
  }
}

function renderBlueprintToMarkdown(spec: {
  title: string;
  domain: string;
  audienceLevel: AudienceLevel;
  roles: string[];
  contextParameters: Record<string, string>;
  smartAssumptions: string[];
  primaryObjectives: string[];
  coreSpecification: string;
  diagrams: DiagramSpecification[];
  executionPhases: ExecutionPhase[];
  negativeConstraints: string[];
  executionProtocol: string[];
  workManagement: { statusModel: string[]; trackingRules: string[] };
  definitionOfDone: string[];
}): string {
  const lines: string[] = [];

  lines.push(`# ${spec.title}`);
  lines.push(`**Universal Meta-Blueprint — Domain: ${spec.domain.toUpperCase()} | Audience: ${spec.audienceLevel.toUpperCase()}**\n`);

  // Section 1
  lines.push("## 1. ROLE & RESPONSIBILITIES");
  lines.push("Bertindaklah sebagai tim profesional multidisiplin terkemuka yang terdiri dari:");
  for (const role of spec.roles) {
    lines.push(`- ${role}`);
  }
  lines.push("Tugas tim adalah memimpin perancangan, pelaksanaan, verifikasi, dan penyelesaian proyek ini dari tahap awal hingga akhir dengan standar kualitas tertinggi di bidangnya.\n");

  // Section 2
  lines.push("## 2. PROJECT CONFIGURATION & CONTEXT PARAMETERS");
  lines.push("Pahami konfigurasi dan batasan parameter proyek berikut:");
  for (const [key, value] of Object.entries(spec.contextParameters)) {
    lines.push(`- **${key}**: ${value}`);
  }
  lines.push("\n### Smart Assumptions & Fact Separation:");
  for (const assumption of spec.smartAssumptions) {
    lines.push(`- ${assumption}`);
  }
  lines.push("");

  // Section 3
  lines.push("## 3. PRIMARY OBJECTIVE & QUALITY CHARACTERISTICS");
  lines.push("Hasil akhir wajib memenuhi tolok ukur kualitas dan karakteristik inti berikut:");
  for (const obj of spec.primaryObjectives) {
    lines.push(`- ${obj}`);
  }
  lines.push("");

  // Section 4
  lines.push("## 4. CORE SYSTEM & DOMAIN SPECIFICATION");
  lines.push(spec.coreSpecification);
  lines.push("");

  // Section 5
  lines.push("## 5. MANDATORY VISUAL & STRUCTURAL ARTIFACTS (MERMAID.JS)");
  lines.push("Wajib menghasilkan dan mematuhi diagram struktural deklaratif berikut:");
  for (const diag of spec.diagrams) {
    lines.push(`\n### ${diag.title}`);
    lines.push(`*Deskripsi: ${diag.description}*`);
    lines.push(`*Entitas Kunci: ${diag.entities.join(", ")}*`);
    lines.push("```mermaid");
    lines.push(diag.mermaidCode);
    lines.push("```\n");
  }

  // Section 6
  lines.push("## 6. END-TO-END EXECUTION PHASES");
  lines.push("Laksanakan seluruh rangkaian pekerjaan melalui tahapan berurutan berikut dengan bukti deliverables konkret di setiap fase:");
  for (const phase of spec.executionPhases) {
    lines.push(`\n### PHASE ${phase.phaseNumber} — ${phase.name}`);
    lines.push("**Tugas Utama:**");
    for (const task of phase.tasks) {
      lines.push(`- ${task}`);
    }
    lines.push("**Keluaran Deliverables Wajib:**");
    for (const deliv of phase.deliverables) {
      lines.push(`- \`${deliv}\``);
    }
  }
  lines.push("");

  // Section 7
  lines.push("## 7. DOMAIN STANDARDS & GUARDRAILS (JANGAN LAKUKAN)");
  lines.push("Patuhi batasan negatif mutlak berikut untuk melindungi integritas dan kebenaran hasil:");
  for (const constraint of spec.negativeConstraints) {
    lines.push(`- ${constraint}`);
  }
  lines.push("");

  // Section 8
  lines.push("## 8. EXECUTION PROTOCOL FOR AI CODING & TASK AGENTS");
  lines.push("Bekerjalah dengan mematuhi protokol 5-langkah sistematis berikut:");
  for (const step of spec.executionProtocol) {
    lines.push(`- ${step}`);
  }
  lines.push("");

  // Section 9
  lines.push("## 9. WORK MANAGEMENT & TASK TRACKING");
  lines.push(`**Model Status:** ${spec.workManagement.statusModel.join(" ➔ ")}`);
  lines.push("\n**Aturan Pelacakan:**");
  for (const rule of spec.workManagement.trackingRules) {
    lines.push(`- ${rule}`);
  }
  lines.push("");

  // Section 10
  lines.push("## 10. DEFINITION OF DONE & IMMEDIATE NEXT STEP");
  lines.push("### Definition of Done (Kriteria Tuntas):");
  for (const dod of spec.definitionOfDone) {
    lines.push(`- ${dod}`);
  }
  lines.push("\n### START NOW (Langkah Pertama):");
  lines.push("Mulai dari PHASE 0: Periksa seluruh konteks dan data yang tersedia, konfirmasikan asumsi, dan buat dokumen brief awal sebelum melangkah ke implementasi teknis.");

  return lines.join("\n");
}
