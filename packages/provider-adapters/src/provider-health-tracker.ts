import { redactApiKey } from "./redact.js";
import { ProviderAdapterError } from "./types.js";

export type ProviderHealthStatus = "HEALTHY" | "DEGRADED" | "COOLDOWN";

export interface ProviderHealthRecord {
  providerId: string;
  status: ProviderHealthStatus;
  consecutiveFailures: number;
  cooldownUntil: number; // timestamp ms
  lastError?: string; // Sanitized, zero secret
  lastErrorCode?: string;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  totalRequests: number;
  totalSuccess: number;
  totalFailures: number;
  totalFailovers: number;
}

export interface ProviderHealthReport {
  timestamp: string;
  healthyCount: number;
  cooldownCount: number;
  degradedCount: number;
  providers: Record<string, ProviderHealthRecord>;
}

export interface ProviderHealthTrackerOptions {
  defaultCooldownMs?: number;
  rateLimitCooldownMs?: number;
  authErrorCooldownMs?: number;
  serverErrorCooldownMs?: number;
  defaultRateLimitCooldownMs?: number;
  defaultAuthErrorCooldownMs?: number;
  defaultServerErrorCooldownMs?: number;
}

/**
 * Global/Scoped Provider Health Tracker
 * Melacak status kesehatan, latensi, dan masa cooldown setiap provider
 * secara akurat dengan jaminan Zero Secret Leakage.
 */
export class ProviderHealthTracker {
  private records: Map<string, ProviderHealthRecord> = new Map();
  private readonly defaultCooldownMs: number;
  private readonly rateLimitCooldownMs: number;
  private readonly authErrorCooldownMs: number;
  private readonly serverErrorCooldownMs: number;

  constructor(options: ProviderHealthTrackerOptions = {}) {
    this.defaultCooldownMs = options.defaultCooldownMs ?? 60_000;
    this.rateLimitCooldownMs =
      options.defaultRateLimitCooldownMs ?? options.rateLimitCooldownMs ?? 60_000; // 1 menit untuk 429
    this.authErrorCooldownMs =
      options.defaultAuthErrorCooldownMs ?? options.authErrorCooldownMs ?? 1_800_000; // 30 menit untuk kunci rusak
    this.serverErrorCooldownMs =
      options.defaultServerErrorCooldownMs ?? options.serverErrorCooldownMs ?? 30_000; // 30 detik untuk timeout/503
  }

  private getOrCreate(providerId: string): ProviderHealthRecord {
    const key = providerId.trim().toLowerCase();
    let record = this.records.get(key);
    if (!record) {
      record = {
        providerId: key,
        status: "HEALTHY",
        consecutiveFailures: 0,
        cooldownUntil: 0,
        totalRequests: 0,
        totalSuccess: 0,
        totalFailures: 0,
        totalFailovers: 0,
      };
      this.records.set(key, record);
    }
    return record;
  }

