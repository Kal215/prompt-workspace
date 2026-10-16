import {
  UniversalBlueprintSpec,
  AudienceLevel,
  DiagramSpecification,
  ExecutionPhase,
  DynamicSynthesisMetadata,
} from "@prompt-workspace/prompt-contracts";
import {
  classifyUniversalDomain,
  detectDomainSubtopic,
  UniversalDomainCategory,
  DomainSubtopic,
  getDomainRoles,
  getContextAndAssumptions,
  getPrimaryObjectives,
  getCoreSpecification,
  getExecutionPhases,
  getNegativeConstraints,
  getDefinitionOfDone,
} from "@prompt-workspace/domain-rules";
import {
  synthesizeUniversalDiagrams,
  compileKnowledgeGraphToMermaid,
} from "./diagram-synthesizer.js";
import { extractDynamicBlueprintWithLLM } from "./dynamic-llm-synthesizer.js";

// Re-export for 100% backward compatibility
export {
  getDomainRoles,
  getContextAndAssumptions,
  getPrimaryObjectives,
  getCoreSpecification,
  getExecutionPhases,
  getNegativeConstraints,
  getDefinitionOfDone,
};
import { auditCrossArtifactConsistency } from "./consistency-guard.js";

export interface UniversalSynthesisInput {
  prompt: string;
  context?: string | null;
  audienceLevel?: AudienceLevel;
  domain?: string;
  negativeConstraints?: string[];
  forceOfflineFallback?: boolean;
}

export interface UniversalSynthesisResult {
  blueprint: UniversalBlueprintSpec;
  consistencyScore: number;
  consistencyValid: boolean;
  warnings: string[];
  metadata?: DynamicSynthesisMetadata;
}

/**
 * Mengekstrak batasan negatif eksplisit dari teks prompt pengguna (misal: "Jangan buat POS")
 */
export function extractNegativeConstraintsFromPrompt(prompt: string): string[] {
  if (!prompt || typeof prompt !== "string") return [];
  const constraints: string[] = [];
  const regex = /(?:jangan\s+buat|jangan\s+gunakan|jangan|tanpa|dilarang\s+membuat|dilarang|do not\s+build|do not|never|no)\s+([^.,;\n]+)/gi;
  let match;
  while ((match = regex.exec(prompt)) !== null) {
    const raw = match[1].trim();
    if (raw.length > 2 && !raw.startsWith("lupa") && !raw.startsWith("khawatir")) {
      constraints.push(`Dilarang mengikutsertakan atau membangun modul/fitur: ${raw}`);
    }
  }
  return constraints;
}

/**
 * Sintesis Blueprint Universal Asinkron dengan Dukungan Live LLM Dynamic Synthesis
 */
