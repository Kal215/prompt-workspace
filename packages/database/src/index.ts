import {
  PrismaClient,
  type SavedPrompt,
  type PromptVersion,
  type SpiderRun,
  type SpiderTestResult,
  type CrawlerSource,
} from "@prisma/client";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type {
  SavedPrompt,
  PromptVersion,
  SpiderRun,
  SpiderTestResult,
  CrawlerSource,
};

export interface SavePromptInput {
  id?: string;
  userId?: string;
  originalPrompt: string;
  optimizedPrompt: string;
  intentSummary?: string | null;
  score: number;
}

export interface SavePromptVersionInput {
  id?: string;
  savedPromptId: string;
  versionNumber?: number;
  promptText: string;
  score: number;
  changesSummary?: string | null;
  parentVersionId?: string | null;
}

export interface SpiderTestResultInput {
  id?: string;
  caseIndex: number;
  testInput: string;
  expectedOutput?: string | null;
  actualOutput: string;
  score: number;
  latencyMs: number;
  status: string;
  findings?: string | null;
}

export interface SaveSpiderRunInput {
  id?: string;
  promptVersionId: string;
  targetProvider: string;
  targetModel: string;
  status: string;
  totalCases: number;
  passedCases: number;
  averageScore: number;
  averageLatencyMs: number;
  errorMessage?: string | null;
  testResults?: SpiderTestResultInput[];
}

