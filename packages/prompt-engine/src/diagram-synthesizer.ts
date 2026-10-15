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

export type UniversalDomainCategory =
  | "software"
  | "research"
  | "academic"
  | "business"
  | "education";

export type DomainSubtopic =
  // Software subtopics
  | "software_web3_defi"
  | "software_ecommerce_store"
  | "software_generic"
  // Research subtopics
  | "research_marine_environmental"
  | "research_generic"
  // Academic subtopics
  | "academic_technology_adoption"
  | "academic_generic"
  // Business subtopics
  | "business_aquaculture_agri"
  | "business_food_beverage"
  | "business_generic"
  // Education subtopics
  | "education_physics_circuits"
  | "education_biology_photosynthesis"
  | "education_generic";

/**
 * Mendeteksi kategori domain umum untuk pemilihan template diagram Mermaid yang tepat
 */
export function classifyUniversalDomain(
  domain: string,
  primaryGoal: string
): UniversalDomainCategory {
  const normalized = (domain + " " + primaryGoal).toLowerCase();

  // 1. Software / IT / Web3 / DeFi / Engineering (Prioritas pertama jika ada kata kunci teknologi spesifik)
  if (
    normalized.includes("smart contract") ||
    normalized.includes("blockchain") ||
    normalized.includes("defi") ||
    normalized.includes("kripto") ||
    normalized.includes("crypto") ||
    normalized.includes("token") ||
    normalized.includes("staking") ||
    normalized.includes("reentrancy") ||
    normalized.includes("solidity") ||
    normalized.includes("web3") ||
    normalized.includes("website") ||
    normalized.includes("aplikasi") ||
    normalized.includes("software") ||
    normalized.includes("backend") ||
    normalized.includes("frontend") ||
    normalized.includes("database") ||
    normalized.includes("fullstack") ||
    normalized.includes("neumorphism") ||
    normalized.includes("api")
  ) {
    return "software";
  }

  // 2. Skripsi / Tesis / Akademik
  if (
    normalized.includes("skripsi") ||
    /\btesis\b/.test(normalized) ||
    normalized.includes("disertasi") ||
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

  // 3. Riset / Sains
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

  // 4. Bisnis / Operasional / UMKM / Agribisnis / Peternakan
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
    normalized.includes("gantt") ||
    normalized.includes("lele") ||
    normalized.includes("bioflok") ||
    normalized.includes("budidaya") ||
    normalized.includes("ikan") ||
    normalized.includes("ternak") ||
    normalized.includes("peternakan") ||
    normalized.includes("pertanian")
  ) {
    return "business";
  }

  // 5. Edukasi / Pelajar / Sekolah
  if (
    normalized.includes("fotosintesis") ||
    normalized.includes("sekolah") ||
    /\b(sma|smp|sd)\b/.test(normalized) ||
    normalized.includes("praktikum") ||
    normalized.includes("pelajar") ||
    normalized.includes("siswa") ||
    normalized.includes("belajar") ||
    normalized.includes("biologi") ||
    normalized.includes("kimia") ||
    normalized.includes("fisika") ||
    normalized.includes("rangkaian listrik") ||
    normalized.includes("bohlam")
  ) {
    return "education";
  }

  // Default Software / IT
  return "software";
}

/**
 * Mendeteksi subtopik secara dinamis dari kata kunci prompt pengguna
 */
