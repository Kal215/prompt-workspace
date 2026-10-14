/**
 * Rate Limiter — In-Memory Sliding Window
 *
 * Arsitektur modular:
 * - Interface RateLimiter terpisah dari implementasi.
 * - InMemorySlidingWindowLimiter: cocok untuk single-instance Node.js.
 * - BATASAN: Tidak cocok untuk multi-instance / load balanced deployment.
 *   Untuk multi-instance, ganti implementasi dengan Redis/Upstash store
 *   yang mengimplementasikan interface RateLimiter yang sama.
 *
 * Konfigurasi default:
 * - /api/history: 60 request per menit per IP (melindungi database dari abuse).
 * - /api/optimize: 10 request per menit per IP (melindungi kuota API LLM & biaya).
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp (seconds)
  retryAfter: number; // Seconds until reset
}

export interface RateLimiter {
  /**
   * Memeriksa dan mencatat request.
   * @param key - Identifier unik (biasanya IP address).
   * @returns Hasil pengecekan rate limit.
   */
  check(key: string): RateLimitResult;
}

interface WindowEntry {
  timestamps: number[];
  cleanedAt: number;
}

/**
 * In-Memory Sliding Window Rate Limiter.
 *
 * Implementasi:
 * - Menyimpan timestamp request per key dalam array.
 * - Setiap pengecekan, membuang timestamp yang sudah melewati jendela waktu.
 * - Jika jumlah request dalam jendela aktif >= maxRequests, request ditolak.
 * - Pembersihan entry kadaluarsa dilakukan secara periodik (setiap 60 detik)
 *   untuk mencegah memory leak pada key yang tidak lagi aktif.
 *
 * Batasan single-instance:
 * - Data hilang saat server restart.
 * - Tidak dishare antar instance/pod.
 * - Untuk deployment terdistribusi, implementasikan RedisRateLimiter
 *   yang mengimplementasikan interface RateLimiter yang sama.
 */
export class InMemorySlidingWindowLimiter implements RateLimiter {
  private store = new Map<string, WindowEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxRequests: number, windowSeconds: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;

    // Cleanup expired entries setiap 60 detik
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
    // Allow process to exit even with active timer
    if (this.cleanupTimer && typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const resetAt = Math.ceil((now + this.windowMs) / 1000);

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [], cleanedAt: now };
      this.store.set(key, entry);
    }

    // Buang request yang sudah di luar jendela waktu
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
    entry.cleanedAt = now;

    const currentCount = entry.timestamps.length;
    const remaining = Math.max(0, this.maxRequests - currentCount);

    if (currentCount >= this.maxRequests) {
      // Rate limited
      const oldestInWindow = entry.timestamps[0] || now;
      const retryAfterMs = oldestInWindow + this.windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }

    // Catat request
    entry.timestamps.push(now);

    return {
      allowed: true,
      remaining: remaining - 1,
      resetAt,
      retryAfter: 0,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = this.windowMs * 2;
    for (const [key, entry] of this.store) {
      if (now - entry.cleanedAt > staleThreshold) {
        this.store.delete(key);
      }
    }
  }

  /** Untuk keperluan testing: reset seluruh store. */
  reset(): void {
    this.store.clear();
  }

  /** Untuk keperluan testing: hentikan cleanup timer. */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Singleton instances per endpoint
const historyLimiter = new InMemorySlidingWindowLimiter(
  60, // 60 requests
  60 // per 60 seconds
);

const optimizeLimiter = new InMemorySlidingWindowLimiter(
  10, // 10 requests
  60 // per 60 seconds
);

export function getHistoryRateLimiter(): InMemorySlidingWindowLimiter {
  return historyLimiter;
}

export function getOptimizeRateLimiter(): InMemorySlidingWindowLimiter {
  return optimizeLimiter;
}

/**
 * Mengekstrak IP address dari Request headers.
 * Hanya mempercayai X-Forwarded-For jika TRUST_PROXY disetel ke "true" untuk mencegah spoofing.
 */
export function extractClientIP(request: Request): string {
  const trustProxy =
    process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1";
  if (trustProxy) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      // Ambil IP pertama (IP klien asli)
      return forwarded.split(",")[0].trim();
    }
    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }
  }
  return request.headers.get("x-client-ip") || "127.0.0.1";
}
