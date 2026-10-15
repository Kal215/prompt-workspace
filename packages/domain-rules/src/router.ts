import {
  TaskArchetype,
  TaskArchetypeEnum,
} from "@prompt-workspace/prompt-contracts";
import { DomainRulePack } from "./types.js";
import { getDomainPack, resolveDomainId } from "./registry.js";

export interface TaskRouteResult {
  archetype: TaskArchetype;
  domainId: string;
  pack: DomainRulePack;
  confidence: number;
  signals: string[];
}

interface PatternRule {
  archetype: TaskArchetype;
  domainId: string;
  weight: number;
  patterns: RegExp[];
  keywordSignals: string[];
}

const PATTERN_RULES: PatternRule[] = [
  // 1. Debugging & Investigation
  {
    archetype: "debugging_investigation",
    domainId: "debugging",
    weight: 12,
    patterns: [
      /\b(?:perbaiki|fix|debug|investigasi|troubleshoot|selidiki)\b/i,
      /\b(?:bug|error|crash|gagal login|exception|stack trace|tidak jalan|hang|memory leak)\b/i,
      /\bperbaiki bug\b/i,
      /\blogin.*(?:gagal|error|tidak bisa)\b/i,
    ],
    keywordSignals: ["bug", "error", "crash", "perbaiki", "gagal login", "investigasi"],
  },

  // 2. Data Analysis
  {
    archetype: "data_analysis",
    domainId: "general",
    weight: 11,
    patterns: [
      /\b(?:analisis data|analisa data|data analysis|cari pola|temukan pola)\b/i,
      /\b(?:dataset|dataframe|csv|distribusi data|regresi|korelasi|agregasi data)\b/i,
      /\b(?:metrik penjualan|statistik|tren penjualan|data mining)\b/i,
    ],
    keywordSignals: ["analisis data", "cari pola", "dataset", "metrik penjualan", "statistik"],
  },

  // 3. UI/UX Design
  {
    archetype: "ui_ux_design",
    domainId: "coding",
    weight: 11,
    patterns: [
      /\b(?:dashboard modern|desain tampilan|ui\/ux|ui & ux|wireframe|mockup visual)\b/i,
      /\b(?:komponen visual|antarmuka pengguna|user interface|user experience|tata letak dashboard)\b/i,
      /\b(?:hierarki visual|design system|figma|responsivitas ui)\b/i,
    ],
    keywordSignals: ["dashboard modern", "desain tampilan", "ui/ux", "wireframe", "komponen visual"],
  },

  // 4. Research & Comparison
  {
    archetype: "research_comparison",
    domainId: "academic_writing",
    weight: 10,
    patterns: [
      /\b(?:bandingkan|komparasi|perbandingan|compare|evaluasi perbandingan)\b/i,
      /\b(?:riset|kajian|tinjauan pustaka|studi literatur|esai akademik)\b/i,
      /\b(?:trade-offs?|kelebihan dan kekurangan|pro dan kontra|analisis database)\b/i,
    ],
    keywordSignals: ["bandingkan", "riset", "kajian", "komparasi", "database yang cocok"],
  },

  // 5. Education & Curriculum
  {
    archetype: "education_curriculum",
    domainId: "general",
    weight: 10,
    patterns: [
      /\b(?:ajari saya|ajarkan|belajar dari nol|panduan belajar|kurikulum|silabus)\b/i,
      /\b(?:jelaskan konsep|tutorial langkah demi langkah|materi pembelajaran|edukasi)\b/i,
      /\b(?:dasar machine learning|pemula|roadmap belajar)\b/i,
    ],
    keywordSignals: ["ajari saya", "belajar dari nol", "jelaskan konsep", "tutorial", "kurikulum"],
  },

  // 6. Business Strategy & Roadmap
  {
    archetype: "business_strategy",
    domainId: "business_strategy",
    weight: 10,
    patterns: [
      /\b(?:riset pasar|market research|kelayakan bisnis|feasibility)\b/i,
      /\b(?:roadmap produk|rencana bisnis|model bisnis|analisis kompetitor|go-to-market)\b/i,
      /\b(?:validasi pasar|strategi monetisasi|unit ekonomi)\b/i,
    ],
    keywordSignals: ["riset pasar", "kelayakan bisnis", "roadmap produk", "analisis bisnis"],
  },

  // 7. Software / Web Engineering
  {
    archetype: "software_engineering",
    domainId: "coding",
    weight: 10,
    patterns: [
      /\b(?:buat website|bikin web|bangun aplikasi|buat script|buat aplikasi)\b/i,
      /\b(?:website toko kue|toko online|ecommerce|fitur stok barang|laporan penjualan|pos|point of sale)\b/i,
      /\b(?:backend|frontend|fullstack|rest api|database|crud|endpoint|microservice)\b/i,
      /\b(?:kode python|javascript|typescript|react|next\.js|node\.js|sql|prisma)\b/i,
      /\b(?:arsitektur sistem|software engineering|repositori|refactor kode)\b/i,
    ],
    keywordSignals: [
      "buat website",
      "stok barang",
      "laporan penjualan",
      "bangun aplikasi",
      "buat script",
      "software engineering",
    ],
  },
];

/**
 * Pemetaan eksplisit taskType ke pasangan Archetype & DomainId
 */
