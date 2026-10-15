import {
  GroqAdapter,
  LLMProviderAdapter,
  createProviderAdapter,
} from "@prompt-workspace/provider-adapters";
import { OptimizationEvaluation } from "@prompt-workspace/prompt-contracts";
import { DomainRulePack, getDomainPack } from "@prompt-workspace/domain-rules";
import { z } from "zod";
import { safeLogger } from "./logger.js";
import {
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  SchemaValidationError,
} from "./errors.js";

export interface EvaluateOptimizationResult extends OptimizationEvaluation {
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

const RawAuditorOutputSchema = z.object({
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  auditorNotes: z.string().min(1),
  intentPreserved: z.boolean().optional(),
  deceptiveCertaintyAvoided: z.boolean().optional(),
  clarityAndStructureScore: z.number().optional(),
});

/**
 * System prompt untuk Auditor QA Ketat (Blueprint Gate 3 — LLM-as-a-Judge)
 */
const AUDITOR_SYSTEM_PROMPT = `Anda adalah Auditor QA Independen & Ketat untuk sistem evaluasi Prompt Intelligence (LLM-as-a-Judge).
Tugas Anda adalah menilai secara kritis dan objektif apakah hasil rekonstruksi prompt (optimizedPrompt) benar-benar berkualitas tinggi, memenuhi ekspektasi perilaku (expectedBehavior), dan TIDAK melanggar prinsip integritas prompt.

Anda WAJIB mengevaluasi 3 kriteria utama:
1. Intent Preservation (Bobot 35%):
   - Apakah maksud dan tujuan asli pengguna tetap terjaga seutuhnya?
   - Apakah tugas inti tetap sama (misal: meminta esai tetap esai, minta scraping tetap scraping)?
   - CATATAN: Meminta rincian spesifikasi yang belum lengkap (seperti target audiens, panjang kata, format) melalui placeholder terstruktur adalah PRAKTIK TERBAIK dan BUKAN pelanggaran intent.
   - Hanya anggap intent melanggar jika tugas pokok diubah menjadi hal lain sama sekali (misal: minta esai diubah jadi skrip kode).

2. Deceptive Certainty & Anti-Hallucination (Bobot 40%):
   - Apakah Optimizer MENGARANG fakta, data palsu, URL spesifik, nama tabel, kolom, kode sumber, atau library tanpa ada di prompt asli?
   - Apakah Optimizer menggunakan placeholder yang jujur (misal: [MASUKKAN_URL_TARGET], [KOLOM_CSV], [LAMPIRKAN_KODE]) saat informasi belum lengkap?
   - Jika ada fabrikasi/halusinasi fakta (misal mengarang URL nyata atau selector CSS palsu padahal user tidak memberikannya) -> MUTLAK GAGAL (passed: false, skor maksimal 40).

3. Clarity & Structure (Bobot 25%):
   - Apakah prompt baru jauh lebih jelas, sistematis, memiliki peran, batasan, dan format output yang rapi?

ATURAN KELULUSAN (passed):
- passed = true HANYA JIKA score >= 70 DAN tidak ada deceptive certainty (tidak mengarang fakta/URL) DAN intent asli terjaga.
- Jika ada halusinasi/karangan fakta/URL palsu, passed = false.

PEDOMAN BAHASA (BAHASA INDONESIA PROFESIONAL & ALAMI):
1. Anda WAJIB menuliskan "auditorNotes" dalam Bahasa Indonesia profesional yang natural, jernih, objektif, dan mudah dipahami manusia (kecuali jika pengguna secara eksplisit meminta evaluasi dalam bahasa asing).
2. DILARANG KERAS menggunakan kalimat bahasa Inggris seperti "The prompt successfully preserves intent...", "Missing context was replaced with placeholders...", dsb. Tuliskan dalam Bahasa Indonesia yang komunikatif dan berwibawa, misalnya: "Maksud asli pengguna berhasil dipertahankan seutuhnya tanpa adanya halusinasi fakta...", "Struktur prompt sangat sistematis dengan batasan operasional yang jelas...".
3. Hindari kalimat terjemahan mesin yang kaku. Gunakan peristilahan teknis baku dalam konteks kalimat Bahasa Indonesia yang gramatikal.

FORMAT OUTPUT:
Kembalikan HANYA JSON murni (valid JSON object) tanpa markdown fence, tanpa teks pembuka atau penutup:
{
  "score": <skor integer 1-100>,
  "passed": <true/false>,
  "auditorNotes": "<Penjelasan ringkas alasan penilaian dalam Bahasa Indonesia profesional, menyoroti penggunaan placeholder atau halusinasi jika ada>",
  "intentPreserved": <true/false>,
  "deceptiveCertaintyAvoided": <true/false>,
  "clarityAndStructureScore": <integer 1-100>
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
  } catch (err) {
    throw new Error(`Gagal mem-parse output JSON dari Auditor: ${cleaned.substring(0, 200)}...`);
  }
}

/**
 * Mengevaluasi kualitas optimasi prompt menggunakan teknik LLM-as-a-Judge
 *
 * @param originalPrompt Prompt asli dari pengguna
 * @param optimizedPrompt Prompt hasil rekonstruksi Optimizer
 * @param expectedBehavior Standar perilaku yang diharapkan dari dataset baseline
 * @param adapter GroqAdapter instance opsional
 * @param domainPackInput DomainRulePack instance atau taskType string opsional
 */
export async function evaluateOptimization(
  originalPrompt: string,
  optimizedPrompt: string,
  expectedBehavior: string,
  adapter?: LLMProviderAdapter | GroqAdapter,
  domainPackInput?: DomainRulePack | string | null
): Promise<EvaluateOptimizationResult> {
  const providerAdapter = adapter || createProviderAdapter({ providerId: "groq" });

  const domainPack: DomainRulePack =
    typeof domainPackInput === "string" || domainPackInput === null || domainPackInput === undefined
      ? getDomainPack(domainPackInput)
      : domainPackInput;

  safeLogger.info("Memulai evaluasi LLM-as-a-Judge (Auditor QA)", {
    domainId: domainPack.domainId,
  });

  const domainCriteriaSection =
    domainPack.evaluationCriteriaNotes && domainPack.domainId !== "general"
      ? `\nPanduan Tambahan Evaluasi Domain [${domainPack.name}]:\n"${domainPack.evaluationCriteriaNotes}"\n`
      : "";

  const userContent = [
    `AUDIT HASIL OPTIMASI PROMPT BERIKUT:`,
    ``,
    `Prompt Asli:`,
    `"${originalPrompt}"`,
    ``,
    `Ekspektasi Perilaku (Expected Behavior):`,
    `"${expectedBehavior}"`,
    domainCriteriaSection,
    `Prompt Hasil Optimasi (Optimized Prompt):`,
    `"${optimizedPrompt}"`,
    ``,
    `Instruksi: Nilai apakah optimizedPrompt di atas mematuhi expectedBehavior, menjaga maksud asli tanpa menambah tujuan baru, dan TIDAK MENGARANG fakta/URL (menggunakan placeholder yang sesuai).`,
  ]
    .filter(Boolean)
    .join("\n");

  let response;
  try {
    response = await providerAdapter.chatCompletion(
      [
        { role: "system", content: AUDITOR_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      {
        temperature: 0.1, // deterministik untuk audit yang konsisten
        responseFormat: "json",
      }
    );
  } catch (err: any) {
    safeLogger.error("Auditor call to LLM provider failed", err);
    if (
      err?.code === "RATE_LIMIT" ||
      err?.code === "RATE_LIMITED" ||
      err?.statusCode === 429
    ) {
      throw new ProviderRateLimitError(err.message, err);
    }
    if (err?.code === "TIMEOUT" || err?.statusCode === 504) {
      throw new ProviderTimeoutError(err.message, err);
    }
    throw new ProviderUnavailableError(err.message || "Failed to reach provider for evaluation", err);
  }

  let parsedJson;
  try {
    parsedJson = extractJsonFromText(response.content);
  } catch (err: any) {
    safeLogger.error("Failed to extract JSON from Auditor response", err);
    throw new SchemaValidationError(err.message, { rawContent: response.content });
  }

  let validated;
  try {
    validated = RawAuditorOutputSchema.parse(parsedJson);
  } catch (err: any) {
    safeLogger.error("Schema validation failed for Auditor output", err);
    throw new SchemaValidationError("Auditor output did not match required schema", err);
  }

  safeLogger.info("Evaluasi Auditor QA selesai", {
    score: validated.score,
    passed: validated.passed,
  });

  return {
    score: validated.score,
    passed: validated.passed,
    auditorNotes: validated.auditorNotes,
    intentPreserved: validated.intentPreserved,
    deceptiveCertaintyAvoided: validated.deceptiveCertaintyAvoided,
    clarityAndStructureScore: validated.clarityAndStructureScore,
    telemetry: {
      model: response.model,
      latencyMs: response.latencyMs,
      usage: response.usage,
      keyUsed: response.keyUsed,
    },
  };
}
