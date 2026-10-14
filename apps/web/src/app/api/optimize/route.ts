import { NextResponse } from "next/server";
import { PromptOptimizationRequestSchema } from "@prompt-workspace/prompt-contracts";
import crypto from "crypto";
import { PromptOptimizationResult } from "@/types/prompt";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Normalisasi payload untuk validasi sesuai kontrak Zod
    const payload = {
      prompt: typeof body.prompt === "string" ? body.prompt.trim() : body.prompt,
      context:
        typeof body.context === "string"
          ? body.context.trim() || null
          : body.context ?? null,
      taskType: body.taskType ?? null,
      constraints: Array.isArray(body.constraints) ? body.constraints : [],
      requestId: body.requestId || crypto.randomUUID(),
    };

    // Validasi input dengan Zod schema dari packages/prompt-contracts
    const validationResult = PromptOptimizationRequestSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Simulasi jeda komputasi engine (1 detik) agar transisi UI natural
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock response komprehensif mengikuti PromptOptimizationResult
    const mockResult: PromptOptimizationResult = {
      requestId: validatedData.requestId,
      originalPrompt: validatedData.prompt,
      detectedIntent: {
        summary:
          "User memerlukan panduan instruksi teknis terstruktur dengan spesifikasi peran yang tegas, penanganan skenario batas, dan format keluaran modular.",
        confidence: 0.91,
        uncertainties: [
          "Format penanganan kesalahan (error handling) belum didefinisikan secara eksplisit.",
          "Apakah kode yang dihasilkan memerlukan dukungan backward compatibility atau target runtime spesifik?",
          "Ekspektasi tingkat kedalaman dokumentasi (inline comments vs architectural overview) belum ditentukan.",
        ],
        targetAudience: "LLM Produksi / Autonomous AI Agent",
        outputFormat: "Blok kode beranotasi lengkap disertai walkthrough skenario pengujian",
      },
      analysis: {
        overallScore: 74,
        status: "needs_optimization",
        findings: [
          {
            id: "f-critical-1",
            type: "missing_boundary",
            severity: "critical",
            message:
              "Batasan eksekusi edge cases dan penanganan kegagalan runtime belum didefinisikan sama sekali.",
            evidence: `"${validatedData.prompt.slice(0, 60)}${
              validatedData.prompt.length > 60 ? "..." : ""
            }"`,
            recommendation:
              "Definisikan secara eksplisit bagaimana sistem harus merespons input invalid, kondisi null/undefined, atau timeout.",
          },
          {
            id: "f-warning-1",
            type: "ambiguity",
            severity: "warning",
            message:
              "Instruksi menyisakan ambiguitas semantik pada ekspektasi keluaran dan kedalaman penjelasan.",
            evidence:
              "Tidak ditemukan kata kunci pembeda format (misal: 'hanya kode' vs 'penjelasan mendalam').",
            recommendation:
              "Tentukan format keluaran modular: Pisahkan Ringkasan Eksekutif, Blok Kode Utama, dan Verifikasi Uji.",
          },
          {
            id: "f-info-1",
            type: "context_enrichment",
            severity: "info",
            message: validatedData.context
              ? "Konteks operasional tambahan berhasil diintegrasikan ke dalam direktif guardrails."
              : "Prompt berjalan pada asumsi generik karena tidak ada batasan konteks tambahan yang disediakan.",
            evidence: validatedData.context
              ? `Konteks: "${validatedData.context}"`
              : "Field konteks bernilai null.",
            recommendation:
              "Menyertakan target runtime, versi pustaka, atau batasan performa dapat mempertajam hasil penalaran model.",
          },
          {
            id: "f-success-1",
            type: "role_clarity",
            severity: "success",
            message:
              "Intent fungsional inti berhasil diidentifikasi dengan polaritas instruksi yang positif dan terarah.",
            evidence:
              "Akar kalimat imperatif pada prompt asli dapat dipetakan secara akurat ke domain engineering.",
            recommendation:
              "Pertahankan kejelasan target fungsional saat menambahkan constraint sekunder.",
          },
        ],
      },
      changes: [
        {
          type: "role_anchoring",
          description: "Pemberian Persona Senior Staff Engineer",
          reason:
            "Memandu LLM untuk menerapkan standar kode enterprise, type safety ketat, dan idiom pemrograman mutakhir.",
        },
        {
          type: "added_constraint",
          description: "Penyisipan Guardrails Edge Cases & Zero Implicit Any",
          reason:
            "Mencegah halusinasi model dan kegagalan kompilasi pada boundary conditions.",
        },
        {
          type: "structured_output",
          description: "Penetapan 4 Bagian Format Output Modular",
          reason:
            "Memudahkan parsing otomatis oleh sistem downstream serta inspeksi manual oleh pengembang.",
        },
        {
          type: "chain_of_thought",
          description: "Direktif Verifikasi Eksplisit Sebelum Respons Akhir",
          reason:
            "Meningkatkan akurasi algoritma dengan mewajibkan validasi asumsi secara eksplisit.",
        },
      ],
      optimizedPrompt: `Anda adalah Senior Staff Software Engineer dan pakar Prompt Intelligence tingkat lanjut.

### 1. Peran & Objektif Utama:
Eksekusi instruksi di bawah ini dengan standar produksi, zero-defect mindset, dan presisi arsitektural:
"${validatedData.prompt}"

### 2. Konteks & Parameter Operasional:
${
  validatedData.context
    ? `- Konteks Pengguna: ${validatedData.context}\n`
    : ""
}- Lingkungan: Modern TypeScript / ECMAScript (Strict Mode, no implicit any).
- Paradigma: Functional-declarative, performa optimal, dan mudah dirawat (maintainable).
- Gaya Penulisan: Lugas, teknis, to-the-point, tanpa pembuka/penutup basa-basi.

### 3. Batasan Wajib (Guardrails):
1. **Handling Edge Cases**: Tangani secara defensif kondisi input kosong, null, tipe tidak terduga, atau batas memori.
2. **Eksplisitkan Asumsi**: Jika terdapat ambiguitas domain, tuliskan asumsi kunci yang Anda gunakan sebelum blok kode.
3. **Clean Implementation**: Jangan gunakan pustaka pihak ketiga eksternal kecuali benar-benar diperlukan.
4. **Alasan Arsitektur**: Berikan 1 kalimat penjelasan teknis untuk setiap keputusan desain krusial.

### 4. Format Keluaran Terstruktur:
Sajikan respons Anda dalam format berikut secara konsisten:
- **[A] Ringkasan Arsitektural**: Inti solusi dan trade-off kompleksitas (waktu & ruang).
- **[B] Implementasi Lengkap**: Kode produksi beranotasi types lengkap.
- **[C] Skenario Verifikasi**: Contoh pengujian kasus sukses (happy path) dan kasus batas (edge case).`,
      metrics: {
        clarityScore: 92,
        constraintCoverage: 88,
        estimatedTokenDelta: "+24% precision yield",
        latencyMs: 1045,
      },
      metadata: {
        modelTarget: "generic-production-llm",
        engineVersion: "v1.0-preview (modular-monolith)",
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(mockResult, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memproses request.",
      },
      { status: 500 }
    );
  }
}