const EXPLICIT_TASK_MAPPINGS: Record<
  string,
  { archetype: TaskArchetype; domainId: string }
> = {
  software_engineering: { archetype: "software_engineering", domainId: "coding" },
  "software-engineering": { archetype: "software_engineering", domainId: "coding" },
  software_development: { archetype: "software_engineering", domainId: "coding" },
  "software-development": { archetype: "software_engineering", domainId: "coding" },
  coding: { archetype: "software_engineering", domainId: "coding" },
  programming: { archetype: "software_engineering", domainId: "coding" },

  debugging_investigation: { archetype: "debugging_investigation", domainId: "debugging" },
  "debugging-investigation": { archetype: "debugging_investigation", domainId: "debugging" },
  debugging: { archetype: "debugging_investigation", domainId: "debugging" },
  debug: { archetype: "debugging_investigation", domainId: "debugging" },
  code_review: { archetype: "debugging_investigation", domainId: "debugging" },

  research_comparison: { archetype: "research_comparison", domainId: "academic_writing" },
  "research-comparison": { archetype: "research_comparison", domainId: "academic_writing" },
  academic_writing: { archetype: "research_comparison", domainId: "academic_writing" },
  "academic-writing": { archetype: "research_comparison", domainId: "academic_writing" },
  research: { archetype: "research_comparison", domainId: "academic_writing" },
  writing: { archetype: "research_comparison", domainId: "academic_writing" },

  education_curriculum: { archetype: "education_curriculum", domainId: "general" },
  "education-curriculum": { archetype: "education_curriculum", domainId: "general" },
  education: { archetype: "education_curriculum", domainId: "general" },
  tutorial: { archetype: "education_curriculum", domainId: "general" },

  data_analysis: { archetype: "data_analysis", domainId: "general" },
  "data-analysis": { archetype: "data_analysis", domainId: "general" },
  data: { archetype: "data_analysis", domainId: "general" },

  ui_ux_design: { archetype: "ui_ux_design", domainId: "coding" },
  "ui-ux-design": { archetype: "ui_ux_design", domainId: "coding" },
  ui_ux: { archetype: "ui_ux_design", domainId: "coding" },
  design: { archetype: "ui_ux_design", domainId: "coding" },

  business_strategy: { archetype: "business_strategy", domainId: "business_strategy" },
  "business-strategy": { archetype: "business_strategy", domainId: "business_strategy" },
  business: { archetype: "business_strategy", domainId: "business_strategy" },
  market_research: { archetype: "business_strategy", domainId: "business_strategy" },
  product_planning: { archetype: "business_strategy", domainId: "business_strategy" },

  general_operational: { archetype: "general_operational", domainId: "general" },
  general: { archetype: "general_operational", domainId: "general" },
};

/**
 * Auto-Detecting Task Router:
 * Menganalisis isi prompt, context, dan explicitTaskType untuk mendeteksi
 * TaskArchetype dan DomainRulePack secara cerdas tanpa hanya pasrah pada "general".
 */
export function detectTaskArchetypeAndDomain(
  prompt: string,
  context?: string | null,
  explicitTaskType?: string | null
): TaskRouteResult {
  const normalizedTaskType = (explicitTaskType || "").trim().toLowerCase();

  // Jika explicitTaskType diberikan dan bukan "general", gunakan jika cocok
  if (
    normalizedTaskType &&
    normalizedTaskType !== "general" &&
    EXPLICIT_TASK_MAPPINGS[normalizedTaskType]
  ) {
    const mapping = EXPLICIT_TASK_MAPPINGS[normalizedTaskType];
    const pack = getDomainPack(mapping.domainId);
    return {
      archetype: mapping.archetype,
      domainId: mapping.domainId,
      pack,
      confidence: 0.95,
      signals: [`explicit_task_type:${normalizedTaskType}`],
    };
  }

  // Jika tidak ada atau "general", periksa sinyal teks prompt & context
  const combinedText = `${prompt || ""} ${context || ""}`.trim();
  const matchedSignals: {
    rule: PatternRule;
    score: number;
    hits: string[];
  }[] = [];

  for (const rule of PATTERN_RULES) {
    let score = 0;
    const hits: string[] = [];

    for (const pattern of rule.patterns) {
      const match = combinedText.match(pattern);
      if (match) {
        score += rule.weight;
        hits.push(match[0].toLowerCase());
      }
    }

    if (score > 0) {
      matchedSignals.push({ rule, score, hits });
    }
  }

  // Pilih skor tertinggi
  if (matchedSignals.length > 0) {
    matchedSignals.sort((a, b) => b.score - a.score);
    const topMatch = matchedSignals[0];
    const pack = getDomainPack(topMatch.rule.domainId);
    return {
      archetype: topMatch.rule.archetype,
      domainId: topMatch.rule.domainId,
      pack,
      confidence: Math.min(0.95, 0.6 + topMatch.score * 0.05),
      signals: topMatch.hits,
    };
  }

  // Default fallback: general_operational
  const fallbackPack = getDomainPack("general");
  return {
    archetype: "general_operational",
    domainId: "general",
    pack: fallbackPack,
    confidence: 0.5,
    signals: ["fallback_general"],
  };
}
