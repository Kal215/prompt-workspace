import { PrismaClient, type SavedPrompt } from "@prisma/client";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type { SavedPrompt };

export interface SavePromptInput {
  id?: string;
  userId?: string;
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

  // Jika berupa path relatif SQLite, arahkan ke path absolut dev.db kanonis
  if (envUrl.startsWith("file:")) {
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
      userId: data.userId ?? "legacy_default_user",
      originalPrompt: data.originalPrompt,
      optimizedPrompt: data.optimizedPrompt,
      intentSummary: data.intentSummary ?? null,
      score: data.score,
    },
  });
}

/**
 * Mengambil riwayat prompt tersimpan, terurut dari yang paling baru.
 * Jika userId disediakan, hanya mengembalikan prompt milik user tersebut serta prompt legacy.
 */
export async function getHistory(
  limit: number = 20,
  userId?: string
): Promise<SavedPrompt[]> {
  const whereClause = userId
    ? {
        OR: [{ userId }, { userId: "legacy_default_user" }],
      }
    : undefined;

  return await prisma.savedPrompt.findMany({
    where: whereClause,
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
 * Jika userId diberikan, pastikan record yang dihapus adalah milik user tersebut
 * atau milik legacy.
 */
export async function deletePrompt(
  id: string,
  userId?: string
): Promise<SavedPrompt> {
  if (userId) {
    const existing = await prisma.savedPrompt.findUnique({
      where: { id },
    });
    if (!existing) {
      const err = new Error("Record tidak ditemukan.");
      (err as unknown as { code: string }).code = "NOT_FOUND";
      throw err;
    }
    if (existing.userId !== userId && existing.userId !== "legacy_default_user") {
      const err = new Error("Forbidden: Tidak berhak menghapus prompt milik pengguna lain.");
      (err as unknown as { code: string }).code = "FORBIDDEN";
      throw err;
    }
  }

  return await prisma.savedPrompt.delete({
    where: { id },
  });
}