export function detectDomainSubtopic(
  domain: UniversalDomainCategory,
  text: string
): DomainSubtopic {
  const norm = text.toLowerCase();

  switch (domain) {
    case "education":
      if (
        norm.includes("listrik") ||
        norm.includes("sirkuit") ||
        norm.includes("seri") ||
        norm.includes("paralel") ||
        norm.includes("baterai") ||
        norm.includes("bohlam") ||
        norm.includes("lampu") ||
        norm.includes("fisika") ||
        norm.includes("ohm")
      ) {
        return "education_physics_circuits";
      }
      if (
        norm.includes("fotosintesis") ||
        norm.includes("klorofil") ||
        norm.includes("ingenhousz") ||
        norm.includes("daun") ||
        norm.includes("biologi")
      ) {
        return "education_biology_photosynthesis";
      }
      return "education_generic";

    case "business":
      if (
        norm.includes("lele") ||
        norm.includes("bioflok") ||
        norm.includes("budidaya") ||
        norm.includes("ikan") ||
        norm.includes("ternak") ||
        norm.includes("benih") ||
        norm.includes("panen") ||
        norm.includes("tambak") ||
        norm.includes("kolam")
      ) {
        return "business_aquaculture_agri";
      }
      if (
        norm.includes("kopi") ||
        norm.includes("minuman") ||
        norm.includes("makanan") ||
        norm.includes("kuliner") ||
        norm.includes("botol") ||
        norm.includes("kemasan") ||
        norm.includes("f&b")
      ) {
        return "business_food_beverage";
      }
      return "business_generic";

    case "software":
      if (
        norm.includes("smart contract") ||
        norm.includes("staking") ||
        norm.includes("defi") ||
        norm.includes("kripto") ||
        norm.includes("token") ||
        norm.includes("unstake") ||
        norm.includes("reentrancy") ||
        norm.includes("solidity") ||
        norm.includes("web3")
      ) {
        return "software_web3_defi";
      }
      if (
        norm.includes("toko") ||
        norm.includes("kue") ||
        norm.includes("katalog") ||
        norm.includes("belanja") ||
        norm.includes("ecommerce") ||
        norm.includes("produk") ||
        norm.includes("neumorphism")
      ) {
        return "software_ecommerce_store";
      }
      return "software_generic";

    case "research":
      if (
        norm.includes("mikroplastik") ||
        norm.includes("laut") ||
        norm.includes("sedimen") ||
        norm.includes("mangrove") ||
        norm.includes("biota")
      ) {
        return "research_marine_environmental";
      }
      return "research_generic";

    case "academic":
      if (
        norm.includes("adopsi") ||
        norm.includes("tam") ||
        norm.includes("utaut") ||
        norm.includes("teknologi") ||
        norm.includes("ai") ||
        norm.includes("umkm")
      ) {
        return "academic_technology_adoption";
      }
      return "academic_generic";
  }
}

/**
 * Sanitasi string mentah menjadi Node ID Mermaid yang valid (alfanumerik + underscore)
 */
export function sanitizeMermaidNodeId(raw: string): string {
  if (!raw || typeof raw !== "string") return "Node_Entity";
  let cleaned = raw
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, " ")
    .trim();
  cleaned = cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
  if (!cleaned || !/^[a-zA-Z_]/.test(cleaned)) {
    cleaned = `Node_${cleaned || "Entity"}`;
  }
  return cleaned;
}

/**
 * Sanitasi label teks agar tidak merusak parser diagram Mermaid dan ramah visual
 */
export function sanitizeMermaidLabel(raw: string, maxLength = 45): string {
  if (!raw || typeof raw !== "string") return "";
  let cleaned = raw
    .replace(/[\r\n\t]+/g, " ")
    .replace(/["“”]/g, "'") // ganti kutip ganda ke kutip tunggal aman
    .replace(/[[\]]/g, "") // hapus kurung siku agar tidak merusak kontainer [Label]
    .replace(/[;]/g, " -") // ubah titik koma jadi tanda strip
    .replace(/[|]/g, "/") // ubah pipe agar tidak merusak sintaks relasi |label|
    .replace(/[{}]/g, "") // hapus kurung kurawal
    .replace(/\s+/g, " ")
    .trim();

  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength - 3).trim() + "...";
  }
  return cleaned;
}

/**
 * Validasi sintaks mendalam untuk memastikan diagram Mermaid aman dari kesalahan render
 */
export function validateMermaidSyntaxDeep(mermaidCode: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  nodeCount: number;
} {
  const trimmed = mermaidCode.trim();
  const errors: string[] = [];
  const warnings: string[] = [];

  const validHeaders = [
    "erDiagram",
    "flowchart",
    "graph",
    "gantt",
    "mindmap",
    "classDiagram",
    "sequenceDiagram",
    "stateDiagram",
    "pie",
  ];

  const firstLine = trimmed.split("\n")[0].trim();
  const hasValidHeader = validHeaders.some((h) => firstLine.startsWith(h));

  if (!hasValidHeader) {
    errors.push(
      `Header Mermaid tidak valid: '${firstLine}'. Wajib diawali salah satu: ${validHeaders.join(", ")}`
    );
  }

  // Cek keseimbangan kurung kurawal, siku, dan kurung biasa pada flowchart & mindmap
  if (!firstLine.startsWith("erDiagram")) {
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Kurung kurawal '{' (${openBraces}) vs '}' (${closeBraces}) tidak seimbang.`);
    }

    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push(`Kurung siku '[' (${openBrackets}) vs ']' (${closeBrackets}) tidak seimbang.`);
    }

    const openParens = (trimmed.match(/\(/g) || []).length;
    const closeParens = (trimmed.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push(`Kurung biasa '(' (${openParens}) vs ')' (${closeParens}) tidak seimbang.`);
    }
  }

  // Hitung perkiraan node untuk layout guard
  const nodeMatches = trimmed.match(/^\s*([a-zA-Z0-9_]+)(\[|\(|\{|\()|^\s*([a-zA-Z0-9_]+)\s*-->/gm);
  const nodeCount = nodeMatches ? new Set(nodeMatches.map((m) => m.trim().split(/[\s[(\{]/)[0])).size : 0;

  if (nodeCount > 15) {
    warnings.push(`Diagram memuat ${nodeCount} node. Disarankan <= 12 node agar visual tidak bertumpuk di layar kecil.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    nodeCount,
  };
}

