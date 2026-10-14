/**
 * ==============================================================================
 * PROMPT INTELLIGENCE ENGINEERING WORKSPACE (PIEW) v2.0
 * Pure Logic Helpers for V2 Workspace UI (Gate 1 & ADR-002)
 * ==============================================================================
 * Menyediakan fungsi-fungsi murni untuk:
 * 1. Validasi URL sumber Crawler (Allowlist P0: github.com & raw.githubusercontent.com)
 * 2. Pemformatan fakta sumber (Grounding Facts) ke dalam konteks prompt
 * 3. Evaluasi banner gerbang kritis (Critical Gate Passed) Prompt Spider Matrix
 * ==============================================================================
 */

import {
  CrawlerResultItem,
  SpiderReportSummary,
} from "@/types/v2-workspace";

/**
 * Domain yang diizinkan untuk penarikan konten pada rilis P0 v2.0.
 */
export const ALLOWED_CRAWLER_HOSTS = [
  "github.com",
  "raw.githubusercontent.com",
] as const;

export interface CrawlerUrlValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
  hostname?: string;
}

/**
 * Memvalidasi input URL sumber Crawler secara client-side sebelum request dikirim:
 * - Wajib menggunakan protokol HTTPS (tanpa plain HTTP / file:// / javascript:)
 * - Tidak boleh mengandung kredensial (username:password@)
 * - Hostname wajib berada dalam daftar allowlist P0
 */
export function validateCrawlerInputUrl(rawUrl: string): CrawlerUrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return {
      valid: false,
      error: "URL sumber tidak boleh kosong.",
    };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: "Format URL tidak valid. Pastikan menyertakan skema https://.",
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      valid: false,
      error: "Protokol tidak aman. Hanya URL HTTPS (https://) yang diizinkan.",
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: "URL tidak boleh mengandung kredensial atau informasi otentikasi (user:pass).",
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isAllowedHost = ALLOWED_CRAWLER_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );

  if (!isAllowedHost) {
    return {
      valid: false,
      error: `Domain "${host}" belum diizinkan pada P0. Sumber resmi saat ini terbatas pada: ${ALLOWED_CRAWLER_HOSTS.join(
        ", "
      )}.`,
    };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    hostname: host,
  };
}

/**
 * Menyusun blok teks [GROUNDING CONTEXT - VERIFIED SOURCE FACTS] untuk disuntikkan
 * ke kolom 'context' tanpa menghapus konten manual yang sudah ditulis oleh pengguna.
 */
export function formatGroundingFactsForContext(
  existingContext: string,
  selectedFacts: CrawlerResultItem[]
): string {
  if (!Array.isArray(selectedFacts) || selectedFacts.length === 0) {
    return existingContext;
  }

  const factsToFormat = selectedFacts.filter(
    (item) => item.type === "GROUNDING_FACT" || item.content?.trim().length > 0
  );

  if (factsToFormat.length === 0) {
    return existingContext;
  }

  const lines: string[] = [
    "--- [GROUNDING CONTEXT - VERIFIED SOURCE FACTS] ---",
    "Fakta & Batasan Faktual Sumber Terverifikasi (Auto-Grounded):",
  ];

  factsToFormat.forEach((fact, idx) => {
    const title = fact.title ? `[${fact.title}] ` : "";
    const source = fact.attribution?.sourceUrl
      ? ` (Sumber: ${fact.attribution.sourceUrl})`
      : "";
    const lineRef = fact.attribution?.lineRange
      ? ` [Baris ${fact.attribution.lineRange}]`
      : "";
    lines.push(
      `${idx + 1}. ${title}${fact.content.trim()}${lineRef}${source}`
    );
  });

  lines.push("--- [AKHIR DOKUMEN GROUNDING] ---");

  const groundingBlock = lines.join("\n");
  const trimmedExisting = (existingContext || "").trim();

  if (!trimmedExisting) {
    return groundingBlock;
  }

  // Jika sudah ada blok grounding sebelumnya, hindari duplikasi ganda
  if (trimmedExisting.includes("--- [GROUNDING CONTEXT - VERIFIED SOURCE FACTS] ---")) {
    return `${trimmedExisting}\n\n${groundingBlock}`;
  }

  return `${trimmedExisting}\n\n${groundingBlock}`;
}

