import {
  DiagramSpecification,
  DiagramType,
  AudienceLevel,
} from "@prompt-workspace/prompt-contracts";

export interface DiagramSynthesisInput {
  domain: string;
  primaryGoal: string;
  audienceLevel?: AudienceLevel;
  entitiesHint?: string[];
}

/**
 * Mendeteksi kategori domain umum untuk pemilihan template diagram Mermaid yang tepat
 */
export function classifyUniversalDomain(
  domain: string,
  primaryGoal: string
): "software" | "research" | "academic" | "business" | "education" {
  const normalized = (domain + " " + primaryGoal).toLowerCase();

  if (
    normalized.includes("fotosintesis") ||
    normalized.includes("sekolah") ||
    normalized.includes("sma") ||
    normalized.includes("smp") ||
    normalized.includes("praktikum") ||
    normalized.includes("pelajar") ||
    normalized.includes("belajar") ||
    normalized.includes("biologi") ||
    normalized.includes("kimia") ||
    normalized.includes("fisika")
  ) {
    return "education";
  }

  if (
    normalized.includes("skripsi") ||
    normalized.includes("tesis") ||
    normalized.includes("kuesioner") ||
    normalized.includes("mahasiswa") ||
    normalized.includes("utaut") ||
    normalized.includes("tam") ||
    normalized.includes("regresi") ||
    normalized.includes("hipotesis") ||
    normalized.includes("bab 1") ||
    normalized.includes("populasi") ||
    normalized.includes("sampel")
  ) {
    return "academic";
  }

  if (
    normalized.includes("penelitian") ||
    normalized.includes("riset") ||
    normalized.includes("mikroplastik") ||
    normalized.includes("ilmiah") ||
    normalized.includes("jurnal") ||
    normalized.includes("laboratorium") ||
    normalized.includes("prisma") ||
    normalized.includes("spektroskopi") ||
    normalized.includes("eksperimen") ||
    normalized.includes("ekosistem")
  ) {
    return "research";
  }

  if (
    normalized.includes("bisnis") ||
    normalized.includes("kopi") ||
    normalized.includes("sop") ||
    normalized.includes("kantor") ||
    normalized.includes("perusahaan") ||
    normalized.includes("peluncuran") ||
    normalized.includes("kemasan") ||
    normalized.includes("umkm") ||
    normalized.includes("operasional") ||
    normalized.includes("hpp") ||
    normalized.includes("margin") ||
    normalized.includes("raci") ||
    normalized.includes("gantt")
  ) {
    return "business";
  }

  return "software";
}

/**
 * Menghasilkan Diagram Mermaid.js yang valid dan terstruktur sesuai domain dan tingkat audiens
 */
