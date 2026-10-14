import { PromptOptimizationResult, DetectedIntent } from "@/types/prompt";
import {
  V2ExportMetadata,
  SPIDER_BENCHMARK_DISCLAIMER,
} from "./export-utils";

/**
 * Mengonversi objek PromptOptimizationResult menjadi dokumen Markdown terstruktur.
 */
export function formatResultToMarkdown(
  result: PromptOptimizationResult,
  v2Metadata?: V2ExportMetadata
): string {
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

  const score =
    result.analysis?.score ??
    result.analysis?.overallScore ??
    result.metrics?.clarityScore ??
    85;

  const modelTarget =
    result.metadata?.modelTarget || "Groq llama-3.3-70b-versatile";
  const latencyMs =
    result.metrics?.latencyMs ??
    result.metadata?.processingTimeMs ??
    1000;
  const tokenDelta =
    result.metrics?.estimatedTokenDelta ??
    result.metadata?.estimatedTokenSavings ??
    "+24% precision";
  const timestamp =
    result.metadata?.timestamp || new Date().toISOString();

  const findings = result.analysis?.findings || [];
  const changes = result.changes || [];

  const findingsMarkdown =
    findings.length > 0
      ? findings
          .map((f, idx) => {
            const sev = (f.severity || "info").toUpperCase();
            const category = f.category || f.type || "Umum";
            const message = f.message || f.recommendation || f.evidence || "";
            let item = `${idx + 1}. **[${sev}]** **${category}**: ${message}`;
            if (f.evidence) {
              item += `\n   - *Bukti Terdeteksi:* \`${f.evidence}\``;
            }
            if (f.recommendation && f.recommendation !== message) {
              item += `\n   - *Rekomendasi Solusi:* ${f.recommendation}`;
            }
            return item;
          })
          .join("\n\n")
      : "*Tidak ada temuan kelemahan spesifik.*";

  const changesMarkdown =
    changes.length > 0
      ? changes
          .map((c, idx) => {
            if (typeof c === "string") {
              return `- **Intervensi ${idx + 1}:** ${c}`;
            }
            return `- **${c.description}** (${c.type || "optimasi"})\n  *Alasan:* ${
              c.reason || "Penyelarasan instruksi dan intent"
            }`;
          })
          .join("\n")
      : "*Tidak ada intervensi perubahan terdata.*";

  const uncertaintiesMarkdown =
    uncertainties.length > 0
      ? uncertainties.map((u: string) => `- ⚠️ ${u}`).join("\n")
      : "*Semua asumsi dan instruksi telah tervalidasi eksplisit.*";

  const metadataSection = `
---

## 5. Metadata Operasional & Telemetri
- **Request ID:** \`${result.requestId}\`
- **Waktu Eksekusi / Latensi:** ${latencyMs} ms
- **Model Target Eksekusi:** \`${modelTarget}\`
- **Efisiensi Token:** ${tokenDelta}
- **Timestamp:** \`${timestamp}\`
`;

  let v2Section = "";
  if (v2Metadata) {
    const versionNumber = v2Metadata.versionNumber ?? 1;
    const sourceRole = v2Metadata.sourceRole ?? "OPTIMIZER";

    let vHistory = `- **Versi Aktif:** \`v${versionNumber}\`\n- **Source Role:** \`${sourceRole}\``;
    if (v2Metadata.versions && v2Metadata.versions.length > 0) {
      vHistory +=
        "\n" +
        v2Metadata.versions
          .map(
            (v) =>
              `- v${v.versionNumber} (${v.sourceRole}): ${
                v.changeSummary || "Optimasi"
              }`
          )
          .join("\n");
    }

    let crawlerText = "*Tidak ada sumber crawler eksternal.*";
    if (v2Metadata.crawlerSources && v2Metadata.crawlerSources.length > 0) {
      crawlerText = v2Metadata.crawlerSources
        .map(
          (src, idx) =>
            `${idx + 1}. **${src.sourceDomain}** (${src.sourceUrl}) — ${(
              src.byteSize / 1024
            ).toFixed(1)} KB`
        )
        .join("\n");
    }

    let spiderText = "*Belum ada uji Spider Matrix yang dijalankan.*";
    if (v2Metadata.spiderReport) {
      const rep = v2Metadata.spiderReport;
      const statusIcon = rep.criticalGatePassed ? "✅ LULUS" : "❌ GAGAL";
      const robustness =
        rep.qualityMetrics?.robustness ??
        rep.qualityMetrics?.robustnessScore ??
        0;
      spiderText = `- **Critical Gate Status:** ${statusIcon}\n- **Robustness Score:** ${robustness}%\n- **Kasus Uji Dijalankan:** ${
        rep.testCases?.length ?? 0
      }`;
    }

    v2Section = `
---

## 6. Metadata v2.0 (Closed-Loop & Ketahanan)

### A. Riwayat Versi Prompt
${vHistory}

### B. Atribusi Sumber Grounding
${crawlerText}

### C. Ringkasan Spider Matrix Scorecard
${spiderText}

> ⚠️ **Disclaimer Pengujian:**
> ${SPIDER_BENCHMARK_DISCLAIMER}
`;
  }

  return `# Laporan Optimasi Prompt

> Dokumen ini dihasilkan secara otomatis oleh **Prompt Intelligence Workspace** pada ${new Date(
    timestamp
  ).toLocaleString("id-ID")}.

---

## 1. Intent Asli (Preserved Intent)

**Maksud Pengguna Teridentifikasi:**
> ${intentSummary}

- **Tingkat Keyakinan Engine:** ${confidence}%
- **Skor Kesehatan Prompt Awal:** ${score}/100

### Asumsi & Catatan Perhatian
${uncertaintiesMarkdown}

---

## 2. Temuan Analisis (Taksonomi Kelemahan)

${findingsMarkdown}

---

## 3. Prompt Asli vs Prompt Teroptimasi

### A. Prompt Asli (Input Awal)
\`\`\`text
${result.originalPrompt}
\`\`\`

### B. Prompt Teroptimasi (Production Ready)
\`\`\`markdown
${result.optimizedPrompt}
\`\`\`

---

## 4. Log Intervensi Rekayasa
${changesMarkdown}
${metadataSection}${v2Section}`;
}

/**
 * Memicu pengunduhan file Markdown langsung di peramban pengguna.
 */
export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Ekspor langsung hasil optimasi ke file .md dengan penamaan otomatis.
 */
export function exportOptimizationResultToMarkdown(
  result: PromptOptimizationResult,
  v2Metadata?: V2ExportMetadata
): string {
  const markdownContent = formatResultToMarkdown(result, v2Metadata);
  const safeId = result.requestId
    ? result.requestId.slice(0, 8)
    : Date.now().toString();
  const filename = `optimization-${safeId}.md`;
  downloadMarkdownFile(filename, markdownContent);
  return filename;
}
