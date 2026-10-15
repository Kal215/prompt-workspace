// ──────────────────────────────────────────────────────────────────
// @prompt-workspace/domain-rules — Universal Domain & Subtopic Taxonomy
// Blueprint v1.0 Bagian 4.2: Domain-aware, not domain-locked
// ──────────────────────────────────────────────────────────────────

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
  | "software_iot_telemetry"
  | "software_medical_clinic"
  | "software_personal_portfolio"
  | "software_generic"
  // Research subtopics
  | "research_marine_environmental"
  | "research_generic"
  // Academic subtopics
  | "academic_technology_adoption"
  | "academic_generic"
  // Business subtopics
  | "business_aquaculture_agri"
  | "business_manufacturing_industry"
  | "business_food_beverage"
  | "business_generic"
  // Education subtopics
  | "education_physics_circuits"
  | "education_biology_photosynthesis"
  | "education_practical_experiment"
  | "education_generic";

export interface SubtopicMetadata {
  readonly subtopicId: DomainSubtopic;
  readonly category: UniversalDomainCategory;
  readonly name: string;
  readonly description: string;
  readonly recommendedDiagrams: readonly string[];
}

export const DOMAIN_SUBTOPICS_CATALOG: readonly SubtopicMetadata[] = [
  {
    subtopicId: "software_web3_defi",
    category: "software",
    name: "Web3 & DeFi Smart Contracts",
    description: "Protokol staking, liquidity pool, audit anti-reentrancy, dan state invariant token vault.",
    recommendedDiagrams: ["erd", "flowchart"],
  },
  {
    subtopicId: "software_iot_telemetry",
    category: "software",
    name: "IoT & Satellite Telemetry",
    description: "Arsitektur telemetri sensor, time-series ingestion, deteksi anomali real-time, dan transmisi satelit.",
    recommendedDiagrams: ["dfd", "flowchart"],
  },
  {
    subtopicId: "software_medical_clinic",
    category: "software",
    name: "Healthcare & Clinic EMR",
    description: "Sistem rekam medis elektronik, triase klinik, kepatuhan ICD-10, dan audit log medis terenkripsi.",
    recommendedDiagrams: ["erd", "flowchart"],
  },
  {
    subtopicId: "software_personal_portfolio",
    category: "software",
    name: "Personal Portfolio & Showcase",
    description: "Website portofolio profesional interaktif, estetika neumorphic soft UI, dan kontak anti-spam.",
    recommendedDiagrams: ["wireframe_spec", "flowchart"],
  },
  {
    subtopicId: "software_ecommerce_store",
    category: "software",
    name: "E-Commerce & Digital Store",
    description: "Platform e-commerce, katalog produk, keranjang belanja, dan manajemen pesanan atomik.",
    recommendedDiagrams: ["erd", "flowchart"],
  },
  {
    subtopicId: "software_generic",
    category: "software",
    name: "Generic Software System",
    description: "Aplikasi perangkat lunak umum berbasis Next.js, TypeScript strict, REST API, dan basis data relasional.",
    recommendedDiagrams: ["erd", "flowchart"],
  },
  {
    subtopicId: "research_marine_environmental",
    category: "research",
    name: "Marine & Environmental Ecology",
    description: "Riset akumulasi mikroplastik laut, metodologi PRISMA, spektroskopi FTIR, dan uji multivariat.",
    recommendedDiagrams: ["mindmap", "flowchart"],
  },
  {
    subtopicId: "research_generic",
    category: "research",
    name: "Generic Scientific Research",
    description: "Metodologi penelitian ilmiah empiris, verifikasi kontrol blanko, dan manuskrip berstandar IMRaD.",
    recommendedDiagrams: ["mindmap", "flowchart"],
  },
  {
    subtopicId: "academic_technology_adoption",
    category: "academic",
    name: "Academic Thesis & Technology Adoption",
    description: "Kajian skripsi model TAM & UTAUT, kuesioner skala Likert, uji validitas/reliabilitas, dan regresi berganda.",
    recommendedDiagrams: ["mindmap", "flowchart"],
  },
  {
    subtopicId: "academic_generic",
    category: "academic",
    name: "Generic Academic Thesis",
    description: "Penulisan karya ilmiah mahasiswa, sistematika bab 1-5, landasan teori, dan kepatuhan anti-plagiasi.",
    recommendedDiagrams: ["mindmap", "flowchart"],
  },
  {
    subtopicId: "business_aquaculture_agri",
    category: "business",
    name: "Aquaculture & Agri Biofloc",
    description: "Budidaya ikan lele sistem bioflok, manajemen kualitas air DO/pH/flok, dan kalkulasi HPP transparan.",
    recommendedDiagrams: ["flowchart", "gantt"],
  },
  {
    subtopicId: "business_manufacturing_industry",
    category: "business",
    name: "Manufacturing & Industrial Processing",
    description: "Pabrik pengolahan kelapa sawit TBS ke CPO, quality control ALB, SOP perebusan, dan K3 manufaktur.",
    recommendedDiagrams: ["flowchart", "gantt"],
  },
  {
    subtopicId: "business_food_beverage",
    category: "business",
    name: "Food & Beverage Business Launch",
    description: "Produksi kopi kemasan siap minum, standar P-IRT/BPOM, struktur HPP per botol, dan timeline 12 minggu.",
    recommendedDiagrams: ["flowchart", "gantt"],
  },
  {
    subtopicId: "business_generic",
    category: "business",
    name: "Generic Business Operations",
    description: "SOP operasional bisnis, pemisahan arus kas, penetapan harga jual berbasis margin, dan mitigasi risiko.",
    recommendedDiagrams: ["flowchart", "gantt"],
  },
  {
    subtopicId: "education_physics_circuits",
    category: "education",
    name: "Physics Electric Circuits",
    description: "Rangkaian listrik seri & paralel, hukum Ohm V=IR, analogi visual aliran pipa air, dan praktikum aman DC.",
    recommendedDiagrams: ["mindmap", "flowchart"],
  },
  {
    subtopicId: "education_biology_photosynthesis",
    category: "education",
    name: "Biology Plant Photosynthesis",
    description: "Reaksi terang & gelap fotosintesis, analogi pabrik surya, dan praktikum Ingenhousz pembuktian oksigen.",
    recommendedDiagrams: ["mindmap", "flowchart"],
  },
  {
    subtopicId: "education_practical_experiment",
    category: "education",
    name: "Vocational Practical Experiment",
    description: "Praktikum kejuruan SMK, budidaya jamur tiram, sterilisasi media baglog, observasi K3, dan laporan siswa.",
    recommendedDiagrams: ["mindmap", "flowchart"],
  },
  {
    subtopicId: "education_generic",
    category: "education",
    name: "Generic Curriculum & Learning Module",
    description: "Modul pembelajaran ramah siswa, lembar kerja pengamatan terstruktur, analogi visual, dan kuis formatif.",
    recommendedDiagrams: ["mindmap", "flowchart"],
  },
];

