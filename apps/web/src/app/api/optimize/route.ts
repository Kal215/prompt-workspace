import { NextResponse } from "next/server";
import { PromptOptimizationRequestSchema } from "@prompt-workspace/prompt-contracts";
import { runOptimizationPipeline } from "@prompt-workspace/prompt-engine";
import { GroqAdapter } from "@prompt-workspace/provider-adapters";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Pastikan environment variables (GROQ_API_KEY_1..6) ter-load di server Next.js
if (!process.env.GROQ_API_KEY_1) {
  const rootEnv = path.resolve(process.cwd(), "../../.env");
  const localEnv = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  } else if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
  }
}

// Module-level adapter instance to share key rotation pool across API invocations
let groqAdapterInstance: GroqAdapter | null = null;
function getGroqAdapter(): GroqAdapter {
  if (!groqAdapterInstance) {
    groqAdapterInstance = new GroqAdapter();
  }
  return groqAdapterInstance;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

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

    const validationResult = PromptOptimizationRequestSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validasi gagal: prompt wajib diisi.",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    const adapter = getGroqAdapter();

    // Jalankan pipeline nyata (Analyzer -> Optimizer) via Groq LLM
    const engineResult = await runOptimizationPipeline(validatedData, adapter);

    return NextResponse.json(engineResult, { status: 200 });
  } catch (error) {
    console.error("[API /api/optimize] Kesalahan pada pipeline engine:", error);

    // Sanitasi pesan error agar tidak membocorkan stack trace atau API key
    let safeMessage =
      "Engine sedang sibuk atau gagal menganalisis. Coba lagi atau sederhanakan prompt.";

    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("rate limit") || msg.includes("429")) {
        safeMessage =
          "Batas kuota request (rate limit) tercapai pada provider LLM. Silakan tunggu beberapa saat dan coba lagi.";
      } else if (msg.includes("timeout") || msg.includes("timed out")) {
        safeMessage =
          "Waktu tunggu analisis engine melebihi batas. Coba perpendek prompt asli Anda.";
      } else if (msg.includes("api key") || msg.includes("authentication")) {
        safeMessage =
          "Koneksi provider LLM bermasalah. Kunci API tidak dapat digunakan.";
      }
    }

    return NextResponse.json(
      {
        error: safeMessage,
      },
      { status: 500 }
    );
  }
}
