import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractPromptPlaceholders,
  resolvePromptPlaceholders,
  executePromptOnTargetModel,
} from "../src/playground.js";
import {
  ChatMessage,
  ChatResponse,
  LLMProviderAdapter,
  ProviderAdapterError,
  ProviderAdapterOptions,
} from "@prompt-workspace/provider-adapters";
import {
  PromptExecutionRequest,
  PromptExecutionResultSchema,
} from "@prompt-workspace/prompt-contracts";
import {
  ProviderRateLimitError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  SchemaValidationError,
} from "../src/errors.js";

/**
 * Mock LLM Adapter untuk pengujian terisolasi tanpa jaringan/kuota
 */
class MockPlaygroundAdapter implements LLMProviderAdapter {
  readonly providerId = "groq";
  readonly defaultModel = "llama-3.3-70b-versatile";

  public lastMessages: ChatMessage[] = [];
  public lastOptions?: ProviderAdapterOptions;
  public mockResponseContent = "Hasil eksekusi mock model target untuk tugas ini.";
  public shouldFailWith?: ProviderAdapterError | Error;
  public mockUsage = { promptTokens: 42, completionTokens: 88 };

  async chatCompletion(
    messages: ChatMessage[],
    options?: ProviderAdapterOptions
  ): Promise<ChatResponse> {
    this.lastMessages = messages;
    this.lastOptions = options;

    if (this.shouldFailWith) {
      throw this.shouldFailWith;
    }

    return {
      content: this.mockResponseContent,
      model: options?.model || this.defaultModel,
      usage: this.mockUsage,
      latencyMs: 145,
    };
  }
}

