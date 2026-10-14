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

// In ESM / Node environments, resolve the absolute path to prisma/dev.db or custom DATABASE_URL
export const getDatabaseUrl = (): string => {
  const envUrl = process.env.DATABASE_URL;
  const currentDir =
    typeof __dirname !== "undefined"
      ? __dirname
      : dirname(fileURLToPath(import.meta.url));
  const fallbackDbPath = resolve(currentDir, "../prisma/dev.db");

  if (!envUrl) {
    return `file:${fallbackDbPath}`;
  }

  // 1. In-memory SQLite
  if (envUrl === "file::memory:" || envUrl.startsWith("file::memory:?")) {
    return envUrl;
  }

  // 2. Windows absolute path: file:C:/... or file:D:\...
  if (/^file:[a-zA-Z]:[\\/]/i.test(envUrl)) {
    return envUrl;
  }

  // 3. Unix absolute path or standard file protocol: file:/... or file:///...
  if (envUrl.startsWith("file:/")) {
    return envUrl;
  }

  // 4. Jika berupa path dev.db relatif eksplisit, arahkan ke dev.db kanonis
  if (
    envUrl === "file:./dev.db" ||
    envUrl === "file:dev.db" ||
    envUrl === "file:prisma/dev.db" ||
    envUrl.endsWith("/prisma/dev.db") ||
    envUrl.endsWith("\\prisma\\dev.db")
  ) {
    return `file:${fallbackDbPath}`;
  }

  // 5. Jika relative file test lain (misal "file:./test-temp.db"), resolve absolut terhadap process.cwd()
  if (envUrl.startsWith("file:")) {
    const rawPath = envUrl.slice(5);
    return `file:${resolve(/* turbopackIgnore: true */ process.cwd(), rawPath)}`;
  }

  return envUrl;
};

let currentUrl = getDatabaseUrl();
let activePrisma = new PrismaClient({
  datasources: {
    db: {
      url: currentUrl,
    },
  },
});

export function setDatabaseUrl(url: string): void {
  process.env.DATABASE_URL = url;
  currentUrl = getDatabaseUrl();
  activePrisma = new PrismaClient({
    datasources: {
      db: {
        url: currentUrl,
      },
    },
  });
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const nowUrl = getDatabaseUrl();
    if (nowUrl !== currentUrl) {
      currentUrl = nowUrl;
      activePrisma = new PrismaClient({
        datasources: {
          db: {
            url: nowUrl,
          },
        },
      });
    }
    const val = (activePrisma as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? val.bind(activePrisma) : val;
  },
});

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
 * Jika userId diberikan, pastikan record yang dihapus adalah milik user tersebut.
 * Record 'legacy_default_user' bersifat read-only dan dilarang dihapus kecuali oleh 'legacy_default_user'.
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
    if (existing.userId === "legacy_default_user" && userId !== "legacy_default_user") {
      const err = new Error("Forbidden: Record legacy bersifat read-only dan tidak boleh dihapus.");
      (err as unknown as { code: string }).code = "FORBIDDEN";
      throw err;
    }
    if (existing.userId !== userId) {
      const err = new Error("Forbidden: Tidak berhak menghapus prompt milik pengguna lain.");
      (err as unknown as { code: string }).code = "FORBIDDEN";
      throw err;
    }
  }

  return await prisma.savedPrompt.delete({
    where: { id },
  });
}
