import crypto from "node:crypto";

export interface CacheEntry<T> {
  key: string;
  data: T;
  createdAt: number;
  expiresAt: number;
}

export interface CacheOptions {
  maxEntries?: number;
  ttlMs?: number;
}

/**
 * Deterministic Content Cache berbasis hash SHA-256 (Mega Task #48).
 * Mendukung batasan kapasitas FIFO dan TTL untuk mencegah lonjakan token (Token Burn & HTTP 429).
 */
export class DeterministicContentCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxEntries: number;
  private defaultTtlMs: number;

  constructor(options: CacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 100;
    this.defaultTtlMs = options.ttlMs ?? 30 * 60 * 1000; // 30 menit
  }

  public computeKey(params: {
    prompt: string;
    context?: string | null;
    taskType?: string | null;
    stylePreset?: string | null;
    budgetMode?: string | null;
    referenceUrls?: string[] | null;
    [key: string]: any;
  }): string {
    const normalized = {
      prompt: (params.prompt || "").trim().toLowerCase(),
      context: (params.context || "").trim().toLowerCase(),
      taskType: (params.taskType || "").trim().toLowerCase(),
      stylePreset: (params.stylePreset || "comprehensive_blueprint").trim().toLowerCase(),
      budgetMode: (params.budgetMode || "balanced").trim().toLowerCase(),
      referenceUrls: (params.referenceUrls || []).map((u) => u.trim().toLowerCase()).sort(),
    };
    const serialized = JSON.stringify(normalized);
    return crypto.createHash("sha256").update(serialized).digest("hex");
  }

  public get<R = T>(keyOrParams: string | Record<string, any>): R | null {
    const key = typeof keyOrParams === "string" ? keyOrParams : this.computeKey(keyOrParams as any);
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as unknown as R;
  }

  public set(keyOrParams: string | Record<string, any>, data: T, ttlMs?: number): void {
    const key = typeof keyOrParams === "string" ? keyOrParams : this.computeKey(keyOrParams as any);
    const now = Date.now();
    const effectiveTtl = ttlMs ?? this.defaultTtlMs;

    // FIFO eviction jika cache penuh
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      key,
      data,
      createdAt: now,
      expiresAt: now + effectiveTtl,
    });
  }

  public has(keyOrParams: string | Record<string, any>): boolean {
    return this.get(keyOrParams) !== null;
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

// Global singleton instance untuk prompt-engine
export const globalPromptEngineCache = new DeterministicContentCache();

export function computeDeterministicCacheKey(params: Record<string, any>): string {
  return globalPromptEngineCache.computeKey(params as any);
}

export function getDeterministicCache<T>(keyOrParams: string | Record<string, any>): T | null {
  return globalPromptEngineCache.get(keyOrParams) as T | null;
}

export function setDeterministicCache<T>(
  keyOrParams: string | Record<string, any>,
  data: T,
  ttlMs?: number
): void {
  globalPromptEngineCache.set(keyOrParams, data, ttlMs);
}

export function clearDeterministicCache(): void {
  globalPromptEngineCache.clear();
}
