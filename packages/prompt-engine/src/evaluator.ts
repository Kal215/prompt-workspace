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
 * System prompt untuk Auditor QA Ketat (Blueprint Gate 3 & Mega Task #44 — Master Prompt Synthesis Evaluation)
 */
const AUDITOR_SYSTEM_PROMPT = `Anda adalah Auditor QA Independen & Ketat untuk sistem evaluasi Prompt Intelligence (LLM-as-a-Judge).
Tugas Anda adalah menilai secara kritis dan objektif apakah hasil rekonstruksi prompt (optimizedPrompt) benar-benar berkualitas tinggi sebagai Master Prompt, memenuhi ekspektasi perilaku (expectedBehavior), dan TIDAK melanggar prinsip integritas prompt.

Anda WAJIB mengevaluasi berdasarkan 9 Kriteria Keberhasilan Master Prompt Synthesis:
1. Pelestarian Maksud Asli (Intent Preservation): Maksud dan tujuan pengguna terjaga seutuhnya tanpa penambahan tujuan liar.
2. Kelengkapan Persyaratan Eksplisit: Setiap fitur/kebutuhan yang diminta pengguna tercantum jelas dan terukur.
3. Ketegasan Penegakan Larangan Kritis (Hard Negative Constraints): Jika pengguna memberikan larangan (misal: "Jangan buat POS"), larangan ini wajib dikunci mutlak dan ditegakkan secara eksplisit.
4. Kedalaman Detail Operasional: Menyediakan perincian logis (validasi input, pencegahan data negatif, pemisahan metrik) yang mendukung pencapaian tujuan.
5. Kesesuaian Struktur Arketipe Domain: Memiliki struktur tahapan yang runtut sesuai bidang tugas (perencanaan, inspeksi fondasi, perancangan modul, pengujian).
6. Kejujuran Penanganan Asumsi & Keputusan Terbuka (No Deceptive Certainty): Tidak mengarang arsitektur/database/URL palsu, dan menginstruksikan AI pelaksana untuk menginspeksi repositori aktual daripada membanjiri teks dengan placeholder kosong.
7. Kelengkapan Tahapan, Deliverables, Skenario Pengujian & Definition of Done: Memuat langkah kerja konkret, artefak deliverables, skenario pengujian perilaku nyata (edge cases), dan kriteria selesai.
8. Kesiapan Pakai Langsung: Dokumen siap dijadikan instruksi kerja langsung oleh AI atau staf pelaksana tanpa ambigu.
9. Ketiadaan Klaim & Data Palsu: Tidak mengarang harga, hasil benchmark palsu, atau klaim tes yang belum dijalankan.

ATURAN KELULUSAN (passed):
- passed = true HANYA JIKA score >= 70 DAN tidak ada deceptive certainty/halusinasi DAN intent asli serta larangan mutlak ditegakkan.
- Jika ada halusinasi/karangan fakta/URL palsu atau pelanggaran larangan mutlak, passed = false.

PEDOMAN BAHASA (BAHASA INDONESIA PROFESIONAL & ALAMI):
1. Anda WAJIB menuliskan "auditorNotes" dalam Bahasa Indonesia profesional yang natural, jernih, objektif, dan berwibawa (kecuali jika pengguna secara eksplisit meminta evaluasi dalam bahasa asing).
2. DILARANG KERAS menggunakan kalimat bahasa Inggris seperti "The prompt successfully preserves intent...", "Missing context was replaced with placeholders...", dsb. Tuliskan dalam Bahasa Indonesia yang komunikatif dan berwibawa.
3. Hindari kalimat terjemahan mesin yang kaku. Gunakan peristilahan teknis baku dalam konteks kalimat Bahasa Indonesia yang gramatikal.

FORMAT OUTPUT:
Kembalikan HANYA JSON murni (valid JSON object) tanpa markdown fence, tanpa teks pembuka atau penutup:
{
  "score": <skor integer 1-100>,
  "passed": <true/false>,
  "auditorNotes": "<Penjelasan ringkas alasan penilaian dalam Bahasa Indonesia profesional, menyoroti penegakan larangan, ketiadaan halusinasi, dan struktur operasional>",
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