  /**
   * Memeriksa apakah provider siap menerima request (tidak dalam masa cooldown).
   * Jika masa cooldown telah berakhir, status otomatis dipulihkan ke "HEALTHY".
   */
  public isAvailable(providerId: string): boolean {
    const record = this.getOrCreate(providerId);
    const now = Date.now();

    if (record.status === "COOLDOWN") {
      if (now >= record.cooldownUntil) {
        // Cooldown telah kedaluwarsa, pulihkan ke HEALTHY
        record.status = "HEALTHY";
        record.consecutiveFailures = 0;
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Mendapatkan sisa waktu cooldown dalam detik (0 jika tidak dalam cooldown).
   */
  public getRemainingCooldownSec(providerId: string): number {
    const record = this.getOrCreate(providerId);
    const now = Date.now();
    if (record.status === "COOLDOWN" && record.cooldownUntil > now) {
      return Math.ceil((record.cooldownUntil - now) / 1000);
    }
    return 0;
  }

  /**
   * Catat panggilan sukses ke provider.
   */
  public recordSuccess(providerId: string, _latencyMs?: number): void {
    const record = this.getOrCreate(providerId);
    record.status = "HEALTHY";
    record.consecutiveFailures = 0;
    record.cooldownUntil = 0;
    record.lastSuccessAt = Date.now();
    record.totalRequests++;
    record.totalSuccess++;
  }

  /**
   * Catat kegagalan panggilan dan hitung masa cooldown otomatis.
   * Jaminan Zero Secret Leakage: pesan error disensor total dari pola API key.
   */
  public recordFailure(
    providerId: string,
    error: unknown,
    customCooldownMs?: number
  ): ProviderHealthRecord {
    const record = this.getOrCreate(providerId);
    const now = Date.now();

    record.totalRequests++;
    record.totalFailures++;
    record.consecutiveFailures++;
    record.lastFailureAt = now;

    // Klasifikasi error & durasi cooldown
    let cooldownDuration = customCooldownMs ?? this.defaultCooldownMs;
    let errorCode = "UNKNOWN";
    let rawMessage = "";

    const anyErr = error as any;
    if (error instanceof ProviderAdapterError || (anyErr && typeof anyErr.code === "string")) {
      errorCode = anyErr.code || "UNKNOWN";
      rawMessage = anyErr.message || String(anyErr);
      const status = anyErr.statusCode || anyErr.status;

      if (
        errorCode === "RATE_LIMIT" ||
        errorCode === "RATE_LIMITED" ||
        status === 429
      ) {
        errorCode = "RATE_LIMIT";
        cooldownDuration = customCooldownMs ?? this.rateLimitCooldownMs;
      } else if (
        errorCode === "AUTH_ERROR" ||
        errorCode === "UNAUTHORIZED" ||
        status === 401 ||
        status === 403
      ) {
        errorCode = "AUTH_ERROR";
        cooldownDuration = customCooldownMs ?? this.authErrorCooldownMs;
      } else if (
        errorCode === "TIMEOUT" ||
        errorCode === "PROVIDER_UNAVAILABLE" ||
        status === 503 ||
        status === 504
      ) {
        cooldownDuration = customCooldownMs ?? this.serverErrorCooldownMs;
      }
    } else if (error instanceof Error) {
      rawMessage = error.message;
      const lower = rawMessage.toLowerCase();
      if (
        lower.includes("429") ||
        lower.includes("rate limit") ||
        lower.includes("too many requests")
      ) {
        errorCode = "RATE_LIMIT";
        cooldownDuration = customCooldownMs ?? this.rateLimitCooldownMs;
      } else if (
        lower.includes("401") ||
        lower.includes("403") ||
        lower.includes("unauthorized") ||
        lower.includes("invalid_api_key")
      ) {
        errorCode = "AUTH_ERROR";
        cooldownDuration = customCooldownMs ?? this.authErrorCooldownMs;
      } else if (
        lower.includes("timeout") ||
        lower.includes("aborted") ||
        lower.includes("504")
      ) {
        errorCode = "TIMEOUT";
        cooldownDuration = customCooldownMs ?? this.serverErrorCooldownMs;
      } else if (
        lower.includes("503") ||
        lower.includes("unavailable") ||
        lower.includes("econnrefused")
      ) {
        errorCode = "PROVIDER_UNAVAILABLE";
        cooldownDuration = customCooldownMs ?? this.serverErrorCooldownMs;
      }
    } else {
      rawMessage = String(error);
    }

    // Sanitasi pesan (Zero Secret Leakage)
    record.lastError = redactApiKey(rawMessage);
    record.lastErrorCode = errorCode;
    record.cooldownUntil = now + cooldownDuration;
    record.status = "COOLDOWN";

    return record;
  }

  /**
   * Catat peristiwa failover dari provider asal ke provider tujuan.
   */
  public recordFailover(fromProviderId: string, _toProviderId: string): void {
    const fromRecord = this.getOrCreate(fromProviderId);
    fromRecord.totalFailovers++;
  }

  /**
   * Dapatkan record kesehatan untuk provider tertentu.
   */
  public getHealth(providerId: string): ProviderHealthRecord {
    return { ...this.getOrCreate(providerId) };
  }

  /**
   * Dapatkan laporan kesehatan lengkap seluruh provider terdaftar.
   */
  public getHealthReport(): ProviderHealthReport {
    let healthy = 0;
    let cooldown = 0;
    let degraded = 0;
    const providers: Record<string, ProviderHealthRecord> = {};

    this.records.forEach((record, id) => {
      // Re-evaluasi ketersediaan saat laporan diminta
      this.isAvailable(id);
      providers[id] = { ...record };

      if (record.status === "HEALTHY") healthy++;
      else if (record.status === "COOLDOWN") cooldown++;
      else if (record.status === "DEGRADED") degraded++;
    });

    return {
      timestamp: new Date().toISOString(),
      healthyCount: healthy,
      cooldownCount: cooldown,
      degradedCount: degraded,
      providers,
    };
  }

  /**
   * Reset status kesehatan (untuk pengujian atau pemulihan manual oleh operator).
   */
  public reset(providerId?: string): void {
    if (providerId) {
      this.records.delete(providerId.trim().toLowerCase());
    } else {
      this.records.clear();
    }
  }
}

/**
 * Singleton instance global untuk seluruh monorepo
 */
let globalInstance: ProviderHealthTracker | null = null;

export function getGlobalProviderHealthTracker(): ProviderHealthTracker {
  if (!globalInstance) {
    globalInstance = new ProviderHealthTracker();
  }
  return globalInstance;
}

export function resetGlobalProviderHealthTracker(): void {
  if (globalInstance) {
    globalInstance.reset();
  }
}
