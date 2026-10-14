import test from "node:test";
import assert from "node:assert/strict";
import {
  validateCrawlerInputUrl,
  formatGroundingFactsForContext,
  evaluateSpiderGateBanner,
  ALLOWED_CRAWLER_HOSTS,
} from "../src/lib/v2-workspace-helpers.ts";

test("V2 Workspace Helpers Suite (Gate 1)", async (t) => {
  await t.test("ALLOWED_CRAWLER_HOSTS includes GitHub domains", () => {
    assert.ok(ALLOWED_CRAWLER_HOSTS.includes("github.com"));
    assert.ok(ALLOWED_CRAWLER_HOSTS.includes("raw.githubusercontent.com"));
  });

  await t.test("validateCrawlerInputUrl rejects invalid, insecure, or credentialed URLs", () => {
    // Empty
    assert.equal(validateCrawlerInputUrl("").valid, false);
    assert.equal(validateCrawlerInputUrl("   ").valid, false);

    // Malformed
    assert.equal(validateCrawlerInputUrl("not-a-url").valid, false);

    // Plain HTTP
    const httpRes = validateCrawlerInputUrl("http://raw.githubusercontent.com/repo/file.txt");
    assert.equal(httpRes.valid, false);
    assert.match(httpRes.error, /HTTPS/);

    // Credentialed
    const credRes = validateCrawlerInputUrl("https://admin:secret@github.com/repo/file.txt");
    assert.equal(credRes.valid, false);
    assert.match(credRes.error, /kredensial/);

    // Disallowed host
    const badHostRes = validateCrawlerInputUrl("https://malicious-site.com/prompt.txt");
    assert.equal(badHostRes.valid, false);
    assert.match(badHostRes.error, /belum diizinkan pada P0/);
  });

  await t.test("validateCrawlerInputUrl accepts valid GitHub & raw.githubusercontent.com URLs", () => {
    const rawRes = validateCrawlerInputUrl("https://raw.githubusercontent.com/owner/repo/main/prompt.md");
    assert.equal(rawRes.valid, true);
    assert.equal(rawRes.hostname, "raw.githubusercontent.com");
    assert.equal(typeof rawRes.normalizedUrl, "string");

    const ghRes = validateCrawlerInputUrl("https://github.com/owner/repo/blob/main/prompt.md");
    assert.equal(ghRes.valid, true);
    assert.equal(ghRes.hostname, "github.com");
  });

  await t.test("formatGroundingFactsForContext formats facts and preserves user context", () => {
    const emptyRes = formatGroundingFactsForContext("Konteks manual pengguna.", []);
    assert.equal(emptyRes, "Konteks manual pengguna.");

    const sampleFacts = [
      {
        id: "fact-1",
        type: "GROUNDING_FACT",
        title: "Batasan SLA",
        content: "Maksimal response time 200ms untuk endpoint tier 1.",
        snippet: "Maksimal response time 200ms...",
        confidenceScore: 0.95,
        attribution: {
          sourceUrl: "https://github.com/owner/repo/blob/main/sla.md",
          sourceDomain: "github.com",
          fetchedAt: "2026-10-14T10:00:00Z",
          byteSize: 1024,
          lineRange: "L15-L18",
        },
      },
      {
        id: "fact-2",
        type: "GROUNDING_FACT",
        title: "Model Default",
        content: "Gunakan Gemini Flash sebagai router.",
        snippet: "Gunakan Gemini Flash...",
        confidenceScore: 0.9,
        attribution: {
          sourceUrl: "https://raw.githubusercontent.com/owner/repo/main/arch.md",
          sourceDomain: "raw.githubusercontent.com",
          fetchedAt: "2026-10-14T10:00:00Z",
          byteSize: 512,
        },
      },
    ];

    // Case with existing context
    const formattedWithContext = formatGroundingFactsForContext(
      "Konteks awal pengguna.",
      sampleFacts
    );
    assert.ok(formattedWithContext.startsWith("Konteks awal pengguna."));
    assert.ok(formattedWithContext.includes("[GROUNDING CONTEXT - VERIFIED SOURCE FACTS]"));
    assert.ok(formattedWithContext.includes("[Batasan SLA] Maksimal response time 200ms"));
    assert.ok(formattedWithContext.includes("[Baris L15-L18]"));
    assert.ok(formattedWithContext.includes("https://github.com/owner/repo/blob/main/sla.md"));
    assert.ok(formattedWithContext.includes("[Model Default] Gunakan Gemini Flash"));

    // Case without existing context
    const formattedEmpty = formatGroundingFactsForContext("", sampleFacts);
    assert.ok(formattedEmpty.startsWith("--- [GROUNDING CONTEXT - VERIFIED SOURCE FACTS] ---"));
  });

  await t.test("evaluateSpiderGateBanner guarantees Fail Visibly and strictly forbids green banner on errors", () => {
    const baseSummary = {
      jobId: "spider-job-123",
      promptVersionId: "v1",
      status: "SUCCEEDED",
      criticalGatePassed: true,
      qualityMetrics: {
        robustnessScore: 92,
        instructionAdherenceScore: 90,
        consistencyScore: 95,
        passedTestCases: 5,
        totalTestCases: 5,
        passRate: 1.0,
        averageLatencyMs: 420,
      },
      securityFindings: [],
      testCases: [
        { id: "c1", name: "Direct Injection", category: "injection", status: "PASS", inputPrompt: "test", latencyMs: 300 },
        { id: "c2", name: "System Leak", category: "leakage", status: "PASS", inputPrompt: "test", latencyMs: 310 },
        { id: "c3", name: "Jailbreak", category: "jailbreak", status: "PASS", inputPrompt: "test", latencyMs: 290 },
        { id: "c4", name: "Adversarial Roleplay", category: "roleplay", status: "PASS", inputPrompt: "test", latencyMs: 350 },
        { id: "c5", name: "Format Tampering", category: "format", status: "PASS", inputPrompt: "test", latencyMs: 280 },
      ],
      evaluatedAt: "2026-10-14T12:00:00Z",
      durationMs: 1530,
    };

    // 1. Success case: All 5 cases PASS, 0 findings, criticalGatePassed: true
    const successResult = evaluateSpiderGateBanner(baseSummary);
    assert.equal(successResult.passed, true);
    assert.equal(successResult.variant, "success");
    assert.match(successResult.message, /Gerbang Kritis Lulus/);
    assert.equal(successResult.hasErrorsOrIndeterminate, false);

    // 2. ERROR case: 1 case is ERROR -> MUST NOT be green/passed
    const errorSummary = {
      ...baseSummary,
      criticalGatePassed: true, // Even if mistakenly marked true
      testCases: [
        ...baseSummary.testCases.slice(0, 4),
        { id: "c5", name: "Format Tampering", category: "format", status: "ERROR", inputPrompt: "test", latencyMs: 0 },
      ],
    };
    const errorResult = evaluateSpiderGateBanner(errorSummary);
    assert.equal(errorResult.passed, false);
    assert.notEqual(errorResult.variant, "success");
    assert.equal(errorResult.variant, "warning");
    assert.match(errorResult.message, /ERROR atau INDETERMINATE tidak dihitung sebagai PASS/);
    assert.equal(errorResult.hasErrorsOrIndeterminate, true);

    // 3. INDETERMINATE case: 1 case is INDETERMINATE -> MUST NOT be green/passed
    const indetSummary = {
      ...baseSummary,
      testCases: [
        ...baseSummary.testCases.slice(0, 4),
        { id: "c5", name: "Format Tampering", category: "format", status: "INDETERMINATE", inputPrompt: "test", latencyMs: 0 },
      ],
    };
    const indetResult = evaluateSpiderGateBanner(indetSummary);
    assert.equal(indetResult.passed, false);
    assert.notEqual(indetResult.variant, "success");
    assert.equal(indetResult.variant, "warning");
    assert.match(indetResult.message, /ERROR atau INDETERMINATE tidak dihitung sebagai PASS/);

    // 4. FAIL case: 1 case is FAIL
    const failSummary = {
      ...baseSummary,
      criticalGatePassed: false,
      testCases: [
        ...baseSummary.testCases.slice(0, 4),
        { id: "c5", name: "Format Tampering", category: "format", status: "FAIL", inputPrompt: "test", latencyMs: 500 },
      ],
    };
    const failResult = evaluateSpiderGateBanner(failSummary);
    assert.equal(failResult.passed, false);
    assert.equal(failResult.variant, "destructive");
    assert.match(failResult.message, /Gerbang Kritis Gagal/);

    // 5. Critical Security Finding present
    const findingSummary = {
      ...baseSummary,
      securityFindings: [
        {
          id: "f1",
          category: "prompt_injection",
          severity: "critical",
          title: "System Prompt Extraction Vulnerability",
          description: "Model reveals internal system instructions.",
          recommendation: "Wrap system boundary with strict delimiter guards.",
        },
      ],
    };
    const findingResult = evaluateSpiderGateBanner(findingSummary);
    assert.equal(findingResult.passed, false);
    assert.equal(findingResult.variant, "destructive");
  });
});
