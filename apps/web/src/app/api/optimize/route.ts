import { NextResponse } from "next/server";
import { PromptOptimizationRequestSchema } from "@prompt-workspace/prompt-contracts";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Normalisasi payload untuk validasi sesuai kontrak Zod
    const payload = {
      prompt: typeof body.prompt === "string" ? body.prompt.trim() : body.prompt,
      context: typeof body.context === "string" ? (body.context.trim() || null) : (body.context ?? null),
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

    // Mock response mengikuti struktur PromptOptimizationResult
    const mockResult = {
      requestId: validatedData.requestId,
      originalPrompt: validatedData.prompt,
      optimizedPrompt: `Anda adalah asisten AI spesialis yang bertindak secara presisi dan sistematis.\n\nTujuan Utama:\n${validatedData.prompt}\n\nKonteks & Arahan:\n${
        validatedData.context ? `- Konteks: ${validatedData.context}\n` : ""
      }- Jalankan instruksi langkah demi langkah (chain-of-thought) sebelum memberikan jawaban final.\n- Sertakan alasan singkat untuk setiap keputusan penting.\n- Jika terdapat batasan atau data yang ambigu, konfirmasikan asumsi secara eksplisit.\n\nFormat Keluaran:\nSajikan jawaban dalam struktur yang rapi: Ringkasan Eksekutif, Poin Pembahasan, dan Rekomendasi Tindak Lanjut.`,
      analysis: {
        score: 68,
        status: "needs_optimization",
        findings: [
          {
            type: "brevity",
            severity: "warning",
            message: "Prompt asli terlalu singkat dan belum memuat batasan format keluaran (output constraints).",
          },
          {
            type: "context_enrichment",
            severity: "info",
            message: validatedData.context
              ? "Konteks tambahan terdeteksi dan berhasil diintegrasikan ke dalam instruksi operasional."
              : "Tidak ada konteks pendukung yang disertakan. Memberikan batasan domain dapat meningkatkan akurasi LLM.",
          },
          {
            type: "role_clarity",
            severity: "success",
            message: "Tujuan inti instruksi teridentifikasi dengan jelas tanpa ambiguitas semantik.",
          },
        ],
      },
      metadata: {
        modelTarget: "generic-llm",
        estimatedTokenSavings: "+18% precision",
        confidenceScore: 0.94,
        processingTimeMs: 1048,
      },
    };

    return NextResponse.json(mockResult, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses request.",
      },
      { status: 500 }
    );
  }
}
