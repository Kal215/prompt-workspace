import {
  PrismaClient,
  Prisma,
  type SavedPrompt,
  type PromptVersion,
  type CrawlSession,
  type CrawlItem,
  type SpiderRun,
  type SpiderBranchResult,
} from "@prisma/client";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type {
  SavedPrompt,
  PromptVersion,
  CrawlSession,
  CrawlItem,
  SpiderRun,
  SpiderBranchResult,
};

// ─────────────────────────────────────────────────────────────────────────────
// v1.0 Interfaces (Preserved 100%)
// ─────────────────────────────────────────────────────────────────────────────
export interface SavePromptInput {
  id?: string;
  userId?: string;
  originalPrompt: string;
  optimizedPrompt: string;
  intentSummary?: string | null;
  score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// v2.0 Interfaces
// ─────────────────────────────────────────────────────────────────────────────
export interface CreatePromptVersionInput {
  id?: string;
  savedPromptId: string;
  userId: string;
  sourceRole?: string; // "OPTIMIZER" | "CRAWLER" | "CLOSED_LOOP" | "MANUAL"
  promptContent: string;
  groundingSummary?: string | null;
}

export interface SaveCrawlItemInput {
  id?: string;
  itemType: string;
  extractedText: string;
  surroundingContext?: string | null;
  lineStart?: number | null;
  lineEnd?: number | null;
  confidenceEstimate: number;
  warnings?: string[];
}

export interface SaveCrawlSessionBatchInput {
  id?: string;
  userId: string;
  idempotencyKey?: string | null;
  sourceUrl: string;
  normalizedUrl: string;
  sourceType: string;
  status: string;
  bytesRead?: number;
  errorCode?: string | null;
  items?: SaveCrawlItemInput[];
}

export interface SaveSpiderBranchInput {
  id?: string;
  caseId: string;
  category: string;
  severity: string;
  status: string;
  score?: number | null;
  latencyMs: number;
  sanitizedInput: string;
  sanitizedOutput: string;
  rationale?: string | null;
  deterministicPass?: boolean;
}

export interface SaveSpiderRunBatchInput {
  id?: string;
  userId: string;
  idempotencyKey?: string | null;
  promptVersionId: string;
  testSuiteVersion: string;
  rubricVersion: string;
  provider: string;
  modelId: string;
  status: string;
  criticalGatePassed?: boolean;
  qualityMetrics?: Record<string, unknown>;
  securityFindings?: Array<Record<string, unknown>>;
  totalTokens?: number;
  durationMs?: number;
  branches?: SaveSpiderBranchInput[];
}

// Retention Constants (ADR-002 Lampiran B)
export const MAX_PROMPT_VERSIONS_PER_PROMPT = 20;
export const MAX_SPIDER_RUNS_PER_VERSION = 10;

// Resolve Database URL
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

  if (envUrl === "file::memory:" || envUrl.startsWith("file::memory:?")) {
    return envUrl;
  }

  if (/^file:[a-zA-Z]:[\\/]/i.test(envUrl)) {
    return envUrl;
  }

  if (envUrl.startsWith("file:/")) {
    return envUrl;
  }

  if (
    envUrl === "file:./dev.db" ||
    envUrl === "file:dev.db" ||
    envUrl === "file:prisma/dev.db" ||
    envUrl.endsWith("/prisma/dev.db") ||
    envUrl.endsWith("\\prisma\\dev.db")
  ) {
    return `file:${fallbackDbPath}`;
  }

  if (envUrl.startsWith("file:")) {
    const rawPath = envUrl.slice(5);
    return `file:${resolve(process.cwd(), rawPath)}`;
  }

  return envUrl;
};

/**
 * Mengaktifkan konfigurasi performa SQLite WAL sesuai ADR-002 Lampiran B:
 * - PRAGMA journal_mode = WAL;
 * - PRAGMA busy_timeout = 5000;
 */
export async function enableSqliteWalMode(client: PrismaClient = prisma): Promise<void> {
  try {
    await client.$executeRawUnsafe("PRAGMA journal_mode = WAL;");
    await client.$executeRawUnsafe("PRAGMA busy_timeout = 5000;");
  } catch {
    // Non-fatal jika berjalan pada in-memory SQLite atau provider non-SQLite
  }
}

// Alias backward compatibility
export const enableSqliteWal = enableSqliteWalMode;

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

export async function getPromptById(id: string): Promise<SavedPrompt | null> {
  return await prisma.savedPrompt.findUnique({
    where: { id },
  });
}

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
// v2.0 Versioning Operations (PromptVersion) & Anti-IDOR & FIFO Retention
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Membuat versi prompt baru dengan penegakan kepemilikan anti-IDOR dan retensi FIFO.
 */
