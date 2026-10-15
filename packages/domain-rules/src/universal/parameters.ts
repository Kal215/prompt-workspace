// ──────────────────────────────────────────────────────────────────
// @prompt-workspace/domain-rules — Universal Context, Objectives & Specifications
// Blueprint v1.0 Bagian 4.2 & ADR-003: Zero Fake Numbers & Domain Calibration
// ──────────────────────────────────────────────────────────────────

import { AudienceLevel } from "@prompt-workspace/prompt-contracts";
import { UniversalDomainCategory, DomainSubtopic } from "./subtopics.js";

export function getContextAndAssumptions(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  prompt: string,
  audience?: AudienceLevel
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

export function getPrimaryObjectives(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  audience?: AudienceLevel
): string[] {
  switch (subtopic) {
    case "software_web3_defi":
      return [
        "1. Invariant Safety: Total pasokan token dalam brankas TokenVaultLedger selalu sama dengan jumlah posisi staking aktif ditambah reward yang belum diklaim.",
        "2. Anti-Reentrancy Guard: Seluruh fungsi state change (stake, withdraw, claim) terlindungi secara atomik oleh ReentrancyGuardShield.",
        "3. Checks-Effects-Interactions: Pembaruan internal state variabel wajib dieksekusi sebelum transfer token eksternal dipicu.",
        "4. Precise Penalty Calculation: Penalti unstake dini dihitung secara proporsional presisi hingga satuan basis points (bips) terkecil.",
        "5. No Fake Authorization: Menolak keras tx.origin dan mewajibkan otorisasi ketat berbasis msg.sender.",
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
        "1. Zero Fake Numbers: Biaya bibit, pakan, listrik, dan tenaga kerja wajib menggunakan variabel eksplisit tanpa angka rekaan.",
        "2. Formula HPP Riil: Menghitung HPP per kg dengan rumus transparan: Total Biaya Operasional Riil dibagi Estimasi Tonase Panen (Kg).",
        "3. Target FCR Presisi: Menjaga Feed Conversion Ratio (FCR) pakan pada rentang terukur 0.9 - 1.1 melalui manajemen sampling berkala.",
        "4. Survival Rate (SR) Terkendali: Mempertahankan tingkat kelangsungan hidup ikan di atas target 85% dengan aerasi tanpa putus.",
        "5. Kualitas Air Teruji: Parameter DO (>3 mg/L), pH (6.8-8.0), dan suhu dipantau menggunakan log harian.",
        "6. Timeline 90 Hari Disiplin: Memetakan seluruh tahapan budidaya dari persiapan kolam, pembentukan flok, tebar benih, hingga panen.",
        "7. Mitigasi Risiko Penyakit: Memiliki protokol tanggap darurat saat flok pecah atau mortalitas harian meningkat.",
        "8. Saluran Pemasaran Komersial: Memastikan kepastian serapan pasar sebelum tanggal proyeksi panen tiba.",
      ];

    case "education_physics_circuits":
      return [
        "1. Pemahaman Logika Rangkaian: Siswa mampu membedakan karakteristik aliran arus pada jalur tunggal (seri) vs jalur bercabang (paralel).",
        "2. Penguasaan Hukum Ohm: Siswa dapat membuktikan hubungan proporsional antara tegangan, hambatan, dan kuat arus (V = I * R).",
        "3. Analogi Visual Mental Model: Siswa memahami konsep tegangan sebagai tekanan air dan hambatan sebagai penyempitan pipa.",
        "4. Protokol Keselamatan Lab (Zero Korsleting): Siswa memahami bahaya korsleting dan selalu memasang beban lampu pada rangkaian tertutup.",
        "5. Keterampilan Merangkai Mandiri: Siswa mampu merakit sirkuit menggunakan baterai, kabel buaya, saklar, dan lampu secara mandiri.",
        "6. Kemampuan Diagnosa Kerusakan: Siswa dapat melacak komponen penyebab padamnya sirkuit (lampu putus vs kabel longgar).",
        "7. Pengukuran Akurat: Siswa terampil membaca nilai tegangan dan arus menggunakan instrumen multimeter digital/analog.",
        "8. Dokumentasi Pengamatan Terstruktur: Siswa mampu mengisi lembar observasi dan menyimpulkan hasil praktikum secara ilmiah.",
      ];

    case "business_food_beverage":
      return [
        "1. Zero Fake Numbers: Seluruh angka modal, HPP per botol, dan target keuntungan wajib menggunakan formula matematis transparan.",
        "2. Standar Mutu Rasa Konsisten: Menetapkan rasio ekstraksi kopi, gula aren, dan susu dengan toleransi error < 2% per batch.",
        "3. Ketahanan Produk (Shelf-Life): Produk siap minum teruji aman dikonsumsi hingga minimal 14 hari pada penyimpanan chiller.",
        "4. Timeline Peluncuran 12 Minggu: Eksekusi disiplin dari riset formula, perizinan P-IRT/BPOM, desain kemasan, hingga distribusi komersial.",
        "5. Manajemen Biaya HPP vs Margin: Menjaga margin kotor produk di atas 50% untuk memastikan keberlanjutan arus kas promosi.",
        "6. Higienitas & Kepatuhan Sanitasi: Menerapkan Standard Sanitation Operating Procedure (SSOP) pada ruang pembotolan.",
        "7. Pelacakan Batch & Kedaluwarsa: Setiap botol memiliki kode lot produksi dan tanggal kedaluwarsa yang tercetak jelas.",
        "8. Validasi Pasar Nyata: Melakukan uji coba sampling pasar terbatas kepada minimal 50 konsumen sebelum peluncuran massal.",
      ];

    case "education_biology_photosynthesis":
      return [
        "1. Pemahaman Menyeluruh Reaksi: Siswa memahami perbedaan esensial antara Reaksi Terang di tilakoid dan Siklus Calvin di stroma.",
        "2. Pembuktian Empiris Oksigen: Siswa berhasil melakukan uji Ingenhousz dan membuktikan dihasilkannya gas oksigen secara visual.",
        "3. Analisis Variabel Percobaan: Siswa dapat menjelaskan pengaruh intensitas cahaya, suhu, dan kadar CO2 terhadap laju fotosintesis.",
        "4. Menghubungkan Teori dan Kehidupan: Siswa menyadari peran fundamental fotosintesis sebagai penghasil oksigen dan makanan bagi biosfer.",
        "5. Keterampilan Menggunakan Alat Lab: Siswa terampil merakit corong kaca, tabung reaksi, dan penanganan tanaman Hydrilla.",
        "6. Penulisan Laporan Ilmiah Ramah Siswa: Siswa mampu menyusun laporan dengan struktur: Tujuan, Alat/Bahan, Langkah, Hasil, dan Kesimpulan.",
        "7. Kepatuhan K3 Laboratorium: Melatih tanggung jawab siswa membersihkan alat kaca dan menjaga kebersihan meja lab setelah selesai.",
        "8. Evaluasi Formatif Terukur: Seluruh siswa mencapai nilai ketuntasan minimum (KKM) pada kuis konsep fotosintesis.",
      ];

    case "research_marine_environmental":
      return [
        "1. Metodologi Standar PRISMA: Seluruh tahapan penelusuran pustaka dan pemilihan artikel terbebas dari bias seleksi.",
        "2. Protokol Kontaminasi Blanko (Zero Background Noise): Memastikan tidak ada partikel mikroplastik airborne yang mencemari sampel uji.",
        "3. Akurasi Spektroskopi FTIR: Memverifikasi profil spektral partikel dengan kepastian polimer di atas ambang batas 85%.",
        "4. Replikasi Data Lapangan: Pengambilan sampel diulang minimum 3 kali pada setiap stasiun guna memenuhi uji signifikansi statistik.",
        "5. Kepatuhan Etika Biosafety: Penanganan biota mangrove dan pembuangan reagen kimia mematuhi peraturan keselamatan lingkungan.",
        "6. Validitas Uji Statistik: Menggunakan uji ANOVA satu arah dan regresi korelasi dengan nilai p < 0.05 yang dapat direplikasi.",
        "7. Manajemen Sitasi Otentik: Seluruh referensi wajib bersumber dari jurnal terindeks Scopus/Web of Science tanpa sitasi halusinasi.",
        "8. Manuskrip Siap Submit: Draft publikasi memenuhi kaidah penulisan IMRaD dan panduan penulisan jurnal sasaran target.",
      ];

    case "academic_technology_adoption":
      return [
        "1. Konsistensi Antar-Bab: Landasan teori di Bab 2 selaras dengan rumusan masalah Bab 1 dan instrumen kuesioner Bab 3.",
        "2. Instrumen Valid dan Reliabel: Nilai r-hitung > r-tabel dan Cronbach's Alpha > 0.70 untuk seluruh indikator variabel penelitian.",
        "3. Pemenuhan Uji Asumsi Klasik: Data terbukti berdistribusi normal, bebas multikolinieritas, dan terbebas dari heteroskedastisitas.",
        "4. Signifikansi Hipotesis: Pengujian koefisien determinasi (R-Square) dan uji t parsial menunjukkan interpretasi data yang objektif.",
        "5. Kepatuhan Format Skripsi Kampus: Mengikuti panduan tata tulis akademik (font, margin, sitasi APA 7th edition, dan lampiran data).",
        "6. Bebas Plagiarisme: Hasil pemeriksaan kesamaan teks (similarity index) Turnitin di bawah ambang batas toleransi 20%.",
        "7. Pembahasan Mendalam: Temuan empiris dibandingkan dengan penelitian terdahulu yang relevan dalam 5 tahun terakhir.",
        "8. Kesiapan Sidang Skripsi: Mahasiswa menguasai seluruh argumen metodologis dan siap menjawab pertanyaan dewan penguji.",
      ];

    default:
      return [
        "1. Keselarasan Fungsional: Sistem memenuhi seluruh kebutuhan fungsional yang diminta tanpa penambahan modul di luar spesifikasi.",
        "2. Integritas Data & Anti-Duplikasi: Penyimpanan transaksi dan mutasi data terjamin atomik dan terbebas dari race condition.",
        "3. Keamanan Standar Produksi: Perlindungan terhadap serangan injeksi, validasi skema ketat, dan enkripsi data sensitif.",
        "4. Aksesibilitas & Responsivitas Antarmuka: Desain adaptif pada multi-perangkat dan memenuhi kriteria WCAG 2.2 AA.",
        "5. Kode Sumber Bersih & Berstruktur: Mematuhi prinsip Clean Architecture dan Separation of Concerns.",
        "6. Kelengkapan Uji Otomatis: Memiliki unit test dan integration test dengan tingkat kelulusan 100%.",
        "7. Dokumentasi Teknis Lengkap: Menyediakan dokumen spesifikasi teknis, arsitektur, dan panduan pengoperasian sistem.",
        "8. Kesiapan Deployment: Konfigurasi build produksi terverifikasi bebas dari error TypeScript dan broken dependencies.",
      ];
  }
}

export function getCoreSpecification(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  audience?: AudienceLevel
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

export function getNegativeConstraints(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  audience?: AudienceLevel
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

export function getDefinitionOfDone(
  domain: UniversalDomainCategory,
  subtopic: DomainSubtopic,
  audience?: AudienceLevel
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
