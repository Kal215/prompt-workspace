import { GroqAdapter } from "@prompt-workspace/provider-adapters";
import { Finding } from "@prompt-workspace/prompt-contracts";
import { z } from "zod";

export interface OptimizePromptResult {
  optimizedPrompt: string;
  changes: string[];
  warnings: string[];
}

const RawOptimizerOutputSchema = z.object({
  optimizedPrompt: z.string().min(1),
  changes: z.array(z.string()).min(1),
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
  } catch (err) {
    throw new Error(`Gagal mem-parse output JSON dari Optimizer: ${cleaned.substring(0, 200)}...`);
  }
}

/**
 * Merekonstruksi dan mengoptimasi prompt berdasarkan temuan analisis dengan Intent Preservation
 *
 * @param originalPrompt Prompt asli dari pengguna
 * @param analysisFindings Daftar temuan dari Analyzer
 * @param constraints Batasan tambahan yang ditentukan pengguna
 * @param adapter GroqAdapter instance (opsional, default dibuat baru)
 */
export async function optimizePrompt(
  originalPrompt: string,
  analysisFindings: Finding[],
  constraints: string[] = [],
  adapter?: GroqAdapter
): Promise<OptimizePromptResult> {
  const groq = adapter || new GroqAdapter();

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

  const userContent = [
    `OPTIMASI PROMPT BERIKUT BERDASARKAN HASIL ANALISIS:`,
    `Prompt Asli: "${originalPrompt}"`,
    ``,
    `Temuan Analisis Kelemahan:`,
    findingsSummary,
    ``,
    `Batasan Tambahan dari Pengguna:`,
    constraintsSummary,
    ``,
    `Ingat aturan keras Intent Preservation: Gunakan placeholder terstruktur jika ada informasi yang belum lengkap, JANGAN PERNAH MENGARANG fakta/URL.`,
  ].join("\n");

  const response = await groq.chatCompletion([
    { role: "system", content: OPTIMIZER_SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ], {
    temperature: 0.2,
  });

  const parsedJson = extractJsonFromText(response.content);
  const validated = RawOptimizerOutputSchema.parse(parsedJson);

  return {
    optimizedPrompt: validated.optimizedPrompt,
    changes: validated.changes,
    warnings: validated.warnings || [],
  };
}