export async function createPromptVersion(
  input: CreatePromptVersionInput
): Promise<PromptVersion> {
  // 1. Verifikasi kepemilikan SavedPrompt (Anti-IDOR)
  const savedPrompt = await prisma.savedPrompt.findUnique({
    where: { id: input.savedPromptId },
  });
  if (!savedPrompt) {
    const err = new Error("SavedPrompt tidak ditemukan.");
    (err as unknown as { code: string }).code = "NOT_FOUND";
    throw err;
  }

  // Jika SavedPrompt bukan milik input.userId (dan bukan legacy yang sedang diakses legacy), lempar FORBIDDEN
  if (
    savedPrompt.userId !== input.userId &&
    savedPrompt.userId !== "legacy_default_user"
  ) {
    const err = new Error("Forbidden: Tidak berhak membuat versi pada prompt pengguna lain.");
    (err as unknown as { code: string }).code = "FORBIDDEN";
    throw err;
  }

  // 2. Tentukan nomor versi berikutnya
  const latest = await prisma.promptVersion.findFirst({
    where: { savedPromptId: input.savedPromptId },
    orderBy: { versionNumber: "desc" },
  });
  const nextVersionNumber = latest ? latest.versionNumber + 1 : 1;

  // 3. Terapkan retensi FIFO (Maksimal MAX_PROMPT_VERSIONS_PER_PROMPT)
  const existingVersions = await prisma.promptVersion.findMany({
    where: { savedPromptId: input.savedPromptId },
    orderBy: { versionNumber: "asc" },
  });

  if (existingVersions.length >= MAX_PROMPT_VERSIONS_PER_PROMPT) {
    const excess = existingVersions.length - MAX_PROMPT_VERSIONS_PER_PROMPT + 1;
    const toDelete = existingVersions.slice(0, excess);
    for (const v of toDelete) {
      await prisma.promptVersion.delete({ where: { id: v.id } });
    }
  }

  return await prisma.promptVersion.create({
    data: {
      id: input.id,
      savedPromptId: input.savedPromptId,
      userId: input.userId,
      versionNumber: nextVersionNumber,
      sourceRole: input.sourceRole ?? "OPTIMIZER",
      promptContent: input.promptContent,
      groundingSummary: input.groundingSummary ?? null,
    },
  });
}

/**
 * Mengambil daftar versi prompt untuk SavedPrompt tertentu.
 * Jika belum ada versi sama sekali, OTOMATIS membuat version 1 dari SavedPrompt.optimizedPrompt.
 * Menegakkan proteksi kepemilikan userId.
 */
export async function getPromptVersions(
  savedPromptId: string,
  userId: string
): Promise<PromptVersion[]> {
  const savedPrompt = await prisma.savedPrompt.findUnique({
    where: { id: savedPromptId },
  });
  if (!savedPrompt) {
    const err = new Error("SavedPrompt tidak ditemukan.");
    (err as unknown as { code: string }).code = "NOT_FOUND";
    throw err;
  }

  if (
    savedPrompt.userId !== userId &&
    savedPrompt.userId !== "legacy_default_user"
  ) {
    const err = new Error("Forbidden: Akses ditolak.");
    (err as unknown as { code: string }).code = "FORBIDDEN";
    throw err;
  }

  let versions = await prisma.promptVersion.findMany({
    where: { savedPromptId },
    orderBy: { versionNumber: "asc" },
  });

  // Otomatis bootstrap Versi 1 dari SavedPrompt.optimizedPrompt jika belum pernah ada
  if (versions.length === 0) {
    const v1 = await prisma.promptVersion.create({
      data: {
        savedPromptId: savedPrompt.id,
        userId: savedPrompt.userId,
        versionNumber: 1,
        sourceRole: "OPTIMIZER",
        promptContent: savedPrompt.optimizedPrompt,
        groundingSummary: savedPrompt.intentSummary ?? null,
      },
    });
    versions = [v1];
  }

  return versions;
}

export async function getPromptVersionById(
  id: string,
  userId?: string
): Promise<PromptVersion | null> {
  const version = await prisma.promptVersion.findUnique({
    where: { id },
  });

  if (!version) return null;

  if (
    userId &&
    version.userId !== userId &&
    version.userId !== "legacy_default_user"
  ) {
    const err = new Error("Forbidden: Akses versi prompt ditolak.");
    (err as unknown as { code: string }).code = "FORBIDDEN";
    throw err;
  }

  return version;
}

// ─────────────────────────────────────────────────────────────────────────────
// v2.0 CrawlSession & CrawlItem Operations (Batch + Idempotensi P2002)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveCrawlSessionBatch(
  input: SaveCrawlSessionBatchInput
): Promise<CrawlSession & { items: CrawlItem[] }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const session = await tx.crawlSession.create({
        data: {
          id: input.id,
          userId: input.userId,
          idempotencyKey: input.idempotencyKey ?? null,
          sourceUrl: input.sourceUrl,
          normalizedUrl: input.normalizedUrl,
          sourceType: input.sourceType,
          status: input.status,
          bytesRead: input.bytesRead ?? 0,
          errorCode: input.errorCode ?? null,
          items: input.items
            ? {
                create: input.items.map((item) => ({
                  id: item.id,
                  userId: input.userId,
                  itemType: item.itemType,
                  extractedText: item.extractedText,
                  surroundingContext: item.surroundingContext ?? null,
                  lineStart: item.lineStart ?? null,
                  lineEnd: item.lineEnd ?? null,
                  confidenceEstimate: item.confidenceEstimate,
                  warningsJson: JSON.stringify(item.warnings ?? []),
                })),
              }
            : undefined,
        },
        include: {
          items: true,
        },
      });

      return session;
    });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      input.idempotencyKey
    ) {
      const existing = await prisma.crawlSession.findUnique({
        where: {
          userId_idempotencyKey: {
            userId: input.userId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        include: { items: true },
      });
      if (existing) {
        return existing;
      }
    }
    throw err;
  }
}

