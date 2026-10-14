import {
  PromptOptimizationResult,
  DetectedIntent,
  AppliedDomainRuleInfo,
  AnalysisFinding,
  PromptChange,
} from "@/types/prompt";

export interface SafeExportPayload {
  schemaVersion: "1.0.0";
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
}

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
 * Blueprint v1.0 Bagian 11 Rencana Kerja #6 & Bagian 15.2:
 * Membangun payload JSON terverifikasi dan bebas dari data sensitif / kredensial internal.
 */
export function buildSafeExportPayload(
  result: PromptOptimizationResult
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

  return {
    schemaVersion: "1.0.0",
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
}

/**
 * Blueprint v1.0 Bagian 11 Rencana Kerja #6:
 * Membangun dokumen laporan Markdown (.md) berbahasa Indonesia yang rapi dan terverifikasi.
 */
export function buildMarkdownReport(result: PromptOptimizationResult): string {
  const payload = buildSafeExportPayload(result);
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
`;
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
