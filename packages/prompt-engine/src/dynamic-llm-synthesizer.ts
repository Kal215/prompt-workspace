import dotenv from "dotenv";
dotenv.config();

import {
  DynamicBlueprintKnowledgeGraph,
  DynamicBlueprintKnowledgeGraphSchema,
  DynamicSynthesisMetadata,
} from "@prompt-workspace/prompt-contracts";
import {
  GroqAdapter,
  CustomEndpointAdapter,
  listCustomEndpoints,
  LLMProviderAdapter,
  OpenRouterAdapter,
  GeminiAdapter,
  OllamaAdapter,
} from "@prompt-workspace/provider-adapters";

export interface DynamicExtractionParams {
  prompt: string;
  audienceLevel?: string;
  domain?: string;
  context?: string | null;
  negativeConstraints?: string[];
  forceOfflineFallback?: boolean;
}

export interface ResolvedProviderInfo {
  adapter: LLMProviderAdapter | CustomEndpointAdapter;
  providerId: string;
  model: string;
}

/**
 * Otomatis mendeteksi dan menyelesaikan provider LLM aktif dari ekosistem:
 * 1. Custom Endpoint aktif di ~/.piew/providers.json (misal: lyra-pc, 9router, local-vision)
 * 2. GroqAdapter dengan rotasi multi-key (GROQ_API_KEY_1 s/d GROQ_API_KEY_6)
 * 3. OpenRouter / Gemini / Ollama
 */
export async function resolveActiveLLMProvider(): Promise<ResolvedProviderInfo | null> {
  // 1. Cek Custom Endpoint persisten yang aktif
  try {
    const customList = await listCustomEndpoints({ includeSecrets: true });
    const activeCustom = customList.find(
      (c) => (c.isActive || c.useForNewChats) && c.endpointUrl
    );
    if (activeCustom) {
      const adapter = new CustomEndpointAdapter(activeCustom as any);
      return {
        adapter,
        providerId: activeCustom.providerId,
        model: activeCustom.defaultModel || "hermes-agent",
      };
    }
  } catch {
    // Abaikan jika direktori ~/.piew belum diinisialisasi
  }

  // 2. Cek GroqAdapter dari Environment (GROQ_API_KEY atau GROQ_API_KEY_1 s/d 6)
  const hasGroqKeys =
    Boolean(process.env.GROQ_API_KEY) ||
    Boolean(process.env.GROQ_API_KEY_1) ||
    Boolean(process.env.GROQ_API_KEYS);

  if (hasGroqKeys) {
    try {
      const groq = new GroqAdapter();
      if (groq.getAvailableKeyCount() > 0) {
        // Gunakan model openai/gpt-oss-120b atau qwen/qwen3.8-27b yang tersedia di Groq
        const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
        return {
          adapter: groq,
          providerId: "groq",
          model,
        };
      }
    } catch (err) {
      console.warn("[DynamicLLM] Groq initialization skipped:", err);
    }
  }

  // 3. Cek OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const openRouter = new OpenRouterAdapter();
      return {
        adapter: openRouter,
        providerId: "openrouter",
        model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
      };
    } catch {}
  }

  // 4. Cek Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const gemini = new GeminiAdapter();
      return {
        adapter: gemini,
        providerId: "gemini",
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      };
    } catch {}
  }

  // 5. Cek Ollama Lokal jika ada
  if (process.env.OLLAMA_BASE_URL) {
    try {
      const ollama = new OllamaAdapter({ baseURL: process.env.OLLAMA_BASE_URL });
      return {
        adapter: ollama,
        providerId: "ollama",
        model: process.env.OLLAMA_MODEL || "llama3.2",
      };
    } catch {}
  }

  return null;
}

/**
 * Ekstraktor AI Dinamis Berbasis LLM
 * Mengubah prompt pengguna menjadi DynamicBlueprintKnowledgeGraph tervalidasi Zod 100% kontekstual
 */