export interface SaveCrawlerSourceInput {
  id?: string;
  savedPromptId?: string | null;
  sourceUrl: string;
  domain: string;
  etag?: string | null;
  contentHash: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Retention Constants (ADR-002 Lampiran B)
// ─────────────────────────────────────────────────────────────────────────────
export const MAX_PROMPT_VERSIONS_PER_PROMPT = 20;
export const MAX_SPIDER_RUNS_PER_VERSION = 10;

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

/**
 * Mengaktifkan konfigurasi performa SQLite WAL sesuai ADR-002 Lampiran B:
 * - PRAGMA journal_mode = WAL;
 * - PRAGMA synchronous = NORMAL;
 * - PRAGMA busy_timeout = 5000;
 */
export async function enableSqliteWal(client: PrismaClient = prisma): Promise<void> {
  try {
    await client.$executeRawUnsafe("PRAGMA journal_mode = WAL;");
    await client.$executeRawUnsafe("PRAGMA synchronous = NORMAL;");
    await client.$executeRawUnsafe("PRAGMA busy_timeout = 5000;");
  } catch {
    // Non-fatal jika berjalan pada in-memory SQLite atau provider non-SQLite
  }
}

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

// ─────────────────────────────────────────────────────────────────────────────
// v1.0 Core Database Operations (100% Backward Compatible)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// v2.0 Versioning Operations (PromptVersion) & FIFO Retention
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Menyimpan versi baru dari prompt (Closed-Loop iteration).
 * Secara otomatis menghitung versionNumber jika tidak diberikan.
 * Menegakkan kebijakan retensi FIFO: maks 20 versi per SavedPrompt (ADR-002 Lampiran B).
 */
export async function savePromptVersion(
  data: SavePromptVersionInput
): Promise<PromptVersion> {
  let nextVersionNumber = data.versionNumber;

  if (nextVersionNumber === undefined) {
    const latest = await prisma.promptVersion.findFirst({
      where: { savedPromptId: data.savedPromptId },
      orderBy: { versionNumber: "desc" },
    });
    nextVersionNumber = latest ? latest.versionNumber + 1 : 1;
  }

  // Penegakan retensi FIFO: jika versi saat ini >= MAX_PROMPT_VERSIONS_PER_PROMPT,
  // hapus versi tertua (kecuali jika hanya 1).
  const currentVersions = await prisma.promptVersion.findMany({
    where: { savedPromptId: data.savedPromptId },
    orderBy: { versionNumber: "asc" },
  });

  if (currentVersions.length >= MAX_PROMPT_VERSIONS_PER_PROMPT) {
    const excessCount = currentVersions.length - MAX_PROMPT_VERSIONS_PER_PROMPT + 1;
    const toDelete = currentVersions.slice(0, excessCount);
    for (const v of toDelete) {
      await prisma.promptVersion.delete({ where: { id: v.id } });
    }
  }

  return await prisma.promptVersion.create({
    data: {
      id: data.id,
      savedPromptId: data.savedPromptId,
      versionNumber: nextVersionNumber,
      promptText: data.promptText,
      score: data.score,
      changesSummary: data.changesSummary ?? null,
      parentVersionId: data.parentVersionId ?? null,
    },
  });
}

/**
 * Mengambil semua versi dari SavedPrompt tertentu, terurut dari versi 1 ke atas.
 */
export async function getPromptVersions(
  savedPromptId: string
): Promise<PromptVersion[]> {
  return await prisma.promptVersion.findMany({
    where: { savedPromptId },
    orderBy: { versionNumber: "asc" },
  });
}

/**
 * Mengambil PromptVersion berdasarkan ID spesifik.
 */
export async function getPromptVersionById(
  id: string
): Promise<PromptVersion | null> {
  return await prisma.promptVersion.findUnique({
    where: { id },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// v2.0 Spider Benchmark Operations (SpiderRun & SpiderTestResult) & FIFO Retention
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Menyimpan hasil eksekusi Prompt Spider Benchmark Run beserta hasil test cases.
 * Menegakkan kebijakan retensi FIFO: maks 10 SpiderRun per PromptVersion (ADR-002 Lampiran B).
 */
export async function saveSpiderRun(
  data: SaveSpiderRunInput
): Promise<SpiderRun & { testResults?: SpiderTestResult[] }> {
  // Penegakan retensi FIFO: jika run saat ini >= MAX_SPIDER_RUNS_PER_VERSION,
  // hapus run tertua untuk version tersebut.
  const existingRuns = await prisma.spiderRun.findMany({
    where: { promptVersionId: data.promptVersionId },
    orderBy: { createdAt: "asc" },
  });

  if (existingRuns.length >= MAX_SPIDER_RUNS_PER_VERSION) {
    const excessCount = existingRuns.length - MAX_SPIDER_RUNS_PER_VERSION + 1;
    const toDelete = existingRuns.slice(0, excessCount);
    for (const r of toDelete) {
      await prisma.spiderRun.delete({ where: { id: r.id } });
    }
  }

  return await prisma.spiderRun.create({
    data: {
      id: data.id,
      promptVersionId: data.promptVersionId,
      targetProvider: data.targetProvider,
      targetModel: data.targetModel,
      status: data.status,
      totalCases: data.totalCases,
      passedCases: data.passedCases,
      averageScore: data.averageScore,
      averageLatencyMs: data.averageLatencyMs,
      errorMessage: data.errorMessage ?? null,
      testResults: data.testResults
        ? {
            create: data.testResults.map((tr) => ({
              id: tr.id,
              caseIndex: tr.caseIndex,
              testInput: tr.testInput,
              expectedOutput: tr.expectedOutput ?? null,
              actualOutput: tr.actualOutput,
              score: tr.score,
              latencyMs: tr.latencyMs,
              status: tr.status,
              findings: tr.findings ?? null,
            })),
          }
        : undefined,
    },
    include: {
      testResults: true,
    },
  });
}

/**
 * Mengambil daftar SpiderRun untuk versi prompt tertentu, terurut dari yang terbaru.
 */
export async function getSpiderRuns(
  promptVersionId: string
): Promise<SpiderRun[]> {
  return await prisma.spiderRun.findMany({
    where: { promptVersionId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Mengambil detail SpiderRun lengkap beserta array SpiderTestResult.
 */
export async function getSpiderRunById(
  id: string
): Promise<(SpiderRun & { testResults: SpiderTestResult[] }) | null> {
  return await prisma.spiderRun.findUnique({
    where: { id },
    include: {
      testResults: {
        orderBy: { caseIndex: "asc" },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// v2.0 Crawler Source Operations (CrawlerSource)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Menyimpan metadata asal pengunduhan prompt dari Web Crawler.
 */
export async function saveCrawlerSource(
  data: SaveCrawlerSourceInput
): Promise<CrawlerSource> {
  return await prisma.crawlerSource.create({
    data: {
      id: data.id,
      savedPromptId: data.savedPromptId ?? null,
      sourceUrl: data.sourceUrl,
      domain: data.domain,
      etag: data.etag ?? null,
      contentHash: data.contentHash,
    },
  });
}

/**
 * Mengambil metadata CrawlerSource yang terhubung dengan SavedPrompt.
 */
export async function getCrawlerSource(
  savedPromptId: string
): Promise<CrawlerSource | null> {
  return await prisma.crawlerSource.findUnique({
    where: { savedPromptId },
  });
}
