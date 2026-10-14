/**
 * ==============================================================================
 * PROMPT INTELLIGENCE ENGINEERING WORKSPACE (PIEW) v2.0
 * View-Model Types & Contracts for UI Layer (apps/web)
 * ==============================================================================
 * Mendefinisikan kontrak View-Model internal frontend untuk integrasi fitur:
 * 1. Prompt Crawler & Grounding Facts Extraction (Gate 1)
 * 2. Prompt Spider Matrix & Robustness Evaluation (Gate 4)
 * 3. Closed-Loop Prompt Refinement & Multi-Version History
 * ==============================================================================
 */

/**
 * Status siklus hidup eksekusi job asinkron v2.0 (Crawler & Spider).
 */
export type V2JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "PARTIAL"
  | "FAILED"
  | "CANCELLED";

/**
 * Klasifikasi item hasil ekstraksi Web Crawler.
 * - PROMPT_CANDIDATE: Teks instruksi yang dapat diadopsi sebagai prompt dasar/input.
 * - GROUNDING_FACT: Fakta atau batasan faktual yang dikunci ke konteks agar prompt tidak halusinasi.
 */
export type CrawlerItemType = "PROMPT_CANDIDATE" | "GROUNDING_FACT";

/**
 * Metadata atribusi dan asal-usul sumber konten hasil crawling.
 */
export interface CrawlerAttribution {
  sourceUrl: string;
  sourceDomain: string;
  sourceTitle?: string;
  authorOrOrg?: string;
  publishedDate?: string;
  fetchedAt: string;
  byteSize: number;
}

/**
 * Item tunggal hasil ekstraksi Crawler untuk ditampilkan di UI modal/drawer.
 */
export interface CrawlerResultItem {
  id: string;
  type: CrawlerItemType;
  title: string;
  content: string;
  snippet: string;
  attribution: CrawlerAttribution;
  confidenceScore: number; // 0.0 - 1.0
  warnings?: string[];
  selected?: boolean; // State seleksi UI oleh pengguna
}

/**
 * View-Model status dan hasil agregat sesi Crawler.
 */
export interface CrawlerSessionViewModel {
  jobId: string;
  status: V2JobStatus;
  targetUrl: string;
  items: CrawlerResultItem[];
  totalBytesProcessed: number;
  durationMs: number;
  error?: string;
  createdAt: string;
}

/**
 * Tingkat keparahan temuan keamanan uji ketahanan prompt (Spider).
 */
export type SpiderFindingSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

/**
 * Status hasil evaluasi tiap kasus uji ketahanan.
 * Catatan penting: Sesuai spesifikasi Gate 5, 'ERROR' atau 'INDETERMINATE' != 'PASS'.
 */
export type SpiderCaseStatus = "PASS" | "FAIL" | "ERROR" | "INDETERMINATE";

/**
 * Temuan keamanan spesifik dari Prompt Spider (injeksi, bypass, kebocoran data).
 */
export interface SpiderSecurityFinding {
  id: string;
  category:
    | "prompt_injection"
    | "jailbreak_attempt"
    | "system_leakage"
    | "guardrail_bypass"
    | "toxic_or_unsafe_output"
    | "other";
  severity: SpiderFindingSeverity;
  title: string;
  description: string;
  evidenceSnippet?: string;
  testCaseName?: string;
  recommendation: string;
}

/**
 * Metrik performa dan kualitas hasil uji Spider (terpisah tegas dari security findings).
 */
export interface SpiderQualityMetrics {
  robustnessScore: number; // 0 - 100
  instructionAdherenceScore: number; // 0 - 100
  consistencyScore: number; // 0 - 100
  passedTestCases: number;
  totalTestCases: number;
  passRate: number; // 0.0 - 1.0
  averageLatencyMs: number;
}

/**
 * Detail kasus uji ketahanan individu dalam matriks uji Spider.
 */
export interface SpiderTestCaseResult {
  id: string;
  name: string;
  category: string;
  status: SpiderCaseStatus;
  inputPrompt: string;
  modelOutputSnippet?: string;
  latencyMs: number;
  errorReason?: string;
}

/**
 * Laporan komprehensif Prompt Spider Matrix untuk ditampilkan di UI drawer/panel.
 */
export interface SpiderReportSummary {
  jobId: string;
  promptVersionId: string;
  status: V2JobStatus;
  /**
   * Evaluasi Gate Kritis: True jika dan hanya jika seluruh tes kritis lulus (0 critical/high findings
   * dan tidak ada status ERROR/INDETERMINATE pada kasus krusial).
   */
  criticalGatePassed: boolean;
  qualityMetrics: SpiderQualityMetrics;
  securityFindings: SpiderSecurityFinding[];
  testCases: SpiderTestCaseResult[];
  evaluatedAt: string;
  durationMs: number;
}

/**
 * Riwayat versi prompt (v1, v2, v3...) dalam satu alur iterasi Closed-Loop.
 */
export interface PromptVersionRecord {
  versionId: string; // e.g. "v1", "v2", "v3"
  versionNumber: number;
  promptText: string;
  contextText?: string;
  createdAt: string;
  spiderJobId?: string;
  criticalGatePassed?: boolean;
  qualityScore?: number;
  changeSummary?: string;
}

/**
 * View-Model state untuk Closed-Loop Prompt Refinement.
 */
export interface ClosedLoopRefinementState {
  currentVersion: string;
  versions: PromptVersionRecord[];
  activeSpiderReport?: SpiderReportSummary;
  isRefining: boolean;
  refinementSuggestions: string[];
}
