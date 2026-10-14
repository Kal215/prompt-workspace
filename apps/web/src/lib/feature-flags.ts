/**
 * ==============================================================================
 * PROMPT INTELLIGENCE ENGINEERING WORKSPACE (PIEW) v2.0
 * Feature Flags & Configuration Guards (Gate 5 Specification)
 * ==============================================================================
 * Menyediakan mekanisme kontrol instan (Kill-Switch) untuk fitur v2.0:
 * - Prompt Crawler (Ekstraksi sumber web & grounding facts)
 * - Prompt Spider Matrix (Uji ketahanan adversarial & stress-testing)
 *
 * Menjamin 100% backward-compatibility: Jika salah satu atau kedua fitur
 * dinonaktifkan, seluruh fungsi optimasi prompt v1.0 tetap berjalan normal.
 * ==============================================================================
 */

export interface V2FeatureFlags {
  /**
   * Status ketersediaan modul Prompt Crawler.
   * Dikontrol via env NEXT_PUBLIC_ENABLE_CRAWLER (default: true di non-production, atau jika env disetel 'true').
   */
  enableCrawler: boolean;

  /**
   * Status ketersediaan modul Prompt Spider.
   * Dikontrol via env NEXT_PUBLIC_ENABLE_SPIDER (default: true di non-production, atau jika env disetel 'true').
   */
  enableSpider: boolean;

  /**
   * Batas maksimal ukuran payload respons HTML/teks hasil crawling dalam bytes.
   * Default: 524288 bytes (512 KB) sesuai spesifikasi Gate 5 Blueprint v2.0.
   */
  crawlerMaxBytes: number;

  /**
   * Batas maksimal jumlah kasus uji adversarial per evaluasi Prompt Spider.
   * Default: 5 kasus uji.
   */
  spiderMaxCases: number;

  /**
   * Batas maksimal konkurensi eksekusi model adversarial pada Prompt Spider.
   * Default: 2 request simultan.
   */
  spiderConcurrency: number;
}

/**
 * Batas default operasional server-side v2.0 sesuai Blueprint Gate 5.
 */
export const DEFAULT_V2_LIMITS = {
  CRAWLER_MAX_BYTES: 524288, // 512 KB
  SPIDER_MAX_CASES: 5,
  SPIDER_CONCURRENCY: 2,
} as const;

/**
 * Membaca nilai boolean dari environment variable dengan fallback cerdas.
 */
function parseBooleanEnv(
  value: string | undefined,
  defaultValue: boolean = true
): boolean {
  if (value === undefined || value === null || value.trim() === "") {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return defaultValue;
}

/**
 * Membaca nilai integer dari environment variable dengan batas keamanan minimum & fallback.
 */
function parsePositiveIntEnv(
  value: string | undefined,
  fallback: number,
  min: number = 1
): number {
  if (!value) return fallback;
  const parsed = parseInt(value.trim(), 10);
  if (isNaN(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
}

/**
 * Mengambil konfigurasi Feature Flags dan batas operasional v2.0 secara terpadu.
 * Aman dipanggil di lingkungan Server Components, Route Handlers, maupun Client Components.
 */
export function getV2FeatureFlags(): V2FeatureFlags {
  const enableCrawler = parseBooleanEnv(
    process.env.NEXT_PUBLIC_ENABLE_CRAWLER,
    true
  );

  const enableSpider = parseBooleanEnv(
    process.env.NEXT_PUBLIC_ENABLE_SPIDER,
    true
  );

  const crawlerMaxBytes = parsePositiveIntEnv(
    process.env.CRAWLER_MAX_BYTES,
    DEFAULT_V2_LIMITS.CRAWLER_MAX_BYTES,
    1024 // minimal 1 KB
  );

  const spiderMaxCases = parsePositiveIntEnv(
    process.env.SPIDER_MAX_CASES,
    DEFAULT_V2_LIMITS.SPIDER_MAX_CASES,
    1
  );

  const spiderConcurrency = parsePositiveIntEnv(
    process.env.SPIDER_CONCURRENCY,
    DEFAULT_V2_LIMITS.SPIDER_CONCURRENCY,
    1
  );

  return {
    enableCrawler,
    enableSpider,
    crawlerMaxBytes,
    spiderMaxCases,
    spiderConcurrency,
  };
}

/**
 * Helper ringkas untuk memeriksa status aktif modul Crawler.
 */
export function isCrawlerFeatureEnabled(): boolean {
  return getV2FeatureFlags().enableCrawler;
}

/**
 * Helper ringkas untuk memeriksa status aktif modul Spider.
 */
export function isSpiderFeatureEnabled(): boolean {
  return getV2FeatureFlags().enableSpider;
}
