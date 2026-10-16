import {
  ChatMessage,
  ChatResponse,
  LLMProviderAdapter,
  ProviderAdapterError,
  ProviderAdapterOptions,
  ProviderErrorCode,
} from "./types.js";
import {
  ProviderHealthTracker,
  getGlobalProviderHealthTracker,
} from "./provider-health-tracker.js";
import { redactApiKey } from "./redact.js";

export interface CascadeCandidate {
  providerId: string;
  adapter: LLMProviderAdapter;
  priority: number; // Angka lebih kecil = dicoba lebih dahulu
  model?: string;
  isBackupOnly?: boolean;
}

export interface FailoverEvent {
  timestamp: string;
  failedProviderId: string;
  nextProviderId: string;
  error: {
    code: string;
    message: string;
  };
  attemptNumber: number;
}

export interface CascadeFailoverOptions {
  primaryProviderId?: string;
  targetModel?: string;
  candidates?: CascadeCandidate[];
  maxCascadeHops?: number; // Maksimum langkah failover (default: 4)
  healthTracker?: ProviderHealthTracker;
  onFailover?: (event: FailoverEvent) => void;
  env?: NodeJS.ProcessEnv;
  fetchFn?: typeof fetch;
}

export interface CascadeChatResponse extends ChatResponse {
  cascadeMetadata?: {
    actualProvider: string;
    requestedProvider: string;
    wasFailover: boolean;
    cascadeHops: number;
    attemptedProviders: string[];
  };
}

/**
 * Smart Cascade Router & Cross-Provider Failover Adapter
 * Mengimplementasikan LLMProviderAdapter secara 100% backward-compatible.
 * Mengotomatisasi failover saat terjadi Rate Limit (429), Auth Error (401/403),
 * Timeout (504), atau Service Unavailable (503) tanpa mengganggu pemanggil.
 */
export class CascadeFailoverAdapter implements LLMProviderAdapter {
  public readonly providerId = "cascade";
  public readonly defaultModel: string;
  private candidates: CascadeCandidate[] = [];
  private readonly maxCascadeHops: number;
  private readonly healthTracker: ProviderHealthTracker;
  private readonly onFailoverCallback?: (event: FailoverEvent) => void;
  private readonly primaryProviderId: string;
  private lastSuccessfulProviderId: string | null = null;

  constructor(options: CascadeFailoverOptions = {}) {
    this.primaryProviderId = options.primaryProviderId || "groq";
    this.maxCascadeHops = options.maxCascadeHops ?? 4;
    this.healthTracker = options.healthTracker || getGlobalProviderHealthTracker();
    this.onFailoverCallback = options.onFailover;

    if (options.candidates && options.candidates.length > 0) {
      this.candidates = [...options.candidates].sort((a, b) => a.priority - b.priority);
    }

    this.defaultModel =
      options.targetModel ||
      this.candidates[0]?.adapter.defaultModel ||
      "llama-3.3-70b-versatile";
  }

