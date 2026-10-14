import { NextResponse } from "next/server";
import { PromptExecutionRequestSchema } from "@prompt-workspace/prompt-contracts";
import { executePromptOnTargetModel } from "@prompt-workspace/prompt-engine";
import { ProviderAdapterError } from "@prompt-workspace/provider-adapters";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";
import {
  getExecuteRateLimiter,
  extractClientIP,
} from "../../../lib/rate-limiter";

// Pastikan environment variables ter-load di server Next.js
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
    // 1. CSRF check (Fail-Closed)
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    // 2. Rate limiting (Sliding window per IP)
    const clientIP = extractClientIP(request);
    const rl = getExecuteRateLimiter().check(`execute:${clientIP}`);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Terlalu banyak permintaan eksekusi model. Silakan tunggu beberapa saat.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfter),
          },
        }
      );
    }

    // 3. Baca dan parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Format request tidak valid: JSON body diharapkan.",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Format request tidak valid: Payload kosong.",
        },
        { status: 400 }
      );
    }

    // 4. Validasi payload dengan PromptExecutionRequestSchema
    const validationResult = PromptExecutionRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validasi gagal: format parameter eksekusi tidak valid.",
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    // 5. Panggil engine eksekusi model target
    const executionResult = await executePromptOnTargetModel(validationResult.data);

    return NextResponse.json(
      {
        success: true,
        data: executionResult,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[API /api/execute] Kesalahan eksekusi target model:", error);

    // Sanitasi pesan error agar tidak membocorkan stack trace atau API key
    let safeMessage =
      "Gagal mengeksekusi prompt pada model target. Silakan coba beberapa saat lagi.";
    let httpStatus = 500;

    if (error instanceof ProviderAdapterError) {
      safeMessage = error.message;
      httpStatus = error.statusCode || 500;
    } else if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("rate limit") || msg.includes("429")) {
        safeMessage =
          "Batas kuota request (rate limit) tercapai pada provider LLM target. Silakan tunggu beberapa saat.";
        httpStatus = 429;
      } else if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("504")) {
        safeMessage =
          "Waktu tunggu eksekusi model melebihi batas (timeout). Coba kurangi kompleksitas prompt.";
        httpStatus = 504;
      } else if (
        msg.includes("api key") ||
        msg.includes("authentication") ||
        msg.includes("belum dikonfigurasi") ||
        msg.includes("unconfigured")
      ) {
        safeMessage =
          "Provider AI yang dipilih belum dikonfigurasi kuncinya di server. Periksa pengaturan environment.";
        httpStatus = 503;
      } else if (msg.includes("ollama") && (msg.includes("koneksi") || msg.includes("offline") || msg.includes("refused"))) {
        safeMessage =
          "Layanan Ollama lokal tidak dapat dihubungi. Pastikan daemon Ollama aktif di komputer Anda.";
        httpStatus = 503;
      } else if (msg.includes("tidak didukung") || msg.includes("not supported")) {
        safeMessage = "Provider atau model yang dipilih tidak didukung oleh sistem.";
        httpStatus = 400;
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: safeMessage,
      },
      { status: httpStatus }
    );
  }
}
