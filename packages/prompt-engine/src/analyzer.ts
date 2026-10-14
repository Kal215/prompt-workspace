import { GroqAdapter } from "@prompt-workspace/provider-adapters";
import { Finding } from "@prompt-workspace/prompt-contracts";
import { DomainRulePack, getDomainPack } from "@prompt-workspace/domain-rules";
import { z } from "zod";
import { safeLogger } from "./logger.js";
import {
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  SchemaValidationError,
} from "./errors.js";

export interface AnalyzePromptResult {
  detectedIntent: string;
  findings: Finding[];
  score: number;
  status: string;
  domainId?: string;
  telemetry?: {
    model: string;
    latencyMs?: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
    };
    keyUsed?: string;
  };
}

const RawFindingSchema = z.object({
  category: z.string(),
  severity: z.enum(["critical", "major", "minor", "info", "warning"]),
  evidence: z.string(),
  recommendation: z.string(),
});

const RawAnalyzerOutputSchema = z.object({
  detectedIntent: z.string().min(1),
  score: z.number().optional().default(40),
  status: z.string().optional().default("needs_optimization"),
  findings: z.array(RawFindingSchema).min(1),
});

/**
 * System prompt ketat untuk Analyzer Engine (Blueprint v1.0 Bagian 5.4)
 */
const ANALYZER_SYSTEM_PROMPT = `Anda adalah Prompt Analyzer Engine tingkat lanjut.
Tugas Anda HANYA menganalisis kelemahan dari prompt pengguna dan mendeteksi maksud aslinya (Intent Detection).
JANGAN memperbaiki prompt pada tahap ini. Fokus Anda adalah menemukan apa yang kurang, ambigu, atau hilang.

Anda WAJIB memetakan setiap temuan ke dalam salah satu dari 8 Taksonomi Temuan berikut:
1. "Tujuan": Tujuan inti kabur, tidak jelas, atau hilang.
2. "Konteks": Latar belakang, domain spesifik, pengguna sasaran, atau lingkungan sistem tidak dijelaskan.
3. "Ambiguitas": Penggunaan kata-kata subjektif/tidak terukur (contoh: "bagus", "lengkap", "canggih", "sukses").
4. "Kontradiksi": Bagian instruksi yang saling bertentangan atau tidak konsisten.
5. "Batasan": Batasan teknis, library, bahasa pemrograman, anggaran, lisensi, atau batas ruang lingkup tidak ditentukan.
6. "Keluaran": Format output (JSON, CSV, markdown, code, dll.) atau struktur respons tidak didefinisikan.
7. "Keberhasilan": Kriteria keberhasilan, definisi selesai, atau metrik evaluasi tidak ada.
8. "Bukti": Kode sumber, pesan error, URL, trace, atau data masukan yang diperlukan tidak dilampirkan.

ATURAN SEVERITY:
- "critical": Informasi vital hilang total (misal: kode tidak ada padahal minta perbaikan bug, atau URL/sumber tidak ada).
- "major": Aspek penting tidak ada sehingga hasil LLM berpotensi halusinasi atau melenceng jauh.
- "minor": Detail pelengkap yang bisa meningkatkan kualitas respons.
- "info": Catatan tambahan atau konteks opsional.

FORMAT OUTPUT:
Anda WAJIB mengembalikan HANYA JSON murni (valid JSON object) tanpa markdown fence, tanpa teks pembuka atau penutup:
{
  "detectedIntent": "Deskripsi maksud asli pengguna secara objektif dan ringkas",
  "score": <nilai kesehatan prompt antara 10 sampai 70 untuk prompt yang bermasalah>,
  "status": "needs_optimization",
  "findings": [
    {
      "category": "Konteks",
      "severity": "critical",
      "evidence": "Kutipan dari prompt yang menunjukkan masalah",
      "recommendation": "Rekomendasi spesifik informasi apa yang harus dilengkapi"
    }
  ]
}`;

/**
 * Helper untuk mengekstrak dan mem-parse JSON dari teks model
 */