/**
 * Menerapkan Layout Guard & Sanitasi otomatis pada seluruh spesifikasi diagram
 */
export function applyMermaidLayoutGuard(
  spec: DiagramSpecification,
  options?: { maxLabelLength?: number; maxNodes?: number }
): DiagramSpecification {
  const maxLabelLength = options?.maxLabelLength ?? 45;

  let cleanedCode = spec.mermaidCode;

  if (spec.type === "flowchart" || spec.type === "mindmap") {
    // 1. Netralkan seluruh double quote menjadi single quote agar sintaks Mermaid aman
    cleanedCode = cleanedCode.replace(/["“”]/g, "'");

    cleanedCode = cleanedCode
      .split("\n")
      .map((line) => {
        // Guard ([...])
        line = line.replace(
          /(\b[a-zA-Z0-9_]+\b)\(\[\s*(.*?)\s*\]\)/g,
          (_, id, lbl) => `${id}([${sanitizeMermaidLabel(lbl, maxLabelLength)}])`
        );
        // Guard [...]
        line = line.replace(
          /(\b[a-zA-Z0-9_]+\b)\[\s*(.*?)\s*\]/g,
          (_, id, lbl) => `${id}[${sanitizeMermaidLabel(lbl, maxLabelLength)}]`
        );
        // Guard {...}
        line = line.replace(
          /(\b[a-zA-Z0-9_]+\b)\{\s*(.*?)\s*\}/g,
          (_, id, lbl) => `${id}{${sanitizeMermaidLabel(lbl, maxLabelLength)}}`
        );
        // Guard relation label |---> or |label|
        line = line.replace(/\|([^|]+)\|/g, (_, lbl) => `|${sanitizeMermaidLabel(lbl, 30)}|`);
        return line;
      })
      .join("\n");
  }

  // Sanitasi entitas list
  const sanitizedEntities = spec.entities.map((e) => sanitizeMermaidNodeId(e));

  return {
    ...spec,
    mermaidCode: cleanedCode,
    entities: sanitizedEntities,
  };
}

/**
 * Menghasilkan spesifikasi diagram Mermaid.js polimorfik yang selaras dengan domain & subtopik pengguna
 */
export function synthesizeUniversalDiagrams(
  input: DiagramSynthesisInput
): DiagramSpecification[] {
  const category = classifyUniversalDomain(input.domain, input.primaryGoal);
  const subtopic = detectDomainSubtopic(category, input.primaryGoal);

  let rawDiagrams: DiagramSpecification[];
  switch (category) {
    case "education":
      rawDiagrams = synthesizeEducationDiagrams(subtopic, input.primaryGoal);
      break;
    case "business":
      rawDiagrams = synthesizeBusinessDiagrams(subtopic, input.primaryGoal);
      break;
    case "software":
      rawDiagrams = synthesizeSoftwareDiagrams(subtopic, input.primaryGoal);
      break;
    case "research":
      rawDiagrams = synthesizeResearchDiagrams(subtopic, input.primaryGoal);
      break;
    case "academic":
      rawDiagrams = synthesizeAcademicDiagrams(subtopic, input.primaryGoal);
      break;
  }

  // Amankan seluruh diagram melalui Layout Guard & Sanitasi Karakter
  return rawDiagrams.map((spec) => applyMermaidLayoutGuard(spec));
}

// -------------------------------------------------------------
// 1. EDUCATION DIAGRAMS
// -------------------------------------------------------------
function synthesizeEducationDiagrams(
  subtopic: DomainSubtopic,
  goal: string
): DiagramSpecification[] {
  if (subtopic === "education_physics_circuits") {
    return [
      {
        id: "diag-physics-circuit-flow",
        type: "flowchart",
        title: "Diagram Alur Pengaliran Arus & Karakteristik Rangkaian Seri vs Paralel",
        description:
          "Visualisasi alur aliran arus listrik DC dari baterai melewati saklar menuju rangkaian seri dan paralel dengan pengukuran voltmeter dan amperemeter.",
        mermaidCode: `flowchart TD
    Start([Mulai: Rangkaian Sumber Daya Listrik]) --> Batt[SumberTeganganBaterai: Beda Potensial Listrik DC]
    Batt --> Switch[SaklarPemutusSirkuit: Pengontrol Aliran Arus Aman]
    Switch --> ModeCheck{Pilihan Topologi Sirkuit}
    ModeCheck -- Konfigurasi Seri --> SeriesPath[RangkaianSeriSatuJalur: Arus Sama di Seluruh Titik BebanLampuBohlam]
    ModeCheck -- Konfigurasi Paralel --> ParallelPath[RangkaianParalelBercabang: Tegangan Sama Tiap Cabang BebanLampuBohlam]
    SeriesPath --> Measure[PengukuranArusDanTegangan: Multimeter Amperemeter & Voltmeter]
    ParallelPath --> Measure
    Measure --> Analysis[Analisis Hukum Ohm V=IR & Nyala Terang BebanLampuBohlam]
    Analysis --> SafetyDone[ProtokolKeamanan: Buka Saklar & Pelepasan Baterai Aman]`,
        entities: [
          "SumberTeganganBaterai",
          "SaklarPemutusSirkuit",
          "RangkaianSeriSatuJalur",
          "RangkaianParalelBercabang",
          "BebanLampuBohlam",
          "PengukuranArusDanTegangan",
        ],
      },
      {
        id: "diag-physics-circuit-mindmap",
        type: "flowchart",
        title: "Peta Konsep & Komponen Dasar Rangkaian Listrik Praktikum Sekolah",
        description:
          "Peta konsep menyeluruh komponen sirkuit, hukum dasar kelistrikan (Ohm dan Kirchhoff), instrumen pengukuran, dan protokol keselamatan lab.",
        mermaidCode: `flowchart TD
    Core([Rangkaian Listrik Dasar]) --> Comp[KomponenSirkuit: SumberTeganganBaterai KabelPenghubung Saklar BebanLampuBohlam]
    Core --> Laws[HukumDasarKelistrikan: Hukum Ohm V=IR & Hukum Kirchhoff Arus/Tegangan]
    Core --> Config[KarakteristikSirkuit: RangkaianSeriSatuJalur Hambatan Total Naik vs RangkaianParalelBercabang Hambatan Turun]
    Core --> Tools[InstrumenPengukuran: PengukuranArusDanTegangan Voltmeter & Amperemeter]
    Core --> Safety[ProtokolKeselamatanListrik: Pencegahan Korsleting Langsung & Penanganan Baterai]`,
        entities: [
          "KomponenSirkuit",
          "HukumDasarKelistrikan",
          "KarakteristikSirkuit",
          "InstrumenPengukuran",
          "ProtokolKeselamatanListrik",
        ],
      },
    ];
  }

  if (subtopic === "education_biology_photosynthesis") {
    return [
      {
        id: "diag-edu-photosynthesis-flow",
        type: "flowchart",
        title: "Diagram Alur Mekanisme Fotosintesis (Reaksi Terang & Gelap)",
        description:
          "Visualisasi alur fotosintesis ramah pelajar membedakan reaksi terang di tilakoid dan siklus Calvin di stroma dengan bahasa lugas.",
        mermaidCode: `flowchart LR
    Sun[CahayaMatahariDanAir: Sinar Matahari + H2O] --> Thylakoid[KlorofilTilakoid: Penyerapan Energi Foton]
    Thylakoid --> LightReact[ReaksiTerang: Fotolisis Air & Pembentukan ATP NADPH]
    LightReact --> ByProduct[OksigenDanEnergiATP: Dilepaskan ke Udara + Energi Kimia]
    ByProduct --> Stroma[SiklusCalvinStroma: Fiksasi CO2 Menggunakan ATP]
    CO2In[KarbonDioksida: Masuk Melalui Stomata Daun] --> Stroma
    Stroma --> Product[GlukosaBahanMakanan: Nutrisi Gula C6H12O6 untuk Tumbuhan]`,
        entities: [
          "CahayaMatahariDanAir",
          "KlorofilTilakoid",
          "ReaksiTerang",
          "OksigenDanEnergiATP",
          "KarbonDioksida",
          "SiklusCalvinStroma",
          "GlukosaBahanMakanan",
        ],
      },
      {
        id: "diag-edu-experiment-mindmap",
        type: "flowchart",
        title: "Mindmap Faktor Laju Fotosintesis & Panduan Praktikum Ingenhousz",
        description:
          "Peta konsep faktor pengendali fotosintesis dan alur praktikum menggunakan tanaman Hydrilla dengan indikator gelembung oksigen.",
        mermaidCode: `flowchart TD
    Center([FaktorPengaruh: Faktor Laju Fotosintesis]) --> Factor1[FaktorIntensitasCahaya: Dekat vs Jauh dari Lampu]
    Center --> Factor2[FaktorKonsentrasiCO2: Penambahan LarutanBikarbonat]
    Center --> Factor3[FaktorSuhuLingkungan: Air Dingin Hangat dan Panas]

    Factor1 --> LabTest[TanamanHydrilla dalam Corong Kaca Terbalik]
    Factor2 --> LabTest
    Factor3 --> LabTest
    LabTest --> Output[IndikatorGelembungOksigen: Hitung Banyak Gelembung per Menit]`,
        entities: [
          "FaktorPengaruh",
          "FaktorIntensitasCahaya",
          "FaktorKonsentrasiCO2",
          "FaktorSuhuLingkungan",
          "IndikatorGelembungOksigen",
          "TanamanHydrilla",
          "LarutanBikarbonat",
        ],
      },
    ];
  }

  // Generic Education
  return [
    {
      id: "diag-edu-generic-flow",
      type: "flowchart",
      title: "Diagram Alur Pembelajaran Konsep & Praktikum Siswa",
      description: "Alur tahapan pemahaman teori hingga eksperimen mandiri yang aman.",
      mermaidCode: `flowchart TD
    Start([Konsep Awal]) --> Theory[TeoriDasarDanPrinsip]
    Theory --> Demo[DemonstrasiInteraktif]
    Demo --> Practice[EksperimenLaboratoriumAman]
    Practice --> Observe[PengamatanDataDanHasil]
    Observe --> Conclude[KesimpulanDanRefleksiSains]`,
      entities: [
        "TeoriDasarDanPrinsip",
        "DemonstrasiInteraktif",
        "EksperimenLaboratoriumAman",
        "PengamatanDataDanHasil",
        "KesimpulanDanRefleksiSains",
      ],
    },
    {
      id: "diag-edu-generic-mindmap",
      type: "flowchart",
      title: "Peta Konsep Materi & Panduan Belajar Mandiri",
      description: "Peta keterkaitan antar konsep ilmiah dan aplikasi nyata.",
      mermaidCode: `flowchart TD
    Core([Subjek Materi Pembelajaran]) --> Fund[KonsepKunciDanDefinisi]
    Core --> App[AplikasiDuniaNyata]
    Core --> Lab[ProsedurPraktikumAman]
    Core --> Eval[KuisEvaluasiPemahaman]`,
      entities: [
        "KonsepKunciDanDefinisi",
        "AplikasiDuniaNyata",
        "ProsedurPraktikumAman",
        "KuisEvaluasiPemahaman",
      ],
    },
  ];
}

// -------------------------------------------------------------
// 2. BUSINESS DIAGRAMS
// -------------------------------------------------------------
function synthesizeBusinessDiagrams(
  subtopic: DomainSubtopic,
  goal: string
): DiagramSpecification[] {
  if (subtopic === "business_aquaculture_agri") {
    return [
      {
        id: "diag-aquaculture-sop-flow",
        type: "flowchart",
        title: "SOP Standar Operasional Budidaya Ikan Lele Sistem Bioflok (Tebar Benih s/d Panen)",
        description:
          "Diagram alur operasional standar budidaya ikan lele sistem bioflok mulai dari sterilisasi kolam terpal, pembentukan kultur flok probiotik, pemberian pakan berdasar FCR, kontrol kualitas air harian, hingga panen dan grading.",
        mermaidCode: `flowchart TD
    Init([Inisiasi Siklus Budidaya]) --> Prep[PersiapanKolamDanAir: Sterilisasi Kolam Terpal & Pengisian Air]
    Prep --> Biofloc[KulturFlokProbiotik: Inokulasi Bakteri Bacillus & Molase Aerasi 24 Jam]
    Biofloc --> CheckWater{Kualitas Air Terbentuk?}
    CheckWater -- Belum Stabil --> Biofloc
    CheckWater -- Siap --> Stocking[AklimatisasiBenihLele: Tebar Benih Ukuran Seragam & Karantina Awal]
    Stocking --> Feed[PemberianPakanFCR: Manajemen Pakan Pelet Terjadwal & Suplementasi Probiotik]
    Feed --> WaterCheck[MonitoringKualitasAir: Pengujian Harian DO Oksigen pH Suhu & Volume Flok Imhoff]
    WaterCheck --> Sample[SamplingPertumbuhanLele: Pengukuran Berkala Bobot Biomassa & Sortir Ukuran]
    Sample --> HarvestReady{Memenuhi Bobot Panen 8-10 Ekor/Kg?}
    HarvestReady -- Belum --> Feed
    HarvestReady -- Ya --> Harvest[PanenDanSortirGrading: Pengeringan Bertahap & Penimbangan Hasil Panen]
    Harvest --> End([Siklus Selesai: Distribusi & Sanitasi Kolam])`,
        entities: [
          "PersiapanKolamDanAir",
          "KulturFlokProbiotik",
          "AklimatisasiBenihLele",
          "PemberianPakanFCR",
          "MonitoringKualitasAir",
          "SamplingPertumbuhanLele",
          "PanenDanSortirGrading",
        ],
      },
      {
        id: "diag-aquaculture-gantt",
        type: "gantt",
        title: "Timeline Operasional Siklus Budidaya Lele Bioflok 90 Hari (3 Bulan)",
        description:
          "Jadwal eksekusi operasional budidaya bioflok 90 hari terbagi atas fase persiapan air, pemeliharaan benih, kontrol pertumbuhan flok, hingga pemanenan.",
        mermaidCode: `gantt
    title Jadwal Operasional Siklus Budidaya Lele Bioflok (90 Hari)
    dateFormat YYYY-MM-DD
    section Konstruksi & Persiapan Air
    PersiapanKolamDanAir                        :done, s1, 2026-11-01, 7d
    KulturFlokProbiotik Molase & Aerasi          :active, s2, 2026-11-08, 7d
    section Penebaran & Pemeliharaan Awal
    AklimatisasiBenihLele Karantina Awal         :s3, 2026-11-15, 3d
    PemberianPakanFCR Starter Pelet 38%          :s4, 2026-11-18, 25d
    section Pemeliharaan Lanjutan & Monitoring
    MonitoringKualitasAir Uji Harian DO pH       :s5, 2026-11-15, 75d
    SamplingPertumbuhanLele Sortir Ukuran        :s6, 2026-12-15, 35d
    section Pemanenan & Pasca Panen
    PanenDanSortirGrading Total Bobot Bersih     :milestone, m1, 2027-01-30, 0d
    Sanitasi Kolam Persiapan Siklus Berikutnya   :s7, 2027-01-31, 5d`,
        entities: [
          "PersiapanKolamDanAir",
          "KulturFlokProbiotik",
          "AklimatisasiBenihLele",
          "PemberianPakanFCR",
          "MonitoringKualitasAir",
          "SamplingPertumbuhanLele",
          "PanenDanSortirGrading",
        ],
      },
    ];
  }

  if (subtopic === "business_food_beverage") {
    return [
      {
        id: "diag-business-sop",
        type: "flowchart",
        title: "Standard Operating Procedure (SOP) Alur Produksi & QC",
        description:
          "Diagram alur proses bisnis operasional harian produksi kopi kemasan dari seleksi bahan baku, sterilisasi botol, pencampuran, hingga sealing kemasan.",
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
        entities: [
          "BahanBakuKopi",
          "PenyeduhanColdBrew",
          "PencampuranSusuGula",
          "QualityControlBrix",
          "PengisianBotolSteril",
          "PenyimpananChiller",
        ],
      },
      {
        id: "diag-business-gantt",
        type: "gantt",
        title: "12-Week Product Launch & Commercialization Timeline",
        description:
          "Jadwal eksekusi peluncuran komersial dari legalitas BPOM/Halal, pengadaan mesin, uji pasar terbatas, hingga grand launching.",
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
        entities: [
          "FaseRisetFormulasi",
          "FaseSertifikasiLegalitas",
          "FasePengadaanAlat",
          "FaseUjiPasarTerbatas",
          "FaseDistribusiGrandLaunch",
        ],
      },
    ];
  }

  // Generic Business
  return [
    {
      id: "diag-biz-generic-sop",
      type: "flowchart",
      title: "SOP Standar Operasional Alur Eksekusi Bisnis & Quality Control",
      description: "Alur standar operasional pelaksanaan tugas bisnis dengan kontrol kualitas.",
      mermaidCode: `flowchart TD
    Init([Inisiasi Pesanan / Pekerjaan]) --> InputCheck[ValidasiKebutuhanKlien]
    InputCheck --> Process[EksekusiOperasionalTerstandar]
    Process --> QualityAudit{PemeriksaanStandarMutu}
    QualityAudit -- Tidak Memenuhi --> Revision[PerbaikanDanPenyesuaian]
    Revision --> Process
    QualityAudit -- Memenuhi Standar --> FinalApproval[PersetujuanManajemen]
    FinalApproval --> Handover([PenyerahanProdukDanLayanan])`,
      entities: [
        "ValidasiKebutuhanKlien",
        "EksekusiOperasionalTerstandar",
        "PemeriksaanStandarMutu",
        "PersetujuanManajemen",
        "PenyerahanProdukDanLayanan",
      ],
    },
    {
      id: "diag-biz-generic-gantt",
      type: "gantt",
      title: "Timeline Eksekusi Strategis Bisnis Terstruktur",
      description: "Jadwal tahapan proyek bisnis multi-minggu.",
      mermaidCode: `gantt
    title Timeline Rencana Strategis Bisnis
    dateFormat YYYY-MM-DD
    section Perencanaan & Desain
    Analisis Pasar & Studi Kelayakan Finansial  :done, g1, 2026-11-01, 14d
    Penyusunan SOP & Alokasi Sumber Daya        :active, g2, 2026-11-15, 14d
    section Eksekusi Operasional
    Pengadaan Fasilitas & Uji Coba Operasional :g3, 2026-12-01, 21d
    Peluncuran Komersial & Evaluasi Kinerja     :milestone, m1, 2026-12-25, 0d`,
      entities: [
        "AnalisisPasarDanKelayakan",
        "PenyusunanSOPDanAlokasi",
        "PengadaanDanUjiOperasional",
        "PeluncuranDanEvaluasiKPI",
      ],
    },
  ];
}

// -------------------------------------------------------------
// 3. SOFTWARE DIAGRAMS
// -------------------------------------------------------------
function synthesizeSoftwareDiagrams(
  subtopic: DomainSubtopic,
  goal: string
): DiagramSpecification[] {
  if (subtopic === "software_web3_defi") {
    return [
      {
        id: "diag-web3-staking-erd",
        type: "erd",
        title: "Smart Contract Staking Data & State Model (Solidity / EVM Schema)",
        description:
          "Skema relasional & penyimpanan state on-chain mencakup akun staker, posisi deposit, pencatatan reward, reentrancy guard, dan kalkulasi penalti unstake dini.",
        mermaidCode: `erDiagram
    StakerAccount ||--o{ DepositPosition : "holds"
    StakingPoolContract ||--o{ DepositPosition : "manages"
    DepositPosition ||--o{ RewardDistribution : "accrues"
    DepositPosition ||--o{ EarlyUnstakePenalty : "penalizesOnEarlyExit"
    StakingPoolContract ||--|| TokenVaultLedger : "reserves"
    StakingPoolContract ||--|| ReentrancyGuardShield : "protects"

    StakerAccount {
        address walletAddress PK
        uint256 nonce
        bool isBlacklisted
        uint256 totalStakedBalance
    }
    StakingPoolContract {
        address poolAddress PK
        address stakingTokenAddress FK
        address rewardTokenAddress FK
        uint256 totalPoolDeposits
        uint256 rewardRatePerBlock
        uint256 minLockDurationSec
        uint256 earlyPenaltyBasisPoints
    }
    DepositPosition {
        uint256 depositId PK
        address stakerAddress FK
        uint256 principalAmount
        uint256 depositTimestamp
        uint256 unlockTimestamp
        uint256 lastClaimTimestamp
        bool hasWithdrawn
    }
    RewardDistribution {
        uint256 distributionId PK
        uint256 depositId FK
        uint256 accruedReward
        uint256 claimedReward
        uint256 lastRewardIndex
    }
    EarlyUnstakePenalty {
        uint256 penaltyId PK
        uint256 depositId FK
        uint256 penaltyAmountBurned
        uint256 penaltyAmountToTreasury
        uint256 actualWithdrawTimestamp
    }
    TokenVaultLedger {
        address vaultAddress PK
        uint256 lockedUnderlyingTokens
        uint256 allocatedRewardReserve
        bool isEmergencyPaused
    }
    ReentrancyGuardShield {
        uint256 statusFlag PK
        uint256 entryTimestamp
    }`,
        entities: [
          "StakerAccount",
          "StakingPoolContract",
          "DepositPosition",
          "RewardDistribution",
          "EarlyUnstakePenalty",
          "TokenVaultLedger",
          "ReentrancyGuardShield",
        ],
      },
      {
        id: "diag-web3-staking-flow",
        type: "flowchart",
        title: "Staking & Early Unstake Penalty Transaction Flow (Checks-Effects-Interactions)",
        description:
          "Alur mutasi fungsi staking & unstake dengan mitigasi serangan reentrancy (ReentrancyGuard), pengecekan periode lock time, dan eksekusi penalti dini secara atomik.",
        mermaidCode: `flowchart TD
    Start([User Transaksi: Stake / Unstake]) --> GuardCheck{ReentrancyGuardShield: Status Mutex Aman?}
    GuardCheck -- Terdeteksi Reentrancy --> RevertReentrancy[Revert: Proteksi Serangan Reentrancy 0xReentrantCall]
    GuardCheck -- Aman: Kunci Mutex --> StateCheck{Jenis Transaksi Eksekusi}
    StateCheck -- Deposit Staking --> CheckAllowance[Validasi Allowance ERC20 & Saldo Token Pengguna]
    CheckAllowance -- Saldo Kurang --> RevertAllowance[Revert: Insufficient Allowance or Balance]
    CheckAllowance -- Saldo Cukup --> RecordPosition[DepositPosition: Catat Pokok Setoran & Timestamp Terkunci]
    RecordPosition --> TransferIn[TokenVaultLedger: TransferFrom Token Masuk ke Brankas Kontrak]
    TransferIn --> ResetGuard[Buka Kembali ReentrancyGuardShield]
    ResetGuard --> Success([Transaksi Berhasil Dieksekusi])

    StateCheck -- Unstake Penarikan --> TimeCheck{Waktu Kunci: Sekarang >= UnlockTimestamp?}
    TimeCheck -- Ya: Periode Selesai Penuh --> CalcReward[RewardDistribution: Hitung Akumulasi Reward Penuh]
    CalcReward --> TransferOut[TokenVaultLedger: Transfer Modal Pokok + Reward ke StakerAccount]
    TimeCheck -- Tidak: Unstake Dini --> ApplyPenalty[EarlyUnstakePenalty: Potong Penalti Berdasarkan Basis Points]
    ApplyPenalty --> SplitBurnTreasury[Eksekusi Burn Penalti / Transfer ke Treasury Pool]
    SplitBurnTreasury --> TransferResidual[TokenVaultLedger: Transfer Sisa Modal Bersih ke StakerAccount]
    TransferOut --> ResetGuard
    TransferResidual --> ResetGuard`,
        entities: [
          "StakerAccount",
          "StakingPoolContract",
          "DepositPosition",
          "RewardDistribution",
          "EarlyUnstakePenalty",
          "TokenVaultLedger",
          "ReentrancyGuardShield",
        ],
      },
    ];
  }

  // E-commerce Store / Cake Shop / Retail
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
}

// -------------------------------------------------------------
// 4. RESEARCH DIAGRAMS
// -------------------------------------------------------------
function synthesizeResearchDiagrams(
  subtopic: DomainSubtopic,
  goal: string
): DiagramSpecification[] {
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
}

// -------------------------------------------------------------
// 5. ACADEMIC DIAGRAMS
// -------------------------------------------------------------
function synthesizeAcademicDiagrams(
  subtopic: DomainSubtopic,
  goal: string
): DiagramSpecification[] {
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
}