  /**
   * Mendaftarkan kandidat provider ke dalam cascade pool
   */
  public registerCandidate(candidate: CascadeCandidate): void {
    const existingIdx = this.candidates.findIndex(
      (c) => c.providerId.toLowerCase() === candidate.providerId.toLowerCase()
    );
    if (existingIdx >= 0) {
      this.candidates[existingIdx] = candidate;
    } else {
      this.candidates.push(candidate);
    }
    this.candidates.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Mengembalikan daftar kandidat yang terdaftar
   */
  public getCandidates(): CascadeCandidate[] {
    return [...this.candidates];
  }

  public getPrimaryProviderId(): string {
    return this.primaryProviderId;
  }

  public getActualProviderId(): string {
    return this.lastSuccessfulProviderId || this.primaryProviderId || "groq";
  }

  /**
   * Eksekusi Chat Completion dengan Auto-Failover
   */
  public async chatCompletion(
    messages: ChatMessage[],
    options?: ProviderAdapterOptions
  ): Promise<CascadeChatResponse> {
    if (!messages || messages.length === 0) {
      throw new ProviderAdapterError(
        "Daftar pesan tidak boleh kosong.",
        "INVALID_REQUEST",
        400,
        this.providerId
      );
    }

    if (this.candidates.length === 0) {
      throw new ProviderAdapterError(
        "Tidak ada provider kandidat yang terdaftar di dalam Cascade Router.",
        "PROVIDER_UNAVAILABLE",
        503,
        this.providerId
      );
    }

    const attemptedProviders: string[] = [];
    const failureSummaries: string[] = [];
    let hops = 0;

    for (let i = 0; i < this.candidates.length; i++) {
      if (hops >= this.maxCascadeHops) {
        break;
      }

      const candidate = this.candidates[i];
      const pid = candidate.providerId;

      // 1. Fast-Skip: Cek apakah provider sedang dalam masa COOLDOWN
      if (!this.healthTracker.isAvailable(pid)) {
        const remainingSec = this.healthTracker.getRemainingCooldownSec(pid);
        console.warn(
          `[CascadeRouter] Provider "${pid}" sedang cooldown (${remainingSec}s tersisa). Melewati ke provider cadangan...`
        );
        failureSummaries.push(`${pid}: SKIPPED_COOLDOWN(${remainingSec}s)`);
        continue;
      }

      attemptedProviders.push(pid);
      hops++;

      const candidateOptions: ProviderAdapterOptions = {
        ...options,
        model: options?.model || candidate.model || candidate.adapter.defaultModel,
      };

      try {
        const startTime = Date.now();
        const response = await candidate.adapter.chatCompletion(messages, candidateOptions);
        const latencyMs = response.latencyMs ?? Date.now() - startTime;

        // Catat keberhasilan ke tracker kesehatan
        this.healthTracker.recordSuccess(pid, latencyMs);
        this.lastSuccessfulProviderId = pid;

        const wasFailover = attemptedProviders.length > 1;
        if (wasFailover) {
          console.info(
            `[CascadeRouter] ✅ Eksekusi berhasil via failover provider "${pid}" (Model: ${response.model}) setelah ${attemptedProviders.length - 1} percobaan gagal.`
          );
        }

        return {
          ...response,
          cascadeMetadata: {
            actualProvider: pid,
            requestedProvider: this.primaryProviderId,
            wasFailover,
            cascadeHops: hops,
            attemptedProviders,
          },
        };
      } catch (err: unknown) {
        // Catat kegagalan ke health tracker
        const healthRecord = this.healthTracker.recordFailure(pid, err);
        const sanitizedErr = redactApiKey(
          (err as any)?.message || String(err)
        );
        failureSummaries.push(`${pid}: ${healthRecord.lastErrorCode || "ERROR"}`);

        const nextCandidate = this.candidates[i + 1];
        if (nextCandidate) {
          this.healthTracker.recordFailover(pid, nextCandidate.providerId);

          const failoverEvent: FailoverEvent = {
            timestamp: new Date().toISOString(),
            failedProviderId: pid,
            nextProviderId: nextCandidate.providerId,
            error: {
              code: healthRecord.lastErrorCode || "UNKNOWN",
              message: sanitizedErr,
            },
            attemptNumber: hops,
          };

          if (this.onFailoverCallback) {
            try {
              this.onFailoverCallback(failoverEvent);
            } catch {
              // Lindungi loop utama dari error callback
            }
          }

          console.warn(
            `[CascadeRouter] ⚠️ Provider "${pid}" gagal (${healthRecord.lastErrorCode}: ${sanitizedErr}). Mengalihkan otomatis ke "${nextCandidate.providerId}"...`
          );
        }
      }
    }

    // Seluruh kandidat gagal
    throw new ProviderAdapterError(
      `Semua ${this.candidates.length} provider dalam cascade pool gagal dieksekusi [${failureSummaries.join(", ")}]. Silakan periksa koneksi internet atau kuota API.`,
      "PROVIDER_UNAVAILABLE",
      503,
      this.providerId
    );
  }
}
