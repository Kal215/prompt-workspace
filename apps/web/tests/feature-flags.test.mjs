import test from "node:test";
import assert from "node:assert/strict";
import {
  getV2FeatureFlags,
  isCrawlerFeatureEnabled,
  isSpiderFeatureEnabled,
  DEFAULT_V2_LIMITS,
} from "../src/lib/feature-flags.ts";
import {
  getCrawlRateLimiter,
  getSpiderRateLimiter,
  getOptimizeRateLimiter,
} from "../src/lib/rate-limiter.ts";

test("V2 Feature Flags & Configuration Guards Suite (Gate 0)", async (t) => {
  const originalEnv = { ...process.env };

  t.afterEach(() => {
    process.env = { ...originalEnv };
  });

  await t.test("getV2FeatureFlags returns valid defaults when env is unset", () => {
    delete process.env.NEXT_PUBLIC_ENABLE_CRAWLER;
    delete process.env.NEXT_PUBLIC_ENABLE_SPIDER;
    delete process.env.CRAWLER_MAX_BYTES;
    delete process.env.SPIDER_MAX_CASES;
    delete process.env.SPIDER_CONCURRENCY;

    const flags = getV2FeatureFlags();
    assert.equal(typeof flags.enableCrawler, "boolean");
    assert.equal(typeof flags.enableSpider, "boolean");
    assert.equal(flags.crawlerMaxBytes, DEFAULT_V2_LIMITS.CRAWLER_MAX_BYTES);
    assert.equal(flags.spiderMaxCases, DEFAULT_V2_LIMITS.SPIDER_MAX_CASES);
    assert.equal(flags.spiderConcurrency, DEFAULT_V2_LIMITS.SPIDER_CONCURRENCY);
  });

  await t.test("getV2FeatureFlags respects explicit false toggle (Kill Switch)", () => {
    process.env.NEXT_PUBLIC_ENABLE_CRAWLER = "false";
    process.env.NEXT_PUBLIC_ENABLE_SPIDER = "false";

    const flags = getV2FeatureFlags();
    assert.equal(flags.enableCrawler, false);
    assert.equal(flags.enableSpider, false);
    assert.equal(isCrawlerFeatureEnabled(), false);
    assert.equal(isSpiderFeatureEnabled(), false);
  });

  await t.test("getV2FeatureFlags respects explicit true toggle", () => {
    process.env.NEXT_PUBLIC_ENABLE_CRAWLER = "true";
    process.env.NEXT_PUBLIC_ENABLE_SPIDER = "true";

    const flags = getV2FeatureFlags();
    assert.equal(flags.enableCrawler, true);
    assert.equal(flags.enableSpider, true);
    assert.equal(isCrawlerFeatureEnabled(), true);
    assert.equal(isSpiderFeatureEnabled(), true);
  });

  await t.test("getV2FeatureFlags parses server-side limit overrides", () => {
    process.env.CRAWLER_MAX_BYTES = "1048576"; // 1 MB
    process.env.SPIDER_MAX_CASES = "10";
    process.env.SPIDER_CONCURRENCY = "4";

    const flags = getV2FeatureFlags();
    assert.equal(flags.crawlerMaxBytes, 1048576);
    assert.equal(flags.spiderMaxCases, 10);
    assert.equal(flags.spiderConcurrency, 4);
  });

  await t.test("getV2FeatureFlags falls back safely when limits are invalid or negative", () => {
    process.env.CRAWLER_MAX_BYTES = "not-a-number";
    process.env.SPIDER_MAX_CASES = "-5";
    process.env.SPIDER_CONCURRENCY = "0";

    const flags = getV2FeatureFlags();
    assert.equal(flags.crawlerMaxBytes, DEFAULT_V2_LIMITS.CRAWLER_MAX_BYTES);
    assert.equal(flags.spiderMaxCases, DEFAULT_V2_LIMITS.SPIDER_MAX_CASES);
    assert.equal(flags.spiderConcurrency, DEFAULT_V2_LIMITS.SPIDER_CONCURRENCY);
  });

  await t.test("v2 rate limiters (crawl & spider) operate in isolated buckets", () => {
    const crawlLimiter = getCrawlRateLimiter();
    const spiderLimiter = getSpiderRateLimiter();
    const optLimiter = getOptimizeRateLimiter();

    crawlLimiter.reset();
    spiderLimiter.reset();
    optLimiter.reset();

    const testKey = `test-ip-v2-${Date.now()}`;

    // Crawl limiter has capacity 5
    for (let i = 0; i < 5; i++) {
      const res = crawlLimiter.check(testKey);
      assert.equal(res.allowed, true);
    }
    const crawlDenied = crawlLimiter.check(testKey);
    assert.equal(crawlDenied.allowed, false);

    // Spider limiter bucket must remain independent
    const spiderAllowed = spiderLimiter.check(testKey);
    assert.equal(spiderAllowed.allowed, true);

    // Optimize limiter bucket must remain independent
    const optAllowed = optLimiter.check(testKey);
    assert.equal(optAllowed.allowed, true);
  });
});