function extractJsonFromText(rawText: string): any {
  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }

  // Find outermost JSON object
  const startIdx = cleaned.indexOf("{");
  const endIdx = cleaned.lastIndexOf("}");
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    throw new SchemaValidationError(
      `Gagal mem-parse output JSON dari Analyzer: ${cleaned.substring(0, 100)}...`,
      err
    );
  }
}

/**
 * Menganalisis prompt dan mendeteksi kelemahan berdasarkan taksonomi temuan
 *
 * @param prompt Prompt asli dari pengguna
 * @param context Konteks opsional
 * @param adapter GroqAdapter instance (opsional, default dibuat baru)
 * @param domainPackInput DomainRulePack instance atau taskType string opsional
 */
export async function analyzePrompt(
  prompt: string,
  context?: string | null,
  adapter?: GroqAdapter,
  domainPackInput?: DomainRulePack | string | null
): Promise<AnalyzePromptResult> {
  const domainPack: DomainRulePack =
    typeof domainPackInput === "string" || domainPackInput === null || domainPackInput === undefined
      ? getDomainPack(domainPackInput)
      : domainPackInput;

  safeLogger.info("Memulai analisis prompt", {
    prompt,
    hasContext: !!context,
    domainId: domainPack.domainId,
  });

  const groq = adapter || new GroqAdapter();

  const domainDirectivesSection =
    domainPack.analyzerDirectives.length > 0 && domainPack.domainId !== "general"
      ? [
          ``,
          `ATURAN PEMERIKSAAN KHUSUS DOMAIN [${domainPack.name.toUpperCase()}]:`,
          ...domainPack.analyzerDirectives.map((d, i) => `${i + 1}. ${d}`),
          `Fokus Taksonomi yang Diperketat: ${domainPack.focusCategories.join(", ")}`,
        ].join("\n")
      : "";

  const userContent = [
    `ANALISIS PROMPT BERIKUT:`,
    `Prompt: "${prompt}"`,
    context ? `Konteks Tambahan: "${context}"` : `Konteks Tambahan: (Tidak ada)`,
    domainDirectivesSection,
  ]
    .filter(Boolean)
    .join("\n");

  let response;
  try {
    response = await groq.chatCompletion(
      [
        { role: "system", content: ANALYZER_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      {
        temperature: 0.1, // deterministik untuk analisis konsisten
      }
    );
  } catch (err: any) {
    safeLogger.error("Gagal memanggil provider saat analisis prompt", err);

    if (err?.code === "RATE_LIMIT" || err?.statusCode === 429) {
      throw new ProviderRateLimitError(err.message, err);
    }
    if (err?.code === "TIMEOUT" || err?.statusCode === 504) {
      throw new ProviderTimeoutError(err.message, err);
    }
    throw new ProviderUnavailableError(
      err?.message || "Provider Groq tidak tersedia atau semua key exhausted",
      err
    );
  }

  const parsedJson = extractJsonFromText(response.content);

  let validated;
  try {
    validated = RawAnalyzerOutputSchema.parse(parsedJson);
  } catch (err: any) {
    safeLogger.error("Validasi skema output Analyzer gagal", err);
    throw new SchemaValidationError(
      "Struktur JSON dari Analyzer tidak sesuai dengan skema yang diharapkan",
      err
    );
  }

  // Normalisasi findings dengan alias type dan message
  const normalizedFindings: Finding[] = validated.findings.map((f) => ({
    category: f.category,
    severity: f.severity,
    evidence: f.evidence,
    recommendation: f.recommendation,
    type: f.category.toLowerCase(),
    message: f.recommendation,
  }));

  safeLogger.info("Analisis prompt selesai", {
    detectedIntent: validated.detectedIntent,
    findingsCount: normalizedFindings.length,
    score: validated.score,
    domainId: domainPack.domainId,
    model: response.model,
    latencyMs: response.latencyMs,
  });

  return {
    detectedIntent: validated.detectedIntent,
    findings: normalizedFindings,
    score: validated.score,
    status: validated.status,
    domainId: domainPack.domainId,
    telemetry: {
      model: response.model,
      latencyMs: response.latencyMs,
      usage: response.usage,
      keyUsed: response.keyUsed,
    },
  };
}
