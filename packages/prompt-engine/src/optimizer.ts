import {
  GroqAdapter,
  LLMProviderAdapter,
  createProviderAdapter,
} from "@prompt-workspace/provider-adapters";
import { Finding, TaskSpecificationMap } from "@prompt-workspace/prompt-contracts";
import {
  DomainRulePack,
  getDomainPack,
  detectTaskArchetypeAndDomain,
  getSynthesisBlueprint,
  DomainSynthesisBlueprint,
} from "@prompt-workspace/domain-rules";
import { z } from "zod";
import { safeLogger } from "./logger.js";
import { extractTaskSpecification } from "./task-extractor.js";
import { synthesizeMasterPrompt } from "./master-synthesizer.js";
import { validateMasterPromptSynthesis } from "./validator.js";
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
 * System prompt ketat untuk Master Prompt Synthesis Engine (Task #44)
 */
const OPTIMIZER_SYSTEM_PROMPT = `Anda adalah Master Prompt Synthesis Engine tingkat lanjut.
Tugas Anda BUKAN sekadar merapikan teks (shallow rewriting) dan BUKAN membanjiri output dengan placeholder kosong (placeholder dumping).
Tugas Anda adalah mensintesis instruksi kerja komprehensif berstandar emas ("Master Prompt") yang siap dieksekusi oleh AI pelaksana di repositori.

PRINSIP EMAS MASTER PROMPT SYNTHESIS (TIDAK BOLEH DILANGGAR):
1. DILARANG SHALLOW REWRITING: Jangan hanya memparafrasa permintaan pengguna menjadi 1-2 paragraf singkat. Bangun dokumen instruksi operasional yang terstruktur mendalam.
2. DILARANG PLACEHOLDER DUMPING:
   - JANGAN membanjiri output dengan [MASUKKAN_FRAMEWORK], [MASUKKAN_DATABASE], [DEFINISI_SUCCES] dsb.
   - Ubah ketidakpastian teknis menjadi instruksi kerja adaptif (misal: "Tahap 1: Periksa struktur repositori, package.json, dan model data yang sudah ada sebelum menulis kode. Gunakan fondasi yang tersedia; dokumentasikan asumsi desain secara jujur").
   - Maksimal 1-2 placeholder opsional jika benar-benar diperlukan sebagai parameter input.
3. PENEGAKAN LARANGAN MUTLAK (HARD NEGATIVE CONSTRAINTS):
   - Jika pengguna memberikan larangan (misal: "Jangan buat POS"), kunci larangan tersebut di bagian Batasan Mutlak secara tegas.
   - Selesaikan ketegangan desain: sediakan mekanisme pengganti paling sederhana (misal: pencatatan data penjualan langsung untuk pelaporan) tanpa melanggar batasan larangan tersebut.
4. DILARANG OVER-PRESCRIPTION & SCOPE CREEP:
   - JANGAN menambahkan fitur baru di luar permintaan pengguna (seperti autentikasi JWT/session, visualisasi grafik Chart.js, ekspor PDF/CSV, kolom lokasi_gudang, atau multi-cabang) kecuali diminta secara eksplisit oleh pengguna!
   - JANGAN mendikte nama tabel kaku (seperti produk, stok, penjualan). Arahkan AI target untuk memeriksa arsitektur/model data proyek yang sudah ada terlebih dahulu dan tidak menambahkan banyak field/modul tambahan tanpa manfaat yang jelas.
5. INTEGRITAS METRIK LAPORAN (OMZET VS KEUNTUNGAN):
   - Pada tahap Laporan Penjualan, WAJIB instruksikan dengan tegas:
     "Tentukan definisi setiap metrik dengan jelas. Jangan menyamakan omzet dengan keuntungan. Jika modal, harga pokok penjualan (HPP), dan biaya belum tersedia, jangan menghasilkan angka keuntungan seolah-olah sudah dapat dihitung dengan benar. Sediakan penanganan untuk kondisi tanpa data, tanggal yang tidak valid, dan rentang laporan yang tidak menghasilkan penjualan."
6. KONSISTENSI TRANSAKSI & STOK GAGAL DI TENGAH JALAN:
   - Pada tahap Pencatatan Penjualan dan Pengelolaan Stok, WAJIB instruksikan:
     "Periksa konsistensi antara kuantitas produk, harga yang digunakan untuk perhitungan, dan nilai penjualan yang tersimpan. Jangan membiarkan stok berubah secara tidak konsisten akibat proses pencatatan yang berulang atau gagal di tengah jalan. Jangan mengarang integrasi pembayaran eksternal apabila tidak diminta."
7. LARANGAN MOCKUP / DATA STATIS DI DELIVERABLES:
   - Hapus permintaan laporan PDF/CSV dari data dummy!
   - Sebaliknya, tegaskan di Deliverables:
     "Jangan menyajikan mockup atau data statis sebagai implementasi penuh apabila fungsi yang diminta belum bekerja."
8. DEFINITION OF DONE & PENGUJIAN YANG REALISTIS UNTUK AI TARGET:
   - AI/coding agent yang menerima Master Prompt ini bekerja mandiri di repositori dan TIDAK memiliki 'reviewer independen manusia' atau target coverage kaku saat eksekusi.
   - Tekankan pada 10 skenario perilaku nyata (termasuk: penolakan produk tidak valid, akurasi perubahan stok, konsistensi rentang tanggal laporan, penanganan kondisi tanpa data, transaksi gagal tidak merusak konsistensi stok, verifikasi tidak ada alur POS/checkout yang ditambahkan, dan fungsi lama tetap bekerja).
   - Wajib menyertakan instruksi kejujuran pelaporan pengujian:
     "Jalankan tes yang tersedia di proyek, pemeriksaan tipe, lint, atau verifikasi lainnya yang sesuai dengan toolchain aktual. Laporkan pengujian yang benar-benar dijalankan dan hasilnya. Jangan menyatakan semua tes lulus apabila ada tes yang belum dijalankan."
9. STRUKTUR MASTER PROMPT LENGKAP:
   - 1. Peran dan Tujuan
   - 2. Persyaratan Utama (bernomor, terukur, tanpa scope creep)
   - 3. Batasan Mutlak (kunci larangan & resolusi ketegangan desain)
   - 4. Tahap Pertama: Pemeriksaan Proyek dan Perencanaan (inspeksi struktur direktori, model data aktual, stack existing)
   - 5. Tahap Perancangan Modul dan Data Inti (konsistensi transaksi & stok gagal, validasi data, tanpa nama tabel kaku)
   - 6. Tahap Mekanisme Pendukung & Integrasi Antar-Fitur (solusi non-POS, log mutasi, tanpa middleware JWT/session yang tak diminta)
   - 7. Tahap Pelaporan dan Perhitungan Aktual (larangan data statis/mockup, integritas metrik omzet vs keuntungan)
   - 8. Tahap Antarmuka dan Pengalaman Pengguna (status stok, interaktivitas proporsional)
   - 9. Tahap Pengujian dan Verifikasi Perilaku (10 skenario perilaku nyata & instruksi kejujuran pengujian)
   - 10. Deliverables (artefak nyata fungsional, larangan mockup statis)
   - 11. Definition of Done (kriteria objektif selesai untuk AI pelaksana mandiri)

PEDOMAN BAHASA (BAHASA INDONESIA PROFESIONAL & ALAMI):
1. Seluruh teks "optimizedPrompt", "changes", dan "warnings" WAJIB ditulis dalam Bahasa Indonesia profesional yang natural, lugas, dan gramatikal.
2. Dilarang menggunakan frasa bahasa Inggris default seperti "User wants...", "Added role...", dsb.

FORMAT OUTPUT:
Kembalikan HANYA JSON murni tanpa markdown fence:
{
  "optimizedPrompt": "Dokumen lengkap Master Prompt bertahap...",
  "changes": [
    "Menetapkan peran profesional dan persyaratan terukur",
    "Menegakkan batasan mutlak dan menyelesaikan ketegangan desain",
    "Menyusun tahapan operasional dan skenario verifikasi perilaku"
  ],
  "warnings": [
    "Periksa ketersediaan repositori existing sebelum memulai tahap implementasi"
  ]
}`;

/**
 * Helper untuk mengekstrak dan mem-parse JSON dari teks model
 */
function extractJsonFromText(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
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
 * Mensintesis Master Prompt berkualitas tinggi berdasarkan spesifikasi tugas dan cetak biru domain
 */
export async function optimizePrompt(
  originalPrompt: string,
  analysisFindings: Finding[],
  constraints: string[] = [],
  adapter?: LLMProviderAdapter | GroqAdapter,
  domainPackInput?: DomainRulePack | string | null,
  taskSpecInput?: TaskSpecificationMap,
  blueprintInput?: DomainSynthesisBlueprint
): Promise<OptimizePromptResult> {
  const domainPack: DomainRulePack =
    typeof domainPackInput === "string" || domainPackInput === null || domainPackInput === undefined
      ? getDomainPack(domainPackInput)
      : domainPackInput;

  const explicitTaskType =
    typeof domainPackInput === "string" ? domainPackInput : domainPack.domainId;

  // Resolusi route, taskSpec, dan blueprint
  const route = detectTaskArchetypeAndDomain(originalPrompt, null, explicitTaskType);
  const taskSpec: TaskSpecificationMap =
    taskSpecInput || extractTaskSpecification(originalPrompt, null, route);
  const blueprint: DomainSynthesisBlueprint =
    blueprintInput || getSynthesisBlueprint(taskSpec.detectedArchetype);

  safeLogger.info("Memulai Master Prompt Synthesis", {
    originalPrompt,
    archetype: taskSpec.detectedArchetype,
    complexity: taskSpec.complexity,
    findingsCount: analysisFindings.length,
    constraintsCount: constraints.length,
    negativeConstraintsCount: taskSpec.negativeConstraints.length,
  });

  const providerAdapter = adapter || createProviderAdapter({ providerId: "groq" });

  const findingsSummary = analysisFindings
    .map(
      (f, idx) =>
        `${idx + 1}. [Kategori: ${f.category} | Severity: ${f.severity}] Masalah: "${f.evidence}". Rekomendasi: ${f.recommendation}`
    )
    .join("\n");

  const combinedConstraints = [
    ...constraints,
    ...taskSpec.negativeConstraints,
  ];

  const constraintsSummary =
    combinedConstraints.length > 0
      ? combinedConstraints.map((c) => `- ${c}`).join("\n")
      : "(Tidak ada batasan tambahan)";

  const tensionsSummary =
    taskSpec.logicalTensions.length > 0
      ? taskSpec.logicalTensions
          .map((t) => `- Masalah: "${t.tension}" -> Solusi Resolusi: "${t.resolutionStrategy}"`)
          .join("\n")
      : "(Tidak ada ketegangan desain terdeteksi)";

  const openDecisionsSummary =
    taskSpec.openDecisions.length > 0
      ? taskSpec.openDecisions
          .map((od) => `- ${od.topic}: ${od.guidance} (Strategi: ${od.handlingStrategy})`)
          .join("\n")
      : "(Tidak ada keputusan terbuka)";

  const userContent = [
    `SINTESIS MASTER PROMPT BERDASARKAN SPESIFIKASI BERIKUT:`,
    `Prompt Asli: "${originalPrompt}"`,
    `Arketipe Tugas: ${taskSpec.detectedArchetype} (${blueprint.name})`,
    `Tujuan Utama: ${taskSpec.primaryGoal}`,
    ``,
    `Persyaratan Eksplisit:`,
    ...taskSpec.explicitRequirements.map((r, i) => `${i + 1}. ${r}`),
    ``,
    `Batasan Mutlak & Negatif:`,
    constraintsSummary,
    ``,
    `Resolusi Ketegangan Desain:`,
    tensionsSummary,
    ``,
    `Penanganan Keputusan Terbuka (Tanpa Deceptive Certainty):`,
    openDecisionsSummary,
    ``,
    `Tahapan & Struktur yang Wajib Diterapkan:`,
    ...blueprint.structuralSections.map((s) => `- ${s}`),
    ``,
    `Temuan Analisis Masalah:`,
    findingsSummary,
    ``,
    `INSTRUKSI KETAT PENCEGAHAN SCOPE CREEP & INTEGRITAS KUALITAS:`,
    `- DILARANG menambahkan fitur yang tidak diminta pengguna (seperti autentikasi JWT/session, grafik Chart.js, ekspor PDF/CSV, kolom lokasi_gudang).`,
    `- DILARANG mendikte nama tabel kaku (produk, stok, penjualan); arahkan untuk memeriksa arsitektur/model data existing.`,
    `- WAJIB instruksikan pada Laporan Penjualan: "Tentukan definisi setiap metrik dengan jelas. Jangan menyamakan omzet dengan keuntungan. Jika modal, harga pokok penjualan (HPP), dan biaya belum tersedia, jangan menghasilkan angka keuntungan seolah-olah sudah dapat dihitung dengan benar. Sediakan penanganan untuk kondisi tanpa data, tanggal yang tidak valid, dan rentang laporan yang tidak menghasilkan penjualan."`,
    `- WAJIB instruksikan pada Transaksi & Stok: "Periksa konsistensi antara kuantitas produk, harga yang digunakan untuk perhitungan, dan nilai penjualan yang tersimpan. Jangan membiarkan stok berubah secara tidak konsisten akibat proses pencatatan yang berulang atau gagal di tengah jalan. Jangan mengarang integrasi pembayaran eksternal apabila tidak diminta."`,
    `- Di bagian Deliverables, WAJIB tegaskan: "Jangan menyajikan mockup atau data statis sebagai implementasi penuh apabila fungsi yang diminta belum bekerja." (DILARANG meminta laporan PDF/CSV dari data dummy).`,
    `- Di bagian Pengujian dan Definition of Done: Rancang 10 skenario perilaku nyata dan instruksikan kejujuran pelaporan pengujian berbasis toolchain aktual (DILARANG meminta coverage >= 80% atau reviewer independen).`,
  ]
    .filter(Boolean)
    .join("\n");

  let candidateOutput: {
    optimizedPrompt: string;
    changes: string[];
    warnings: string[];
    telemetry?: any;
  } | null = null;

  try {
    const response = await providerAdapter.chatCompletion(
      [
        { role: "system", content: OPTIMIZER_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      {
        temperature: 0.2,
        responseFormat: "json",
      }
    );

    const parsedJson = extractJsonFromText(response.content);
    const validated = RawOptimizerOutputSchema.parse(parsedJson);

    candidateOutput = {
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
  } catch (err: any) {
    safeLogger.warn("Panggilan LLM Optimizer gagal atau dilewati, beralih ke Synthesis Generator deterministik", {
      message: err.message,
    });
  }

  // Validasi kandidat jika LLM mengembalikan hasil
  if (candidateOutput && candidateOutput.optimizedPrompt.trim().length > 0) {
    const valResult = validateMasterPromptSynthesis(
      originalPrompt,
      candidateOutput.optimizedPrompt,
      taskSpec
    );

    if (valResult.passed) {
      safeLogger.info("LLM Master Prompt Synthesis lulus validasi deterministik", {
        score: valResult.overallSynthesisScore,
      });
      return candidateOutput;
    }

    safeLogger.warn("Kandidat LLM tidak lulus validasi deterministik, menerapkan repair via Synthesis Generator", {
      failureReasons: valResult.failureReasons,
    });
  }

  // Fallback / Deterministic Master Synthesis Generator
  const synthesized = synthesizeMasterPrompt(
    originalPrompt,
    taskSpec,
    blueprint,
    analysisFindings
  );

  return {
    optimizedPrompt: synthesized.masterPrompt,
    changes: candidateOutput?.changes && candidateOutput.changes.length > 0
      ? candidateOutput.changes
      : synthesized.changes,
    warnings: candidateOutput?.warnings || synthesized.warnings,
    telemetry: candidateOutput?.telemetry,
  };
}
