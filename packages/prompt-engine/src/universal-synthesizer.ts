import {
  UniversalBlueprintSpec,
  AudienceLevel,
  DiagramSpecification,
  ExecutionPhase,
} from "@prompt-workspace/prompt-contracts";
import {
  classifyUniversalDomain,
  detectDomainSubtopic,
  synthesizeUniversalDiagrams,
  UniversalDomainCategory,
  DomainSubtopic,
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
  const rawPrompt = ((input.prompt || (input as any).primaryGoal) || "").trim();
  const audience: AudienceLevel = input.audienceLevel || "specialist";
  const domainCategory = classifyUniversalDomain(
    input.domain || "",
    rawPrompt
  );
  const subtopic = detectDomainSubtopic(domainCategory, rawPrompt);

  // 1. Bangkitkan Diagram Spesifik Domain & Subtopik (Mermaid.js)
  const diagrams = synthesizeUniversalDiagrams({
    domain: domainCategory,
    primaryGoal: rawPrompt,
    audienceLevel: audience,
  });

  // 2. Tentukan Dewan Pakar (Role & Responsibilities)
  const roles = getDomainRoles(domainCategory, subtopic, audience);

  // 3. Tentukan Parameter Konteks & Asumsi Cerdas
  const { contextParameters, smartAssumptions } = getContextAndAssumptions(
    domainCategory,
    subtopic,
    rawPrompt,
    audience
  );

  // 4. Standar Kualitas Utama (8-10 Tolok Ukur)
  const primaryObjectives = getPrimaryObjectives(
    domainCategory,
    subtopic,
    audience
  );

  // 5. Spesifikasi Teknis / Konseptual Inti
  const coreSpecification = getCoreSpecification(
    domainCategory,
    subtopic,
    audience
  );

  // 6. Tahapan Eksekusi End-to-End dengan Deliverables Nyata
  const executionPhases = getExecutionPhases(
    domainCategory,
    subtopic,
    diagrams,
    audience
  );

  // 7. Standar Negatif & Guardrails ("Jangan Lakukan")
  const negativeConstraints = getNegativeConstraints(
    domainCategory,
    subtopic,
    audience
  );

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
  const definitionOfDone = getDefinitionOfDone(
    domainCategory,
    subtopic,
    audience
  );

  // 11. Render Master Prompt Markdown 10 Bagian Utuh
  const renderedMasterPrompt = renderBlueprintToMarkdown({
    title: getBlueprintTitle(domainCategory, subtopic, rawPrompt),
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
    title: getBlueprintTitle(domainCategory, subtopic, rawPrompt),
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

function getBlueprintTitle(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  prompt: string
): string {
  switch (subtopic) {
    case "software_web3_defi":
      return "MASTER BLUEPRINT — SMART CONTRACT STAKING DEFI & SECURITY AUDIT";
    case "software_ecommerce_store":
      return "MASTER BLUEPRINT — END-TO-END SOFTWARE & SYSTEM ENGINEERING";
    case "business_aquaculture_agri":
      return "MASTER BLUEPRINT — BIOFLOC AQUACULTURE STRATEGY & OPERATIONAL SOP";
    case "business_food_beverage":
      return "MASTER BLUEPRINT — ENTERPRISE BUSINESS STRATEGY & OPERATIONAL SOP";
    case "education_physics_circuits":
      return "MASTER BLUEPRINT — PHYSICS EXPERIMENT & CIRCUIT THEORY GUIDE";
    case "education_biology_photosynthesis":
      return "MASTER BLUEPRINT — GUIDED LEARNING & LABORATORY EXPERIMENT";
    case "research_marine_environmental":
      return "MASTER BLUEPRINT — SCIENTIFIC RESEARCH PROTOCOL & EMPIRICAL STUDY";
    case "academic_technology_adoption":
      return "MASTER BLUEPRINT — ACADEMIC THESIS & METHODOLOGICAL FRAMEWORK";
    default:
      return `MASTER BLUEPRINT — UNIVERSAL ${domain.toUpperCase()} SPECIFICATION`;
  }
}

function getDomainRoles(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  audience: AudienceLevel
): string[] {
  switch (subtopic) {
    case "software_web3_defi":
      return [
        "Lead Solidity & Smart Contract Security Architect",
        "DeFi Protocol Architect & Tokenomics Specialist",
        "Smart Contract Security Auditor (Anti-Reentrancy & Invariant Specialist)",
        "EVM State & Gas Optimization Specialist",
        "QA & Automated Hardhat/Foundry Test Specialist",
      ];
    case "software_iot_telemetry":
      return [
        "IoT Embedded Systems Architect & Hardware Interface Specialist",
        "Satellite Telemetry Protocol Engineer & Anomaly Detection Lead",
        "Time-Series Database Architect & High-Throughput Ingestion Engineer",
        "Distributed Systems & Edge Computing Reliability Specialist",
        "QA Automated Hardware-in-the-Loop & Fuzz Testing Lead",
      ];
    case "software_medical_clinic":
      return [
        "Clinical Informatics Specialist & Medical Systems Architect",
        "Electronic Medical Record (EMR/EHR) & ICD-10 Compliance Lead",
        "Healthcare Privacy & HIPAA / GDPR Security Auditor",
        "Fullstack Healthcare App Developer (Strict TypeScript & Next.js)",
        "Database Architect & Medical Audit Log Specialist",
      ];
    case "software_personal_portfolio":
      return [
        "Senior Creative Director & Interactive UI/UX Designer",
        "Design System Engineer (Neumorphism / Soft UI Tokens)",
        "Senior Frontend Engineer (Next.js App Router & Micro-animations)",
        "Technical Copywriter & Professional Branding Strategist",
        "Performance Optimization & Web Vitals Specialist",
      ];
    case "software_ecommerce_store":
    case "software_generic":
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
    case "business_manufacturing_industry":
      return [
        "Manajer Pabrik & Industrial Process Engineering Lead",
        "Quality Control Lead Pengolahan Hasil Perkebunan & Minyak Sawit (CPO)",
        "Analis Efisiensi Biaya Operasional Manufaktur & OEE Pabrik",
        "Spesialis Standard Operating Procedure (SOP) & K3 Pabrik",
        "Koordinator Logistik Rantai Pasok TBS & Pengapalan CPO",
      ];
    case "business_aquaculture_agri":
      return [
        "Ahli Akuakultur & Spesialis Mikrobiologi Bioflok",
        "Manajer Operasional Tambak & Standard Operating Procedure (SOP) Lead",
        "Analis Keuangan Agribisnis & Struktur Biaya HPP Budidaya",
        "Spesialis Manajemen Kualitas Air & Biosafety Kolam",
        "Koordinator Rantai Pasok, Grading & Distribusi Pasar Panen",
      ];
    case "business_food_beverage":
    case "business_generic":
      return [
        "Chief Strategy Officer & Business Development Lead",
        "Head of Operations & Standard Operating Procedure (SOP) Architect",
        "Financial & HPP Margin Analyst",
        "Supply Chain & Food Safety Quality Control Specialist",
        "Marketing & Commercial Launch Campaign Manager",
        "Risk & Legal Compliance Officer (P-IRT, BPOM, Sertifikasi Halal)",
      ];
    case "education_physics_circuits":
      return [
        "Guru Pembimbing Fisika Sekolah Menengah & Desainer Eksperimen Sains",
        "Instruktur Praktikum Sirkuit & Kelistrikan Dasar Ramah Siswa",
        "Fasilitator Pemahaman Konsep Teori & Analogi Aliran Listrik",
        "Petugas Keselamatan Kerja Laboratorium & Pencegahan Korsleting",
        "Pengembang Modul Pembelajaran Visual & Lembar Kerja Siswa",
      ];
    case "education_practical_experiment":
      return [
        "Instruktur Pembimbing Praktikum Kejuruan (SMK / Vokasi)",
        "Spesialis Prosedur Sterilisasi & Keselamatan Kerja Laboratorium (K3)",
        "Fasilitator Observasi Lapangan & Analisis Hasil Eksperimen Mandiri",
        "Pengembang Modul Praktikum Terpadu & Lembar Kerja Siswa",
        "Desainer Evaluasi Pemahaman Praktik & Refleksi Sains",
      ];
    case "education_biology_photosynthesis":
    case "education_generic":
      return [
        "Guru Pembimbing Sains & Biologi Sekolah Menengah",
        "Desainer Kurikulum Edukasi & Pedagogi Visual",
        "Mentor Praktikum Laboratorium Sains Ramah Siswa",
        "Fasilitator Pemahaman Konsep & Analogi Sehari-hari",
        "Petugas Keselamatan Kerja Laboratorium Sekolah",
      ];
    case "research_marine_environmental":
    case "research_generic":
      return [
        "Principal Investigator (Lead Scientific Researcher)",
        "Research Methodologist & PRISMA Framework Specialist",
        "Biostatistician & Quantitative Data Analyst (ANOVA / Multivariate)",
        "Marine Ecology & Microplastics Domain Specialist",
        "Peer Reviewer & Scientific Rigor Auditor",
        "Research Ethics & Biosafety Compliance Officer",
      ];
    case "academic_technology_adoption":
    case "academic_generic":
      return [
        "Dosen Pembimbing Akademik Utama (Senior Academic Supervisor)",
        "Metodolog Penelitian Kuantitatif & Model UTAUT / TAM",
        "Analis Statistik Skripsi (Uji Validitas, Reliabilitas & Regresi)",
        "Kajian Pustaka & Literature Gap Specialist",
        "Editor Penulisan Ilmiah & Checklist Anti-Plagiasi",
      ];
  }
}

function getContextAndAssumptions(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  prompt: string,
  audience: AudienceLevel
): { contextParameters: Record<string, string>; smartAssumptions: string[] } {
  switch (subtopic) {
    case "software_web3_defi":
      return {
        contextParameters: {
          "Nama Sistem": "[SMART CONTRACT STAKING DEFI & TOKEN VAULT]",
          "Platform Target": "Ethereum Virtual Machine (EVM) / Solidity ^0.8.20",
          "Mekanisme Proteksi": "OpenZeppelin ReentrancyGuard & Checks-Effects-Interactions Pattern",
          "Logika Penalti": "Early Unstake Penalty Basis Points Proporsional Durasi Sisa Kunci",
          "Pengelolaan Dana": "Brankas TokenVaultLedger Terisolasi dari Mutasi Tak Sah",
          "Kepatuhan Audit": "Anti-Reentrancy, Anti-Integer Overflow, Tanpa Otorisasi tx.origin",
        },
        smartAssumptions: [
          "FAKTA PASTI: Pengguna meminta sistem smart contract staking token kripto DeFi dengan penalti unstake dini dan audit keamanan anti-reentrancy.",
          "ASUMSI CERDAS: Token staking dan token reward memenuhi standar ERC20 dengan pengamanan SafeERC20.",
          "KEPUTUSAN TERBUKA: Penalti unstake dini dialokasikan antara mekanisme burn permanen atau dialihkan ke reward pool cadangan.",
        ],
      };

    case "software_iot_telemetry":
      return {
        contextParameters: {
          "Nama Sistem": "[SISTEM TELEMETRI SENSOR IOT & SATELIT REAL-TIME]",
          "Platform Target": "Cloud Time-Series Database & Ingestion Engine Berlatensi Rendah",
          "Komponen Kunci": "DeviceNode, SensorTelemetry, TelemetryAlert, TelemetryLog",
          "Protokol Transmisi": "MQTT / gRPC / WebSockets dengan Verifikasi Checksum Aman",
          "Mekanisme Peringatan": "Deteksi Ambang Batas Anomali Kritis & Notifikasi Darurat",
          "Tech Stack": "TypeScript Strict, InfluxDB / TimescaleDB, Next.js Dashboard, Node.js Stream",
        },
        smartAssumptions: [
          "FAKTA PASTI: Pengguna meminta perancangan arsitektur sistem IoT / telemetri sensor untuk pemantauan parameter real-time.",
          "ASUMSI CERDAS: Perangkat node terhubung melalui protokol ringan berdaya rendah dengan enkripsi end-to-end.",
          "KEPUTUSAN TERBUKA: Interval pengiriman paket data sensor dikalibrasi antara frekuensi tinggi (sub-detik) atau periodik hemat daya.",
        ],
      };

    case "software_medical_clinic":
      return {
        contextParameters: {
          "Nama Sistem": "[SISTEM MANAJEMEN KLINIK & REKAM MEDIS ELEKTRONIK]",
          "Platform Target": "Web Healthcare Portal Responsif Berstandar Privasi Tinggi",
          "Komponen Kunci": "Pasien, Dokter, JanjiKonsultasi, RekamMedis, ResepObat",
          "Standar Kepatuhan": "Kerahasiaan Medis Pasien, Audit Akses Catatan Medis, ICD-10 Coding",
          "Tech Stack": "Next.js App Router, Strict TypeScript, PostgreSQL, Role-Based Access Control",
        },
        smartAssumptions: [
          "FAKTA PASTI: Pengguna meminta sistem informasi rekam medis digital klinik dengan pencatatan terstruktur dan resep obat.",
          "ASUMSI CERDAS: Hak akses rekam medis dibatasi ketat hanya untuk dokter pemeriksa dan petugas terotorisasi.",
          "KEPUTUSAN TERBUKA: Integrasi bridging klaim asuransi kesehatan atau sistem rujukan dievaluasi pada fase lanjutan.",
        ],
      };

    case "software_personal_portfolio":
      return {
        contextParameters: {
          "Nama Proyek": "[WEBSITE PORTOFOLIO PROFESIONAL NEUMORPHISM]",
          "Tema Desain": "Premium Neumorphism / Soft UI (Raised, Inset, Level 0-3 Shadows)",
          "Komponen Kunci": "ProfilPengembang, KeahlianTeknis, KatalogProyek, PesanKontakMasuk",
          "Platform Target": "Desktop, Tablet, dan Mobile Responsif",
          "Tech Stack": "Next.js App Router, TypeScript Strict, Tailwind CSS, SQLite WAL",
        },
        smartAssumptions: [
          "FAKTA PASTI: Pengguna meminta perancangan website portofolio profesional dengan estetika neumorphism yang responsif.",
          "ASUMSI CERDAS: Fitur inti mencakup showcase proyek interaktif, profil keahlian, formulir kontak anti-spam, dan navigasi multi-viewport.",
          "KEPUTUSAN TERBUKA: Metode pengiriman pesan kontak dapat dikonfigurasi melalui Telegram Bot Webhook atau penyedia SMTP.",
        ],
      };

    case "software_ecommerce_store":
    case "software_generic": {
      const lower = prompt.toLowerCase();
      const isPortfolio = lower.includes("portofolio") || lower.includes("portfolio");
      const isCakeOrBakery = lower.includes("kue") || lower.includes("roti") || lower.includes("bakery");
      const isStore = lower.includes("toko") || lower.includes("belanja") || lower.includes("ecommerce") || lower.includes("katalog");

      let projectName = "[SISTEM APLIKASI WEB SESUAI SPESIFIKASI]";
      let factCertainty = "Pengguna meminta perancangan sistem aplikasi web responsif berstandar produksi.";
      let smartAssumption = "Fitur inti disusun modular mencakup navigasi terstruktur, validasi formulir, dan state management.";

      if (isPortfolio) {
        projectName = "[WEBSITE PORTOFOLIO PROFESIONAL NEUMORPHISM]";
        factCertainty = "Pengguna meminta perancangan website portofolio profesional dengan estetika neumorphism yang responsif.";
        smartAssumption = "Fitur inti mencakup showcase proyek interaktif, profil keahlian, formulir kontak terverifikasi, dan navigasi multi-viewport.";
      } else if (isCakeOrBakery) {
        projectName = "[NAMA APLIKASI WEB TOKO KUE]";
        factCertainty = "Pengguna meminta sistem website toko kue end-to-end dengan estetika neumorphism.";
        smartAssumption = "Fitur minimum mencakup katalog produk, manajemen kategori, keranjang pesanan, dan log audit mutasi tanpa modul POS.";
      } else if (isStore) {
        projectName = "[PLATFORM E-COMMERCE & KATALOG PRODUK]";
        factCertainty = "Pengguna meminta sistem e-commerce web end-to-end dengan estetika antarmuka responsif.";
        smartAssumption = "Fitur minimum mencakup katalog produk, keranjang pesanan, dan verifikasi checkout atomik.";
      }

      return {
        contextParameters: {
          "Nama Proyek": projectName,
          "Tema Desain": "Premium Neumorphism / Soft UI (Raised, Inset, Level 0-3 Shadows)",
          "Platform Target": "Desktop, Tablet, dan Mobile Responsif",
          "Tech Stack": "Next.js App Router, TypeScript Strict, Tailwind CSS, PostgreSQL / SQLite",
          "Autentikasi & Otorisasi": "Session Management Aman & Role-Based Access Control",
          "Deployment Target": "Vercel / VPS Linux Cloud",
        },
        smartAssumptions: [
          `FAKTA PASTI: ${factCertainty}`,
          `ASUMSI CERDAS: ${smartAssumption}`,
          "KEPUTUSAN TERBUKA: Pemilihan gateway pembayaran atau integrasi layanan pihak ketiga akan ditentukan saat integrasi fase produksi.",
        ],
      };
    }

    case "business_manufacturing_industry":
      return {
        contextParameters: {
          "Komoditas Industri": "[PABRIK PENGOLAHAN KELAPA SAWIT (TBS MENJADI CPO)]",
          "Kapasitas Olah": "Unit Pengolahan Tandan Buah Segar (TBS) Berstandar Industri",
          "Tahapan Utama": "PenerimaanBahanBaku, SterilisasiUapPanas, PengepresanEkstraksi, PemurnianKlarifikasi, QualityControlLab, PenyimpananTangkiCPO",
          "Parameter Mutu": "Kadar Asam Lemak Bebas (ALB) < 3.5%, Kadar Air < 0.15%, Kadar Kotoran < 0.02%",
          "Standar Kepatuhan": "SOP Sanitasi Pabrik, Kalibrasi Mesin Tekanan Uap, Protokol K3 Industri",
        },
        smartAssumptions: [
          "FAKTA PASTI: Pengguna meminta perancangan SOP dan timeline operasional pengolahan kelapa sawit menjadi CPO berkualitas tinggi.",
          "ASUMSI CERDAS: Suhu rebusan sterilizer dan tekanan mesin screw press beroperasi stabil sesuai kapasitas terpasang.",
          "KEPUTUSAN TERBUKA: Pemanfaatan limbah padat (tandan kosong dan cangkang) sebagai bahan bakar boiler dioptimalkan secara bertahap.",
        ],
      };

    case "business_aquaculture_agri":
      return {
        contextParameters: {
          "Komoditas Budidaya": "[IKAN LELE SISTEM BIOFLOK TERPAL BUNDAR]",
          "Metode Budidaya": "Kultur Mikroorganisme Flok Probiotik Bacillus dengan Aerasi 24 Jam",
          "Siklus Operasional": "Target 90 Hari (Tebar Benih s/d Panen Bobot 8-10 Ekor/Kg)",
          "Struktur Biaya HPP": "Formula Matematis Riil [FORMULA_HPP_PER_KG = BiayaOperasional / TonasePanen]",
          "Target FCR": "Feed Conversion Ratio 0.9 - 1.1 dengan Manajemen Pakan Terjadwal",
          "Parameter Kualitas Air": "Dissolved Oxygen (DO) > 3.0 mg/L, pH 6.8 - 8.0, Volume Flok 15-25 ml/L",
        },
        smartAssumptions: [
          "FAKTA PASTI: Pengguna meminta rencana strategis dan SOP budidaya ikan lele sistem bioflok dari tebar benih hingga panen.",
          "ASUMSI CERDAS: Sumber listrik untuk aerator dan blower berjalan stabil tanpa jeda untuk menjaga bakteri heterotrof tetap aktif.",
          "KEPUTUSAN TERBUKA: Pemilihan pakan komersial pelet apung vs formulasi pakan mandiri dievaluasi berdasarkan rasio FCR aktual di kolam.",
        ],
      };

    case "business_food_beverage":
      return {
        contextParameters: {
          "Nama Produk": "[KOPI SUSU KEMASAN BOTOL SIAP MINUM (READY-TO-DRINK)]",
          "Model Bisnis": "Direct-to-Consumer (D2C) & Distribusi Konsinyasi Outlet Retail",
          "Target Peluncuran": "12 Minggu dari Nol hingga Distribusi Komersial Pertama",
          "Struktur Biaya": "Formula Matematis Riil [FORMULA_HPP_PER_BOTOL] dengan Pemisahan Mutlak vs Margin Laba",
          "Sertifikasi & Kepatuhan": "Izin Edar P-IRT / BPOM, Sertifikasi Halal, dan Standar Sanitasi Pangan",
        },
        smartAssumptions: [
          "FAKTA PASTI: Produk berupa minuman kemasan botol siap minum yang membutuhkan alur produksi terstandar.",
          "ASUMSI CERDAS: Umur simpan (shelf-life) ditargetkan teruji pada suhu chiller (2-4 derajat Celcius).",
          "KEPUTUSAN TERBUKA: Pemilihan kemasan botol dievaluasi berdasarkan sensitivitas harga pasar dan daya tahan segel.",
        ],
      };

    case "education_physics_circuits":
      return {
        contextParameters: {
          "Topik Pembelajaran": "Rangkaian Listrik Seri dan Paralel DC & Panduan Praktikum Sekolah",
          "Tingkat Pendidikan": "Siswa Sekolah Menengah (SMP / SMA Kelas XII)",
          "Alat & Bahan": "Baterai Kering DC, Kabel Penghubung Arus, Saklar Pemutus Sirkuit, Beban Lampu Bohlam, Voltmeter, Amperemeter",
          "Fokus Konsep": "Hukum Ohm V=IR, Karakteristik Kuat Arus dan Beda Potensial pada Jalur Seri vs Paralel",
          "Protokol Keselamatan": "Pencegahan Hubungan Singkat (Korsleting Baterai Langsung Tanpa Beban Lampu)",
        },
        smartAssumptions: [
          "FAKTA PASTI: Materi menjelaskan cara kerja rangkaian listrik seri dan paralel beserta panduan praktikum baterai dan bohlam.",
          "ASUMSI CERDAS: Siswa menggunakan sumber arus searah (DC) bertegangan rendah aman (1.5V - 9V) di bawah pengawasan instruktur.",
          "KEPUTUSAN TERBUKA: Komparasi hasil terang redupnya lampu bohlam dibuktikan secara kuantitatif melalui pembacaan multimeter.",
        ],
      };

    case "education_practical_experiment":
      return {
        contextParameters: {
          "Topik Pembelajaran": "Panduan Praktikum Kejuruan & Eksperimen Siswa (SOP & Observasi)",
          "Tingkat Pendidikan": "Siswa Sekolah Menengah Kejuruan (SMK / Vokasi)",
          "Fokus Pelaksanaan": "PersiapanAlatMedia, PerlakuanPraktikum, ObservasiBerkala, EvaluasiFaktorKesalahan, KompilasiDataHasil",
          "Standar Kepatuhan": "Protokol K3 Laboratorium Sekolah, Sanitasi Sterilisasi, Lembar Observasi Terverifikasi",
        },
        smartAssumptions: [
          "FAKTA PASTI: Pembelajaran mencakup prosedur praktikum langsung, sterilisasi alat/media, observasi harian, dan evaluasi hasil.",
          "ASUMSI CERDAS: Siswa melakukan pengujian mandiri di bawah bimbingan instruktur dengan protokol keselamatan terstandar.",
          "KEPUTUSAN TERBUKA: Pemilihan media pertumbuhan atau bahan uji disesuaikan dengan ketersediaan fasilitas laboratorium sekolah.",
        ],
      };

    case "education_biology_photosynthesis":
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
          "KEPUTUSAN TERBUKA: Variasi perlakuan cahaya disesuaikan dengan kondisi cuaca hari praktikum.",
        ],
      };

    case "research_marine_environmental":
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

    case "academic_technology_adoption":
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

    default:
      return {
        contextParameters: {
          "Subjek Proyek": prompt,
          "Domain": domain,
        },
        smartAssumptions: [
          `FAKTA PASTI: Pengguna menugaskan eksekusi ${prompt}.`,
          "ASUMSI CERDAS: Seluruh spesifikasi dieksekusi dengan standar kualitas profesional.",
        ],
      };
  }
}

function getPrimaryObjectives(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  audience: AudienceLevel
): string[] {
  switch (subtopic) {
    case "software_web3_defi":
      return [
        "1. Invariant Safety: Total pasokan token dalam brankas TokenVaultLedger selalu sama dengan jumlah posisi staking aktif ditambah reward yang belum diklaim.",
        "2. Anti-Reentrancy Guard: Seluruh fungsi state change (stake, withdraw, claim) terlindungi secara atomik oleh ReentrancyGuardShield.",
        "3. Checks-Effects-Interactions: Pembaruan internal state variabel wajib dieksekusi sebelum transfer token eksternal dipicu.",
        "4. Precise Penalty Calculation: Penalti unstake dini dihitung secara proporsional presisi hingga satuan basis points (bips) terkecil.",
        "5. No Fake Authorization: Menolak penggunaan tx.origin dan mewajibkan otorisasi ketat berbasis msg.sender.",
        "6. Gas Optimization: Penggunaan struktur data hemat storage dan pengelompokan variabel (storage packing) yang efisien.",
        "7. Emergency Stop: Memiliki mekanisme pause darurat multi-sig yang dapat menghentikan deposit saat anomali terdeteksi.",
        "8. 100% Branch Test Coverage: Seluruh skenario batas (boundary conditions, early penalty, zero balance) teruji oleh automated suite.",
      ];

    case "software_iot_telemetry":
      return [
        "1. High-Throughput Stream Ingestion: Mampu menyerap ribuan stream metrik sensor telemetri per detik dengan latensi minimal.",
        "2. Strict Integrity Checksum: Memvalidasi keabsahan paket data sensor sebelum disimpan ke tabel time-series.",
        "3. Anomaly & Incident Detection: Memiliki filter pendeteksi lonjakan ambang batas ekstrem yang dapat memicu sinyal peringatan darurat seketika.",
        "4. Partitioned Time-Series Storage: Penyimpanan data metrik terpartisi per rentang waktu guna menjamin query analitik tetap kilat.",
        "5. Offline Buffering Resiliency: Menjamin perangkat IoT/satelit memiliki buffer penyimpanan lokal saat koneksi terputus.",
        "6. Granular Device Registry: Mencatat status operasional, tipe sensor, dan riwayat kesehatan node perangkat secara real-time.",
        "7. Transport Layer Security: Mengamankan komunikasi data sensor menggunakan enkripsi TLS/mTLS standar industri.",
        "8. Automated Audit Logging: Mencatat anomali, eror transmisi, dan kejadian kritis ke dalam log audit permanen.",
      ];

    case "software_medical_clinic":
      return [
        "1. Confidential Patient Data Privacy: Menjaga kerahasiaan riwayat medis pasien dengan enkripsi data sensitif (at-rest & in-transit).",
        "2. Seamless Clinical Workflow: Alur pendaftaran, triase awal, penanganan dokter, dan verifikasi apotek terhubung tanpa redundansi.",
        "3. Standardized Diagnosis Coding: Mengintegrasikan koding penyakit standar ICD-10 untuk akurasi pencatatan rekam medis.",
        "4. Safe Prescription Engine: Sistem peringatan dosis obat dan kontraindikasi otomatis saat dokter menerbitkan resep.",
        "5. Strict Role-Based Access Control (RBAC): Hak akses rekam medis dipisahkan secara ketat antara dokter, perawat, dan staf kasir.",
        "6. Immutable Medical Audit Trail: Setiap pembacaan, pembuatan, atau pembaruan rekam medis dicatat permanen dalam log audit.",
        "7. Instant Queue Synchronization: Antrean poli dokter terbarukan secara otomatis secara real-time.",
        "8. Reliable Clinical Data Backup: Cadangan data rekam medis terenkripsi otomatis harian dengan skenario pemulihan bencana.",
      ];

    case "software_personal_portfolio":
      return [
        "1. Tactile Neumorphic Visuals: Menampilkan estetika modern Neumorphism dengan bayangan terukur dan hierarki visual yang elegan.",
        "2. Interactive Project Showcase: Memudahkan calon klien atau perekrut mengeksplorasi portofolio proyek berdasarkan kategori keahlian.",
        "3. Spam-Proof Contact Form: Formulir kontak terlindungi dari bot spam menggunakan Turnstile atau honeypot tanpa merusak UX pengunjung.",
        "4. Blazing Fast Page Load: Memenuhi standar Core Web Vitals dengan performa loading instan (LCP < 1.2 detik).",
        "5. Full Responsive Multi-Device: Tampilan tetap proporsional dan responsif dari layar smartphone hingga monitor desktop 4K.",
        "6. High Accessibility (WCAG 2.2 AA): Kontras warna teks dan elemen navigasi ramah bagi semua pengguna termasuk disabilitas visual.",
        "7. Instant Lead Notification: Pesan kontak yang masuk segera diteruskan ke notifikasi email atau Telegram pengembang secara real-time.",
        "8. Production Clean Code: Dibangun menggunakan TypeScript modular tanpa library berat yang memperlambat rendering.",
      ];

    case "business_manufacturing_industry":
      return [
        "1. Zero Fake Industrial Metrics: Target rendemen CPO, kapasitas olah TBS, dan konsumsi energi dihitung berdasarkan formula teknik pabrik nyata.",
        "2. Optimal Quality Control: Kadar Asam Lemak Bebas (ALB) dijaga di bawah ambang batas standar mutu ekspor (< 5.0%).",
        "3. Minimasi Kehilangan Minyak (Oil Loss): Menekan kehilangan minyak pada ampas press dan air buangan kondensat serendah mungkin.",
        "4. Strict Maintenance Schedule: Kalibrasi mesin rebusan sterilizer, thresher, dan screw press secara disiplin sesuai jadwal Gantt Chart.",
        "5. Continuous Temperature Control: Menjaga kestabilan suhu tangki timbun CPO pada rentang 45-55°C guna mencegah pengendapan asam stearat.",
        "6. Zero Liquid Waste Leakage: Kolam pengolahan limbah cair (IPAL) dikelola ketat agar memenuhi baku mutu lingkungan hidup.",
        "7. Keselamatan Kerja Pabrik (K3): Menegakkan standar keselamatan kerja operasional alat berat dan boiler uap bertekanan tinggi.",
        "8. Akurasi Penimbangan & Logistik: Mencegah selisih tonase antara jembatan timbang penerimaan TBS dan tangki pengapalan komersial.",
      ];

    case "education_practical_experiment":
      return [
        "1. Kepatuhan K3 Laboratorium: Seluruh tahapan praktikum menjamin keamanan fisik siswa dan bebas dari bahan kimia berbahaya tak terkontrol.",
        "2. Prosedur Ilmiah Terstandar: Modul memberikan panduan langkah demi langkah mulai dari persiapan media, inokulasi, hingga pengamatan.",
        "3. Pembuktian Empiris Teramati: Siswa dapat mengukur dan mendokumentasikan fenomena pertumbuhan atau reaksi secara kuantitatif.",
        "4. Lembar Observasi Mandiri: Format tabel pengamatan harian dirancang ringkas, mudah diisi, dan memicu ketelitian siswa.",
        "5. Analisis Faktor Kegagalan: Siswa diajak berpikir kritis menganalisis penyebab jika terjadi kontaminasi atau anomali pada sampel praktikum.",
        "6. Kerja Sama & Kolaborasi: Panduan mendukung pembagian peran yang adil dan kolaboratif antar anggota kelompok belajar.",
        "7. Penguatan Pemahaman Konsep: Mengaitkan data hasil eksperimen nyata dengan teori sains mendasar dalam buku pelajaran kejuruan.",
        "8. Standar Penyusunan Laporan Ilmiah: Membiasakan siswa menyusun laporan berformat baku yang siap dipresentasikan di depan kelas.",
      ];

    case "business_aquaculture_agri":
      return [
        "1. Zero Fake Financials: Seluruh estimasi modal, pakan, dan HPP dihitung menggunakan formula matematis riil tanpa angka karangan.",
        "2. Ekosistem Flok Stabil: Menjaga rasio C:N > 10:1 menggunakan molase dan bakteri Bacillus agar amonia air terkontrol sempurna.",
        "3. Kualitas Oksigen Terlarut: Menjamin DO air konsisten di atas 3.0 mg/L dengan operasional aerasi nonstop 24 jam.",
        "4. Efisiensi Pakan (FCR): Mencapai target FCR pakan pelet antara 0.9 hingga 1.1 untuk memaksimalkan margin keuntungan.",
        "5. Kelangsungan Hidup Tinggi (SR): Menargetkan Survival Rate ikan lele di atas 85% melalui karantina benih dan penyortiran ukuran berkala.",
        "6. Disiplin Pemisahan Keuangan: Menjaga pembukuan kas operasional tambak terpisah total dari rekening keluarga.",
        "7. Penanganan Limbah Ramah Lingkungan: Memanfaatkan endapan flok buangan dasar kolam (central drain) sebagai pupuk organik tanaman.",
        "8. Standar Mutu Panen: Memastikan ikan bebas bau lumpur dan memiliki ukuran seragam sesuai permintaan pasar konsumsi.",
      ];

    case "education_physics_circuits":
      return [
        "1. Kejelasan Konsep Arus & Hambatan: Menjelaskan perbedaan mendasar rangkaian seri (arus sama) dan paralel (tegangan sama) dengan analogi visual pipa air.",
        "2. Eksperimen Aman Tanpa Korsleting: Prosedur praktikum dirancang bebas risiko kebakaran baterai dengan proteksi beban lampu bohlam.",
        "3. Pembuktian Nyata Teramati: Siswa dapat mengamati langsung perbedaan tingkat terang nyala lampu bohlam antara konfigurasi seri dan paralel.",
        "4. Penerapan Hukum Ohm: Menghubungkan perhitungan matematis V=IR dengan hasil pengukuran voltmeter dan amperemeter di laboratorium.",
        "5. Berpikir Kritis Siswa: Mengajak siswa memecahkan masalah: apa yang terjadi jika salah satu lampu dalam rangkaian seri atau paralel dilepas.",
        "6. Lembar Kerja Praktikum Terstruktur: Menyediakan tabel pencatatan data eksperimen yang mudah diisi selama jam pelajaran.",
        "7. Refleksi & Kuis Pemahaman: Dilengkapi evaluasi formatif untuk menguji daya ingat logika sirkuit listrik.",
        "8. Disiplin Prosedural Laboratorium: Menanamkan kebiasaan memutus saklar dan melepas baterai setelah selesai praktikum.",
      ];

    case "business_food_beverage":
      return [
        "1. Pemisahan HPP vs Margin: Menghitung harga pokok produksi per botol secara presisi menggunakan formula biaya bahan baku dan kemasan.",
        "2. Standar Kualitas Pangan Konsisten: Formulasi rasa, derajat keasaman (pH), dan kadar manis (Brix) terkontrol ketat.",
        "3. Kepatuhan Regulasi Pangan: Memenuhi kelayakan izin edar P-IRT/BPOM, higienitas sanitasi, dan sertifikasi Halal.",
        "4. Standard Operating Procedure (SOP) Jelas: Setiap langkah produksi dan penyimpanan memiliki checklist penanggung jawab.",
        "5. Efisiensi Rantai Pasok: Mencegah overstock bahan baku segar dan mengoptimalkan perputaran persediaan.",
        "6. Disiplin Eksekusi Timeline: Memastikan peluncuran produk tepat waktu sesuai jadwal Gantt Chart 12 minggu.",
        "7. Mitigasi Risiko Finansial: Menetapkan titik impas (Break-Even Point) dan skenario proteksi arus kas operasional.",
        "8. Metrik Keberhasilan Terukur: Pelacakan Key Performance Indicators (KPI) volume penjualan dan repeat order.",
      ];

    case "education_biology_photosynthesis":
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

    case "research_marine_environmental":
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

    case "academic_technology_adoption":
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

    default:
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
  }
}

function getCoreSpecification(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  audience: AudienceLevel
): string {
  switch (subtopic) {
    case "software_web3_defi":
      return `### SPESIFIKASI ARSITEKTUR SMART CONTRACT & KEAMANAN DEFI
1. **Arsitektur Kontrak Solidity & State Machine:**
   - Compiler & Bahasa: Solidity versi ^0.8.20 dengan optimizer aktif (200 runs)
   - Standar Antarmuka: IERC20 dengan pembungkus SafeERC20 untuk menangani token non-standar
   - Struktur Data & Penyimpanan:
     - StakerAccount: mapping(address => StakerInfo) mencatat saldo total dan status
     - StakingPoolContract: Mengelola poolAddress, stakingTokenAddress, totalPoolDeposits, dan earlyPenaltyBasisPoints
     - DepositPosition: mapping(uint256 => DepositInfo) mencatat principalAmount, depositTimestamp, unlockTimestamp, dan status hasWithdrawn
     - RewardDistribution: Perhitungan reward terakumulasi berdasarkan laju blok (rewardRatePerBlock)
     - EarlyUnstakePenalty: Pencatatan potongan penalti unstake dini yang dialokasikan ke treasury atau di-burn
     - TokenVaultLedger: Brankas penyimpan saldo token terkunci dan cadangan reward
     - ReentrancyGuardShield: Mutex slot uint256 private _status untuk mencegah eksekusi rekursif
2. **Formula Penalti Unstake Dini & Unit Economics (Transparan):**
   - Formula Penalti:
     Jika (block.timestamp < unlockTimestamp):
     Penalti = principalAmount * (earlyPenaltyBasisPoints / 10000) * (sisaWaktuKunci / totalDurasiKunci)
     Dana Bersih Diterima Staker = principalAmount - Penalti
     Alokasi Penalti: Ditransfer ke Treasury Pool atau di-Burn sesuai parameter tata kelola
3. **Protokol Keamanan & Anti-Reentrancy Mutlak:**
   - Penerapan modifier nonReentrant pada seluruh fungsi mutatif (stake, withdraw, claimReward)
   - Disiplin Checks-Effects-Interactions: Mutasi state lokal (saldo posisi dan timestamp) WAJIB dieksekusi SEBELUM token eksternal ditransfer keluar
   - Larangan tx.origin: Seluruh verifikasi otorisasi wajib menggunakan msg.sender
   - Proteksi Mutlak: DILARANG membuat modul POS/Kasir atau komponen toko ritel yang tidak relevan`;

    case "business_aquaculture_agri":
      return `### TATA KELOLA OPERASIONAL BIOFLOK & MODEL BIAYA TRANSPARAN
1. **Parameter Teknis & Manajemen Kualitas Air:**
   - Konstruksi: Kolam terpal bundar (Diameter D3/D4) dilengkapi saluran pembuangan tengah (central drain)
   - Aerasi: Blower/aerator continuous 24 jam dengan batu aerasi uniring menjaga Dissolved Oxygen (DO) > 3.0 mg/L
   - Kultur Flok: Inokulasi bakteri probiotik Bacillus subtilis, molase tetes tebu (rasio C:N > 10:1), dan garam krosok
   - Pengukuran Flok: Volume flok terkontrol pada rentang 15-25 ml/L menggunakan kerucut Imhoff
2. **Manajemen Pakan & Feeding Rate:**
   - Pakan Starter: Pelet protein tinggi (38-40%) untuk fase benih (ukuran 5-7 cm)
   - Pakan Grower: Pelet protein 30-32% diberikan 3-4 kali sehari dengan feeding rate 3-5% dari biomassa
   - Target Feed Conversion Ratio (FCR): 0.9 - 1.1
3. **Model Finansial & Formula HPP Transparan (Zero Fake Numbers):**
   - Biaya Variabel = [BIAYA_BENIH] + [BIAYA_PAKAN_FCR] + [BIAYA_PROBIOTIK_MOLASE] + [BIAYA_LISTRIK_AERASI] + [BIAYA_TENAGA_KERJA]
   - Estimasi Tonase Panen = ([JUMLAH_BENIH_TEBAR] * [SURVIVAL_RATE_SR_%]) / [JUMLAH_EKOR_PER_KG]
   - Formula HPP per Kg = Total Biaya Operasional Riil / Estimasi Tonase Panen (Kg)
   - Formula Penetapan Harga Jual = HPP per Kg * (1 + [TARGET_MARGIN_LABA_%])`;

    case "education_physics_circuits":
      return `### MODEL MENTAL, HUKUM KELISTRIKAN & PANDUAN PRAKTIKUM SEKOLAH
1. **Model Mental & Analogi Aliran Air:**
   - Sumber Tegangan Baterai = Pompa air yang menciptakan tekanan beda potensial.
   - Kabel Penghubung = Pipa air penghantar arus.
   - Saklar = Kran pembuka dan penutup aliran air.
   - Beban Lampu Bohlam = Kincir air (resistor hambatan) yang menyala saat dilewati aliran air listrik.
2. **Prinsip Fisika & Hukum Ohm:**
   - Hukum Ohm: V = I * R (Tegangan = Kuat Arus * Hambatan)
   - Karakteristik Rangkaian Seri: Arus sama di setiap titik (I_total = I_1 = I_2), Tegangan terbagi (V_total = V_1 + V_2), Hambatan bertambah (R_total = R_1 + R_2). Jika satu lampu putus, seluruh rangkaian padam.
   - Karakteristik Rangkaian Paralel: Tegangan sama di setiap cabang (V_total = V_1 = V_2), Arus terbagi (I_total = I_1 + I_2), Hambatan berkurang (1/R_total = 1/R_1 + 1/R_2). Jika satu lampu putus, lampu cabang lain tetap menyala.
3. **Protokol Keselamatan Praktikum di Laboratorium:**
   - DILARANG menghubungkan kutub positif dan negatif baterai secara langsung tanpa ada beban lampu atau resistor (mencegah hubungan pendek / korsleting dan baterai panas).
   - Saklar wajib dalam kondisi terbuka (OFF) saat siswa merangkai kabel dan komponen.
   - Selalu lepas baterai dari dudukannya setelah pengamatan selesai.`;

    case "business_food_beverage":
      return `### TATA KELOLA OPERASIONAL & SPESIFIKASI FORMULASI PRODUK
1. **Formulasi Produk Minuman Kemasan:**
   - Komposisi Terstandar: Rasio Ekstraksi Kopi Cold Brew 1:8, Susu Segar Pasteurisasi, Gula Aren Organik
   - Parameter Kontrol Mutu: Kadar Manis 9-11 Brix, pH Keasaman 5.8-6.2, Suhu Pengisian Maksimal 10 Derajat Celcius
2. **Struktur Biaya & Formula HPP Transparan (Zero Fake Numbers):**
   - Komponen Biaya = [BIAYA_BAHAN_BAKU] + [BIAYA_KEMASAN_DAN_BOTOL] + [BIAYA_TENAGA_KERJA_DAN_ENERGI]
   - Formula HPP per Botol = Total Biaya Produksi Batch / Total Unit Botol Jadi
   - Formula Harga Jual = HPP per Botol * (1 + [TARGET_MARGIN_KOTOR_%])`;

    case "education_biology_photosynthesis":
      return `### MODEL MENTAL & PANDUAN KONSEP KUNCI FOTOSINTESIS
1. **Analogi Pabrik Tenaga Surya:**
   - Klorofil (Daun) = Panel surya yang menyerap energi foton cahaya matahari.
   - Reaksi Terang (Tilakoid) = Mesin pemecah air (H2O) menghasilkan gas oksigen dan mengisi baterai kimia (ATP & NADPH).
   - Reaksi Gelap / Siklus Calvin (Stroma) = Dapur sintesis yang mencampurkan karbon dioksida (CO2) dengan energi baterai menjadi gula glukosa (C6H12O6).
2. **Prosedur Praktikum Ingenhousz yang Aman:**
   - Masukkan tanaman Hydrilla ke dalam corong kaca terbalik di dalam gelas piala berisi air.
   - Tutup ujung pipa corong dengan tabung reaksi terisi air penuh tanpa gelembung awal.
   - Bandingkan jumlah gelembung udara yang terbentuk antara perlakuan tempat teduh vs tempat disinari cahaya matahari.`;

    case "research_marine_environmental":
      return `### SPESIFIKASI METODOLOGI & KERANGKA ANALITIS RISET
1. **Desain Pengambilan Sampel & Kontrol:**
   - Sampling Intertidal: Metode transek garis kuadrat pada kedalaman sedimen 0-5 cm
   - Replikasi: 3 titik stasiun pengamatan dengan masing-masing 5 sub-sampel acak
   - Kontrol Udara (Procedural Blank): Cawan petri terbuka berisi filter ultra-murni untuk mengukur background contamination
2. **Karakterisasi Partikel Spektroskopi:**
   - Instrumen: Fourier Transform Infrared Spectroscopy (µ-FTIR) dengan mode ATR
   - Resolusi Spektra: 4 cm-1 dengan rentang bilangan gelombang 4000-600 cm-1
   - Kriteria Identifikasi: Koefisien kecocokan pustaka (Hit Quality Index) > 85% untuk polimer PP, PE, dan PET`;

    case "academic_technology_adoption":
      return `### KERANGKA PEMIKIRAN TEORITIS & SPESIFIKASI PENGUKURAN
1. **Konseptualisasi Variabel (Model TAM & UTAUT):**
   - Variabel Independen X1 (Persepsi Kemudahan): 4 indikator (Mudah dipelajari, fleksibel, jelas, efisien)
   - Variabel Independen X2 (Persepsi Manfaat): 4 indikator (Meningkatkan efisiensi, akurasi, profitabilitas)
   - Variabel Dependen Y (Niat Adopsi AI): 3 indikator (Rencana penggunaan, frekuensi, rekomendasi ke mitra)
2. **Prosedur Pengolahan Statistik:**
   - Skala Pengukuran: Skala Likert 1-5 (Sangat Tidak Setuju hingga Sangat Setuju)
   - Batas Kelayakan Instrumen: r-hitung > r-tabel (Validitas) dan Cronbach Alpha > 0.70 (Reliabilitas)
   - Uji Asumsi Klasik: Uji Kolmogorov-Smirnov (Normalitas) dan VIF < 10 (Bebas Multikolinieritas)`;

    default:
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
  }
}

function getExecutionPhases(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  diagrams: DiagramSpecification[],
  audience: AudienceLevel
): ExecutionPhase[] {
  switch (subtopic) {
    case "software_web3_defi":
      return [
        {
          phaseNumber: 0,
          name: "DeFi Protocol Architecture & Invariant Modeling",
          tasks: [
            "Analisis spesifikasi staking pool, rasio token, dan formula early unstake penalty.",
            "Definisikan invariant keamanan: perlindungan vault dan kalkulasi pembagian reward per blok.",
            "Petakan model akun staker (StakerAccount) dan otorisasi nonReentrant.",
          ],
          deliverables: ["PROTOCOL_SPEC.md", "INVARIANT_RULES.md", "MATH_MODELS.md"],
        },
        {
          phaseNumber: 1,
          name: "Smart Contract State Design & Entity Modeling",
          tasks: [
            "Rancang struktur data Solidity: StakerAccount, StakingPoolContract, DepositPosition, RewardDistribution, EarlyUnstakePenalty, TokenVaultLedger, dan ReentrancyGuardShield sesuai diagram ERD.",
            "Terapkan interface IERC20 dan SafeERC20 untuk operasi brankas TokenVaultLedger yang aman.",
            "Rancang alur mutasi fungsi staking dan penalti unstake sesuai diagram Flowchart.",
          ],
          deliverables: ["STAKING_CONTRACT_SCHEMA.sol", "STATE_VARIABLES.md", "EVENT_DEFINITIONS.sol"],
        },
        {
          phaseNumber: 2,
          name: "Solidity Implementation & Anti-Reentrancy Guard",
          tasks: [
            "Implementasikan kontrak staking pool lengkap dengan modifier ReentrancyGuardShield nonReentrant.",
            "Terapkan pola Checks-Effects-Interactions secara ketat pada fungsi withdraw dan claim reward.",
            "Tuliskan fungsi kalkulasi potongan EarlyUnstakePenalty berbasis basis points.",
          ],
          deliverables: ["StakingPool.sol", "EarlyPenaltyLib.sol", "ReentrancyGuardShield.sol"],
        },
        {
          phaseNumber: 3,
          name: "Unit Testing & Fuzz Testing Suite",
          tasks: [
            "Bangun test suite automated (Hardhat/Foundry) untuk skenario deposit, reward accumulation, dan penalti dini.",
            "Jalankan fuzz testing terhadap manipulasi timestamp blok dan overflow kalkulasi token.",
            "Verifikasi isolasi saldo brankas TokenVaultLedger terhadap request ganda tak sah.",
          ],
          deliverables: ["TEST_STAKING_POOL.ts", "FUZZ_INVARIANTS.sol", "GAS_REPORT.json"],
        },
        {
          phaseNumber: 4,
          name: "Security Audit & Vulnerability Scanning",
          tasks: [
            "Audit keamanan celah reentrancy (Cross-function dan Read-only reentrancy).",
            "Verifikasi larangan penggunaan tx.origin dan pastikan hanya msg.sender yang diotorisasi.",
            "Jalankan analisis statis menggunakan Slither dan mythril untuk menjamin zero critical bugs.",
          ],
          deliverables: ["SECURITY_AUDIT_REPORT.md", "SLITHER_REPORT.json", "AUDIT_CHECKLIST.md"],
        },
        {
          phaseNumber: 5,
          name: "Testnet Deployment & Operational Runbook",
          tasks: [
            "Deploy kontrak ke testnet EVM dan verifikasi kode sumber di block explorer.",
            "Siapkan multi-sig tim untuk kepemilikan admin dan mekanisme emergency pause.",
            "Finalisasi dokumentasi integrasi API frontend Web3 untuk dApp staking.",
          ],
          deliverables: ["DEPLOYMENT_ADDRESSES.json", "RUNBOOK.md", "WEB3_SDK_GUIDE.md"],
        },
      ];

    case "software_iot_telemetry":
      return [
        {
          phaseNumber: 0,
          name: "IoT Telemetry Architecture & Ingestion Design",
          tasks: [
            "Analisis spesifikasi hardware node, frekuensi sampling sensor, dan kapasitas throughput jaringan.",
            "Definisikan protokol komunikasi (MQTT/gRPC) dan aturan deteksi ambang batas anomali kritis.",
            "Petakan model registrasi perangkat DeviceNode dan penanganan latency buffering.",
          ],
          deliverables: ["IOT_ARCHITECTURE.md", "TELEMETRY_SPEC.md", "BANDWIDTH_BUDGET.xlsx"],
        },
        {
          phaseNumber: 1,
          name: "Data Model & Schema Engineering",
          tasks: [
            "Rancang skema database time-series: DeviceNode, SensorTelemetry, TelemetryAlert, dan TelemetryLog sesuai diagram ERD.",
            "Terapkan retensi data otomatis dan partisi time-bucket untuk efisiensi query analitik.",
            "Implementasikan alur validasi sinyal: SinyalSensor, ValidasiIntegritas, DeteksiAmbangBatas, PenyimpananTimeSeries, KirimPeringatanAlert sesuai diagram Flowchart.",
          ],
          deliverables: ["TIMESERIES_SCHEMA.sql", "DEVICE_REGISTRY.json", "ALERT_RULES.yaml"],
        },
        {
          phaseNumber: 2,
          name: "Ingestion Engine & Anomaly Detection Pipeline",
          tasks: [
            "Bangun stream ingestion pipeline berlatensi rendah dengan decoding paket binary/JSON.",
            "Terapkan algoritma deteksi lonjakan ekstrem dan filter noise sensor.",
            "Integrasikan sistem antrean pesan aman untuk dispatch notifikasi darurat.",
          ],
          deliverables: ["INGESTION_SERVICE.ts", "ANOMALY_DETECTOR.ts", "ALERT_DISPATCHER.ts"],
        },
        {
          phaseNumber: 3,
          name: "Dashboard & Real-time Visualization",
          tasks: [
            "Kembangkan dashboard visual pemantauan status node dan grafik metrik sensor real-time.",
            "Terapkan WebSockets untuk streaming metrik tanpa polling berlebihan.",
            "Sediakan panel administrasi manajemen perangkat dan threshold tuning.",
          ],
          deliverables: ["DASHBOARD_UI/", "WEBSOCKET_STREAM.ts", "ALERT_PANEL.tsx"],
        },
        {
          phaseNumber: 4,
          name: "Simulation, Stress Testing & Hardware-in-the-Loop",
          tasks: [
            "Jalankan simulasi 10.000 paket sensor per detik untuk menguji ketahanan antrean sistem.",
            "Simulasikan kegagalan jaringan dan verifikasi mekanisme offline buffering lokal.",
            "Uji responsivitas pengiriman sinyal peringatan bahaya di bawah beban puncak.",
          ],
          deliverables: ["LOAD_TEST_REPORT.json", "FAILOVER_LOG.md", "BENCHMARK_CHART.png"],
        },
        {
          phaseNumber: 5,
          name: "Deployment, Fleet Provisioning & Monitoring",
          tasks: [
            "Deploy layanan ingest ke cluster cloud dan konfigurasikan certificate TLS untuk tiap node.",
            "Siapkan alerting dashboard untuk tim operasional dan runbook penanganan insiden.",
            "Dokumentasikan panduan integrasi firmware sensor untuk teknisi lapangan.",
          ],
          deliverables: ["DEPLOYMENT_CONFIG.yaml", "FIELD_MANUAL.pdf", "OPERATIONAL_RUNBOOK.md"],
        },
      ];

    case "software_medical_clinic":
      return [
        {
          phaseNumber: 0,
          name: "Healthcare Workflow & Compliance Scoping",
          tasks: [
            "Analisis alur perjalanan pasien, triase perawat, tindakan dokter, dan verifikasi apotek.",
            "Petakan kepatuhan privasi data medis (Kerahasiaan Rekam Medis) dan standar audit logging.",
            "Definisikan standarisasi koding diagnosis menggunakan referensi ICD-10.",
          ],
          deliverables: ["CLINICAL_WORKFLOW.md", "COMPLIANCE_CHECKLIST.md", "DATA_GOVERNANCE.pdf"],
        },
        {
          phaseNumber: 1,
          name: "Medical Relational Schema & Access Control",
          tasks: [
            "Rancang skema database rekam medis: Pasien, Dokter, JanjiKonsultasi, RekamMedis, ResepObat sesuai diagram ERD.",
            "Terapkan enkripsi kolom sensitif (data identitas dan riwayat medis pasien).",
            "Petakan alur kerja klinis: RegistrasiPasien, TriasePemeriksaanAwal, KonsultasiTindakanDokter, PencatatanRekamMedis, VerifikasiResepApotek sesuai diagram Flowchart.",
          ],
          deliverables: ["HEALTHCARE_SCHEMA.prisma", "SECURITY_ROLES.yaml", "MIGRATION_PLAN.md"],
        },
        {
          phaseNumber: 2,
          name: "Clinical Portal & EMR Management Development",
          tasks: [
            "Implementasikan modul registrasi pasien dan antrean poli dokter interaktif.",
            "Bangun antarmuka lembar rekam medis elektronik (EMR) yang intuitif dan cepat diinput dokter.",
            "Sediakan modul e-prescribing dengan validasi dosis otomatis untuk apoteker.",
          ],
          deliverables: ["EMR_INTERFACES/", "PRESCRIPTION_ENGINE.ts", "QUEUE_MANAGER.tsx"],
        },
        {
          phaseNumber: 3,
          name: "Security Auditing & Audit Trail Implementation",
          tasks: [
            "Implementasikan immutable audit log untuk setiap pembacaan dan pengeditan riwayat pasien.",
            "Lakukan pengujian penetrasi terhadap otorisasi peran (pencegahan eskalasi hak akses).",
            "Verifikasi kepatuhan masa retensi rekam medis digital sesuai regulasi pelayanan kesehatan.",
          ],
          deliverables: ["AUDIT_TRAIL.ts", "PENETRATION_TEST_REPORT.md", "RBAC_TESTS.ts"],
        },
        {
          phaseNumber: 4,
          name: "Clinical User Testing & Training Simulation",
          tasks: [
            "Jalankan uji coba simulasi alur pasien bersama staf administrasi, perawat, dan dokter.",
            "Optimalkan kecepatan respons antarmuka pada skenario antrean ramai.",
            "Susun panduan ringkas operasional (SOP Digital) untuk staf klinik.",
          ],
          deliverables: ["UAT_REPORT.md", "USER_MANUAL.pdf", "QUICK_START_CARD.png"],
        },
        {
          phaseNumber: 5,
          name: "Production Go-Live & Disaster Recovery Setup",
          tasks: [
            "Deploy aplikasi ke cloud berstandar keamanan data medis dengan backup harian otomatis.",
            "Siapkan konfigurasi disaster recovery dan prosedur ekspor data darurat terenkripsi.",
            "Pantau log transaksi hari pertama untuk memastikan zero downtime pelayanan pasien.",
          ],
          deliverables: ["RUNBOOK_OPS.md", "BACKUP_VERIFICATION.json", "GO_LIVE_SIGNOFF.pdf"],
        },
      ];

    case "software_personal_portfolio":
      return [
        {
          phaseNumber: 0,
          name: "Branding, Content Strategy & Information Architecture",
          tasks: [
            "Identifikasi positioning profesional, keahlian utama, dan kurasi showcase proyek unggulan.",
            "Susun struktur sitemap navigasi dan wireframe responsif (mobile-first).",
            "Definisikan tone of voice dan narasi portofolio yang berbobot kredibel.",
          ],
          deliverables: ["CONTENT_OUTLINE.md", "SITEMAP.md", "WIREFRAMES.fig"],
        },
        {
          phaseNumber: 1,
          name: "Portfolio Data Model & Interaction Flow",
          tasks: [
            "Rancang skema relasional: ProfilPengembang, KeahlianTeknis, KatalogProyek, dan PesanKontakMasuk sesuai diagram ERD.",
            "Petakan alur navigasi pengunjung: EksplorasiShowcase, FilterKategoriProyek, FormulirKontak, ValidasiAntiSpam, PengirimanNotifikasi sesuai diagram Flowchart.",
            "Siapkan database lokal SQLite WAL untuk performa akses kilat.",
          ],
          deliverables: ["PORTFOLIO_SCHEMA.prisma", "SEED_DATA.json", "INTERACTION_FLOW.md"],
        },
        {
          phaseNumber: 2,
          name: "Neumorphic Design System & Component Library",
          tasks: [
            "Terapkan palet warna Neumorphism soft-shadow dan micro-interactions tactile.",
            "Bangun komponen kartu proyek elevated, badge keahlian inset, dan modal detail interaktif.",
            "Jamin aksesibilitas kontras teks sesuai standar WCAG 2.2 AA.",
          ],
          deliverables: ["DESIGN_SYSTEM.md", "tailwind.config.ts", "UI_COMPONENTS/"],
        },
        {
          phaseNumber: 3,
          name: "Frontend Development & Contact Security",
          tasks: [
            "Implementasikan halaman showcase proyek dengan filter kategori dinamis tanpa reload.",
            "Bangun formulir kontak aman yang dilengkapi proteksi Turnstile / honeypot anti-spam.",
            "Integrasikan webhook dispatch pengiriman notifikasi instan saat ada pesan baru.",
          ],
          deliverables: ["APP_PAGES/", "CONTACT_API.ts", "SPAM_SHIELD.ts"],
        },
        {
          phaseNumber: 4,
          name: "Performance Tuning, SEO & Cross-Device QA",
          tasks: [
            "Optimalkan Core Web Vitals (LCP < 1.2s, CLS = 0, FID < 100ms) dan kompresi aset gambar.",
            "Terapkan OpenGraph tags, JSON-LD schema, dan sitemap XML untuk optimasi SEO.",
            "Uji tampilan pada resolusi smartphone, tablet, laptop, dan monitor ultrawide.",
          ],
          deliverables: ["LIGHTHOUSE_REPORT.json", "SEO_TAGS.html", "RESPONSIVE_QA.md"],
        },
        {
          phaseNumber: 5,
          name: "Vercel / VPS Deployment & Analytics",
          tasks: [
            "Deploy ke platform hosting edge dengan SSL otomatis dan CDN global.",
            "Konfigurasikan custom domain DNS dan monitoring uptime.",
            "Finalisasi dokumentasi perawatan dan prosedur penambahan proyek baru.",
          ],
          deliverables: ["DEPLOYMENT_INFO.md", "DNS_RECORDS.txt", "MAINTENANCE_GUIDE.md"],
        },
      ];

    case "business_manufacturing_industry":
      return [
        {
          phaseNumber: 0,
          name: "Perencanaan Kapasitas Pabrik & Studi Kelayakan Bahan Baku",
          tasks: [
            "Analisis kapasitas olah pabrik per jam dan proyeksi pasokan Tandan Buah Segar (TBS).",
            "Susun estimasi biaya operasional pabrik, bahan bakar boiler, dan target rendemen CPO.",
            "Definisikan parameter standar mutu CPO komersial (Kadar ALB, Air, dan Kotoran).",
          ],
          deliverables: ["STUDI_KELAYAKAN_PABRIK.xlsx", "TARGET_RENDEMEN_CPO.pdf", "RENCANA_BIAYA_OLAH.xlsx"],
        },
        {
          phaseNumber: 1,
          name: "Penerimaan TBS & Kalibrasi Mesin Pra-Proses",
          tasks: [
            "Laksanakan PenerimaanBahanBaku: penimbangan tonase truk dan sortasi mutu fraksi kematangan buah.",
            "Lakukan KalibrasiMesinPabrik: uji tekanan sterilizer uap dan putaran mesin thresher pemipil.",
            "Pastikan sistem logistik stasiun penerimaan berjalan tanpa penumpukan buah mentah.",
          ],
          deliverables: ["SOP_PENERIMAAN_TBS.md", "LOGBOOK_TIMBANGAN.csv", "CHECKLIST_KALIBRASI_MESIN.md"],
        },
        {
          phaseNumber: 2,
          name: "Sterilisasi Uap & Ekstraksi Screw Press",
          tasks: [
            "Jalankan SterilisasiUapPanas: rebusan uap bertekanan untuk menghentikan kenaikan asam lemak bebas.",
            "Eksekusi PengepresanEkstraksi: perasan mekanik screw press memisahkan minyak kasar dari serabut serat.",
            "Monitor temperatur rebusan dan tekanan hidrolik secara kontinyu.",
          ],
          deliverables: ["LOGBOOK_STERILIZER.csv", "SOP_SCREW_PRESS.md", "LAPORAN_PRESSURE_UAP.xlsx"],
        },
        {
          phaseNumber: 3,
          name: "Klarifikasi, Pemurnian & Quality Control Lab",
          tasks: [
            "Lakukan PemurnianKlarifikasi: pemisahan lumpur pasir via sand trap dan centrifuge separator.",
            "Laksanakan QualityControlLab: pengambilan sampel harian untuk uji kadar Asam Lemak Bebas (ALB) dan kadar air.",
            "Lakukan penyulingan ulang jika mutu belum memenuhi standar ekspor.",
          ],
          deliverables: ["LOGBOOK_KLARIFIKASI.csv", "SERTIFIKAT_UJI_LAB_MUTU.pdf", "GRAFIK_KADAR_ALB.png"],
        },
        {
          phaseNumber: 4,
          name: "Penyimpanan Tangki Komersial & Manajemen Suhu",
          tasks: [
            "Jalankan PenyimpananTangkiCPO: transfer minyak murni ke tangki timbun berkapasitas besar.",
            "Jaga suhu tangki stabil pada rentang 45-55 derajat Celcius guna mencegah pembekuan asam stearat.",
            "Lakukan kalibrasi berkala volume tangki menggunakan metode sounding tera bersertifikasi.",
          ],
          deliverables: ["LOG_SUHU_TANGKI_TIMBUN.xlsx", "SURAT_TERA_TANGKI.pdf", "SOP_STORAGE_CPO.md"],
        },
        {
          phaseNumber: 5,
          name: "Pengapalan, Distribusi & Penyerahan Komersial",
          tasks: [
            "Eksekusi pemompaan CPO ke truk tangki / kapal tongkang pengangkut.",
            "Terbitkan Berita Acara Serah Terima, nota timbangan, dan sertifikat mutu pengapalan.",
            "Hitung rendemen riil olah pabrik dan evaluasi efisiensi biaya produksi harian.",
          ],
          deliverables: ["BERITA_ACARA_PENGAPALAN.pdf", "REKAPITULASI_RENDEMEN_CPO.xlsx", "NOTA_PENJUALAN_CPO.pdf"],
        },
      ];

    case "business_aquaculture_agri":
      return [
        {
          phaseNumber: 0,
          name: "Studi Kelayakan Lokasi & Perencanaan Bioflok",
          tasks: [
            "Analisis kelayakan lokasi, ketersediaan air tawar steril, dan pasokan listrik aerasi 24 jam.",
            "Hitung estimasi kebutuhan pakan pelet berdasar FCR dan proyeksi tonase panen lele.",
            "Susun anggaran modal kerja kolam terpal tanpa rekayasa angka fiktif.",
          ],
          deliverables: ["STUDI_KELAYAKAN_BIOFLOK.xlsx", "RENCANA_BIAYA_OPERASIONAL.xlsx", "SITE_MAP.pdf"],
        },
        {
          phaseNumber: 1,
          name: "Persiapan Kolam Dan Air & Pembentukan Kultur Flok",
          tasks: [
            "Laksanakan PersiapanKolamDanAir: sterilisasi kolam terpal, instalasi aerasi uniring, dan pengisian air tawar.",
            "Inokulasi KulturFlokProbiotik: campurkan bakteri Bacillus, molase tetes tebu, dan garam krosok dengan aerasi continuous.",
            "Uji kematangan air hingga terbentuk bioflok stabil dengan volume 15-25 ml/L di kerucut Imhoff.",
          ],
          deliverables: ["SOP_PERSIAPAN_AIR.md", "LOGBOOK_KULTUR_FLOK.csv", "CHECKLIST_AERASI.md"],
        },
        {
          phaseNumber: 2,
          name: "Penebaran Benih & Manajemen Pakan Starter",
          tasks: [
            "Lakukan AklimatisasiBenihLele: adaptasi suhu dan pH air secara bertahap sebelum pelepasan benih ukuran seragam.",
            "Jalankan PemberianPakanFCR: distribusi pakan starter protein 38% dengan porsi terukur 3-4 kali sehari.",
            "Lakukan MonitoringKualitasAir harian mencakup Dissolved Oxygen (DO), suhu, dan keasaman pH.",
          ],
          deliverables: ["LOGBOOK_PENEBARAN_BENIH.csv", "JADWAL_PAKAN_HARIAN.md", "KARTU_KUALITAS_AIR.xlsx"],
        },
        {
          phaseNumber: 3,
          name: "Pemeliharaan Lanjutan & Sampling Pertumbuhan",
          tasks: [
            "Eksekusi SamplingPertumbuhanLele berkala tiap 10-14 hari untuk mengukur Average Daily Gain (ADG).",
            "Lakukan penyortiran (grading) ukuran untuk mencegah kanibalisme pada populasi lele.",
            "Kendalikan volume flok dan lakukan pembuangan lumpur dasar kolam via central drain.",
          ],
          deliverables: ["LAPORAN_SAMPLING_BIOMASSA.xlsx", "BERITA_ACARA_SORTIR.md", "GRAFIK_PERTUMBUHAN.png"],
        },
        {
          phaseNumber: 4,
          name: "Pemanenan & Sortir Grading Komersial",
          tasks: [
            "Jalankan PanenDanSortirGrading: penurunan air kolam bertahap dan seleksi bobot panen (8-10 ekor/kg).",
            "Lakukan penimbangan total tonase bersih hasil panen dan kalkulasi nilai FCR riil siklus.",
            "Hitung HPP per kg aktual dan laba bersih usaha menggunakan model keuangan transparan.",
          ],
          deliverables: ["REKAP_PANEN_TOTAL.xlsx", "KALKULASI_FCR_DAN_HPP.xlsx", "NOTA_PENJUALAN.pdf"],
        },
        {
          phaseNumber: 5,
          name: "Sanitasi Kolam & Evaluasi Siklus Berkelanjutan",
          tasks: [
            "Keringkan dan sanitasi kolam terpal dengan desinfektan ramah lingkungan untuk persiapan siklus berikutnya.",
            "Evaluasi efisiensi pakan, mortalitas ikan, dan performa keuangan siklus 90 hari.",
            "Perbarui SOP operasional berdasarkan catatan evaluasi lapangan.",
          ],
          deliverables: ["EVALUASI_SIKLUS_90HARI.md", "REKOMENDASI_SIKLUS_BERIKUTNYA.md", "SOP_REVISI.md"],
        },
      ];

    case "education_physics_circuits":
      return [
        {
          phaseNumber: 0,
          name: "Pengenalan Konsep Kelistrikan & Teori Sirkuit",
          tasks: [
            "Kenalkan KomponenSirkuit dasar: SumberTeganganBaterai, KabelPenghubungArus, SaklarPemutusSirkuit, dan BebanLampuBohlam.",
            "Jelaskan HukumDasarKelistrikan: Hukum Ohm (V=IR) dan prinsip konservasi muatan listrik.",
            "Sajikan analogi visual aliran air dalam pipa untuk memudahkan pemahaman beda potensial dan arus.",
          ],
          deliverables: ["MODUL_TEORI_LISTRIK_SISWA.pdf", "SLIDE_PEMBELAJARAN_SIRKUIT.pptx"],
        },
        {
          phaseNumber: 1,
          name: "Pemetaan Karakteristik Rangkaian Seri vs Paralel",
          tasks: [
            "Bahas KarakteristikSirkuit: RangkaianSeriSatuJalur (arus konstan, tegangan terbagi) vs RangkaianParalelBercabang (tegangan konstan, arus terbagi).",
            "Gambarkan skema rangkaian dan prediksi matematis nyala lampu bohlam pada kedua konfigurasi.",
            "Siapkan Lembar Kerja Siswa (LKS) perbandingan rangkaian seri dan paralel.",
          ],
          deliverables: ["PETA_KONSEP_SIRKUIT.png", "LEMBAR_KERJA_SISWA_CIRCUIT.docx"],
        },
        {
          phaseNumber: 2,
          name: "Persiapan Laboratorium & Keselamatan Praktikum",
          tasks: [
            "Kenalkan InstrumenPengukuran: PengukuranArusDanTegangan menggunakan Voltmeter dan Amperemeter / Multimeter digital.",
            "Tegaskan ProtokolKeselamatanListrik: Dilarang menghubungkan kutub baterai langsung tanpa beban (mencegah korsleting/panas).",
            "Bagi siswa ke dalam kelompok kerja praktikum mandiri dan periksa kelengkapan baterai serta bohlam.",
          ],
          deliverables: ["SOP_KESELAMATAN_PRAKTIKUM.md", "CHECKLIST_ALAT_LAB.docx"],
        },
        {
          phaseNumber: 3,
          name: "Pelaksanaan Praktikum Rangkaian Seri & Paralel",
          tasks: [
            "Siswa merangkai RangkaianSeriSatuJalur dengan dua lampu bohlam dan satu saklar, lalu ukur arus dan tegangan di tiap titik.",
            "Siswa merangkai RangkaianParalelBercabang dengan dua lampu bohlam, lalu catat tingkat terang lampu dan beda potensialnya.",
            "Uji pelepasan satu bohlam pada masing-masing konfigurasi untuk membuktikan kesinambungan sirkuit.",
          ],
          deliverables: ["LEMBAR_PENGAMATAN_SERI_PARALEL.pdf", "FOTO_DOKUMENTASI_PRAKTIKUM.jpg"],
        },
        {
          phaseNumber: 4,
          name: "Analisis Data Pengukuran & Diskusi Ilmiah",
          tasks: [
            "Bandingkan data kuantitatif tegangan dan arus antara konfigurasi seri dan paralel.",
            "Arahkan siswa menyimpulkan hubungan antara hambatan total dengan terang redupnya lampu bohlam berdasar Hukum Ohm.",
            "Tuliskan laporan praktikum kelompok sesuai kaidah penulisan sains sekolah.",
          ],
          deliverables: ["LAPORAN_PRAKTIKUM_FISIKA.docx", "GRAFIK_HASIL_PENGUKURAN.xlsx"],
        },
        {
          phaseNumber: 5,
          name: "Evaluasi Pemahaman & Refleksi Pembelajaran",
          tasks: [
            "Adakan kuis evaluasi pemahaman (soal konsep logika sirkuit dan perhitungan Hukum Ohm sederhana).",
            "Bahas bersama solusi kuis untuk meluruskan miskonsepsi kelistrikan pada siswa.",
            "Pastikan seluruh kelompok membongkar rangkaian, mematikan saklar, dan melepas baterai secara tertib.",
          ],
          deliverables: ["KUIS_EVALUASI_FISIKA.pdf", "KUNCI_JAWABAN_PEMBAHASAN.pdf"],
        },
      ];

    case "business_food_beverage":
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
            "Uji coba resep BahanBakuKopi, PenyeduhanColdBrew, dan PencampuranSusuGula hingga mencapai rasa konsisten.",
            "Lakukan QualityControlBrix untuk derajat manis dan pH, lalu PengisianBotolSteril dan PenyimpananChiller.",
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
            "Buka jalur kemitraan konsinyasi dengan outlet sasaran (FaseDistribusiGrandLaunch).",
          ],
          deliverables: ["DESAIN_LABEL.ai", "MARKETING_CALENDAR.md", "MOU_KONSINYASI.docx"],
        },
        {
          phaseNumber: 4,
          name: "Uji Pasar Terbatas & Umpan Balik Konsumen",
          tasks: [
            "Produksi batch uji coba pertama (FaseUjiPasarTerbatas) dan sebar ke konsumen terpilih.",
            "Kumpulkan data indeks kepuasan rasa, kemudahan membuka tutup botol, dan daya tarik kemasan.",
            "Lakukan penyesuaian resep atau packaging jika ditemukan keluhan teknis.",
          ],
          deliverables: ["TEST_MARKET_FEEDBACK.csv", "ACTION_ITEMS_REVISION.md"],
        },
        {
          phaseNumber: 5,
          name: "Grand Launching & Pelaksanaan Operasional Berkelanjutan",
          tasks: [
            "Peluncuran komersial resmi produk (FaseDistribusiGrandLaunch) secara serentak di seluruh kanal penjualan.",
            "Jalankan sistem pencatatan keuangan harian yang memisahkan rekening pribadi dan omzet usaha.",
            "Evaluasi pencapaian KPI bulanan: repeat order, margin laba bersih, dan utilisasi kapasitas produksi.",
          ],
          deliverables: ["LAUNCH_REPORT.pdf", "FINANCIAL_LEDGER.xlsx", "KPI_DASHBOARD.xlsx"],
        },
      ];

    case "education_biology_photosynthesis":
      return [
        {
          phaseNumber: 0,
          name: "Penyusunan Materi Pembelajaran & Pengenalan Konsep",
          tasks: [
            "Jelaskan fungsi klorofil (KlorofilTilakoid) dan organel kloroplas sebagai pabrik energi fotosintesis.",
            "Gunakan analogi visual kehidupan sehari-hari agar siswa mudah mencerna materi.",
            "Sajikan ringkasan perbedaan mendasar antara ReaksiTerang dan SiklusCalvinStroma.",
          ],
          deliverables: ["PANDUAN_MATERI_SISWA.pdf", "SLIDE_PRESENTASI_KELAS.pptx"],
        },
        {
          phaseNumber: 1,
          name: "Visualisasi Alur Proses & Pemetaan Konsep",
          tasks: [
            "Tampilkan diagram alur reaksi kimia fotosintesis yang menghubungkan CahayaMatahariDanAir, KarbonDioksida, dan GlukosaBahanMakanan.",
            "Bahas mindmap FaktorPengaruh: FaktorIntensitasCahaya, FaktorKonsentrasiCO2, dan FaktorSuhuLingkungan.",
            "Berikan pertanyaan pemantik diskusi untuk menguji pemahaman awal siswa.",
          ],
          deliverables: ["MINDMAP_FOTOSINTESIS.png", "LEMBAR_DISKUSI_SISWA.docx"],
        },
        {
          phaseNumber: 2,
          name: "Persiapan Praktikum & Pengenalan Keselamatan Lab",
          tasks: [
            "Kenalkan alat praktikum Ingenhousz (gelas piala, corong kaca, tabung reaksi, TanamanHydrilla, LarutanBikarbonat).",
            "Jelaskan aturan keselamatan laboratorium: hati-hati saat memegang alat kaca dan hindari tumpahan air.",
            "Bagi siswa ke dalam kelompok kerja praktikum (4-5 siswa per kelompok).",
          ],
          deliverables: ["SOP_KESELAMATAN_LAB.md", "DAFTAR_KELOMPOK_PRAKTIKUM.docx"],
        },
        {
          phaseNumber: 3,
          name: "Pelaksanaan Eksperimen Laboratorium & Pengamatan Gelembung",
          tasks: [
            "Rangkai perangkat percobaan Ingenhousz dengan TanamanHydrilla dalam posisi corong terbalik.",
            "Letakkan satu perangkat di bawah sinar matahari langsung dan satu perangkat di tempat teduh.",
            "Amati dan hitung IndikatorGelembungOksigen (OksigenDanEnergiATP) yang muncul setiap 5 menit selama 30 menit.",
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

    case "education_practical_experiment":
      return [
        {
          phaseNumber: 0,
          name: "Rancangan Instruksional & Keselamatan Laboratorium",
          tasks: [
            "Rumuskan capaian kompetensi praktikum dan panduan observasi mandiri siswa berbasis PrinsipBiologiIlmiah.",
            "Susun analisis potensi bahaya dan ProtokolKeselamatanLab terstandar (K3 Lab).",
            "Siapkan lembar kerja praktikum MetodeObservasiParameter terstruktur dan KuisRefleksiSains pemahaman.",
          ],
          deliverables: ["SILABUS_PRAKTIKUM.pdf", "SOP_K3_LABORATORIUM.md", "LEMBAR_KERJA_SISWA.docx"],
        },
        {
          phaseNumber: 1,
          name: "Persiapan Alat Media & Sterilisasi Prosedural",
          tasks: [
            "Laksanakan PersiapanAlatMedia: penyiapan wadah, bahan baku/nutrisi, dan media pengujian.",
            "Lakukan sterilisasi instrumen kerja (autoclave / perebusan / sanitasi alkohol) sesuai SOP.",
            "Periksa kesiapan meja kerja dan pastikan seluruh perlengkapan pelindung diri (jas lab, sarung tangan) terpakai.",
          ],
          deliverables: ["CHECKLIST_ALAT_BAHAN.md", "SOP_STERILISASI.md", "FOTO_PERSIAPAN_LAB.png"],
        },
        {
          phaseNumber: 2,
          name: "Pelaksanaan Perlakuan & Inokulasi Sampel",
          tasks: [
            "Jalankan PerlakuanPraktikum: pemberian variabel perlakuan dan inokulasi bahan secara aseptis.",
            "Berikan label penanda identitas (tanggal, kelompok, jenis perlakuan) pada setiap wadah sampel.",
            "Tempatkan wadah sampel pada lingkungan terkontrol (suhu, aerasi, pencahayaan) sesuai instruksi modul.",
          ],
          deliverables: ["LOGBOOK_INOKULASI.csv", "FOTO_SAMPEL_LABEL.png", "KARTU_MONITORING.docx"],
        },
        {
          phaseNumber: 3,
          name: "Observasi Berkala & Pencatatan Data Parameter",
          tasks: [
            "Laksanakan ObservasiBerkala: pengukuran harian terhadap pertumbuhan, perubahan fisik, atau parameter metrik.",
            "Catat temuan anomali atau kontaminasi pada lembar observasi siswa.",
            "Dokumentasikan perkembangan visual menggunakan foto berkala sebagai bukti empiris.",
          ],
          deliverables: ["LOGBOOK_OBSERVASI_HARIAN.xlsx", "DOKUMENTASI_VISUAL/", "CATATAN_KONTAMINASI.md"],
        },
        {
          phaseNumber: 4,
          name: "Evaluasi Faktor Kesalahan & Analisis Komparatif",
          tasks: [
            "Laksanakan EvaluasiFaktorKesalahan: identifikasi penyebab jika sampel tidak tumbuh atau terkontaminasi.",
            "Bandingkan hasil antar perlakuan (misal kontrol vs variasi perlakuan).",
            "Diskusikan korelasi data empiris dengan teori ilmiah dalam kelompok belajar.",
          ],
          deliverables: ["LEMBAR_EVALUASI_HASIL.docx", "GRAFIK_KOMPARASI.png", "TABEL_ANALISIS_ERROR.xlsx"],
        },
        {
          phaseNumber: 5,
          name: "Kompilasi Data Hasil & Penyusunan Laporan Praktikum",
          tasks: [
            "Lakukan KompilasiDataHasil: penarikan kesimpulan ilmiah berdasarkan data nyata pengamatan siswa.",
            "Susun laporan praktikum lengkap berformat standar (Pendahuluan, Metode, Hasil, Pembahasan, Kesimpulan).",
            "Presentasikan temuan eksperimen di depan kelas dan ikuti kuis evaluasi pemahaman.",
          ],
          deliverables: ["LAPORAN_PRAKTIKUM_FINAL.pdf", "SLIDE_PRESENTASI_KELOMPOK.pptx", "LEMBAR_NILAI_SISWA.pdf"],
        },
      ];

    case "research_marine_environmental":
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
            "Desain protokol pengambilan sampel intertidal sedimen (PopulasiSampel) dan biota laut sesuai diagram metodologi.",
            "Tetapkan prosedur kontrol sterilisasi alat laboratorium untuk mencegah kontaminasi latar belakang.",
            "Susun dokumen persetujuan etika riset biosafety (VerifikasiEtika) dan perizinan zonasi konservasi.",
          ],
          deliverables: ["SAMPLING_PROTOCOL.md", "ETHICS_CLEARANCE.pdf", "STATION_COORDINATES.csv"],
        },
        {
          phaseNumber: 2,
          name: "Fieldwork & Laboratory Analytical Extraction",
          tasks: [
            "Pengambilan sampel sedimen dan air laut secara sistematis di lokasi riset.",
            "Lakukan PreparasiSampel: ekstraksi densitas menggunakan larutan garam pekat dan pencernaan bahan organik hidrogen peroksida.",
            "Isolasi partikel mikroplastik pada filter membran selulosa nitrat.",
          ],
          deliverables: ["FIELD_LOGBOOK.md", "EXTRACTION_RECORDS.csv", "BLANK_CONTROL_AUDIT.md"],
        },
        {
          phaseNumber: 3,
          name: "Spectroscopic Identification & Data Compilation",
          tasks: [
            "Karakterisasi polimer menggunakan SpektroskopiFTIR (identifikasi PP, PE, PET).",
            "Kuantifikasi kelimpahan partikel berdasarkan ukuran, bentuk (fiber/film), dan warna.",
            "KompilasiData: dataset numerik ke dalam matriks data riset standar.",
          ],
          deliverables: ["FTIR_SPECTRA_DATASET.json", "PARTICLE_CLASSIFICATION.csv"],
        },
        {
          phaseNumber: 4,
          name: "Statistical Analysis & Scientific Discussion",
          tasks: [
            "UjiStatistik signifikansi statistik (ANOVA dan korelasi) antar stasiun pengambilan sampel.",
            "Interpretasi hubungan kausal antara AkumulasiMikroplastik dengan KualitasAirDanSedimen, KepadatanBiotaLaut, dan KesehatanEkosistemMangrove.",
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

    case "academic_technology_adoption":
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
            "Kompilasi teori PersepsiKemudahan, PersepsiManfaat, KesiapanTeknologi, NiatAdopsiAI, dan KinerjaUMKM.",
            "Gambarkan diagram kerangka pemikiran dan formulasi hipotesis H1 hingga H4.",
            "Rangkum matriks penelitian terdahulu sebagai landasan komparasi.",
          ],
          deliverables: ["BAB2_TINJAUAN_PUSTAKA.docx", "KERANGKA_PEMIKIRAN.png", "TABEL_GAP_RISET.docx"],
        },
        {
          phaseNumber: 2,
          name: "Desain Metodologi & Instrumen Penelitian (Bab 3)",
          tasks: [
            "Tentukan PopulasiUMKM dan ukuran sampel menggunakan rumus Slovin.",
            "Susun kisi-kisi KuesionerLikert skala 1-5 berdasarkan indikator variabel.",
            "Jalankan UjiValiditasReliabilitas (pilot test) kepada 30 responden untuk menguji keabsahan instrumen.",
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
            "Jalankan UjiAsumsiKlasik: normalitas, multikolinieritas, dan heteroskedastisitas.",
            "Eksekusi UjiRegresiBerganda (koefisien R2, uji F simultan, dan uji t parsial).",
            "Tulis pembahasan hasil temuan: mengapa hipotesis diterima atau ditolak berdasarkan fakta empiris.",
          ],
          deliverables: ["BAB4_HASIL_DAN_PEMBAHASAN.docx", "OUTPUT_STATISTIK_SPSS.pdf"],
        },
        {
          phaseNumber: 5,
          name: "Kesimpulan, Saran & Persiapan Ujian Sidang (Bab 5)",
          tasks: [
            "Tarik KesimpulanSkripsi esensial yang menjawab rumusan masalah secara lugas.",
            "Rumuskan saran aplikatif bagi pelaku UMKM kuliner dan saran teoritis bagi peneliti selanjutnya.",
            "Periksa format penulisan skripsi, cek plagiasi Turnitin, dan siapkan slide presentasi sidang.",
          ],
          deliverables: ["SKRIPSI_LENGKAP_FINAL.docx", "SLIDE_SIDANG.pptx", "HASIL_TURNITIN.pdf"],
        },
      ];

    default:
      return [
        {
          phaseNumber: 0,
          name: "Discovery & Requirements Analysis",
          tasks: [
            "Analisis mendalam kebutuhan sistem dan tujuan arsitektur aplikasi.",
            "Dokumentasikan batasan ruang lingkup dan pencegahan scope creep.",
            "Petakan persona pengguna target dan alur interaksi antarmuka.",
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
  }
}

function getNegativeConstraints(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  audience: AudienceLevel
): string[] {
  switch (subtopic) {
    case "software_web3_defi":
      return [
        "1. DILARANG memanggil fungsi eksternal sebelum pembaruan state lokal (Wajib patuhi pola Checks-Effects-Interactions & Anti-Reentrancy).",
        "2. DILARANG menggunakan tx.origin untuk autentikasi atau otorisasi hak akses (Wajib msg.sender).",
        "3. DILARANG membuat modul POS/Kasir atau komponen e-commerce yang menyimpang dari kontrak DeFi.",
        "4. DILARANG mengabaikan penanganan desimal token (Wajib mengonversi basis token 18 desimal secara akurat).",
        "5. DILARANG melakukan deploy tanpa pengujian otomatis anti-reentrancy dan branch test coverage 100%.",
      ];

    case "business_aquaculture_agri":
      return [
        "1. DILARANG MENGARANG ANGKA BIAYA ATAU HPP FIKTIF (Gunakan formula matematis transparan dan parameter terukur).",
        "2. DILARANG memberi pakan saat DO (oksigen terlarut) berada di bawah ambang batas 3 mg/L atau saat air berbau menyengat.",
        "3. DILARANG mencampurkan kas operasional tambak dengan rekening pribadi (Wajib pembukuan terpisah).",
        "4. DILARANG menebar benih tanpa proses aklimatisasi suhu dan pH terlebih dahulu.",
        "5. DILARANG menunda panen saat kapasitas flok atau ukuran ikan telah mencapai titik optimal efisiensi pakan.",
      ];

    case "education_physics_circuits":
      return [
        "1. DILARANG menghubungkan kutub baterai secara langsung tanpa beban resistansi lampu (mencegah korsleting dan pemanasan baterai).",
        "2. DILARANG membiarkan saklar tertutup saat siswa memasang atau membongkar rangkaian kabel.",
        "3. DILARANG menggunakan sumber tegangan listrik AC PLN bertegangan tinggi untuk praktikum dasar siswa (Wajib baterai DC rendah).",
        "4. DILARANG menyajikan rumus fisika tanpa penjelasan analogi visual yang memudahkan pemahaman logika sirkuit.",
      ];

    case "business_food_beverage":
      return [
        "1. DILARANG MENGARANG ANGKA BIAYA ATAU HPP FIKTIF (Gunakan formula matematis transparan dan parameter terukur).",
        "2. DILARANG meluncurkan produk makanan minuman tanpa label kedaluwarsa jelas dan izin edar resmi yang dipersyaratkan.",
        "3. DILARANG mencampuradukkan omzet kotor dengan laba bersih.",
        "4. DILARANG membuat SOP tanpa penanggung jawab eksplisit (Setiap tugas harus memiliki pemilik PIC).",
        "5. DILARANG mengorbankan higienitas dan mutu bahan baku hanya demi menekan biaya HPP secara membabi buta.",
      ];

    case "education_biology_photosynthesis":
      return [
        "1. DILARANG menggunakan istilah teknis atau rumus kimia yang membingungkan siswa tanpa memberikan analogi yang mudah.",
        "2. DILARANG membiarkan siswa melakukan praktikum tanpa pengawasan keselamatan dan instruksi yang teruji aman.",
        "3. DILARANG memberikan prosedur eksperimen yang membutuhkan zat kimia berbahaya atau api tanpa alat pelindung.",
        "4. DILARANG membatasi proses belajar hanya pada hafalan teks; wajib utamakan pemahaman logika sebab-akibat.",
      ];

    case "research_marine_environmental":
      return [
        "1. DILARANG MENGARANG SITASI ATAU JURNAL FIKTIF (Zero tolerance for hallucinated references).",
        "2. DILARANG melakukan manipulasi data statistik (p-hacking) atau cherry-picking data sampel untuk memaksakan hipotesis.",
        "3. DILARANG mengabaikan prosedur kontaminasi blanko kontrol saat ekstraksi dan identifikasi spektroskopi.",
        "4. DILARANG menggeneralisasi kesimpulan riset melebihi batas cakupan populasi dan metodologi yang diuji.",
        "5. DILARANG menyembunyikan keterbatasan riset atau anomali data lapangan yang ditemukan.",
      ];

    case "academic_technology_adoption":
      return [
        "1. DILARANG melakukan plagiarisme atau menyalin kalimat karya ilmiah orang lain tanpa atribusi sitasi yang sah.",
        "2. DILARANG memalsukan jawaban responden kuesioner atau mengisi data kuesioner sendiri secara fiktif.",
        "3. DILARANG memaksakan model regresi jika data gagal memenuhi uji asumsi klasik dasar.",
        "4. DILARANG menggunakan referensi ilmiah yang sudah usang atau bersumber dari blog personal tanpa peer-review.",
        "5. DILARANG mengabaikan koreksi dan saran dosen pembimbing saat melangkah ke bab berikutnya.",
      ];

    default:
      return [
        "1. DILARANG menggunakan mock data di lingkungan production atau mengklaim backend selesai tanpa implementasi nyata.",
        "2. DILARANG menaruh seluruh kode aplikasi ke dalam satu file raksasa (Patuhi Separation of Concerns).",
        "3. DILARANG menggunakan tipe data 'any' tanpa alasan teknis kuat dalam kode TypeScript.",
        "4. DILARANG mengabaikan standar aksesibilitas WCAG 2.2 AA (Pastikan rasio kontras teks terpenuhi).",
        "5. DILARANG menghapus atau mengabaikan penanganan error pada endpoint mutasi data penting.",
        "6. DILARANG memasukkan API key, token rahasia, atau kredensial database ke dalam repository publik.",
      ];
  }
}

function getDefinitionOfDone(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  audience: AudienceLevel
): string[] {
  switch (subtopic) {
    case "software_web3_defi":
      return [
        "1. Seluruh 6 fase eksekusi protokol staking dan audit keamanan telah diselesaikan dengan artefak dokumen nyata.",
        "2. Diagram ERD model state Solidity dan Flowchart mutasi transaksi terbukti sinkron 100% tanpa entitas fiktif.",
        "3. Proteksi ReentrancyGuardShield terbukti efektif menolak serangan reentrancy pada seluruh fungsi mutatif.",
        "4. Seluruh rangkaian pengujian automated (unit, invariant fuzzing, dan static analysis) lulus 100% dengan Exit Code 0.",
        "5. Skrip deployment testnet dan operational runbook siap dieksekusi oleh tim engineering.",
      ];

    case "business_aquaculture_agri":
      return [
        "1. Rencana bisnis, analisis kelayakan finansial, dan formula matematis HPP bioflok terhitung transparan tanpa angka palsu.",
        "2. Diagram SOP alur budidaya bioflok dan jadwal pemeliharaan 90 hari disahkan untuk operasional kolam.",
        "3. Kualitas air harian (DO, pH, suhu, dan volume flok) terdata rapi dalam logbook monitoring.",
        "4. Bobot panen mencapai standar 8-10 ekor/kg dengan target FCR 0.9 - 1.1 terpenuhi.",
        "5. Rekening keuangan usaha terpisah total dan sistem grading panen siap melayani pembeli komersial.",
      ];

    case "education_physics_circuits":
      return [
        "1. Materi konsep dasar rangkaian seri dan paralel tersaji dengan analogi visual pipa air yang mudah dipahami siswa.",
        "2. Diagram alur sirkuit dan peta konsep kelistrikan selesai dibuat dan selaras dengan kurikulum fisika sekolah.",
        "3. Prosedur praktikum baterai dan bohlam terbukti aman, bebas risiko hubungan singkat / korsleting.",
        "4. Lembar kerja siswa dan format laporan pengamatan kelompok siap digunakan di meja laboratorium.",
        "5. Kuis evaluasi pemahaman Hukum Ohm dan kunci pembahasan tersedia untuk mengukur kompetensi siswa.",
      ];

    case "business_food_beverage":
      return [
        "1. Rencana bisnis, analisis kelayakan finansial, dan formula HPP vs Margin terhitung akurat dan transparan.",
        "2. Diagram SOP alur produksi dan jadwal peluncuran Gantt Chart 12 minggu selesai disahkan oleh manajemen.",
        "3. Izin legalitas edar dasar dan sertifikasi standar sanitasi pangan terpenuhi sesuai regulasi.",
        "4. Batch uji coba pertama berhasil diproduksi dengan kepuasan konsumen di atas ambang batas penerimaan pasar.",
        "5. Sistem pencatatan kas terpisah dan indikator KPI operasional aktif digunakan untuk memantau performa harian.",
      ];

    case "education_biology_photosynthesis":
      return [
        "1. Materi konsep dasar fotosintesis tersaji secara terstruktur, ramah siswa, dan diperkaya analogi kehidupan nyata.",
        "2. Diagram alur reaksi dan mindmap faktor fotosintesis selesai dibuat dan mudah dipahami siswa.",
        "3. Prosedur praktikum Ingenhousz terbukti aman, mudah dipraktikkan, dan menghasilkan indikator gelembung oksigen terukur.",
        "4. Lembar kerja siswa dan format laporan praktikum kelompok siap digunakan saat jam pelajaran laboratorium.",
        "5. Kuis evaluasi pemahaman dan kunci pembahasan tersedia untuk mengukur ketercapaian kompetensi siswa.",
      ];

    case "research_marine_environmental":
      return [
        "1. Proposal dan protokol metodologi pengambilan sampel terstandar selesai disusun tanpa ambiguitas.",
        "2. Seluruh diagram kerangka konsep dan alur PRISMA sinkron dengan variabel penelitian yang diuji.",
        "3. Identifikasi spektral FTIR partikel mikroplastik memenuhi standar kecocokan pustaka > 85%.",
        "4. Analisis statistik terbukti signifikan dan seluruh referensi yang digunakan diverifikasi valid serta ada di dunia nyata.",
        "5. Manuskrip artikel ilmiah berformat IMRaD siap diserahkan (submission-ready) ke dewan reviewer jurnal.",
      ];

    case "academic_technology_adoption":
      return [
        "1. Seluruh draft bab 1 sampai bab 5 selesai ditulis mengikuti pedoman penulisan skripsi akademik yang sah.",
        "2. Kerangka pemikiran teoritis dan formulasi hipotesis terbukti selaras dengan instrumen kuesioner penelitian.",
        "3. Instrumen penelitian terbukti valid dan reliabel melalui uji empiris pada responden nyata.",
        "4. Seluruh uji asumsi klasik dan regresi berganda selesai dihitung dengan transparansi output statistik.",
        "5. Dokumen skripsi lolos uji anti-plagiasi Turnitin dan materi slide presentasi sidang telah siap diuji.",
      ];

    default:
      return [
        "1. Seluruh 6 fase eksekusi (Phase 0 hingga Phase 5) telah diselesaikan dengan bukti artefak dokumen nyata.",
        "2. Diagram ERD dan Flowchart transaksi terbukti sinkron 100% dengan skema Prisma dan logika API.",
        "3. Desain antarmuka Neumorphism konsisten dan terbukti memenuhi kriteria aksesibilitas WCAG 2.2 AA.",
        "4. Seluruh rangkaian pengujian (unit, API, dan security linting) lulus 100% dengan Exit Code 0.",
        "5. Kompilasi build produksi (next build) berhasil bersih tanpa ada error TypeScript atau broken dependencies.",
      ];
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
  lines.push(
    `**Universal Meta-Blueprint — Domain: ${spec.domain.toUpperCase()} | Audience: ${spec.audienceLevel.toUpperCase()}**\n`
  );

  // Section 1
  lines.push("## 1. ROLE & RESPONSIBILITIES");
  lines.push(
    "Bertindaklah sebagai tim profesional multidisiplin terkemuka yang terdiri dari:"
  );
  for (const role of spec.roles) {
    lines.push(`- ${role}`);
  }
  lines.push(
    "Tugas tim adalah memimpin perancangan, pelaksanaan, verifikasi, dan penyelesaian proyek ini dari tahap awal hingga akhir dengan standar kualitas tertinggi di bidangnya.\n"
  );

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
  lines.push(
    "Hasil akhir wajib memenuhi tolok ukur kualitas dan karakteristik inti berikut:"
  );
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
  lines.push(
    "Wajib menghasilkan dan mematuhi diagram struktural deklaratif berikut:"
  );
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
  lines.push(
    "Laksanakan seluruh rangkaian pekerjaan melalui tahapan berurutan berikut dengan bukti deliverables konkret di setiap fase:"
  );
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
  lines.push(
    "Patuhi batasan negatif mutlak berikut untuk melindungi integritas dan kebenaran hasil:"
  );
  for (const constraint of spec.negativeConstraints) {
    lines.push(`- ${constraint}`);
  }
  lines.push("");

  // Section 8
  lines.push("## 8. EXECUTION PROTOCOL FOR AI CODING & TASK AGENTS");
  lines.push(
    "Bekerjalah dengan mematuhi protokol 5-langkah sistematis berikut:"
  );
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
  lines.push(
    "Mulai dari PHASE 0: Periksa seluruh konteks dan data yang tersedia, konfirmasikan asumsi, dan buat dokumen brief awal sebelum melangkah ke implementasi teknis."
  );

  return lines.join("\n");
}