export async function extractDynamicBlueprintWithLLM(
  params: DynamicExtractionParams
): Promise<{
  graph: DynamicBlueprintKnowledgeGraph;
  metadata: DynamicSynthesisMetadata;
} | null> {
  if (params.forceOfflineFallback) {
    return null;
  }

  const provider = await resolveActiveLLMProvider();
  if (!provider) {
    return null;
  }

  const startTime = Date.now();
  const negativeConstraintsList = params.negativeConstraints || [];

  // Bangun System Prompt yang mewajibkan kepatuhan JSON Zod dan domain guardrails
  const systemPrompt = `You are the PIEW Dynamic Knowledge Graph & Enterprise Blueprint Synthesis Engine.
Your task is to analyze the user's prompt and extract a 100% REAL, UNIQUE, and HIGHLY CONTEXTUAL Knowledge Graph in strict JSON format.

CRITICAL RULES:
1. STRICT JSON ONLY: Output ONLY a single valid JSON object matching the requested schema. No conversational filler, no markdown fences outside the JSON.
2. ZERO GENERIC TEMPLATES: Do NOT use generic entities like "Pengguna", "Pesanan", "Produk" unless the prompt is literally a generic e-commerce store!
   - For Car Rental -> Use entities like ArmadaMobil, PelangganRental, KontrakSewa, InspeksiKendaraan, DendaKeterlambatan.
   - For Bakery Recipes -> Use entities like BahanBaku, ResepVarian, KomposisiResep, BatchProduksi, PerhitunganHPP, StokGudangTepung.
   - For Vaccine Cold Chain -> Use SOP nodes like PenerimaanVaksinPabrik, ColdStorageMonitoring, SensorSuhuIoT, PengirimanKapalAntarPulau, ValidasiRantaiDingin.
3. ABSOLUTE NEGATIVE CONSTRAINTS COMPLIANCE:
   - If the user explicitly forbids something (e.g. "Jangan buat kasir POS", "Tanpa modul POS"), you MUST NOT include ANY entity, field, workflow node, or execution task related to that forbidden concept!
   - Include all forbidden requests in "domainGuardrails.negativeConstraintsHonored".
4. ACCURACY FOR ALL DOMAINS: Handle Software, Scientific Research, Academic Theses, Business/SOP, Crypto/Web3, and Student Education seamlessly.

JSON SCHEMA STRUCTURE TO POPULATE:
{
  "projectTitle": string (Clear, specific title for this exact project),
  "domainClassification": "software_engineering" | "scientific_research" | "academic_thesis" | "enterprise_business" | "crypto_web3" | "student_education" | "general_operations",
  "domainContextSummary": string (Deep, specific context summary for this project),
  "expertCouncil": [
    { "role": string, "focus": string, "concreteResponsibility": string }
  ] (4 to 6 specific expert roles),
  "coreParameters": [
    { "name": string, "value": string, "rationale": string }
  ] (At least 3 specific project parameters),
  "explicitFacts": [string, string] (Facts stated directly in the prompt),
  "smartAssumptions": [string, string] (Realistic domain assumptions),
  "openDecisions": [
    { "decision": string, "chosenPath": string, "tradeOff": string }
  ],
  "qualityObjectives": [
    { "objective": string, "metric": string, "targetCriteria": string }
  ] (6 to 8 quantifiable objectives),
  "coreSpecification": {
    "architectureOverview": string,
    "functionalCapabilities": [string, string, string],
    "technicalStackOrMethodology": [string, string, string],
    "dataOrOperationalFlow": string
  },
  "diagramStructures": {
    "primaryDiagramType": "erDiagram" | "flowchart_td" | "flowchart_lr" | "gantt",
    "entities": [
      {
        "name": string (Alphanumeric/PascalCase only, no spaces),
        "description": string,
        "fields": [
          { "name": string, "type": string, "isPrimaryKey": boolean, "isForeignKey": boolean, "description": string }
        ]
      }
    ] (4 to 6 specific entities for software/data projects; empty if purely SOP/research),
    "relationships": [
      { "from": string, "to": string, "cardinality": "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many", "label": string }
    ],
    "workflow": {
      "diagramTitle": string,
      "flowDirection": "TD" | "LR",
      "nodes": [
        { "id": string (alphanumeric only), "label": string, "type": "start" | "process" | "decision" | "storage" | "end" }
      ],
      "edges": [
        { "from": string, "to": string, "label": string }
      ]
    }
  },
  "executionPhases": [
    {
      "phaseIndex": number (0 to 6),
      "phaseName": string,
      "goal": string,
      "concreteActions": [string, string],
      "deliverables": [
        { "name": string, "description": string }
      ]
    }
  ] (6 to 8 phases from Phase 0 to Phase Final),
  "domainGuardrails": {
    "negativeConstraintsHonored": [string],
    "antiPatternsForbidden": [string],
    "consequenceOfViolation": string
  }
}`;

  const userPrompt = `PROMPT PENGGUNA:
"""${params.prompt}"""

AUDIENCE LEVEL: ${params.audienceLevel || "specialist"}
DOMAIN OVERRIDE: ${params.domain || "auto"}
ADDITIONAL CONTEXT: ${params.context || "None provided"}
LARANGAN MUTLAK PENGGUNA (NEGATIVE CONSTRAINTS):
${negativeConstraintsList.length > 0 ? negativeConstraintsList.map((c) => `- ${c}`).join("\n") : "- Tidak ada larangan khusus"}

Please synthesize and return the complete, deeply contextual DynamicBlueprintKnowledgeGraph JSON now.`;

  try {
    const response = await provider.adapter.chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        model: provider.model,
        temperature: 0.15,
        maxTokens: 4096,
        responseFormat: "json",
      }
    );

    const latencyMs = Date.now() - startTime;
    let rawContent = response.content.trim();

    // Bersihkan pembungkus markdown jika ada
    if (rawContent.startsWith("```json")) {
      rawContent = rawContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (rawContent.startsWith("```")) {
      rawContent = rawContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsedJson = JSON.parse(rawContent);

    // Normalisasi & perbaikan otomatis jika ada array kosong atau tipe yang sedikit meleset
    const normalizedJson = normalizeKnowledgeGraphJson(
      parsedJson,
      params.prompt,
      negativeConstraintsList
    );

    const validatedGraph = DynamicBlueprintKnowledgeGraphSchema.parse(normalizedJson);

    const metadata: DynamicSynthesisMetadata = {
      synthesisMode: "live_llm_dynamic",
      providerId: provider.providerId,
      model: response.model || provider.model,
      latencyMs,
      tokensUsed: response.usage
        ? {
            promptTokens: response.usage.promptTokens,
            completionTokens: response.usage.completionTokens,
          }
        : undefined,
      generatedAt: new Date().toISOString(),
      activeNegativeConstraints: negativeConstraintsList,
    };

    return { graph: validatedGraph, metadata };
  } catch (err: any) {
    console.warn(`[DynamicLLM] Live synthesis failed (${err.message}). Falling back to deterministic synthesis.`);
    return null;
  }
}