/**
 * Mendeteksi kategori domain umum untuk pemilihan template blueprint & diagram yang tepat
 */
export function classifyUniversalDomain(
  domain: string | undefined,
  primaryGoal: string
): UniversalDomainCategory {
  const normDomain = (domain || "").toLowerCase().trim();
  const normGoal = (primaryGoal || "").toLowerCase().trim();

  // 0. Jika domain eksplisit valid sudah diberikan, hormati langsung
  if (
    normDomain === "software" ||
    normDomain === "business" ||
    normDomain === "education" ||
    normDomain === "research" ||
    normDomain === "academic"
  ) {
    return normDomain as UniversalDomainCategory;
  }

  const normalized = `${normDomain} ${normGoal}`.trim();

  // 1. Software / IT / Web3 / DeFi / Engineering (Prioritas pertama jika ada kata kunci teknologi spesifik)
  if (
    normalized.includes("smart contract") ||
    normalized.includes("blockchain") ||
    /\bdefi\b/.test(normalized) ||
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
    /\biot\b/.test(normalized) ||
    normalized.includes("telemetri") ||
    normalized.includes("sensor") ||
    normalized.includes("satelit") ||
    normalized.includes("embedded") ||
    normalized.includes("sistem informasi") ||
    normalized.includes("sistem software") ||
    normalized.includes("sistem aplikasi") ||
    normalized.includes("arsitektur sistem") ||
    normalized.includes("arsitektur software") ||
    normalized.includes("mobile") ||
    normalized.includes("android") ||
    /\bapi\b/.test(normalized)
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

  // 4. Edukasi / Pelajar / Sekolah / Modul Praktikum Kejuruan
  if (
    normalized.includes("fotosintesis") ||
    normalized.includes("sekolah") ||
    /\b(sma|smp|sd|smk)\b/.test(normalized) ||
    normalized.includes("praktikum") ||
    normalized.includes("pelajar") ||
    normalized.includes("siswa") ||
    normalized.includes("guru") ||
    normalized.includes("belajar") ||
    normalized.includes("biologi") ||
    normalized.includes("kimia") ||
    normalized.includes("fisika") ||
    normalized.includes("rangkaian listrik") ||
    normalized.includes("bohlam") ||
    normalized.includes("jamur") ||
    normalized.includes("kurikulum") ||
    normalized.includes("modul pembelajaran")
  ) {
    return "education";
  }

  // 5. Bisnis / Operasional / UMKM / Agribisnis / Manufaktur / Pabrik
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
    normalized.includes("pertanian") ||
    normalized.includes("pabrik") ||
    normalized.includes("manufaktur") ||
    normalized.includes("sawit") ||
    normalized.includes("cpo") ||
    normalized.includes("tbs") ||
    normalized.includes("industri")
  ) {
    return "business";
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
        norm.includes("daun")
      ) {
        return "education_biology_photosynthesis";
      }
      if (
        norm.includes("praktikum") ||
        norm.includes("jamur") ||
        norm.includes("laboratorium") ||
        norm.includes("smk")
      ) {
        return "education_practical_experiment";
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
        norm.includes("sawit") ||
        norm.includes("cpo") ||
        norm.includes("tbs") ||
        norm.includes("pabrik") ||
        norm.includes("manufaktur") ||
        norm.includes("industri") ||
        norm.includes("produksi") ||
        norm.includes("kilang")
      ) {
        return "business_manufacturing_industry";
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
        norm.includes("iot") ||
        norm.includes("telemetri") ||
        norm.includes("sensor") ||
        norm.includes("satelit") ||
        norm.includes("cuaca") ||
        norm.includes("embedded") ||
        norm.includes("arduino") ||
        norm.includes("esp32")
      ) {
        return "software_iot_telemetry";
      }
      if (
        norm.includes("klinik") ||
        norm.includes("pasien") ||
        norm.includes("dokter") ||
        norm.includes("rekam medis") ||
        norm.includes("rumah sakit") ||
        norm.includes("medis")
      ) {
        return "software_medical_clinic";
      }
      if (
        norm.includes("portofolio") ||
        norm.includes("portfolio") ||
        norm.includes("curriculum vitae") ||
        norm.includes("resume") ||
        norm.includes("showcase")
      ) {
        return "software_personal_portfolio";
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
