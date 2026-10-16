import { NextResponse } from "next/server";
import { PromptOptimizationRequestSchema } from "@prompt-workspace/prompt-contracts";
import { runOptimizationPipeline } from "@prompt-workspace/prompt-engine";
import {
  ProviderAdapterError,
} from "@prompt-workspace/provider-adapters";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";
import {
  getOptimizeRateLimiter,
  extractClientIP,
} from "../../../lib/rate-limiter";

// Pastikan environment variables (GROQ_API_KEY_1..6, GEMINI_API_KEY, dll) ter-load di server Next.js
if (!process.env.GROQ_API_KEY_1) {
  const rootEnv = path.resolve(process.cwd(), "../../.env");
  const localEnv = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  } else if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
  }
}

export async function POST(request: Request) {
  try {
    // CSRF check
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    // Rate limiting (lebih ketat: melindungi kuota API provider/biaya)
    const clientIP = extractClientIP(request);
    const rl = getOptimizeRateLimiter().check(`optimize:${clientIP}`);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Terlalu banyak request optimasi. Silakan coba lagi nanti.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfter),
          },
        }
      );
    }

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
      providerId: ["groq", "gemini", "openrouter", "ollama"].includes(body.providerId)
        ? body.providerId
        : null,
      targetModel: body.targetModel ?? null,
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

    // Jalankan pipeline nyata via provider yang dipilih pengguna (default: groq)
    const engineResult = await runOptimizationPipeline(validatedData);

    return NextResponse.json(engineResult, { status: 200 });
  } catch (error) {
    console.error("[API /api/optimize] Kesalahan pada pipeline engine:", error);

    // Sanitasi pesan error agar tidak membocorkan stack trace atau API key
    let safeMessage =
      "Engine sedang sibuk atau gagal menganalisis. Coba lagi atau sederhanakan prompt.";
    let httpStatus = 500;

    if (error instanceof ProviderAdapterError) {
      safeMessage = error.message;
      httpStatus = error.statusCode || 500;
    } else if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("rate limit") || msg.includes("429")) {
        safeMessage =
          "Batas kuota request (rate limit) tercapai pada provider LLM. Silakan tunggu beberapa saat dan coba lagi.";
        httpStatus = 429;
      } else if (msg.includes("timeout") || msg.includes("timed out")) {
        safeMessage =
          "Waktu tunggu analisis engine melebihi batas. Coba perpendek prompt asli Anda.";
        httpStatus = 504;
      } else if (msg.includes("api key") || msg.includes("authentication") || msg.includes("belum dikonfigurasi")) {
        safeMessage =
          "Provider LLM yang dipilih belum dikonfigurasi atau kunci API-nya tidak valid. Periksa pengaturan server.";
        httpStatus = 503;
      } else if (msg.includes("tidak didukung") || msg.includes("not supported")) {
        safeMessage =
          "Provider yang dipilih tidak didukung oleh sistem.";
        httpStatus = 400;
      }
    }

    return NextResponse.json(
      {
        error: safeMessage,
      },
      { status: httpStatus }
    );
  }
}
