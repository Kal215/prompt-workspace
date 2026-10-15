// ──────────────────────────────────────────────────────────────────
// @prompt-workspace/domain-rules — Universal Execution Phases
// Blueprint v1.0 Bagian 4.2 & ADR-003: 6-Phase Structured Execution
// ──────────────────────────────────────────────────────────────────

import {
  AudienceLevel,
  DiagramSpecification,
  ExecutionPhase,
} from "@prompt-workspace/prompt-contracts";
import { UniversalDomainCategory, DomainSubtopic } from "./subtopics.js";

export function getExecutionPhases(
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