/**
 * Memperbaiki dan menormalisasi JSON dari LLM jika ada atribut yang kurang lengkap
 */
function normalizeKnowledgeGraphJson(
  raw: any,
  originalPrompt: string,
  negativeConstraints: string[]
): any {
  const result = { ...raw };

  if (!result.projectTitle || typeof result.projectTitle !== "string") {
    result.projectTitle = originalPrompt.slice(0, 60);
  }

  if (!result.domainClassification) {
    result.domainClassification = "software_engineering";
  }

  if (!result.domainContextSummary) {
    result.domainContextSummary = `Sistem terpadu untuk ${originalPrompt}.`;
  }

  if (!Array.isArray(result.expertCouncil) || result.expertCouncil.length < 3) {
    result.expertCouncil = [
      { role: "Domain Architect", focus: "Arsitektur Inti", concreteResponsibility: "Merancang spesifikasi utama" },
      { role: "Implementation Lead", focus: "Eksekusi Sistem", concreteResponsibility: "Memimpin implementasi modul" },
      { role: "Quality Specialist", focus: "Jaminan Mutu & Audit", concreteResponsibility: "Memverifikasi kepatuhan standar" },
    ];
  }

  if (!Array.isArray(result.coreParameters) || result.coreParameters.length < 3) {
    result.coreParameters = [
      { name: "Skala Operasional", value: "Tinggi", rationale: "Kebutuhan performa dan keandalan sistem" },
      { name: "Standar Keamanan", value: "Zero Trust", rationale: "Perlindungan data dan integritas transaksi" },
      { name: "Mode Eksekusi", value: "Modular", rationale: "Memudahkan pemeliharaan dan skalabilitas" },
    ];
  }

  if (!Array.isArray(result.explicitFacts) || result.explicitFacts.length < 2) {
    result.explicitFacts = [
      `Kebutuhan utama: ${originalPrompt}`,
      `Larangan aktif: ${negativeConstraints.join(", ") || "Standar operasional"}`,
    ];
  }

  if (!Array.isArray(result.smartAssumptions) || result.smartAssumptions.length < 2) {
    result.smartAssumptions = [
      "Infrastruktur modern mendukung ketersediaan tinggi dan isolasi layanan.",
      "Kepatuhan data dan audit log diterapkan di seluruh titik transaksi.",
    ];
  }

  if (!Array.isArray(result.openDecisions) || result.openDecisions.length < 1) {
    result.openDecisions = [
      { decision: "Pilihan Protokol Komunikasi", chosenPath: "REST / Event-Driven", tradeOff: "Latensi rendah vs kesederhanaan" },
    ];
  }

  if (!Array.isArray(result.qualityObjectives) || result.qualityObjectives.length < 4) {
    result.qualityObjectives = [
      { objective: "Keandalan Sistem", metric: "Uptime", targetCriteria: ">= 99.9%" },
      { objective: "Kecepatan Respon", metric: "Latensi", targetCriteria: "< 200ms" },
      { objective: "Akurasi Data", metric: "Integritas Transaksi", targetCriteria: "100% konsisten" },
      { objective: "Kepatuhan Regulasi", metric: "Audit Trail", targetCriteria: "100% terlacak" },
    ];
  }

  if (!result.coreSpecification || typeof result.coreSpecification !== "object") {
    result.coreSpecification = {
      architectureOverview: `Arsitektur menyeluruh untuk ${result.projectTitle}.`,
      functionalCapabilities: ["Manajemen alur kerja inti", "Validasi dan verifikasi otomatis"],
      technicalStackOrMethodology: ["TypeScript / Node.js", "Relational Database / Event Stream"],
      dataOrOperationalFlow: "Alur data mengalir dari inisiasi input, validasi skema, pemrosesan transaksi, hingga penyimpanan audit.",
    };
  }

  if (!result.diagramStructures || typeof result.diagramStructures !== "object") {
    result.diagramStructures = {
      primaryDiagramType: "erDiagram",
      entities: [],
      relationships: [],
    };
  } else {
    if (!result.diagramStructures.primaryDiagramType) {
      result.diagramStructures.primaryDiagramType =
        Array.isArray(result.diagramStructures.entities) && result.diagramStructures.entities.length > 0
          ? "erDiagram"
          : "flowchart_td";
    }
    if (!Array.isArray(result.diagramStructures.entities)) {
      result.diagramStructures.entities = [];
    }
    if (!Array.isArray(result.diagramStructures.relationships)) {
      result.diagramStructures.relationships = [];
    }
    if (result.diagramStructures.workflow && typeof result.diagramStructures.workflow === "object") {
      const wf = result.diagramStructures.workflow;
      if (!Array.isArray(wf.nodes)) wf.nodes = [];
      if (!Array.isArray(wf.edges)) wf.edges = [];
      if (wf.nodes.length > 1 && wf.edges.length === 0) {
        for (let i = 0; i < wf.nodes.length - 1; i++) {
          if (wf.nodes[i]?.id && wf.nodes[i + 1]?.id) {
            wf.edges.push({ from: wf.nodes[i].id, to: wf.nodes[i + 1].id });
          }
        }
      }
    }
  }

  // Normalisasi executionPhases secara mendalam per item
  if (!Array.isArray(result.executionPhases) || result.executionPhases.length === 0) {
    result.executionPhases = [
      {
        phaseIndex: 0,
        phaseName: "Fase 0: Inisiasi & Analisis Domain",
        goal: "Memetakan spesifikasi teknis dan batasan sistem",
        concreteActions: ["Audit kebutuhan bisnis", "Penyusunan kamus data"],
        deliverables: [{ name: "SPEC_FOUNDATION.md", description: "Dokumen pondasi arsitektur" }],
      },
      {
        phaseIndex: 1,
        phaseName: "Fase 1: Desain Data & Alur Transaksi",
        goal: "Menyusun skema data dan alur operasional terverifikasi",
        concreteActions: ["Penyusunan model relasional", "Pemodelan state machine"],
        deliverables: [{ name: "DATA_SCHEMA.sql", description: "Skema DDL basis data" }],
      },
      {
        phaseIndex: 2,
        phaseName: "Fase 2: Implementasi Layanan Inti",
        goal: "Membangun fungsi bisnis utama tanpa fitur terlarang",
        concreteActions: ["Pengembangan logika komputasi", "Penyambungan antarmuka"],
        deliverables: [{ name: "CORE_SERVICES.ts", description: "Modul pemrosesan logika inti" }],
      },
      {
        phaseIndex: 3,
        phaseName: "Fase 3: Verifikasi Mutu & Penyerahan",
        goal: "Memastikan seluruh tolok ukur kualitas terpenuhi",
        concreteActions: ["Uji regresi fungsional", "Audit kepatuhan batas wilayah"],
        deliverables: [{ name: "VERIFICATION_REPORT.md", description: "Laporan kelulusan 100%" }],
      },
    ];
  } else {
    result.executionPhases = result.executionPhases.map((p: any, idx: number) => {
      if (!p || typeof p !== "object" || Array.isArray(p)) {
        const strName = typeof p === "string" ? p : `Fase ${idx}: Pengerjaan Modul`;
        return {
          phaseIndex: idx,
          phaseName: strName,
          goal: `Tuntaskan target ${strName}`,
          concreteActions: [`Laksanakan implementasi teknis untuk ${strName}`],
          deliverables: [{ name: `PHASE_${idx}_DELIVERABLE.md`, description: `Keluaran fase ${idx}` }],
        };
      }
      return {
        phaseIndex: typeof p.phaseIndex === "number" ? p.phaseIndex : idx,
        phaseName: typeof p.phaseName === "string" ? p.phaseName : `Fase ${idx}: Eksekusi Modul`,
        goal: typeof p.goal === "string" ? p.goal : "Menyelesaikan target deliverable",
        concreteActions: Array.isArray(p.concreteActions) && p.concreteActions.length > 0
          ? p.concreteActions.map((a: any) => String(a))
          : ["Eksekusi tugas teknis sesuai spesifikasi"],
        deliverables: Array.isArray(p.deliverables) && p.deliverables.length > 0
          ? p.deliverables.map((d: any, dIdx: number) => {
              if (typeof d === "string") return { name: d, description: `Deliverable ${d}` };
              return {
                name: d?.name ? String(d.name) : `DELIVERABLE_${dIdx + 1}.md`,
                description: d?.description ? String(d.description) : "Dokumentasi / artefak implementasi",
              };
            })
          : [{ name: `DELIVERABLE_PHASE_${idx}.md`, description: "Artefak keluaran fase" }],
      };
    });
  }

  // Domain guardrails
  const allHonored = Array.from(
    new Set([
      ...negativeConstraints,
      ...(result.domainGuardrails?.negativeConstraintsHonored || []),
    ])
  );

  result.domainGuardrails = {
    negativeConstraintsHonored: allHonored,
    antiPatternsForbidden: result.domainGuardrails?.antiPatternsForbidden || [
      "Penyimpanan kredensial plaintext",
      "Eksekusi tanpa validasi skema",
    ],
    consequenceOfViolation:
      result.domainGuardrails?.consequenceOfViolation ||
      "Pekerjaan ditolak secara otomatis dan status dikembalikan ke REJECTED_NEEDS_REPAIR.",
  };

  return result;
}
