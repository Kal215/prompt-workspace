import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  ChatMessage,
  ChatResponse,
  LLMProviderAdapter,
  ProviderAdapterError,
  ProviderAdapterOptions,
  CascadeFailoverAdapter,
  CascadeCandidate,
  createCascadeAdapter,
  createProviderAdapter,
  ProviderHealthTracker,
  FailoverEvent,
} from "../src/index.js";

/**
 * Mock Adapter untuk pengujian terisolasi dan deterministik
 */
class MockAdapter implements LLMProviderAdapter {
  public callCount = 0;
  constructor(
    public readonly providerId: string,
    public readonly defaultModel: string,
    private readonly behavior: (callIndex: number) => Promise<ChatResponse>
  ) {}

  async chatCompletion(
    messages: ChatMessage[],
    options?: ProviderAdapterOptions
  ): Promise<ChatResponse> {
    this.callCount++;
    return this.behavior(this.callCount);
  }
}

describe("Smart Cascade Router & Cross-Provider Failover Pool", () => {
  let healthTracker: ProviderHealthTracker;

  beforeEach(() => {
    healthTracker = new ProviderHealthTracker({
      defaultRateLimitCooldownMs: 1000,
      defaultAuthErrorCooldownMs: 2000,
      defaultServerErrorCooldownMs: 500,
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Contract Conformance
  // ─────────────────────────────────────────────────────────────
  describe("1. Contract Conformance", () => {
    it("CascadeFailoverAdapter mematuhi kontrak LLMProviderAdapter", () => {
      const mockPrimary = new MockAdapter("groq", "llama-3.3-70b-versatile", async () => ({
        content: "Halo",
        model: "llama-3.3-70b-versatile",
      }));

      const adapter = new CascadeFailoverAdapter({
        primaryProviderId: "groq",
        candidates: [{ providerId: "groq", adapter: mockPrimary, priority: 1 }],
        healthTracker,
      });

      assert.equal(adapter.providerId, "cascade");
      assert.equal(typeof adapter.defaultModel, "string");
      assert.equal(typeof adapter.chatCompletion, "function");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Primary Execution Success (Tanpa Failover)
  // ─────────────────────────────────────────────────────────────
  describe("2. Primary Execution Success (No Failover)", () => {
    it("mengeksekusi primary provider dengan sukses dan mencatat metrik", async () => {
      const primaryMock = new MockAdapter("groq", "llama-3.3-70b-versatile", async () => ({
        content: "Respons optimasi utama",
        model: "llama-3.3-70b-versatile",
        usage: { promptTokens: 10, completionTokens: 20 },
      }));

      const secondaryMock = new MockAdapter("gemini", "gemini-2.5-flash", async () => ({
        content: "Respons cadangan",
        model: "gemini-2.5-flash",
      }));

      const cascade = new CascadeFailoverAdapter({
        primaryProviderId: "groq",
        candidates: [
          { providerId: "groq", adapter: primaryMock, priority: 1 },
          { providerId: "gemini", adapter: secondaryMock, priority: 2 },
        ],
        healthTracker,
      });

      const res = await cascade.chatCompletion([{ role: "user", content: "Test" }]);

      assert.equal(res.content, "Respons optimasi utama");
      assert.equal(primaryMock.callCount, 1);
      assert.equal(secondaryMock.callCount, 0); // Cadangan tidak disentuh

      const health = healthTracker.getHealth("groq");
      assert.equal(health?.status, "HEALTHY");
      assert.equal(health?.totalSuccess, 1);
      assert.equal(health?.totalFailures, 0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Automatic Failover saat Primary Terkena Rate Limit 429
  // ─────────────────────────────────────────────────────────────
  describe("3. Cross-Provider Automatic Failover (429 Rate Limit)", () => {
    it("otomatis beralih ke Gemini saat Groq terkena 429 dan mencatat event failover", async () => {
      const failoverEvents: FailoverEvent[] = [];

      // Primary melempar RATE_LIMIT (429)
      const primaryMock = new MockAdapter("groq", "llama-3.3-70b-versatile", async () => {
        throw new ProviderAdapterError("Rate limit reached on Groq key", "RATE_LIMIT", 429, "groq");
      });

      // Secondary berhasil merespons
      const secondaryMock = new MockAdapter("gemini", "gemini-2.5-flash", async () => ({
        content: "Respons sukses dari Gemini cadangan",
        model: "gemini-2.5-flash",
      }));

      const cascade = new CascadeFailoverAdapter({
        primaryProviderId: "groq",
        candidates: [
          { providerId: "groq", adapter: primaryMock, priority: 1 },
          { providerId: "gemini", adapter: secondaryMock, priority: 2 },
        ],
        healthTracker,
        onFailover: (evt) => failoverEvents.push(evt),
      });

      const res = await cascade.chatCompletion([{ role: "user", content: "Test cascade" }]);

      assert.equal(res.content, "Respons sukses dari Gemini cadangan");
      assert.equal(primaryMock.callCount, 1);
      assert.equal(secondaryMock.callCount, 1);

      // Verifikasi event failover terpanggil
      assert.equal(failoverEvents.length, 1);
      assert.equal(failoverEvents[0].failedProviderId, "groq");
      assert.equal(failoverEvents[0].nextProviderId, "gemini");
      assert.equal(failoverEvents[0].error.code, "RATE_LIMIT");

      // Verifikasi status kesehatan Groq masuk ke COOLDOWN
      const groqHealth = healthTracker.getHealth("groq");
      assert.equal(groqHealth?.status, "COOLDOWN");
      assert.equal(groqHealth?.totalFailures, 1);

      // Verifikasi Gemini berstatus HEALTHY
      const geminiHealth = healthTracker.getHealth("gemini");
      assert.equal(geminiHealth?.status, "HEALTHY");
      assert.equal(geminiHealth?.totalSuccess, 1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Fast-Skip: Melewati Provider yang Sedang Cooldown (0ms Penalti)
  // ─────────────────────────────────────────────────────────────
  describe("4. Fast-Skip Cooldown Provider", () => {
    it("langsung melewati provider yang sedang cooldown tanpa memanggil ulang network", async () => {
      const primaryMock = new MockAdapter("groq", "llama-3.3-70b-versatile", async () => {
        throw new ProviderAdapterError("Rate limit 429", "RATE_LIMIT", 429, "groq");
      });

      const secondaryMock = new MockAdapter("gemini", "gemini-2.5-flash", async () => ({
        content: "Gemini respons",
        model: "gemini-2.5-flash",
      }));

      const cascade = new CascadeFailoverAdapter({
        primaryProviderId: "groq",
        candidates: [
          { providerId: "groq", adapter: primaryMock, priority: 1 },
          { providerId: "gemini", adapter: secondaryMock, priority: 2 },
        ],
        healthTracker,
      });

      // Panggilan pertama: Groq gagal -> Failover ke Gemini
      await cascade.chatCompletion([{ role: "user", content: "Panggilan 1" }]);
      assert.equal(primaryMock.callCount, 1);
      assert.equal(secondaryMock.callCount, 1);

      // Panggilan kedua: Groq MASIH dalam cooldown -> langsung skip ke Gemini!
      const res2 = await cascade.chatCompletion([{ role: "user", content: "Panggilan 2" }]);
      assert.equal(res2.content, "Gemini respons");
      assert.equal(primaryMock.callCount, 1); // primary TIDAK dipanggil lagi!
      assert.equal(secondaryMock.callCount, 2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Recovery Setelah Cooldown Expired
  // ─────────────────────────────────────────────────────────────
  describe("5. Recovery After Cooldown Expiry", () => {
    it("mencoba kembali primary provider setelah masa cooldown habis", async () => {
      let groqHealthyNow = false;

      const primaryMock = new MockAdapter("groq", "llama-3.3-70b-versatile", async () => {
        if (!groqHealthyNow) {
          throw new ProviderAdapterError("Rate limit 429", "RATE_LIMIT", 429, "groq");
        }
        return {
          content: "Groq pulih dan sehat kembali",
          model: "llama-3.3-70b-versatile",
        };
      });

      const secondaryMock = new MockAdapter("gemini", "gemini-2.5-flash", async () => ({
        content: "Gemini fallback",
        model: "gemini-2.5-flash",
      }));

      const shortTracker = new ProviderHealthTracker({
        defaultRateLimitCooldownMs: 50, // 50ms cooldown untuk pengujian cepat
      });

      const cascade = new CascadeFailoverAdapter({
        primaryProviderId: "groq",
        candidates: [
          { providerId: "groq", adapter: primaryMock, priority: 1 },
          { providerId: "gemini", adapter: secondaryMock, priority: 2 },
        ],
        healthTracker: shortTracker,
      });

      // Panggilan 1: Gagal, masuk cooldown
      await cascade.chatCompletion([{ role: "user", content: "Call 1" }]);
      assert.equal(primaryMock.callCount, 1);

      // Simulasi Groq sudah pulih dan tunggu 60ms agar cooldown habis
      groqHealthyNow = true;
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Panggilan 2: Cooldown sudah habis, coba Groq lagi dan sukses!
      const res = await cascade.chatCompletion([{ role: "user", content: "Call 2" }]);
      assert.equal(res.content, "Groq pulih dan sehat kembali");
      assert.equal(primaryMock.callCount, 2);

      const groqHealth = shortTracker.getHealth("groq");
      assert.equal(groqHealth?.status, "HEALTHY");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. All Providers Failing (Exhaustion Guard)
  // ─────────────────────────────────────────────────────────────
  describe("6. All Providers Exhaustion Guard", () => {
    it("melempar ProviderAdapterError jika seluruh kandidat gagal dengan pesan bersih", async () => {
      const mockKeySecret = "sk-ant-api03-abcdef1234567890abcdef1234567890";

      const primaryMock = new MockAdapter("groq", "llama-3.3-70b-versatile", async () => {
        throw new ProviderAdapterError(`Groq 429 with key ${mockKeySecret}`, "RATE_LIMIT", 429, "groq");
      });

      const secondaryMock = new MockAdapter("gemini", "gemini-2.5-flash", async () => {
        throw new ProviderAdapterError(`Gemini 503 unavailable`, "PROVIDER_UNAVAILABLE", 503, "gemini");
      });

      const cascade = new CascadeFailoverAdapter({
        primaryProviderId: "groq",
        candidates: [
          { providerId: "groq", adapter: primaryMock, priority: 1 },
          { providerId: "gemini", adapter: secondaryMock, priority: 2 },
        ],
        healthTracker,
      });

      await assert.rejects(
        async () => {
          await cascade.chatCompletion([{ role: "user", content: "Harus gagal" }]);
        },
        (err: any) => {
          assert.equal(err instanceof ProviderAdapterError, true);
          assert.ok(err.message.includes("Semua 2 provider dalam cascade pool gagal dieksekusi"));
          // ZERO SECRET LEAKAGE: Pastikan secret key tidak muncul di pesan error
          assert.equal(err.message.includes(mockKeySecret), false);
          return true;
        }
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Factory Integration: createProviderAdapter({ enableCascade: true })
  // ─────────────────────────────────────────────────────────────
  describe("7. Factory Integration", () => {
    it("createProviderAdapter menghasilkan instance CascadeFailoverAdapter saat enableCascade=true", () => {
      const envWithKeys: NodeJS.ProcessEnv = {
        GROQ_API_KEY: "gsk_test12345678901234567890",
        GEMINI_API_KEY: "AIzaSyTest12345678901234567890",
      };

      const cascadeAdapter = createProviderAdapter({
        providerId: "groq",
        enableCascade: true,
        env: envWithKeys,
      });

      assert.equal(cascadeAdapter.providerId, "cascade");
      assert.equal(cascadeAdapter instanceof CascadeFailoverAdapter, true);
    });

    it("createCascadeAdapter menyusun urutan kandidat failover secara deterministik", () => {
      const envWithMulti: NodeJS.ProcessEnv = {
        GROQ_API_KEY: "gsk_test12345678901234567890",
        GEMINI_API_KEY: "AIzaSyTest12345678901234567890",
        OPENROUTER_API_KEY: "sk-or-v1-test12345678901234567890",
      };

      const adapter = createCascadeAdapter({
        primaryProviderId: "groq",
        env: envWithMulti,
      });

      const candidates = adapter.getCandidates();
      assert.equal(candidates.length, 3);
      assert.equal(candidates[0].providerId, "groq");
      assert.equal(candidates[1].providerId, "gemini");
      assert.equal(candidates[2].providerId, "openrouter");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Health Report & Telemetry
  // ─────────────────────────────────────────────────────────────
  describe("8. Health Report & Telemetry", () => {
    it("menghasilkan laporan kesehatan pool provider yang akurat dan zero secret", () => {
      healthTracker.recordSuccess("groq", 120);
      healthTracker.recordFailure("gemini", new Error("Rate limit on key sk-secret1234567890"));
      healthTracker.recordFailover("gemini", "openrouter");

      const report = healthTracker.getHealthReport();
      assert.equal(report.healthyCount, 1);
      assert.equal(report.cooldownCount, 1);
      assert.equal(report.providers["groq"].status, "HEALTHY");
      assert.equal(report.providers["gemini"].status, "COOLDOWN");

      // Zero secret in report
      const jsonReport = JSON.stringify(report);
      assert.equal(jsonReport.includes("sk-secret1234567890"), false);
      assert.ok(jsonReport.includes("[REDACTED_OPENAI_KEY]"));
    });
  });
});
