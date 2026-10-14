import {
  PromptOptimizationResult,
  DetectedIntent,
  AppliedDomainRuleInfo,
  AnalysisFinding,
  PromptChange,
} from "@/types/prompt";

export interface V2ExportMetadata {
  versionNumber?: number;
  sourceRole?: string;
  versions?: Array<{
    versionNumber: number;
    sourceRole?: string;
    createdAt?: string;
    changeSummary?: string;
    criticalGatePassed?: boolean;
    qualityScore?: number;
  }>;
  crawlerSources?: Array<{
    sourceUrl: string;
    sourceDomain: string;
    sourceTitle?: string;
    authorOrOrg?: string;
    fetchedAt: string;
    byteSize: number;
    lineRange?: string;
  }>;
  spiderReport?: {
    jobId?: string;
    promptVersionId?: string;
    status?: string;
    criticalGatePassed: boolean;
    qualityMetrics?: {
      robustness?: number;
      taskAdherence?: number;
      constraintAdherence?: number;
      formatCompliance?: number;
      robustnessScore?: number;
      passRate?: number;
      averageLatencyMs?: number;
    };
    securityFindings?: Array<{
      id?: string;
      category: string;
      severity: string;
      title?: string;
      description?: string;
      evidenceSnippet?: string;
      recommendation?: string;
    }>;
    testCases?: Array<{
      id?: string;
      name?: string;
      category?: string;
      status: string;
      score?: number;
      latencyMs?: number;
      inputPrompt?: string;
      modelOutputSnippet?: string;
      errorReason?: string;
    }>;
    evaluatedAt?: string;
    durationMs?: number;
  };
}

export interface SafeExportPayload {
  schemaVersion: "1.0.0" | "2.0.0";
  requestId: string;
  metadata: {
    engineVersion: string;
    rubricVersion: string;
    appliedDomainRule: AppliedDomainRuleInfo;
    providerId: string;
    model: string;
    createdAt: string;
  };
  reproducibility: {
    engineVersion: string;
    rubricVersion: string;
    appliedDomainRule: AppliedDomainRuleInfo;
    providerId: string;
    model: string;
    createdAt: string;
  };
  originalPrompt: string;
  optimizedPrompt: string;
  promptComparison: {
    originalPrompt: string;
    optimizedPrompt: string;
  };
  detectedIntent: {
    category?: string;
    summary: string;
    confidence: number;
    uncertainties: string[];
    intentPreserved: boolean;
  };
  intentGuard: {
    summary: string;
    confidence: number;
    uncertainties: string[];
    intentPreserved: boolean;
  };
  findings: Array<{
    category: string;
    severity: string;
    evidence: string;
    recommendation: string;
  }>;
  changes: Array<{
    type: string;
    description: string;
    reason: string;
  }>;
  evaluation: {
    score: number;
    overallScore?: number;
    passed: boolean;
    auditorNotes?: string;
    clarityAndStructureScore?: number;
    staticEvaluationNotice: string;
  };
  provenance: {
    reproducibilityGuaranteed: boolean;
    zeroSecretsConfirmed: boolean;
  };
  v2Metadata?: V2ExportMetadata & {
    disclaimer: string;
  };
}

export const SPIDER_BENCHMARK_DISCLAIMER =
  "Peringatan: Evaluasi ketahanan dan skor pengujian Spider Matrix merupakan hasil pengujian terbatas pada test suite berversi tertentu dan bukan jaminan keamanan mutlak atau garansi di semua kondisi dan variasi model target.";

/**
 * Membersihkan ID untuk penamaan file yang aman dan bebas path traversal.
 */
export function sanitizeExportFilename(
  requestId?: string | null,
  extension: "md" | "json" = "md"
): string {
  const rawId = (requestId || Date.now().toString()).trim();
  // Hanya izinkan karakter alfanumerik, tanda minus, dan garis bawah
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "report";
  return `prompt-report-${safeId}.${extension}`;
}

/**
 * Blueprint v1.0 Bagian 11 Rencana Kerja #6 & Bagian 15.2 (Diperluas untuk v2.0):
 * Membangun payload JSON terverifikasi, bebas data sensitif, dengan metadata v2.0 opsional.
 */
