import { NextResponse } from "next/server";
import { listProviderCapabilities } from "@prompt-workspace/provider-adapters";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

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

export async function GET() {
  try {
    const capabilities = listProviderCapabilities();
    return NextResponse.json(
      { success: true, providers: capabilities },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil daftar kapabilitas provider.",
      },
      { status: 500 }
    );
  }
}