export async function getCrawlSessionById(
  id: string,
  userId: string
): Promise<(CrawlSession & { items: CrawlItem[] }) | null> {
  const session = await prisma.crawlSession.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!session) return null;

  if (session.userId !== userId && session.userId !== "legacy_default_user") {
    const err = new Error("Forbidden: Akses crawl session ditolak.");
    (err as unknown as { code: string }).code = "FORBIDDEN";
    throw err;
  }

  return session;
}

// ─────────────────────────────────────────────────────────────────────────────
// v2.0 SpiderRun & SpiderBranchResult Operations (Single Transaction + Anti-IDOR + Retensi)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveSpiderRunBatch(
  input: SaveSpiderRunBatchInput
): Promise<SpiderRun & { branches: SpiderBranchResult[] }> {
  // 1. Verifikasi kepemilikan PromptVersion (Anti-IDOR)
  const promptVersion = await prisma.promptVersion.findUnique({
    where: { id: input.promptVersionId },
  });
  if (!promptVersion) {
    const err = new Error("PromptVersion tidak ditemukan.");
    (err as unknown as { code: string }).code = "NOT_FOUND";
    throw err;
  }

  if (
    promptVersion.userId !== input.userId &&
    promptVersion.userId !== "legacy_default_user"
  ) {
    const err = new Error("Forbidden: Tidak berhak menjalankan spider pada versi prompt pengguna lain.");
    (err as unknown as { code: string }).code = "FORBIDDEN";
    throw err;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // 2. Retensi FIFO (Maksimal MAX_SPIDER_RUNS_PER_VERSION per promptVersionId)
      const existingRuns = await tx.spiderRun.findMany({
        where: { promptVersionId: input.promptVersionId },
        orderBy: { createdAt: "asc" },
      });

      if (existingRuns.length >= MAX_SPIDER_RUNS_PER_VERSION) {
        const excess = existingRuns.length - MAX_SPIDER_RUNS_PER_VERSION + 1;
        const toDelete = existingRuns.slice(0, excess);
        for (const r of toDelete) {
          await tx.spiderRun.delete({ where: { id: r.id } });
        }
      }

      // 3. Simpan SpiderRun bersama seluruh SpiderBranchResult dalam satu batch
      const run = await tx.spiderRun.create({
        data: {
          id: input.id,
          userId: input.userId,
          idempotencyKey: input.idempotencyKey ?? null,
          promptVersionId: input.promptVersionId,
          testSuiteVersion: input.testSuiteVersion,
          rubricVersion: input.rubricVersion,
          provider: input.provider,
          modelId: input.modelId,
          status: input.status,
          criticalGatePassed: input.criticalGatePassed ?? false,
          qualityMetricsJson: JSON.stringify(input.qualityMetrics ?? {}),
          securityJson: JSON.stringify(input.securityFindings ?? []),
          totalTokens: input.totalTokens ?? 0,
          durationMs: input.durationMs ?? 0,
          completedAt: input.status === "SUCCEEDED" || input.status === "FAILED" ? new Date() : null,
          branches: input.branches
            ? {
                create: input.branches.map((b) => ({
                  id: b.id,
                  caseId: b.caseId,
                  category: b.category,
                  severity: b.severity,
                  status: b.status,
                  score: b.score ?? null,
                  latencyMs: b.latencyMs,
                  sanitizedInput: b.sanitizedInput,
                  sanitizedOutput: b.sanitizedOutput,
                  rationale: b.rationale ?? null,
                  deterministicPass: b.deterministicPass ?? false,
                })),
              }
            : undefined,
        },
        include: {
          branches: true,
        },
      });

      return run;
    });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      input.idempotencyKey
    ) {
      const existing = await prisma.spiderRun.findUnique({
        where: {
          userId_idempotencyKey: {
            userId: input.userId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        include: { branches: true },
      });
      if (existing) {
        return existing;
      }
    }
    throw err;
  }
}

export async function getSpiderRunById(
  id: string,
  userId: string
): Promise<(SpiderRun & { branches: SpiderBranchResult[] }) | null> {
  const run = await prisma.spiderRun.findUnique({
    where: { id },
    include: { branches: true },
  });

  if (!run) return null;

  if (run.userId !== userId && run.userId !== "legacy_default_user") {
    const err = new Error("Forbidden: Akses spider run ditolak.");
    (err as unknown as { code: string }).code = "FORBIDDEN";
    throw err;
  }

  return run;
}