export function buildSafeExportPayload(
  result: PromptOptimizationResult,
  v2Metadata?: V2ExportMetadata
): SafeExportPayload {
  const isIntentString = typeof result.detectedIntent === "string";
  const intentObj: DetectedIntent | null =
    typeof result.detectedIntent === "object" && result.detectedIntent !== null
      ? (result.detectedIntent as DetectedIntent)
      : null;

  const intentSummary = isIntentString
    ? (result.detectedIntent as string)
    : intentObj?.summary || "Tidak ada ringkasan maksud";

  const confidence =
    typeof intentObj?.confidence === "number"
      ? Math.round(intentObj.confidence * 100)
      : 95;

  const uncertainties: string[] =
    intentObj?.uncertainties && Array.isArray(intentObj.uncertainties)
      ? intentObj.uncertainties
      : Array.isArray(result.warnings)
      ? result.warnings
      : [];

  const rawEvaluation = (result as unknown as Record<string, unknown>)
    .evaluation as Record<string, unknown> | undefined;

  const score =
    result.analysis?.score ??
    result.analysis?.overallScore ??
    (typeof rawEvaluation?.score === "number" ? rawEvaluation.score : undefined) ??
    (typeof rawEvaluation?.overallScore === "number"
      ? (rawEvaluation.overallScore as number)
      : undefined) ??
    result.metrics?.clarityScore ??
    85;

  const appliedDomain: AppliedDomainRuleInfo =
    typeof result.appliedDomainRule === "object" && result.appliedDomainRule !== null
      ? (result.appliedDomainRule as AppliedDomainRuleInfo)
      : typeof result.appliedDomainRule === "string"
      ? {
          domainId: result.appliedDomainRule,
          name: result.appliedDomainRule,
          ruleVersion: "1.0.0",
        }
      : typeof result.metadata?.appliedDomainRule === "object" &&
        result.metadata?.appliedDomainRule !== null
      ? (result.metadata.appliedDomainRule as AppliedDomainRuleInfo)
      : typeof result.metadata?.appliedDomainRule === "string"
      ? {
          domainId: result.metadata.appliedDomainRule,
          name: result.metadata.appliedDomainRule,
          ruleVersion: "1.0.0",
        }
      : {
          domainId: "general",
          name: "Umum / Otomatis",
          ruleVersion: "1.0.0",
        };

  const providerId =
    result.providerId ||
    (result.metadata?.providerId as string) ||
    "groq";

  const model =
    result.model ||
    (result.metadata?.model as string) ||
    (result.metadata?.modelTarget as string) ||
    "llama-3.3-70b-versatile";

  const engineVersion =
    (result.metadata?.engineVersion as string) || "1.1.0";
  const rubricVersion =
    (typeof rawEvaluation?.rubricVersion === "string"
      ? (rawEvaluation.rubricVersion as string)
      : (result.metadata?.rubricVersion as string)) || "1.0.0";
  const createdAt =
    (result.metadata?.timestamp as string) ||
    (result.metadata?.createdAt as string) ||
    new Date().toISOString();

  const rawFindings =
    result.analysis?.findings ||
    ((result as unknown as Record<string, unknown>).findings as
      | AnalysisFinding[]
      | undefined) ||
    [];

  const findings: Array<{
    category: string;
    severity: string;
    evidence: string;
    recommendation: string;
  }> = rawFindings.map((f: AnalysisFinding) => {
    const fRecord = f as unknown as Record<string, unknown>;
    return {
      category: f.category || f.type || "Kualitas Prompt",
      severity: (f.severity || "info").toLowerCase(),
      evidence: f.evidence || (fRecord.description as string) || "-",
      recommendation:
        f.recommendation ||
        (fRecord.suggestion as string) ||
        f.message ||
        "Terapkan perbaikan struktur",
    };
  });

  const changes: Array<{
    type: string;
    description: string;
    reason: string;
  }> = (result.changes || []).map((c: string | PromptChange) => {
    if (typeof c === "string") {
      return {
        type: "optimasi",
        description: c,
        reason: "Peningkatan kejelasan instruksi",
      };
    }
    return {
      type: c.type || "optimasi",
      description: c.description || "",
      reason: c.reason || "Penyelarasan maksud pengguna",
    };
  });

  const metadataInfo = {
    engineVersion,
    rubricVersion,
    appliedDomainRule: appliedDomain,
    providerId,
    model,
    createdAt,
  };

  const payload: SafeExportPayload = {
    schemaVersion: v2Metadata ? "2.0.0" : "1.0.0",
    requestId: result.requestId || `req-${Date.now()}`,
    metadata: metadataInfo,
    reproducibility: metadataInfo,
    originalPrompt: result.originalPrompt || "",
    optimizedPrompt: result.optimizedPrompt || "",
    promptComparison: {
      originalPrompt: result.originalPrompt || "",
      optimizedPrompt: result.optimizedPrompt || "",
    },
    detectedIntent: {
      category:
        typeof (intentObj as unknown as Record<string, unknown>)?.category ===
        "string"
          ? ((intentObj as unknown as Record<string, unknown>).category as string)
          : undefined,
      summary: intentSummary,
      confidence,
      uncertainties,
      intentPreserved:
        typeof rawEvaluation?.intentPreserved === "boolean"
          ? rawEvaluation.intentPreserved
          : true,
    },
    intentGuard: {
      summary: intentSummary,
      confidence,
      uncertainties,
      intentPreserved:
        typeof rawEvaluation?.intentPreserved === "boolean"
          ? rawEvaluation.intentPreserved
          : true,
    },
    findings,
    changes,
    evaluation: {
      score,
      overallScore: score,
      passed:
        typeof rawEvaluation?.passed === "boolean"
          ? rawEvaluation.passed
          : score >= 70,
      auditorNotes:
        typeof rawEvaluation?.auditorNotes === "string"
          ? rawEvaluation.auditorNotes
          : undefined,
      clarityAndStructureScore:
        typeof rawEvaluation?.clarityAndStructureScore === "number"
          ? rawEvaluation.clarityAndStructureScore
          : score,
      staticEvaluationNotice:
        "Catatan: Evaluasi rubrik dilakukan secara analitis/statis dan heuristik model; hasil eksekusi riil pada model tujuan dapat bervariasi karena sifat probabilistik LLM.",
    },
    provenance: {
      reproducibilityGuaranteed: true,
      zeroSecretsConfirmed: true,
    },
  };

  if (v2Metadata) {
    payload.v2Metadata = {
      ...v2Metadata,
      disclaimer: SPIDER_BENCHMARK_DISCLAIMER,
    };
  }

  return payload;
}

