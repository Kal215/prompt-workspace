import { PrismaClient, type SavedPrompt } from "@prisma/client";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type { SavedPrompt };

export interface SavePromptInput {
  id?: string;
  originalPrompt: string;
  optimizedPrompt: string;
  intentSummary?: string | null;
  score: number;
}

// In ESM / Node environments, resolve the absolute path to prisma/dev.db
const getDatabaseUrl = (): string => {
  const envUrl = process.env.DATABASE_URL;
  const currentDir =
    typeof __dirname !== "undefined"
      ? __dirname
      : dirname(fileURLToPath(import.meta.url));
  const fallbackDbPath = resolve(currentDir, "../prisma/dev.db");

  if (!envUrl) {
    return `file:${fallbackDbPath}`;
  }

  // Absolute SQLite path or protocol (e.g. file:/tmp/isolated.db or file:///...)
  if (envUrl.startsWith("file:/")) {
    return envUrl;
  }

  // Relative SQLite path (e.g. file:./packages/database/prisma/dev.db or file:./dev.db)
  if (envUrl.startsWith("file:")) {
    const rel = envUrl.replace(/^file:/, "");
    const cwdPath = resolve(process.cwd(), rel);
    if (existsSync(cwdPath)) {
      return `file:${cwdPath}`;
    }
    return `file:${fallbackDbPath}`;
  }

  return envUrl;
};

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Menyimpan riwayat prompt yang di-"Accept" oleh pengguna.
 */
export async function savePrompt(data: SavePromptInput): Promise<SavedPrompt> {
  return await prisma.savedPrompt.create({
    data: {
      id: data.id,
      originalPrompt: data.originalPrompt,
      optimizedPrompt: data.optimizedPrompt,
      intentSummary: data.intentSummary ?? null,
      score: data.score,
    },
  });
}

/**
 * Mengambil riwayat prompt tersimpan, terurut dari yang paling baru.
 */
export async function getHistory(limit: number = 20): Promise<SavedPrompt[]> {
  return await prisma.savedPrompt.findMany({
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Mengambil prompt tersimpan berdasarkan ID.
 */
export async function getPromptById(id: string): Promise<SavedPrompt | null> {
  return await prisma.savedPrompt.findUnique({
    where: { id },
  });
}

/**
 * Menghapus prompt tersimpan berdasarkan ID.
 */
export async function deletePrompt(id: string): Promise<SavedPrompt> {
  return await prisma.savedPrompt.delete({
    where: { id },
  });
}