describe("Playground & Target Model Execution Suite", () => {
  describe("1. extractPromptPlaceholders", () => {
    it("menangkap [MASUKKAN_BAHASA], [TARGET_AUDIENS], {{ variabel }}", () => {
      const prompt = `Anda adalah pakar bahasa [MASUKKAN_BAHASA]. Buat tutorial untuk [TARGET_AUDIENS] menggunakan fitur {{ variabel }}.`;
      const placeholders = extractPromptPlaceholders(prompt);

      assert.deepEqual(placeholders, [
        "[MASUKKAN_BAHASA]",
        "[TARGET_AUDIENS]",
        "{{ variabel }}",
      ]);
    });

    it("mengabaikan array indexing kode seperti [0], [1], dan [index]", () => {
      const prompt = `Periksa array arr[0], arr[1], dan items[index]. Juga arr[i] dan list[idx]. Placeholder nyata: [MASUKKAN_BAHASA].`;
      const placeholders = extractPromptPlaceholders(prompt);

      assert.deepEqual(placeholders, ["[MASUKKAN_BAHASA]"]);
      assert.ok(!placeholders.includes("[0]"), "Tidak boleh menangkap [0]");
      assert.ok(!placeholders.includes("[1]"), "Tidak boleh menangkap [1]");
      assert.ok(!placeholders.includes("[index]"), "Tidak boleh menangkap [index]");
      assert.ok(!placeholders.includes("[i]"), "Tidak boleh menangkap [i]");
      assert.ok(!placeholders.includes("[idx]"), "Tidak boleh menangkap [idx]");
    });

    it("mengabaikan Markdown link sintaks [Label](URL)", () => {
      const prompt = `Kunjungi [Dokumentasi Resmi](https://example.com/docs) untuk referensi. Masukkan [GAYA_SITASI: APA/IEEE].`;
      const placeholders = extractPromptPlaceholders(prompt);

      assert.deepEqual(placeholders, ["[GAYA_SITASI: APA/IEEE]"]);
      assert.ok(!placeholders.includes("[Dokumentasi Resmi]"));
    });

    it("menangani placeholder format colon, slash, dan mustache variatif", () => {
      const prompt = `Spesifikasi: [Input/Output], gaya: [GAYA_SITASI: APA/IEEE], nama: {{user_name}}, dan {{ variabel }}.`;
      const placeholders = extractPromptPlaceholders(prompt);

      assert.ok(placeholders.includes("[Input/Output]"));
      assert.ok(placeholders.includes("[GAYA_SITASI: APA/IEEE]"));
      assert.ok(placeholders.includes("{{user_name}}"));
      assert.ok(placeholders.includes("{{ variabel }}"));
    });

    it("melakukan deduplikasi placeholder yang muncul berulang", () => {
      const prompt = `Gunakan [MASUKKAN_BAHASA] di sini dan [MASUKKAN_BAHASA] di sana.`;
      const placeholders = extractPromptPlaceholders(prompt);

      assert.deepEqual(placeholders, ["[MASUKKAN_BAHASA]"]);
    });

    it("mengembalikan array kosong untuk string kosong atau falsy", () => {
      assert.deepEqual(extractPromptPlaceholders(""), []);
      assert.deepEqual(extractPromptPlaceholders(null as any), []);
      assert.deepEqual(extractPromptPlaceholders(undefined as any), []);
    });
  });

  describe("2. resolvePromptPlaceholders", () => {
    it("mengganti seluruh placeholder ketika semua nilai disediakan (full replacement)", () => {
      const prompt = `Gunakan [MASUKKAN_BAHASA] untuk membuat sistem bagi [TARGET_AUDIENS] dengan {{ variabel }}.`;
      const values = {
        MASUKKAN_BAHASA: "TypeScript",
        TARGET_AUDIENS: "Frontend Developers",
        variabel: "React Hooks",
      };

      const result = resolvePromptPlaceholders(prompt, values);

      assert.equal(
        result.resolvedPrompt,
        "Gunakan TypeScript untuk membuat sistem bagi Frontend Developers dengan React Hooks."
      );
      assert.deepEqual(result.unresolvedPlaceholders, []);
    });

    it("mengganti sebagian placeholder dan mendeteksi unresolvedPlaceholders", () => {
      const prompt = `Gunakan [MASUKKAN_BAHASA] untuk [TARGET_AUDIENS].`;
      const values = {
        MASUKKAN_BAHASA: "Python",
      };

      const result = resolvePromptPlaceholders(prompt, values);

      assert.equal(
        result.resolvedPrompt,
        "Gunakan Python untuk [TARGET_AUDIENS]."
      );
      assert.deepEqual(result.unresolvedPlaceholders, ["[TARGET_AUDIENS]"]);
    });

    it("mendukung pencocokan key dengan kurung siku [KEY] dan tanpa kurung siku KEY", () => {
      const prompt = `Bahasa: [MASUKKAN_BAHASA], Framework: [FRAMEWORK_PILIHAN].`;
      const values = {
        "[MASUKKAN_BAHASA]": "Rust",
        FRAMEWORK_PILIHAN: "Actix",
      };

      const result = resolvePromptPlaceholders(prompt, values);

      assert.equal(result.resolvedPrompt, "Bahasa: Rust, Framework: Actix.");
      assert.deepEqual(result.unresolvedPlaceholders, []);
    });

    it("mengabaikan nilai bernilai spasi kosong (whitespace) dan menandainya unresolved", () => {
      const prompt = `Target: [TARGET_AUDIENS].`;
      const values = {
        TARGET_AUDIENS: "   ",
      };

      const result = resolvePromptPlaceholders(prompt, values);

      assert.equal(result.resolvedPrompt, "Target: [TARGET_AUDIENS].");
      assert.deepEqual(result.unresolvedPlaceholders, ["[TARGET_AUDIENS]"]);
    });

    it("mengembalikan teks asli dan seluruh placeholder saat values kosong", () => {
      const prompt = `Gunakan [MASUKKAN_BAHASA] dan {{ variabel }}.`;
      const result = resolvePromptPlaceholders(prompt, {});

      assert.equal(result.resolvedPrompt, prompt);
      assert.deepEqual(result.unresolvedPlaceholders, [
        "[MASUKKAN_BAHASA]",
        "{{ variabel }}",
      ]);
    });
  });

  describe("3. executePromptOnTargetModel Execution & Contract Conformance", () => {
    it("berhasil mengeksekusi prompt dan memvalidasi output kontrak PromptExecutionResultSchema", async () => {
      const mockAdapter = new MockPlaygroundAdapter();
      const request: PromptExecutionRequest = {
        prompt: "Anda adalah analis data. Bantu saya analisis penjualan dalam [MASUKKAN_BAHASA].",
        placeholderValues: {
          MASUKKAN_BAHASA: "Python Pandas",
        },
        providerId: "groq",
        targetModel: "llama-3.3-70b-versatile",
        parameters: {
          temperature: 0.2,
          maxOutputTokens: 800,
        },
      };

      const result = await executePromptOnTargetModel(request, {
        adapter: mockAdapter,
      });

      // Validasi struktur kontrak skema
      const parsed = PromptExecutionResultSchema.safeParse(result);
      assert.ok(parsed.success, "Hasil harus mematuhi PromptExecutionResultSchema");

      assert.ok(result.executionId.startsWith("exec-"));
      assert.equal(
        result.resolvedPrompt,
        "Anda adalah analis data. Bantu saya analisis penjualan dalam Python Pandas."
      );
      assert.deepEqual(result.unresolvedPlaceholders, []);
      assert.equal(result.output, "Hasil eksekusi mock model target untuk tugas ini.");
      assert.equal(result.providerId, "groq");
      assert.equal(result.model, "llama-3.3-70b-versatile");
      assert.equal(result.parameters.temperature, 0.2);
      assert.equal(result.parameters.maxOutputTokens, 800);
      assert.equal(result.latencyMs, 145);
      assert.equal(result.usage.promptTokens, 42);
      assert.equal(result.usage.completionTokens, 88);
      assert.equal(result.usage.totalTokens, 130);
      assert.ok(result.nondeterminismNotice.length > 20);
      assert.ok(new Date(result.createdAt).getTime() > 0);

      // Verifikasi pesan yang dikirim ke adapter
      assert.equal(mockAdapter.lastMessages.length, 2);
      assert.equal(mockAdapter.lastMessages[0].role, "system");
      assert.ok(mockAdapter.lastMessages[0].content.includes("asisten AI"));
      assert.equal(mockAdapter.lastMessages[1].role, "user");
      assert.equal(mockAdapter.lastMessages[1].content, result.resolvedPrompt);

      // Verifikasi opsi adapter
      assert.equal(mockAdapter.lastOptions?.temperature, 0.2);
      assert.equal(mockAdapter.lastOptions?.maxTokens, 800);
    });

    it("melampirkan testInput sebagai blok data uji secara terstruktur", async () => {
      const mockAdapter = new MockPlaygroundAdapter();
      const request: PromptExecutionRequest = {
        prompt: "Ekstrak nama dan email dari teks berikut:",
        placeholderValues: {},
        testInput: "John Doe - john@example.com\nJane Smith - jane@example.com",
        providerId: "groq",
      };

      const result = await executePromptOnTargetModel(request, {
        adapter: mockAdapter,
      });

      assert.equal(result.resolvedPrompt, "Ekstrak nama dan email dari teks berikut:");
      const userMessage = mockAdapter.lastMessages[1].content;
      assert.ok(
        userMessage.includes("--- KASUS UJI / TEST CASE INPUT ---"),
        "User message harus menyertakan header blok kasus uji"
      );
      assert.ok(
        userMessage.includes("John Doe - john@example.com"),
        "User message harus menyertakan isi testInput"
      );
    });

    it("menggunakan parameter default ketika request.parameters tidak diisi", async () => {
      const mockAdapter = new MockPlaygroundAdapter();
      const request: PromptExecutionRequest = {
        prompt: "Jelaskan konsep OOP secara ringkas.",
      };

      const result = await executePromptOnTargetModel(request, {
        adapter: mockAdapter,
      });

      assert.equal(result.parameters.temperature, 0.3);
      assert.equal(result.parameters.maxOutputTokens, 1024);
      assert.equal(mockAdapter.lastOptions?.temperature, 0.3);
      assert.equal(mockAdapter.lastOptions?.maxTokens, 1024);
    });

    it("mencatat unresolvedPlaceholders jika ada placeholder yang belum diisi", async () => {
      const mockAdapter = new MockPlaygroundAdapter();
      const request: PromptExecutionRequest = {
        prompt: "Buat panduan [MASUKKAN_TOPIK] untuk [TARGET_AUDIENS].",
        placeholderValues: {
          MASUKKAN_TOPIK: "Clean Code",
        },
      };

      const result = await executePromptOnTargetModel(request, {
        adapter: mockAdapter,
      });

      assert.deepEqual(result.unresolvedPlaceholders, ["[TARGET_AUDIENS]"]);
      assert.equal(
        result.resolvedPrompt,
        "Buat panduan Clean Code untuk [TARGET_AUDIENS]."
      );
    });

    it("menormalisasi error rate limit dari adapter ke ProviderRateLimitError", async () => {
      const mockAdapter = new MockPlaygroundAdapter();
      mockAdapter.shouldFailWith = new ProviderAdapterError(
        "Rate limit exceeded (429)",
        "RATE_LIMIT",
        429,
        "groq"
      );

      await assert.rejects(
        async () => {
          await executePromptOnTargetModel(
            { prompt: "Test prompt rate limit" },
            { adapter: mockAdapter }
          );
        },
        (err: any) => {
          assert.ok(err instanceof ProviderRateLimitError);
          assert.equal(err.code, "PROVIDER_RATE_LIMIT");
          assert.equal(err.statusCode, 429);
          return true;
        }
      );
    });

    it("menormalisasi timeout dari adapter ke ProviderTimeoutError", async () => {
      const mockAdapter = new MockPlaygroundAdapter();
      mockAdapter.shouldFailWith = new ProviderAdapterError(
        "Request timed out",
        "TIMEOUT",
        504,
        "groq"
      );

      await assert.rejects(
        async () => {
          await executePromptOnTargetModel(
            { prompt: "Test prompt timeout" },
            { adapter: mockAdapter }
          );
        },
        (err: any) => {
          assert.ok(err instanceof ProviderTimeoutError);
          assert.equal(err.code, "PROVIDER_TIMEOUT");
          assert.equal(err.statusCode, 504);
          return true;
        }
      );
    });

    it("menolak prompt kosong dengan SchemaValidationError", async () => {
      await assert.rejects(
        async () => {
          await executePromptOnTargetModel({ prompt: "" });
        },
        (err: any) => {
          assert.ok(err instanceof SchemaValidationError);
          assert.equal(err.code, "SCHEMA_VALIDATION_ERROR");
          return true;
        }
      );
    });
  });
});
