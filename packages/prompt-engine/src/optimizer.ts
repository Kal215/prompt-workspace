import {
  GroqAdapter,
  LLMProviderAdapter,
  createProviderAdapter,
} from "@prompt-workspace/provider-adapters";
import { Finding } from "@prompt-workspace/prompt-contracts";
import { DomainRulePack, getDomainPack } from "@prompt-workspace/domain-rules";
import { z } from "zod";
import { safeLogger } from "./logger.js";
import {
  IntentPreservationError,
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  SchemaValidationError,
} from "./errors.js";

export interface OptimizePromptResult {
  optimizedPrompt: string;
  changes: string[];
  warnings: string[];
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

const RawOptimizerOutputSchema = z.object({
  optimizedPrompt: z.string().min(1, "optimizedPrompt tidak boleh kosong"),
  changes: z.array(z.string()).min(1, "Minimal harus ada 1 catatan perubahan"),
  warnings: z.array(z.string()),
});

/**
 * System prompt ketat untuk Optimizer Engine (Blueprint v1.0 Bagian 5.5 — Intent Preservation)
 */
const OPTIMIZER_SYSTEM_PROMPT = `Anda adalah Prompt Optimizer Engine tingkat lanjut dengan kepatuhan mutlak pada prinsip "Preserve Intent" (Blueprint v1.0 Bagian 5.5).
Tugas Anda adalah merekonstruksi dan mengoptimasi prompt mentah pengguna menjadi prompt yang terstruktur, jelas, dan siap pakai berdasarkan hasil temuan analisis (analysisFindings).

ATURAN EMAS "PRESERVE INTENT" (TIDAK BOLEH DILANGGAR):
1. DILARANG MENAMBAHKAN TUJUAN BARU: Jangan memperluas cakupan tugas di luar maksud asli pengguna.
2. DILARANG MENGARANG FAKTA ATAU DATA (ANTI-HALUSINASI):
   - JANGAN mengarang URL situs (misal: "https://example.com/books").
   - JANGAN mengarang nama file, selector CSS, database table, atau kode yang tidak diberikan.
   - JANGAN mengarang referensi ilmiah, judul buku, atau nama penulis jika tidak ada di prompt asli.
3. WAJIB GUNAKAN PLACEHOLDER UNTUK INFORMASI YANG HILANG:
   Jika informasi krusial belum disediakan pengguna, gunakan placeholder yang jelas dan terstandarisasi seperti:
   - [MASUKKAN_URL_TARGET]
   - [DAFTAR_DATA_YANG_INGIN_DIAMBIL]
   - [LAMPIRKAN_KODE_YANG_ERROR_DISINI]
   - [TEMPEL_PESAN_ERROR_ATAU_TRACE_DISINI]
   - [TENTUKAN_JENIS_BISNIS_DAN_LOKASI]
   - [TARGET_AUDIENS_DAN_JUMLAH_KATA]
4. PERTAHANKAN BATASAN ASLI: Jika user menetapkan batasan atau bahasa tertentu, pertahankan seutuhnya.
5. STRUKTUR PROMPT REKOMENDASI:
   Susun prompt hasil optimasi dengan format yang jelas dan profesional:
   - Peran & Tanggung Jawab (Role)
   - Tujuan Spesifik (Objective)
   - Informasi & Parameter Masukan (termasuk Placeholders)
   - Instruksi Kerja / Langkah Operasional
   - Format Keluaran yang Diharapkan (Output Format)
   - Batasan & Aturan Khusus (Constraints)

PEDOMAN BAHASA (BAHASA INDONESIA PROFESIONAL & ALAMI):
1. Anda WAJIB menuliskan seluruh elemen dalam "changes" (catatan/alasan perubahan) dan "warnings" dalam Bahasa Indonesia profesional yang natural, jernih, dan mudah dipahami manusia (kecuali jika pengguna secara eksplisit meminta output dalam bahasa asing).
2. DILARANG KERAS menggunakan frasa bahasa Inggris bawaan seperti "Added role and context...", "User must specify...", "Integrated domain directives...", dsb. Gunakan Bahasa Indonesia yang mengalir, misalnya: "Menambahkan perincian peran dan kejelasan tujuan operasional", "Menyediakan placeholder terstruktur untuk parameter yang belum ditentukan".
3. Untuk "optimizedPrompt":
   - Jika prompt asli pengguna berbahasa Indonesia, susun seluruh teks optimizedPrompt dalam Bahasa Indonesia profesional (termasuk judul bagian, peran, deskripsi tugas, format luaran, dan batasan).
   - Jika pengguna secara eksplisit meminta hasil dalam bahasa asing (misal: "tulis dalam bahasa Inggris"), hormati permintaan bahasa tersebut untuk isi prompt-nya, namun tetap tulis "changes" dan "warnings" dalam Bahasa Indonesia.
4. Hindari kalimat terjemahan mesin yang kaku. Gunakan peristilahan teknis standar industri dalam struktur kalimat Bahasa Indonesia yang lazim.

FORMAT OUTPUT:
Kembalikan HANYA JSON murni (valid JSON object) tanpa markdown fence, tanpa teks pembuka atau penutup:
{
  "optimizedPrompt": "Teks lengkap prompt yang sudah dioptimasi dan terstruktur...",
  "changes": [
    "Menambahkan instruksi peran dan kejelasan tujuan",
    "Menyediakan placeholder terstruktur untuk informasi yang belum lengkap",
    "Menentukan format keluaran dan batasan operasional"
  ],
  "warnings": [
    "Pengguna wajib mengganti placeholder [MASUKKAN_...] sebelum menjalankan prompt",
    "Periksa batasan etika dan perizinan terkait"
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
      `Gagal mem-parse output JSON dari Optimizer: ${cleaned.substring(0, 100)}...`,
      err
    );
  }
}

/**
 * Merekonstruksi dan mengoptimasi prompt berdasarkan temuan analisis dengan Intent Preservation
 *
 * @param originalPrompt Prompt asli dari pengguna
 * @param analysisFindings Daftar temuan dari Analyzer
 * @param constraints Batasan tambahan yang ditentukan pengguna
 * @param adapter GroqAdapter instance (opsional, default dibuat baru)
 * @param domainPackInput DomainRulePack instance atau taskType string opsional
 */
export async function optimizePrompt(
  originalPrompt: string,
  analysisFindings: Finding[],
  constraints: string[] = [],
  adapter?: LLMProviderAdapter | GroqAdapter,
  domainPackInput?: DomainRulePack | string | null
): Promise<OptimizePromptResult> {
  const domainPack: DomainRulePack =
    typeof domainPackInput === "string" || domainPackInput === null || domainPackInput === undefined
      ? getDomainPack(domainPackInput)
      : domainPackInput;

  safeLogger.info("Memulai optimasi prompt (Preserve Intent)", {
    originalPrompt,
    findingsCount: analysisFindings.length,
    constraintsCount: constraints.length,
    domainId: domainPack.domainId,
  });

  const providerAdapter = adapter || createProviderAdapter({ providerId: "groq" });

  const findingsSummary = analysisFindings
    .map(
      (f, idx) =>
        `${idx + 1}. [Kategori: ${f.category} | Severity: ${f.severity}] Masalah: "${f.evidence}". Rekomendasi: ${f.recommendation}`
    )
    .join("\n");

  const constraintsSummary =
    constraints && constraints.length > 0
      ? constraints.map((c) => `- ${c}`).join("\n")
      : "(Tidak ada batasan tambahan)";

  const domainDirectivesSection =
    domainPack.optimizerDirectives.length > 0 && domainPack.domainId !== "general"
      ? [
          ``,
          `ATURAN REKONSTRUKSI & GUARDRAIL KHUSUS DOMAIN [${domainPack.name.toUpperCase()}]:`,
          ...domainPack.optimizerDirectives.map((d, i) => `${i + 1}. ${d}`),
        ].join("\n")
      : "";

  const userContent = [
    `OPTIMASI PROMPT BERIKUT BERDASARKAN HASIL ANALISIS:`,
    `Prompt Asli: "${originalPrompt}"`,
    ``,
    `Temuan Analisis Kelemahan:`,
    findingsSummary,
    ``,
    `Batasan Tambahan dari Pengguna:`,
    constraintsSummary,
    domainDirectivesSection,
    ``,
    `Ingat aturan keras Intent Preservation: Gunakan placeholder terstruktur jika ada informasi yang belum lengkap, JANGAN PERNAH MENGARANG fakta/URL.`,
  ]
    .filter(Boolean)
    .join("\n");

  let response;
  try {
    response = await providerAdapter.chatCompletion(
      [
        { role: "system", content: OPTIMIZER_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      {
        temperature: 0.2,
        responseFormat: "json",
      }
    );
  } catch (err: any) {
    safeLogger.error("Gagal memanggil provider saat optimasi prompt", err);

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
    throw new ProviderUnavailableError(
      err?.message || "Provider LLM tidak tersedia atau semua key exhausted",
      err
    );
  }

  const parsedJson = extractJsonFromText(response.content);

  let validated;
  try {
    validated = RawOptimizerOutputSchema.parse(parsedJson);
  } catch (err: any) {
    safeLogger.error("Validasi skema output Optimizer gagal", err);
    throw new SchemaValidationError(
      "Struktur JSON dari Optimizer tidak sesuai dengan skema yang diharapkan",
      err
    );
  }

  // Verifikasi dasar Intent Preservation: prompt hasil optimasi tidak boleh kosong
  if (!validated.optimizedPrompt || validated.optimizedPrompt.trim().length === 0) {
    throw new IntentPreservationError("Hasil optimasi prompt kosong");
  }

  safeLogger.info("Optimasi prompt selesai", {
    optimizedPrompt: validated.optimizedPrompt,
    changesCount: validated.changes.length,
    warningsCount: (validated.warnings || []).length,
    model: response.model,
    latencyMs: response.latencyMs,
  });

  return {
    optimizedPrompt: validated.optimizedPrompt,
    changes: validated.changes,
    warnings: validated.warnings || [],
    telemetry: {
      model: response.model,
      latencyMs: response.latencyMs,
      usage: response.usage,
      keyUsed: response.keyUsed,
    },
  };
}