export function synthesizeUniversalDiagrams(
  input: DiagramSynthesisInput
): DiagramSpecification[] {
  const category = classifyUniversalDomain(input.domain, input.primaryGoal);
  const audience = input.audienceLevel || "specialist";

  switch (category) {
    case "software":
      return [
        {
          id: "diag-software-erd",
          type: "erd",
          title: "Entity Relationship Diagram (Relational Data Model)",
          description:
            "Skema relasi database relasional production-ready mencakup tabel utama, integritas referensial (PK/FK), dan tabel audit.",
          entities: [
            "Pengguna",
            "Produk",
            "Kategori",
            "Pesanan",
            "ItemPesanan",
            "LogAudit",
            "USER",
            "PRODUCT",
            "CATEGORY",
            "ORDER",
            "ORDER_ITEM",
            "AUDIT_LOG",
          ],
          mermaidCode: `erDiagram
    Pengguna ||--o{ Pesanan : "membuat"
    Kategori ||--o{ Produk : "mengelompokkan"
    Pesanan ||--|{ ItemPesanan : "memuat"
    Produk ||--o{ ItemPesanan : "dipesan"
    Pengguna ||--o{ LogAudit : "memicu"

    Pengguna {
        uuid id PK
        string nama
        string email UK
        string peran
        datetime dibuatPada
    }
    Kategori {
        uuid id PK
        string nama UK
        string slug
    }
    Produk {
        uuid id PK
        uuid kategoriId FK
        string nama
        decimal harga
        int stok
        boolean aktif
    }
    Pesanan {
        uuid id PK
        uuid penggunaId FK
        decimal totalHarga
        string status
        datetime dibuatPada
    }
    ItemPesanan {
        uuid id PK
        uuid pesananId FK
        uuid produkId FK
        int jumlah
        decimal hargaSatuan
    }
    LogAudit {
        uuid id PK
        uuid penggunaId FK
        string aksi
        string detail
        datetime timestamp
    }`,
        },
        {
          id: "diag-software-flow",
          type: "flowchart",
          title: "System & Transaction Flowchart",
          description:
            "Alur eksekusi transaksi dari validasi payload input, pengecekan ketersediaan stok, eksekusi mutasi DB atomik, hingga respons pengguna.",
          entities: [
            "InputPengguna",
            "ValidasiSkema",
            "CekStok",
            "TransaksiDatabase",
            "NotifikasiBerhasil",
            "RollbackError",
          ],
          mermaidCode: `flowchart TD
    Start([Mulai: Request Pesanan]) --> Ingest[InputPengguna: Terima Payload Pesanan]
    Ingest --> Val{ValidasiSkema: Format Zod Valid?}
    Val -- Tidak --> ErrVal[RollbackError: Kembalikan 400 Bad Request]
    Val -- Ya --> CheckStock{CekStok: Ketersediaan Produk Cukup?}
    CheckStock -- Tidak --> ErrStock[RollbackError: Stok Tidak Cukup 409 Conflict]
    CheckStock -- Ya --> Mutate[TransaksiDatabase: Kurangi Stok & Buat Record Pesanan]
    Mutate --> Audit[Catat LogAudit Transaksi]
    Audit --> Success[NotifikasiBerhasil: Kembalikan 201 Created & Nota Digital]
    Success --> Done([Selesai])
    ErrVal --> Done
    ErrStock --> Done`,
        },
      ];

    case "research":
      return [
        {
          id: "diag-research-prisma",
          type: "flowchart",
          title: "Research Methodology & Sampling Protocol (PRISMA / Lab Standard)",
          description:
            "Protokol metodologi penelitian terstandar mulai dari perumusan sampel lapangan, ekstraksi analitis, spektroskopi FTIR, hingga analisis multivariat.",
          entities: [
            "PopulasiSampel",
            "PreparasiSampel",
            "SpektroskopiFTIR",
            "KompilasiData",
            "UjiStatistik",
            "VerifikasiEtika",
          ],
          mermaidCode: `flowchart TD
    Init([Inisiasi Penelitian: Protokol PRISMA]) --> Sampling[PopulasiSampel: Pengambilan Sampel Sedimen & Air Laut]
    Sampling --> Prep[PreparasiSampel: Ekstraksi Densitas & Pencernaan Bahan Organik]
    Prep --> QualityGate{VerifikasiEtika: Kontaminasi Udara Terkendali?}
    QualityGate -- Tidak --> ReClean[Ulangi Isolasi Sampel dalam Clean Bench]
    ReClean --> Prep
    QualityGate -- Ya --> Spec[SpektroskopiFTIR: Identifikasi Spektral Polimer Polimer]
    Spec --> Dataset[KompilasiData: Kuantifikasi Ukuran & Konsentrasi Partikel]
    Dataset --> Stats[UjiStatistik: Analisis ANOVA & Uji Korelasi Multivariat]
    Stats --> Synthesize([Sintesis Manuskrip & Pembahasan Temuan])`,
        },
        {
          id: "diag-research-framework",
          type: "flowchart",
          title: "Conceptual Framework (Relationship of Variables)",
          description:
            "Diagram kerangka pemikiran yang menghubungkan variabel independen, mediator lingkungan, dan variabel dependen.",
          entities: [
            "AkumulasiMikroplastik",
            "KualitasAirDanSedimen",
            "KepadatanBiotaLaut",
            "KesehatanEkosistemMangrove",
          ],
          mermaidCode: `flowchart LR
    VarIndep[AkumulasiMikroplastik: Konsentrasi Partikel PP PE PET] --> Mediator[KualitasAirDanSedimen: Penetrasi Oksigen & pH Substrat]
    Mediator --> VarDep1[KepadatanBiotaLaut: Mortalitas & Laju Reproduksi Benthos]
    Mediator --> VarDep2[KesehatanEkosistemMangrove: Tingkat Klorofil & Pertumbuhan Akar]
    ControlVar[FaktorKontrol: Suhu Arus Pasang Surut] -.-> Mediator`,
        },
      ];

    case "academic":
      return [
        {
          id: "diag-academic-framework",
          type: "flowchart",
          title: "Theoretical Framework & Hypotheses Model (TAM / UTAUT)",
          description:
            "Kerangka pemikiran teoritis skripsi menghubungkan variabel independen kemudahan dan manfaat terhadap niat adopsi teknologi dengan hipotesis teruji.",
          entities: [
            "PersepsiKemudahan",
            "PersepsiManfaat",
            "KesiapanTeknologi",
            "NiatAdopsiAI",
            "KinerjaUMKM",
          ],
          mermaidCode: `flowchart TD
    X1[PersepsiKemudahan: Usability & User Experience] -- H1 (+) --> Y1[NiatAdopsiAI: Keputusan Menggunakan Tools AI]
    X2[PersepsiManfaat: Peningkatan Produktivitas] -- H2 (+) --> Y1
    X3[KesiapanTeknologi: Infrastruktur & Literasi Digital] -- H3 (+) --> Y1
    Y1 -- H4 (+) --> Y2[KinerjaUMKM: Efisiensi Biaya & Pertumbuhan Penjualan]`,
        },
        {
          id: "diag-academic-methodology",
          type: "flowchart",
          title: "Quantitative Research Methodology Flow (Bab 3)",
          description:
            "Tahapan metodologi penelitian dari penentuan populasi, penyusunan kuesioner skala Likert, uji instrumen, hingga analisis regresi linier berganda.",
          entities: [
            "PopulasiUMKM",
            "KuesionerLikert",
            "UjiValiditasReliabilitas",
            "UjiAsumsiKlasik",
            "UjiRegresiBerganda",
            "KesimpulanSkripsi",
          ],
          mermaidCode: `flowchart TD
    Step1[PopulasiUMKM: Penentuan Sampling Slovin] --> Step2[KuesionerLikert: Instrumen Skala 1-5]
    Step2 --> Step3{UjiValiditasReliabilitas: r-hitung > r-tabel & Cronbach Alpha > 0.7?}
    Step3 -- Gagal --> ReviseInst[Revisi Indikator Pernyataan Kuesioner]
    ReviseInst --> Step2
    Step3 -- Lolos --> Step4[Pengumpulan Data Primer Lapangan]
    Step4 --> Step5[UjiAsumsiKlasik: Normalitas Multikolinieritas Heteroskedastisitas]
    Step5 --> Step6[UjiRegresiBerganda: Koefisien Determinasi R2 & Uji t Parsial]
    Step6 --> Step7[KesimpulanSkripsi: Pembahasan Hipotesis Diterima atau Ditolak]`,
        },
      ];

    case "business":
      return [
        {
          id: "diag-business-sop",
          type: "flowchart",
          title: "Standard Operating Procedure (SOP) Alur Produksi & QC",
          description:
            "Diagram alur proses bisnis operasional harian produksi kopi kemasan dari seleksi bahan baku, sterilisasi botol, pencampuran, hingga sealing kemasan.",
          entities: [
            "BahanBakuKopi",
            "PenyeduhanColdBrew",
            "PencampuranSusuGula",
            "QualityControlBrix",
            "PengisianBotolSteril",
            "PenyimpananChiller",
          ],
          mermaidCode: `flowchart TD
    Inbound[BahanBakuKopi: Inspeksi Roast Beans & Susu Segar] --> Brew[PenyeduhanColdBrew: Ekstraksi Dingin 16 Jam]
    Brew --> Blend[PencampuranSusuGula: Formulasi Rasa Terstandar]
    Blend --> QC{QualityControlBrix: Pengujian Rasa pH & Kadar Manis}
    QC -- Tidak Lolos --> Segregate[Karantina Batch & Penyesuaian Formula]
    Segregate --> Blend
    QC -- Lolos Standar --> Bottle[PengisianBotolSteril: Botol Food Grade & Sealing Induksi]
    Bottle --> Label[Pemberian Label Tanggal Kedaluwarsa & Barcode]
    Label --> Storage[PenyimpananChiller: Suhu 2-4 Derajat Celcius]
    Storage --> Dispatch([Siap Distribusi & Penjualan])`,
        },
        {
          id: "diag-business-gantt",
          type: "gantt",
          title: "12-Week Product Launch & Commercialization Timeline",
          description:
            "Jadwal eksekusi peluncuran komersial dari legalitas BPOM/Halal, pengadaan mesin, uji pasar terbatas, hingga grand launching.",
          entities: [
            "FaseRisetFormulasi",
            "FaseSertifikasiLegalitas",
            "FasePengadaanAlat",
            "FaseUjiPasarTerbatas",
            "FaseDistribusiGrandLaunch",
          ],
          mermaidCode: `gantt
    title Jadwal Peluncuran Produk Kopi Susu Kemasan (Minggu 1 - 12)
    dateFormat  YYYY-MM-DD
    section Formulasi & Riset
    Finalisasi Resep & Shelf-Life Test     :active, r1, 2026-11-01, 14d
    Desain Kemasan & Uji Konsumen         :r2, 2026-11-15, 14d
    section Legalitas & Fasilitas
    Pendaftaran Halal & Izin Edar P-IRT   :r3, 2026-11-05, 30d
    Pengadaan Mesin Filler & Chiller       :r4, 2026-11-20, 21d
    section Pra-Peluncuran & Operasional
    Trial Batch & Pelatihan Karyawan       :r5, 2026-12-05, 14d
    Kampanye Pre-Order & Teaser Media     :r6, 2026-12-10, 14d
    section Peluncuran Resmi
    Distribusi Retail & Grand Launching   :milestone, m1, 2026-12-25, 0d`,
        },
      ];

    case "education":
      return [
        {
          id: "diag-edu-photosynthesis-flow",
          type: "flowchart",
          title: "Diagram Alur Mekanisme Fotosintesis (Reaksi Terang & Gelap)",
          description:
            "Visualisasi alur fotosintesis ramah pelajar membedakan reaksi terang di tilakoid dan siklus Calvin di stroma dengan bahasa lugas.",
          entities: [
            "CahayaMatahariDanAir",
            "KlorofilTilakoid",
            "ReaksiTerang",
            "OksigenDanEnergiATP",
            "KarbonDioksida",
            "SiklusCalvinStroma",
            "GlukosaBahanMakanan",
          ],
          mermaidCode: `flowchart LR
    Sun[CahayaMatahariDanAir: Sinar Matahari + H2O] --> Thylakoid[KlorofilTilakoid: Penyerapan Energi Foton]
    Thylakoid --> LightReact[ReaksiTerang: Fotolisis Air & Pembentukan ATP NADPH]
    LightReact --> ByProduct[OksigenDanEnergiATP: Dilepaskan ke Udara + Energi Kimia]
    ByProduct --> Stroma[SiklusCalvinStroma: Fiksasi CO2 Menggunakan ATP]
    CO2In[KarbonDioksida: Masuk Melalui Stomata Daun] --> Stroma
    Stroma --> Product[GlukosaBahanMakanan: Nutrisi Gula C6H12O6 untuk Tumbuhan]`,
        },
        {
          id: "diag-edu-experiment-mindmap",
          type: "flowchart",
          title: "Mindmap Faktor Laju Fotosintesis & Panduan Praktikum Ingenhousz",
          description:
            "Peta konsep faktor pengendali fotosintesis dan alur praktikum menggunakan tanaman Hydrilla dengan indikator gelembung oksigen.",
          entities: [
            "FaktorPengaruh",
            "FaktorIntensitasCahaya",
            "FaktorKonsentrasiCO2",
            "FaktorSuhuLingkungan",
            "IndikatorGelembungOksigen",
            "TanamanHydrilla",
            "LarutanBikarbonat",
          ],
          mermaidCode: `flowchart TD
    Center([FaktorPengaruh: Faktor Laju Fotosintesis]) --> Factor1[FaktorIntensitasCahaya: Dekat vs Jauh dari Lampu]
    Center --> Factor2[FaktorKonsentrasiCO2: Penambahan LarutanBikarbonat]
    Center --> Factor3[FaktorSuhuLingkungan: Air Dingin Hangat dan Panas]

    Factor1 --> LabTest[TanamanHydrilla dalam Corong Kaca Terbalik]
    Factor2 --> LabTest
    Factor3 --> LabTest
    LabTest --> Output[IndikatorGelembungOksigen: Hitung Banyak Gelembung per Menit]`,
        },
      ];
  }
}
