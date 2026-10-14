import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GroqAdapter,
  GeminiAdapter,
  OpenRouterAdapter,
  OllamaAdapter,
  ProviderAdapterError,
  listProviderCapabilities,
  getProviderCapability,
  createProviderAdapter,
  redactApiKey,
  maskKey,
  LLMProviderAdapter,
} from "../src/index.js";

describe("Multi-Provider Adapters Contract & Capability Tests", () => {
  // ──────────────────────────────────────────────
  // 1. Contract Tests: Semua adapter mematuhi LLMProviderAdapter
  // ──────────────────────────────────────────────
  describe("1. Contract Conformance", () => {
    it("GroqAdapter memenuhi LLMProviderAdapter contract", () => {
      // GroqAdapter membutuhkan key atau env
      const mockKey = "gsk_testdummykey12345678901234567890";
      const adapter = new GroqAdapter([mockKey]);
      assert.equal(adapter.providerId, "groq");
      assert.equal(typeof adapter.defaultModel, "string");
      assert.equal(typeof adapter.chatCompletion, "function");
      assert.ok(adapter.defaultModel.length > 0);
    });

    it("GeminiAdapter memenuhi LLMProviderAdapter contract", () => {
      const adapter = new GeminiAdapter({ apiKey: "AIzaDummyKey1234567890123456789012345" });
      assert.equal(adapter.providerId, "gemini");
      assert.equal(adapter.defaultModel, "gemini-2.5-flash");
      assert.equal(typeof adapter.chatCompletion, "function");
    });

    it("OpenRouterAdapter memenuhi LLMProviderAdapter contract", () => {
      const adapter = new OpenRouterAdapter({ apiKey: "sk-or-testdummykey12345678901234567890" });
      assert.equal(adapter.providerId, "openrouter");
      assert.equal(adapter.defaultModel, "meta-llama/llama-3.3-70b-instruct");
      assert.equal(typeof adapter.chatCompletion, "function");
    });

    it("OllamaAdapter memenuhi LLMProviderAdapter contract", () => {
      const adapter = new OllamaAdapter({ baseURL: "http://127.0.0.1:11434" });
      assert.equal(adapter.providerId, "ollama");
      assert.equal(adapter.defaultModel, "llama3.2");
      assert.equal(typeof adapter.chatCompletion, "function");
    });
  });

  // ──────────────────────────────────────────────
  // 2. Mock Fetch & Normalization: GeminiAdapter
  // ──────────────────────────────────────────────
  describe("2. GeminiAdapter Execution & Normalization", () => {
    it("berhasil melakukan chatCompletion dengan mock fetch Gemini", async () => {
      let capturedUrl = "";
      let capturedBody: any = null;

      const mockFetch: typeof fetch = async (url, init) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(String(init?.body));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "Respons optimasi Gemini teruji." }],
                  role: "model",
                },
                finishReason: "STOP",
              },
            ],
            usageMetadata: {
              promptTokenCount: 25,
              candidatesTokenCount: 15,
              totalTokenCount: 40,
            },
            modelVersion: "gemini-2.5-flash",
          }),
        } as unknown as Response;
      };

      const adapter = new GeminiAdapter({
        apiKey: "AIzaDummyKeyTest12345678901234567890123",
        fetchFn: mockFetch,
      });

      const res = await adapter.chatCompletion(
        [
          { role: "system", content: "Instruksi sistem" },
          { role: "user", content: "Prompt user" },
        ],
        { responseFormat: "json" }
      );

      assert.equal(res.content, "Respons optimasi Gemini teruji.");
      assert.equal(res.model, "gemini-2.5-flash");
      assert.equal(res.usage?.promptTokens, 25);
      assert.equal(res.usage?.completionTokens, 15);
      assert.ok(capturedUrl.includes("gemini-2.5-flash:generateContent"));
      assert.equal(capturedBody.generationConfig?.responseMimeType, "application/json");
      assert.equal(capturedBody.systemInstruction?.parts?.[0]?.text, "Instruksi sistem");
    });

    it("menormalisasi error 401/403 ke AUTH_ERROR", async () => {
      const mockFetch: typeof fetch = async () => {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            error: { message: "API_KEY_INVALID" },
          }),
        } as unknown as Response;
      };

      const adapter = new GeminiAdapter({
        apiKey: "AIzaInvalidKey123456789012345678901234",
        fetchFn: mockFetch,
      });

      await assert.rejects(
        async () => {
          await adapter.chatCompletion([{ role: "user", content: "test" }]);
        },
        (err: any) => {
          assert.ok(err instanceof ProviderAdapterError);
          assert.equal(err.code, "AUTH_ERROR");
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    });

    it("menormalisasi error 429 ke RATE_LIMIT", async () => {
      const mockFetch: typeof fetch = async () => {
        return {
          ok: false,
          status: 429,
          json: async () => ({
            error: { message: "RESOURCE_EXHAUSTED" },
          }),
        } as unknown as Response;
      };

      const adapter = new GeminiAdapter({
        apiKey: "AIzaRateLimitedKey12345678901234567890",
        fetchFn: mockFetch,
      });

      await assert.rejects(
        async () => {
          await adapter.chatCompletion([{ role: "user", content: "test" }]);
        },
        (err: any) => {
          assert.ok(err instanceof ProviderAdapterError);
          assert.equal(err.code, "RATE_LIMIT");
          assert.equal(err.statusCode, 429);
          return true;
        }
      );
    });

    it("menormalisasi error 503 ke PROVIDER_UNAVAILABLE", async () => {
      const mockFetch: typeof fetch = async () => {
        return {
          ok: false,
          status: 503,
          json: async () => ({
            error: { message: "The service is currently unavailable." },
          }),
        } as unknown as Response;
      };

      const adapter = new GeminiAdapter({
        apiKey: "AIzaKeyTest123456789012345678901234567",
        fetchFn: mockFetch,
      });

      await assert.rejects(
        async () => {
          await adapter.chatCompletion([{ role: "user", content: "test" }]);
        },
        (err: any) => {
          assert.ok(err instanceof ProviderAdapterError);
          assert.equal(err.code, "PROVIDER_UNAVAILABLE");
          assert.equal(err.statusCode, 503);
          return true;
        }
      );
    });

    it("menormalisasi keluaran kosong/malformed ke MALFORMED_OUTPUT", async () => {
      const mockFetch: typeof fetch = async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [], // Kosong
          }),
        } as unknown as Response;
      };

      const adapter = new GeminiAdapter({
        apiKey: "AIzaKeyTest123456789012345678901234567",
        fetchFn: mockFetch,
      });

      await assert.rejects(
        async () => {
          await adapter.chatCompletion([{ role: "user", content: "test" }]);
        },
        (err: any) => {
          assert.ok(err instanceof ProviderAdapterError);
          assert.equal(err.code, "MALFORMED_OUTPUT");
          return true;
        }
      );
    });
  });

  // ──────────────────────────────────────────────
  // 3. Mock Fetch & Normalization: OpenRouterAdapter
  // ──────────────────────────────────────────────
  describe("3. OpenRouterAdapter Execution & Normalization", () => {
    it("berhasil melakukan chatCompletion dengan mock fetch OpenRouter", async () => {
      let capturedHeaders: Record<string, string> = {};
      let capturedBody: any = null;

      const mockFetch: typeof fetch = async (_url, init) => {
        capturedHeaders = init?.headers as Record<string, string>;
        capturedBody = JSON.parse(String(init?.body));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: "gen-123",
            model: "meta-llama/llama-3.3-70b-instruct",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: "Respons optimasi OpenRouter.",
                },
              },
            ],
            usage: {
              prompt_tokens: 30,
              completion_tokens: 20,
            },
          }),
        } as unknown as Response;
      };

      const adapter = new OpenRouterAdapter({
        apiKey: "sk-or-dummyKey123456789012345678901234",
        fetchFn: mockFetch,
      });

      const res = await adapter.chatCompletion(
        [{ role: "user", content: "Halo" }],
        { responseFormat: "json" }
      );

      assert.equal(res.content, "Respons optimasi OpenRouter.");
      assert.equal(res.model, "meta-llama/llama-3.3-70b-instruct");
      assert.equal(res.usage?.promptTokens, 30);
      assert.equal(res.usage?.completionTokens, 20);
      assert.ok(capturedHeaders["Authorization"].startsWith("Bearer sk-or-"));
      assert.deepEqual(capturedBody.response_format, { type: "json_object" });
    });

    it("menormalisasi error 401 ke AUTH_ERROR", async () => {
      const mockFetch: typeof fetch = async () => {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            error: { message: "Invalid API key" },
          }),
        } as unknown as Response;
      };

      const adapter = new OpenRouterAdapter({
        apiKey: "sk-or-invalid123456789012345678901234",
        fetchFn: mockFetch,
      });

      await assert.rejects(
        async () => {
          await adapter.chatCompletion([{ role: "user", content: "test" }]);
        },
        (err: any) => {
          assert.ok(err instanceof ProviderAdapterError);
          assert.equal(err.code, "AUTH_ERROR");
          assert.equal(err.statusCode, 401);
          return true;
        }
      );
    });

    it("menormalisasi error 429 ke RATE_LIMIT", async () => {
      const mockFetch: typeof fetch = async () => {
        return {
          ok: false,
          status: 429,
          json: async () => ({
            error: { message: "Rate limit exceeded" },
          }),
        } as unknown as Response;
      };

      const adapter = new OpenRouterAdapter({
        apiKey: "sk-or-ratelimited1234567890123456789",
        fetchFn: mockFetch,
      });

      await assert.rejects(
        async () => {
          await adapter.chatCompletion([{ role: "user", content: "test" }]);
        },
        (err: any) => {
          assert.ok(err instanceof ProviderAdapterError);
          assert.equal(err.code, "RATE_LIMIT");
          assert.equal(err.statusCode, 429);
          return true;
        }
      );
    });
  });

  // ──────────────────────────────────────────────
  // 4. Mock Fetch & Normalization: OllamaAdapter
  // ──────────────────────────────────────────────
  describe("4. OllamaAdapter Execution & Normalization", () => {
    it("berhasil melakukan chatCompletion dengan mock fetch Ollama", async () => {
      let capturedBody: any = null;

      const mockFetch: typeof fetch = async (_url, init) => {
        capturedBody = JSON.parse(String(init?.body));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            model: "llama3.2",
            message: {
              role: "assistant",
              content: "Respons Ollama lokal.",
            },
            done: true,
            prompt_eval_count: 18,
            eval_count: 22,
          }),
        } as unknown as Response;
      };

      const adapter = new OllamaAdapter({
        baseURL: "http://127.0.0.1:11434",
        fetchFn: mockFetch,
      });

      const res = await adapter.chatCompletion(
        [{ role: "user", content: "Optimasi ini" }],
        { responseFormat: "json" }
      );

      assert.equal(res.content, "Respons Ollama lokal.");
      assert.equal(res.model, "llama3.2");
      assert.equal(res.usage?.promptTokens, 18);
      assert.equal(res.usage?.completionTokens, 22);
      assert.equal(capturedBody.format, "json");
    });

    it("menormalisasi ECONNREFUSED dengan pesan ramah Bahasa Indonesia", async () => {
      const mockFetch: typeof fetch = async () => {
        const error: any = new Error("connect ECONNREFUSED 127.0.0.1:11434");
        error.code = "ECONNREFUSED";
        throw error;
      };

      const adapter = new OllamaAdapter({
        baseURL: "http://127.0.0.1:11434",
        fetchFn: mockFetch,
      });

      await assert.rejects(
        async () => {
          await adapter.chatCompletion([{ role: "user", content: "test" }]);
        },
        (err: any) => {
          assert.ok(err instanceof ProviderAdapterError);
          assert.equal(err.code, "PROVIDER_UNAVAILABLE");
          assert.ok(err.message.includes("Layanan Ollama lokal tidak terdeteksi"));
          assert.ok(err.message.includes("ollama serve"));
          return true;
        }
      );
    });

    it("menormalisasi HTTP 404 (model tidak ditemukan) ke INVALID_REQUEST", async () => {
      const mockFetch: typeof fetch = async () => {
        return {
          ok: false,
          status: 404,
          json: async () => ({
            error: "model 'qwen2.5-coder' not found",
          }),
        } as unknown as Response;
      };

      const adapter = new OllamaAdapter({
        baseURL: "http://127.0.0.1:11434",
        fetchFn: mockFetch,
      });

      await assert.rejects(
        async () => {
          await adapter.chatCompletion([{ role: "user", content: "test" }], {
            model: "qwen2.5-coder",
          });
        },
        (err: any) => {
          assert.ok(err instanceof ProviderAdapterError);
          assert.equal(err.code, "INVALID_REQUEST");
          assert.equal(err.statusCode, 404);
          assert.ok(err.message.includes("ollama pull qwen2.5-coder"));
          return true;
        }
      );
    });
  });

  // ──────────────────────────────────────────────
  // 5. Capability Metadata & Zero-Secret Leakage
  // ──────────────────────────────────────────────
  describe("5. Capability Metadata & Zero-Secret Leakage", () => {
    const dummySecrets = {
      GROQ_API_KEY_1: "gsk_dummyGroqKey12345678901234567890",
      GEMINI_API_KEY: "AIzaDummyGeminiSecretKey12345678901234",
      OPENROUTER_API_KEY: "sk-or-dummyOpenRouterSecretKey123456",
      OLLAMA_ENABLED: "true",
      OLLAMA_BASE_URL: "http://127.0.0.1:11434",
    };

    it("mengembalikan metadata 4 provider dengan status configured=true saat env tersedia", () => {
      const capabilities = listProviderCapabilities(dummySecrets as any);
      assert.equal(capabilities.length, 4);

      const groqCap = capabilities.find((c) => c.providerId === "groq");
      const geminiCap = capabilities.find((c) => c.providerId === "gemini");
      const openRouterCap = capabilities.find((c) => c.providerId === "openrouter");
      const ollamaCap = capabilities.find((c) => c.providerId === "ollama");

      assert.ok(groqCap?.configured);
      assert.ok(geminiCap?.configured);
      assert.ok(openRouterCap?.configured);
      assert.ok(ollamaCap?.configured);

      assert.equal(ollamaCap?.isLocal, true);
      assert.equal(groqCap?.isLocal, false);
    });

    it("mengembalikan status configured=false saat env kosong", () => {
      const capabilities = listProviderCapabilities({});
      assert.equal(capabilities.length, 4);
      assert.ok(capabilities.every((c) => c.configured === false));
    });

    it("ZERO-SECRET LEAKAGE: listProviderCapabilities tidak pernah membocorkan string API key", () => {
      const capabilities = listProviderCapabilities(dummySecrets as any);
      const serialized = JSON.stringify(capabilities);

      // Verifikasi bahwa tidak ada satu pun dari secret keys yang terkandung dalam output
      assert.ok(!serialized.includes(dummySecrets.GROQ_API_KEY_1));
      assert.ok(!serialized.includes(dummySecrets.GEMINI_API_KEY));
      assert.ok(!serialized.includes(dummySecrets.OPENROUTER_API_KEY));
      assert.ok(!serialized.includes("gsk_"));
      assert.ok(!serialized.includes("AIza"));
      assert.ok(!serialized.includes("sk-or-"));
    });

    it("getProviderCapability mengembalikan data yang valid", () => {
      const cap = getProviderCapability("gemini", dummySecrets as any);
      assert.ok(cap);
      assert.equal(cap?.providerId, "gemini");
      assert.equal(cap?.defaultModel, "gemini-2.5-flash");
    });

    it("createProviderAdapter melempar error saat provider tidak didukung", () => {
      assert.throws(
        () => {
          createProviderAdapter({ providerId: "unsupported-provider" as any });
        },
        (err: any) => {
          assert.ok(err instanceof ProviderAdapterError);
          assert.equal(err.code, "INVALID_REQUEST");
          return true;
        }
      );
    });

    it("createProviderAdapter melempar error saat API key belum dikonfigurasi", () => {
      assert.throws(
        () => {
          createProviderAdapter({ providerId: "gemini", env: {} });
        },
        (err: any) => {
          assert.ok(err instanceof ProviderAdapterError);
          assert.equal(err.code, "AUTH_ERROR");
          return true;
        }
      );
    });
  });

  // ──────────────────────────────────────────────
  // 6. Redaction & Privacy Utilities
  // ──────────────────────────────────────────────
  describe("6. Key Redaction & Masking", () => {
    it("menyensor berbagai format API key secara aman", () => {
      const text =
        "Log: Groq=gsk_12345678901234567890, Gemini=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P, OpenRouter=sk-or-12345678901234567890, Token=Bearer xyz123abc456";
      const redacted = redactApiKey(text);

      assert.ok(!redacted.includes("gsk_12345678901234567890"));
      assert.ok(!redacted.includes("AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P"));
      assert.ok(!redacted.includes("sk-or-12345678901234567890"));
      assert.ok(!redacted.includes("xyz123abc456"));
      assert.ok(redacted.includes("[REDACTED_GROQ_KEY]"));
      assert.ok(redacted.includes("[REDACTED_GEMINI_KEY]"));
      assert.ok(redacted.includes("[REDACTED_OPENROUTER_KEY]"));
    });

    it("maskKey menyisakan 4 karakter terakhir", () => {
      const masked = maskKey("TEST_KEY", "secretkey1234");
      assert.equal(masked, "TEST_KEY (***1234)");
    });
  });
});