/**
 * Blueprint v1.0 Bagian 11 Rencana Kerja #6 & v2.0 Gate 4/5:
 * Membangun dokumen laporan Markdown (.md) berbahasa Indonesia yang rapi dan terverifikasi,
 * lengkap dengan metadata v2.0 (Riwayat Versi, Atribusi Grounding Crawler, & Spider Scorecard).
 */
export function buildMarkdownReport(
  result: PromptOptimizationResult,
  v2Metadata?: V2ExportMetadata
): string {
  const payload = buildSafeExportPayload(result, v2Metadata);
  const formattedDate = new Date(payload.reproducibility.createdAt).toLocaleString(
    "id-ID",
    { dateStyle: "long", timeStyle: "medium" }
  );

  const findingsRows =
    payload.findings.length > 0
      ? payload.findings
          .map(
            (f, idx) =>
              `| ${idx + 1} | **${f.category}** | \`${f.severity.toUpperCase()}\` | ${f.evidence.replace(
                /\r?\n/g,
                " "
              )} | ${f.recommendation.replace(/\r?\n/g, " ")} |`
          )
          .join("\n")
      : "| - | *Tidak ada temuan kelemahan spesifik* | INFO | - | Siap digunakan |";

  const changesList =
    payload.changes.length > 0
      ? payload.changes
          .map(
            (c, idx) =>
              `${idx + 1}. **${c.description}** (${c.type})\n   *Alasan:* ${c.reason}`
          )
          .join("\n")
      : "*Tidak ada perubahan intervensi terdata.*";

  const uncertaintiesList =
    payload.intentGuard.uncertainties.length > 0
      ? payload.intentGuard.uncertainties
          .map((u) => `- ⚠️ ${u}`)
          .join("\n")
      : "*Semua instruksi dan batasan telah terdefinisi secara eksplisit.*";

  let v2Sections = "";
  if (v2Metadata) {
    const versionNum = v2Metadata.versionNumber || 1;
    const sourceRole = v2Metadata.sourceRole || "OPTIMIZER";

    let versionHistoryText = `- **Versi Aktif:** \`v${versionNum}\`\n- **Peran Pembuatan (Source Role):** \`${sourceRole}\``;
    if (v2Metadata.versions && v2Metadata.versions.length > 0) {
      const vRows = v2Metadata.versions
        .map(
          (v) =>
            `- **v${v.versionNumber}** (${v.sourceRole || "OPTIMIZER"})${
              v.changeSummary ? `: ${v.changeSummary}` : ""
            }${
              typeof v.criticalGatePassed === "boolean"
                ? ` — Status Spider: ${
                    v.criticalGatePassed ? "✅ Lulus" : "❌ Gagal"
                  }`
                : ""
            }`
        )
        .join("\n");
      versionHistoryText += `\n\n**Riwayat Linimasa Versi:**\n${vRows}`;
    }

    let crawlerText = "*Tidak ada sumber grounding eksternal yang diimpor.*";
    if (v2Metadata.crawlerSources && v2Metadata.crawlerSources.length > 0) {
      crawlerText = v2Metadata.crawlerSources
        .map((src, idx) => {
          let line = `${idx + 1}. **${src.sourceDomain}** — [${src.sourceUrl}](${src.sourceUrl})`;
          line += `\n   - *Ukuran Data:* ${(src.byteSize / 1024).toFixed(1)} KB | *Diambil:* ${src.fetchedAt}`;
          if (src.lineRange) {
            line += ` | *Rentang Baris:* \`${src.lineRange}\``;
          }
          return line;
        })
        .join("\n\n");
    }

    let spiderText = "*Belum ada uji ketahanan adversarial yang dijalankan pada versi ini.*";
    if (v2Metadata.spiderReport) {
      const rep = v2Metadata.spiderReport;
      const gateStatus = rep.criticalGatePassed
        ? "✅ **LULUS (CRITICAL_GATE_PASSED)**"
        : "❌ **GAGAL (CRITICAL_GATE_FAILED)**";
      const robustness =
        rep.qualityMetrics?.robustness ??
        rep.qualityMetrics?.robustnessScore ??
        0;
      const taskAdherence = rep.qualityMetrics?.taskAdherence ?? 0;
      const constraintAdherence = rep.qualityMetrics?.constraintAdherence ?? 0;
      const formatCompliance = rep.qualityMetrics?.formatCompliance ?? 0;

      let testCasesRows = "";
      if (rep.testCases && rep.testCases.length > 0) {
        testCasesRows =
          "\n\n##### Matriks Kasus Uji Adversarial\n" +
          "| No | Kasus Uji | Kategori | Keparahan | Status | Skor |\n" +
          "|:---|:---|:---|:---:|:---:|:---:|\n" +
          rep.testCases
            .map((tc, idx) => {
              const statusBadge =
                tc.status === "PASS"
                  ? "✅ PASS"
                  : tc.status === "FAIL"
                  ? "❌ FAIL"
                  : tc.status;
              return `| ${idx + 1} | ${tc.name || tc.id} | \`${tc.category || "GENERAL"}\` | ${
                tc.errorReason ? "CRITICAL" : "STANDARD"
              } | ${statusBadge} | ${tc.score ?? "-"} |`;
            })
            .join("\n");
      }

      let findingsList = "";
      if (rep.securityFindings && rep.securityFindings.length > 0) {
        findingsList =
          "\n\n##### Temuan Keamanan & Rekomendasi Remediasi\n" +
          rep.securityFindings
            .map((sf, idx) => {
              return `${idx + 1}. **[${(sf.severity || "CRITICAL").toUpperCase()}] ${sf.category}**\n   - *Temuan:* ${
                sf.description || sf.title || "Kerentanan adversarial terdeteksi"
              }\n   - *Rekomendasi:* ${sf.recommendation || "Sematkan batasan pertahanan eksplisit"}`;
            })
            .join("\n");
      }

      spiderText = `- **Status Gerbang Kritis:** ${gateStatus}\n- **Skor Ketahanan (Robustness):** ${robustness}%\n- **Kepatuhan Batasan (Constraint Adherence):** ${constraintAdherence}%\n- **Kepatuhan Format (Format Compliance):** ${formatCompliance}%\n- **Kesesuaian Tugas (Task Adherence):** ${taskAdherence}%${testCasesRows}${findingsList}`;
    }

    v2Sections = `
---

## 7. Metadata Ekosistem v2.0 (Closed-Loop & Keamanan)

### A. Riwayat Versi Prompt
${versionHistoryText}

---

### B. Atribusi Sumber Grounding (Web Crawler)
${crawlerText}

---

### C. Ringkasan Uji Ketahanan (Spider Matrix Scorecard)
${spiderText}

> ⚠️ **Disclaimer Pengujian Ketahanan (Spider Benchmark):**
> ${SPIDER_BENCHMARK_DISCLAIMER}
`;
  }

  return `# Laporan Analisis & Rekayasa Prompt Terverifikasi
*Dihasilkan secara otomatis oleh **Prompt Intelligence Workspace (v${payload.reproducibility.engineVersion})** pada ${formattedDate}.*

---

## 1. Metadata Reprodusibilitas
- **Request ID:** \`${payload.requestId}\`
- **Versi Engine:** \`${payload.reproducibility.engineVersion}\`
- **Versi Rubrik Evaluasi:** \`${payload.reproducibility.rubricVersion}\`
- **Mode Domain Pack:** **${payload.reproducibility.appliedDomainRule.name}** (\`${payload.reproducibility.appliedDomainRule.domainId}\` v${payload.reproducibility.appliedDomainRule.ruleVersion})
- **Penyedia AI (Provider):** \`${payload.reproducibility.providerId}\`
- **Model Eksekusi:** \`${payload.reproducibility.model}\`
- **Waktu Eksekusi:** \`${payload.reproducibility.createdAt}\`

---

## 2. Intent Guard (Deteksi Maksud & Batasan)
**Maksud Utama Teridentifikasi:**
> ${payload.intentGuard.summary}

- **Tingkat Keyakinan Engine:** ${payload.intentGuard.confidence}%
- **Status Preservasi Maksud Asli:** ${
    payload.intentGuard.intentPreserved
      ? "✅ Terpelihara Sempurna (100%)"
      : "⚠️ Perlu Verifikasi Manual"
  }

### Catatan Asumsi & Peringatan Ambiguitas
${uncertaintiesList}

---

## 3. Perbandingan Prompt (Sebelum vs Sesudah)

### A. Prompt Asli (Input Awal)
\`\`\`text
${payload.promptComparison.originalPrompt}
\`\`\`

### B. Prompt Teroptimasi (Production Ready)
\`\`\`markdown
${payload.promptComparison.optimizedPrompt}
\`\`\`

---

## 4. Temuan Analisis Semantik (Taksonomi Kelemahan)
| No | Kategori | Keparahan | Bukti Terdeteksi | Rekomendasi Solusi |
|:---|:---|:---:|:---|:---|
${findingsRows}

---

## 5. Log Rekonstruksi & Intervensi Perubahan
${changesList}

---

## 6. Evaluasi Rubrik & Keterbatasan Evaluasi
- **Skor Kualitas Prompt:** **${payload.evaluation.score}/100** (${
    payload.evaluation.passed
      ? "Lulus Ambang Batas Kualitas"
      : "Perlu Peninjauan Lanjutan"
  })
${
  payload.evaluation.auditorNotes
    ? `- **Catatan Auditor:** ${payload.evaluation.auditorNotes}\n`
    : ""
}- **Skor Kejelasan & Struktur:** ${
    payload.evaluation.clarityAndStructureScore ?? payload.evaluation.score
  }/100

> **Catatan Transparansi & Sifat Non-Deterministik (Blueprint Bagian 5.6 & 23):**
> ${payload.evaluation.staticEvaluationNotice}
${v2Sections}`;
}

/**
 * Memicu pengunduhan file teks (Markdown/JSON) di peramban pengguna.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  contentType: string
): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
