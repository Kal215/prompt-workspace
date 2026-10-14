import assert from "node:assert/strict";
import {
  validateTargetUrl,
  normalizeTargetUrl,
  isPrivateOrReservedIp,
  CrawlerSecurityError,
  redactSecrets,
  streamBoundedFetch,
  CrawlerPayloadTooLargeError,
  runPromptCrawler,
} from "../src/index.js";
import { CrawlResultSchema } from "@prompt-workspace/prompt-contracts";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("🕷️  TEST SUITE: PROMPT CRAWLER ENGINE (packages/prompt-crawler)");
  console.log("═══════════════════════════════════════════════════════════════════");

  // [1] Testing validateTargetUrl & normalizeTargetUrl
  console.log("\n[1] Menguji validateTargetUrl & normalizeTargetUrl...");
  
  // Valid URL
  const validUrl = "https://raw.githubusercontent.com/owner/repo/main/prompt.md";
  const parsedValid = validateTargetUrl(validUrl);
  assert.equal(parsedValid.hostname, "raw.githubusercontent.com");

  // Normalisasi GitHub blob -> raw
  const blobUrl = "https://github.com/owner/repo/blob/main/prompts/analyst.md";
  const { normalizedUrl, wasConverted } = normalizeTargetUrl(blobUrl);
  assert.equal(wasConverted, true);
  assert.equal(normalizedUrl, "https://raw.githubusercontent.com/owner/repo/main/prompts/analyst.md");

  // Tolak skema non-HTTPS
  assert.throws(
    () => validateTargetUrl("http://raw.githubusercontent.com/file.md"),
    (err: any) => err instanceof CrawlerSecurityError && err.code === "DISALLOWED_PROTOCOL"
  );

  // Tolak credentials (user:pass@)
  assert.throws(
    () => validateTargetUrl("https://user:pass@raw.githubusercontent.com/file.md"),
    (err: any) => err instanceof CrawlerSecurityError && err.code === "CREDENTIALS_FORBIDDEN"
  );

  // Tolak port non-443
  assert.throws(
    () => validateTargetUrl("https://raw.githubusercontent.com:8443/file.md"),
    (err: any) => err instanceof CrawlerSecurityError && err.code === "DISALLOWED_PORT"
  );

  // Tolak domain di luar allowlist
  assert.throws(
    () => validateTargetUrl("https://evil-site.com/prompt.md"),
    (err: any) => err instanceof CrawlerSecurityError && err.code === "DOMAIN_NOT_ALLOWED"
  );

  // Tolak IP literal langsung
  assert.throws(
    () => validateTargetUrl("https://127.0.0.1/prompt.md"),
    (err: any) => err instanceof CrawlerSecurityError && err.code === "IP_LITERAL_FORBIDDEN"
  );

  console.log("✅ validateTargetUrl & normalizeTargetUrl lolos seluruh batasan P0.");

  // [2] Testing isPrivateOrReservedIp (SSRF IP filter)
  console.log("\n[2] Menguji isPrivateOrReservedIp (IPv4, IPv6, & Cloud Metadata)...");

  // IPv4 Private & Reserved
  assert.equal(isPrivateOrReservedIp("127.0.0.1"), true, "Loopback must be blocked");
  assert.equal(isPrivateOrReservedIp("127.255.255.255"), true, "Loopback must be blocked");
  assert.equal(isPrivateOrReservedIp("10.0.0.5"), true, "10.0.0.0/8 must be blocked");
  assert.equal(isPrivateOrReservedIp("172.16.0.1"), true, "172.16.0.0/12 must be blocked");
  assert.equal(isPrivateOrReservedIp("172.31.255.255"), true, "172.16.0.0/12 must be blocked");
  assert.equal(isPrivateOrReservedIp("192.168.1.1"), true, "192.168.0.0/16 must be blocked");
  assert.equal(isPrivateOrReservedIp("169.254.169.254"), true, "Cloud metadata must be blocked");
  assert.equal(isPrivateOrReservedIp("100.64.0.1"), true, "CGNAT must be blocked");
  assert.equal(isPrivateOrReservedIp("0.0.0.0"), true, "Current network must be blocked");
  assert.equal(isPrivateOrReservedIp("224.0.0.1"), true, "Multicast must be blocked");
  assert.equal(isPrivateOrReservedIp("240.0.0.1"), true, "Reserved 240/4 must be blocked");
  assert.equal(isPrivateOrReservedIp("255.255.255.255"), true, "Broadcast must be blocked");

  // IPv4 Public
  assert.equal(isPrivateOrReservedIp("8.8.8.8"), false, "Public Google DNS must be allowed");
  assert.equal(isPrivateOrReservedIp("1.1.1.1"), false, "Public Cloudflare DNS must be allowed");
  assert.equal(isPrivateOrReservedIp("185.199.108.133"), false, "Public GitHub Fastly CDN IP must be allowed");

  // IPv6 Private & Reserved
  assert.equal(isPrivateOrReservedIp("::1"), true, "IPv6 Loopback must be blocked");
  assert.equal(isPrivateOrReservedIp("::"), true, "IPv6 Unspecified must be blocked");
  assert.equal(isPrivateOrReservedIp("fc00::1"), true, "IPv6 Unique Local must be blocked");
  assert.equal(isPrivateOrReservedIp("fe80::1"), true, "IPv6 Link Local must be blocked");
  assert.equal(isPrivateOrReservedIp("::ffff:127.0.0.1"), true, "IPv4-mapped Loopback must be blocked");
  assert.equal(isPrivateOrReservedIp("::ffff:169.254.169.254"), true, "IPv4-mapped Metadata must be blocked");

  // IPv6 Public
  assert.equal(isPrivateOrReservedIp("2606:4700:4700::1111"), false, "Public Cloudflare IPv6 must be allowed");

  console.log("✅ isPrivateOrReservedIp lolos verifikasi komprehensif.");

  // [3] Testing Secret Redaction
  console.log("\n[3] Menguji Secret Redaction...");
  const rawWithSecrets = `
Here is my prompt:
System: You are an analyst.
API_KEY=gsk_1234567890abcdef1234567890abcdef
OPENAI_KEY=sk-abcdefghijklmnopqrstuvwxyz123456
GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234
GOOGLE=AIzaSyA1234567890abcdefghijklmnopqrstu
AUTH=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz
`;
  const redaction = redactSecrets(rawWithSecrets);
  assert.equal(redaction.secretsFoundCount, 5);
  assert.ok(!redaction.redactedText.includes("gsk_"));
  assert.ok(!redaction.redactedText.includes("sk-"));
  assert.ok(!redaction.redactedText.includes("ghp_"));
  assert.ok(!redaction.redactedText.includes("AIza"));
  assert.ok(redaction.redactedText.includes("[REDACTED_SECRET]"));
  console.log(`✅ redactSecrets berhasil menyensor ${redaction.secretsFoundCount} pola rahasia.`);

  // [4] Testing streamBoundedFetch (512 KiB stream limit)
  console.log("\n[4] Menguji streamBoundedFetch dengan batas 512 KiB stream...");
  
  // Mock fetch exceeding 512 KiB
  const mockTooLargeFetch = async () => {
    const hugeChunk = new Uint8Array(256 * 1024); // 256 KB
    let chunksSent = 0;
    const stream = new ReadableStream({
      pull(controller) {
        if (chunksSent < 3) { // 3 * 256 KB = 768 KB > 512 KB
          controller.enqueue(hugeChunk);
          chunksSent++;
        } else {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  };

  await assert.rejects(
    async () => {
      await streamBoundedFetch("https://raw.githubusercontent.com/huge-file.txt", {
        customFetch: mockTooLargeFetch as any,
        skipDnsCheckForTesting: true,
      });
    },
    (err: any) => err instanceof CrawlerPayloadTooLargeError
  );
  console.log("✅ streamBoundedFetch berhasil melakukan abort saat akumulasi byte melebihi 512 KiB.");

  // [5] Testing runPromptCrawler end-to-end dengan Mock Data
  console.log("\n[5] Menguji runPromptCrawler (EXTRACT_PROMPTS & EXTRACT_GROUNDING_CONTEXT)...");
  
  const sampleMarkdown = `
# Customer Support Prompt Engine

Berikut adalah sistem prompt utama:

## System Prompt
You are a professional customer support representative for Nay's Cake Bakery.
Always be polite, provide ingredient information, and confirm delivery dates.

\`\`\`markdown
You are a senior reviewer. Verify all order line items before confirmation.
\`\`\`

## Architecture & Technical Context
Nay's Cake API runs on Next.js 16 and SQLite WAL mode.
All requests require CSRF and session authentication headers.
`;

  const mockSuccessFetch = async () => {
    return new Response(sampleMarkdown, {
      status: 200,
      headers: { "Content-Type": "text/markdown" },
    });
  };

  // Test mode EXTRACT_PROMPTS
  const crawlResultPrompts = await runPromptCrawler(
    {
      targetUrl: "https://raw.githubusercontent.com/test-org/repo/main/README.md",
      sourceType: "GITHUB_RAW_FILE",
      mode: "EXTRACT_PROMPTS",
    },
    {
      customFetch: mockSuccessFetch as any,
      skipDnsCheckForTesting: true,
    }
  );

  assert.equal(crawlResultPrompts.status, "SUCCEEDED");
  assert.ok(crawlResultPrompts.items.length >= 2, "Harus menemukan minimal 2 kandidat prompt");
  assert.equal(crawlResultPrompts.items[0].itemType, "PROMPT_CANDIDATE");
  assert.doesNotThrow(() => CrawlResultSchema.parse(crawlResultPrompts));
  console.log(`✅ Mode EXTRACT_PROMPTS berhasil mengekstrak ${crawlResultPrompts.items.length} item kandidat prompt.`);

  // Test mode EXTRACT_GROUNDING_CONTEXT
  const crawlResultGrounding = await runPromptCrawler(
    {
      targetUrl: "https://raw.githubusercontent.com/test-org/repo/main/README.md",
      sourceType: "GITHUB_RAW_FILE",
      mode: "EXTRACT_GROUNDING_CONTEXT",
    },
    {
      customFetch: mockSuccessFetch as any,
      skipDnsCheckForTesting: true,
    }
  );

  assert.equal(crawlResultGrounding.status, "SUCCEEDED");
  assert.ok(crawlResultGrounding.items.length >= 1, "Harus menemukan fakta grounding");
  assert.equal(crawlResultGrounding.items[0].itemType, "GROUNDING_FACT");
  assert.doesNotThrow(() => CrawlResultSchema.parse(crawlResultGrounding));
  console.log(`✅ Mode EXTRACT_GROUNDING_CONTEXT berhasil mengekstrak ${crawlResultGrounding.items.length} fakta grounding.`);

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("🏁 PROMPT CRAWLER ENGINE TEST SUITE BERHASIL 100%");
  console.log("═══════════════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("❌ Test crawler gagal:", err);
  process.exit(1);
});
