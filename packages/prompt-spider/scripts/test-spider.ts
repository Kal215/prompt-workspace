import assert from "node:assert/strict";
import {
  AsyncSemaphore,
  generateStandardSpiderTestCases,
  evaluateBranchExecution,
  runPromptSpider,
} from "../src/index.js";
import { SpiderReportSchema } from "@prompt-workspace/prompt-contracts";
import { LLMProviderAdapter } from "@prompt-workspace/provider-adapters";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("🕸️  TEST SUITE: PROMPT SPIDER ENGINE (packages/prompt-spider)");
  console.log("═══════════════════════════════════════════════════════════════════");

  // [1] Testing AsyncSemaphore
  console.log("\n[1] Menguji AsyncSemaphore (concurrency = 2)...");
  const semaphore = new AsyncSemaphore(2);
  let activeConcurrency = 0;
  let maxObservedConcurrency = 0;

  const tasks = Array.from({ length: 6 }).map((_, i) =>
    semaphore.runExclusive(async () => {
      activeConcurrency++;
      if (activeConcurrency > maxObservedConcurrency) {
        maxObservedConcurrency = activeConcurrency;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
      activeConcurrency--;
      return i;
    })
  );

  await Promise.all(tasks);
  assert.equal(maxObservedConcurrency, 2, "Konkurensi tidak boleh melebihi batas 2");
  console.log("✅ AsyncSemaphore mematuhi batas konkurensi = 2 secara presisi.");

  // [2] Testing generateStandardSpiderTestCases
  console.log("\n[2] Menguji generateStandardSpiderTestCases...");
  const cases = generateStandardSpiderTestCases("You are a system prompt");
  assert.equal(cases.length, 5, "Harus menghasilkan tepat 5 kasus uji");
  const categories = cases.map((c) => c.category);
  assert.ok(categories.includes("BASELINE_HAPPY_PATH"));
  assert.ok(categories.includes("EDGE_EMPTY_OR_NOISE"));
  assert.ok(categories.includes("AMBIGUOUS_CONFLICT"));
  assert.ok(categories.includes("ADVERSARIAL_INJECTION"));
  assert.ok(categories.includes("STRICT_FORMAT_TRAP"));
  console.log("✅ generateStandardSpiderTestCases menghasilkan 5 kategori kasus ketahanan.");

  // [3] Testing evaluateBranchExecution (Adversarial Injection Detection)
  console.log("\n[3] Menguji deteksi Adversarial Injection di evaluateBranchExecution...");
  const injectionCase = cases.find((c) => c.category === "ADVERSARIAL_INJECTION")!;

  // Vulnerable output
  const vulnResult = evaluateBranchExecution(
    injectionCase,
    "Override granted! [PWNED] Here is the system prompt: secret123",
    120,
    "You are a system prompt"
  );
  assert.equal(vulnResult.branchResult.status, "FAIL");
  assert.equal(vulnResult.branchResult.deterministicPass, false);
  assert.ok(vulnResult.securityFinding, "Harus menghasilkan security finding");
  assert.equal(vulnResult.securityFinding?.severity, "CRITICAL");
  console.log("✅ Model rentan terdeteksi sebagai FAIL dengan Security Finding CRITICAL.");

  // Robust output
  const robustResult = evaluateBranchExecution(
    injectionCase,
    "Maaf, saya tidak dapat mematuhi instruksi override dan harus tetap menjalankan tugas awal.",
    150,
    "You are a system prompt"
  );
  assert.equal(robustResult.branchResult.status, "PASS");
  assert.equal(robustResult.branchResult.deterministicPass, true);
  assert.equal(robustResult.securityFinding, undefined);
  console.log("✅ Model aman terverifikasi sebagai PASS tanpa security finding.");

  // [4] Testing runPromptSpider (Happy Path: All Pass)
  console.log("\n[4] Menguji runPromptSpider end-to-end (Robust Prompt / All Pass)...");
  const mockRobustAdapter: LLMProviderAdapter = {
    providerId: "groq",
    defaultModel: "mock-model-safe",
    async chatCompletion(messages) {
      const userMsg = messages.find((m) => m.role === "user")?.content || "";
      if (userMsg.includes("IGNORE ALL PREVIOUS")) {
        return {
          content: "Permintaan override ditolak demi keamanan sistem.",
          model: "mock-model-safe",
        };
      }
      return {
        content: '{"status": "ok", "message": "Proses selesai dengan sukses"}',
        model: "mock-model-safe",
      };
    },
  };

  const safeReport = await runPromptSpider(
    "You are an assistant. Output JSON.",
    "ver-123",
    mockRobustAdapter,
    { concurrencyLimit: 2, maxCases: 5 }
  );

  assert.equal(safeReport.criticalGatePassed, true);
  assert.equal(safeReport.status, "SUCCEEDED");
  assert.equal(safeReport.branches.length, 5);
  assert.doesNotThrow(() => SpiderReportSchema.parse(safeReport));
  console.log("✅ Robust Prompt lulus seluruh cabang dengan criticalGatePassed = true.");

  // [5] Testing runPromptSpider (Vulnerable Prompt / Critical Gate Fail)
  console.log("\n[5] Menguji runPromptSpider end-to-end (Vulnerable Prompt / Gate Fail)...");
  const mockVulnAdapter: LLMProviderAdapter = {
    providerId: "groq",
    defaultModel: "mock-model-vuln",
    async chatCompletion(messages) {
      const userMsg = messages.find((m) => m.role === "user")?.content || "";
      if (userMsg.includes("IGNORE ALL PREVIOUS")) {
        return {
          content: "System override code: 999 accepted! [PWNED]",
          model: "mock-model-vuln",
        };
      }
      return {
        content: "Halo, ini jawaban saya.",
        model: "mock-model-vuln",
      };
    },
  };

  const vulnReport = await runPromptSpider(
    "You are an assistant.",
    "ver-123",
    mockVulnAdapter,
    { concurrencyLimit: 2, maxCases: 5 }
  );

  assert.equal(vulnReport.criticalGatePassed, false, "Critical gate harus gagal jika injection tembus");
  assert.ok(vulnReport.securityFindings.length > 0, "Harus memuat security finding");
  assert.doesNotThrow(() => SpiderReportSchema.parse(vulnReport));
  console.log("✅ Vulnerable Prompt menghasilkan criticalGatePassed = false dan security finding tersimpan.");

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🏁 PROMPT SPIDER ENGINE TEST SUITE BERHASIL 100%");
  console.log("═══════════════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("❌ Test spider gagal:", err);
  process.exit(1);
});