export async function synthesizeUniversalBlueprintAsync(
  input: UniversalSynthesisInput
): Promise<UniversalSynthesisResult> {
  const rawPrompt = ((input.prompt || (input as any).primaryGoal) || "").trim();
  const audience: AudienceLevel = input.audienceLevel || "specialist";
  const explicitNegative = input.negativeConstraints || [];
  const detectedNegative = extractNegativeConstraintsFromPrompt(rawPrompt);
  const activeNegativeConstraints = Array.from(new Set([...explicitNegative, ...detectedNegative]));

  // Tier 1: Coba Live LLM Dynamic Synthesis jika tidak dipaksa offline
  if (!input.forceOfflineFallback) {
    try {
      const llmResult = await extractDynamicBlueprintWithLLM({
        prompt: rawPrompt,
        audienceLevel: audience,
        domain: input.domain,
        context: input.context,
        negativeConstraints: activeNegativeConstraints,
      });

      if (llmResult && llmResult.graph) {
        const { graph, metadata } = llmResult;
        const diagrams = compileKnowledgeGraphToMermaid(graph);

        const roles = graph.expertCouncil.map(
          (m) => `**${m.role}** (${m.focus}): ${m.concreteResponsibility}`
        );

        const contextParameters: Record<string, string> = {};
        for (const p of graph.coreParameters) {
          contextParameters[p.name] = `${p.value} — ${p.rationale}`;
        }

        const smartAssumptions: string[] = [
          ...graph.smartAssumptions,
          ...graph.explicitFacts.map((f) => `[FAKTA PROMPT]: ${f}`),
          ...graph.openDecisions.map(
            (d) => `[KEPUTUSAN]: ${d.decision} -> Dipilih: ${d.chosenPath} (${d.tradeOff})`
          ),
        ];

        const primaryObjectives = graph.qualityObjectives.map(
          (q) => `**${q.objective}**: ${q.metric} (Target: ${q.targetCriteria})`
        );

        const coreSpecification = [
          `### 4.1 Arsitektur & Gambaran Sistem:`,
          graph.coreSpecification.architectureOverview,
          `\n### 4.2 Kapabilitas Fungsional Inti:`,
          ...graph.coreSpecification.functionalCapabilities.map((c) => `- ${c}`),
          `\n### 4.3 Tumpukan Teknologi / Metodologi:`,
          ...graph.coreSpecification.technicalStackOrMethodology.map((s) => `- ${s}`),
          `\n### 4.4 Alur Data & Operasional:`,
          graph.coreSpecification.dataOrOperationalFlow,
        ].join("\n");

        const executionPhases: ExecutionPhase[] = graph.executionPhases.map((p) => ({
          phaseNumber: p.phaseIndex,
          name: p.phaseName,
          tasks: p.concreteActions,
          deliverables: p.deliverables.map((d) => `${d.name} (${d.description})`),
        }));

        const negativeConstraints: string[] = [
          ...graph.domainGuardrails.negativeConstraintsHonored.map(
            (c) => `[LARANGAN MUTLAK PENGGUNA]: ${c}`
          ),
          ...graph.domainGuardrails.antiPatternsForbidden.map(
            (a) => `[ANTI-PATTERN TERLARANG]: ${a}`
          ),
          `Konsekuensi Pelanggaran: ${graph.domainGuardrails.consequenceOfViolation}`,
        ];

        const executionProtocol = [
          "Step 1 — INSPECT: Pelajari seluruh konteks, repositori, data awal, atau dokumen yang tersedia sebelum memulai perubahan.",
          "Step 2 — PLAN: Rancang rencana implementasi bertahap dan petakan ketergantungan antar-task (dependency tree).",
          "Step 3 — IMPLEMENT: Bangun artefak, dokumen, atau modul kode secara modular dan patuhi standar spesifikasi pada Bagian 4.",
          "Step 4 — VERIFY: Uji setiap keluaran menggunakan verifikasi faktual atau automated test suite (Pastikan 100% lulus / Exit Code 0).",
          "Step 5 — REPORT: Laporkan bukti artefak konkret yang selesai, kriteria yang terpenuhi, dan batasan yang terverifikasi.",
        ];

        const workManagement = {
          statusModel: ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "VERIFIED"],
          trackingRules: [
            "Setiap task wajib memiliki: Task ID, Deskripsi, Prioritas, Ketergantungan, Kriteria Penerimaan, dan Bukti Verifikasi.",
            "Status DONE hanya berlaku jika dokumen atau kode telah selesai ditulis.",
            "Status VERIFIED hanya boleh diberikan jika kriteria penerimaan telah dibuktikan secara empiris atau lulus pengujian sistem.",
            "Dilarang menandai pekerjaan selesai hanya karena sebagian output visual terlihat bagus.",
          ],
        };

        const definitionOfDone = [
          `Seluruh ${primaryObjectives.length} standar mutu pada Bagian 3 terverifikasi 100%.`,
          `Seluruh diagram Mermaid pada Bagian 5 valid tanpa syntax error.`,
          `Seluruh fase eksekusi pada Bagian 6 menghasilkan deliverable nyata.`,
          `Tidak ada pelanggaran batasan negatif pada Bagian 7.`,
        ];

        const renderedMasterPrompt = renderBlueprintToMarkdown({
          title: graph.projectTitle,
          domain: graph.domainClassification,
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
          title: graph.projectTitle,
          domain: graph.domainClassification,
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
          metadata: metadata as any,
        };

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
          metadata,
        };
      }
    } catch (err: any) {
      console.warn(`[UniversalSynthesizer] Dynamic LLM failed (${err.message}), falling back to deterministic.`);
    }
  }

  // Tier 2: Deterministic Fallback
  const fallbackResult = synthesizeUniversalBlueprint(input);
  return {
    ...fallbackResult,
    metadata: {
      synthesisMode: "deterministic_fallback",
      providerId: "deterministic_rules",
      model: "piew-rules-v2",
      latencyMs: 8,
      generatedAt: new Date().toISOString(),
      activeNegativeConstraints,
    },
  };
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