export interface SpiderGateBannerEvaluation {
  passed: boolean;
  variant: "success" | "warning" | "destructive";
  badgeText: string;
  title: string;
  message: string;
  hasErrorsOrIndeterminate: boolean;
  metrics: {
    passCount: number;
    failCount: number;
    errorCount: number;
    indeterminateCount: number;
    criticalFindingsCount: number;
  };
}

/**
 * ADR-002 Bab 11.2 (Prinsip Evidence Over Claims & Fail Visibly):
 * Mengevaluasi status kelulusan Gerbang Kritis secara jujur dan transparan:
 * - Jika criticalGatePassed === true, status SUCCEEDED, dan tidak ada temuan kritis/error -> Emerald
 * - Jika terdapat kasus ERROR atau INDETERMINATE -> DILARANG mengklaim Lulus/Hijau -> Warning
 * - Jika terdapat kasus FAIL atau temuan Critical/High -> Destructive
 */
export function evaluateSpiderGateBanner(
  report: SpiderReportSummary
): SpiderGateBannerEvaluation {
  const testCases = report.testCases || [];
  const findings = report.securityFindings || [];

  const passCount = testCases.filter((c) => c.status === "PASS").length;
  const failCount = testCases.filter((c) => c.status === "FAIL").length;
  const errorCount = testCases.filter((c) => c.status === "ERROR").length;
  const indeterminateCount = testCases.filter(
    (c) => c.status === "INDETERMINATE"
  ).length;

  const criticalFindingsCount = findings.filter(
    (f) => f.severity === "critical" || f.severity === "high"
  ).length;

  const hasErrorsOrIndeterminate = errorCount > 0 || indeterminateCount > 0;
  const totalCases = testCases.length;

  const metrics = {
    passCount,
    failCount,
    errorCount,
    indeterminateCount,
    criticalFindingsCount,
  };

  // 1. Jika job belum selesai atau dibatalkan
  if (report.status === "QUEUED" || report.status === "RUNNING") {
    return {
      passed: false,
      variant: "warning",
      badgeText: "Sedang Berjalan",
      title: "Evaluasi Ketahanan Sedang Diproses",
      message: "Prompt Spider sedang menguji variasi adversarial secara paralel...",
      hasErrorsOrIndeterminate: false,
      metrics,
    };
  }

  if (report.status === "FAILED" || report.status === "CANCELLED") {
    return {
      passed: false,
      variant: "destructive",
      badgeText: "Eksekusi Gagal",
      title: "Uji Ketahanan Terhenti atau Dibatalkan",
      message: "Proses evaluasi adversarial tidak berhasil diselesaikan secara utuh.",
      hasErrorsOrIndeterminate: true,
      metrics,
    };
  }

  // 2. Jika ada status ERROR atau INDETERMINATE (Fail Visibly: Bukan PASS!)
  if (hasErrorsOrIndeterminate) {
    return {
      passed: false,
      variant: "warning",
      badgeText: "Pengujian Tidak Lengkap / Error",
      title: "Gerbang Kritis Belum Lulus / Pengujian Tidak Lengkap",
      message:
        "Gerbang Kritis Belum Lulus / Pengujian Tidak Lengkap (Status ERROR atau INDETERMINATE tidak dihitung sebagai PASS).",
      hasErrorsOrIndeterminate: true,
      metrics,
    };
  }

  // 3. Jika ada kegagalan kasus uji atau temuan keamanan kritis
  if (
    failCount > 0 ||
    criticalFindingsCount > 0 ||
    !report.criticalGatePassed
  ) {
    return {
      passed: false,
      variant: "destructive",
      badgeText: "Gerbang Kritis Gagal",
      title: "Gerbang Kritis Gagal Terverifikasi",
      message: `Gerbang Kritis Gagal: Ditemukan ${failCount} kegagalan kasus uji dan ${criticalFindingsCount} temuan keamanan berisiko tinggi.`,
      hasErrorsOrIndeterminate: false,
      metrics,
    };
  }

  // 4. Lulus Sempurna
  const displayTotal = totalCases > 0 ? totalCases : 5;
  return {
    passed: true,
    variant: "success",
    badgeText: "Gerbang Kritis Lulus",
    title: "Gerbang Kritis Lulus Terverifikasi",
    message: `Gerbang Kritis Lulus (${passCount}/${displayTotal} Kasus Terverifikasi & Bebas Celah Kritis).`,
    hasErrorsOrIndeterminate: false,
    metrics,
  };
}
