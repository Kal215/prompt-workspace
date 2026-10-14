import { z } from "zod";

/**
 * ==============================================================================
 * PROMPT INTELLIGENCE ENGINEERING WORKSPACE (PIEW) v2.0
 * Prompt Contracts — Web Crawler Schemas & Enums
 * ==============================================================================
 */

/**
 * Status seragam untuk job asinkron dan bounded execution di PIEW v2.0.
 */
export const JobStatusEnum = z.enum([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "PARTIAL",
  "FAILED",
  "CANCELLED",
]);
export type JobStatus = z.infer<typeof JobStatusEnum>;

/**
 * Jenis sumber daya web yang didukung oleh Prompt Crawler.
 */
export const CrawlSourceTypeEnum = z.enum([
  "GITHUB_RAW_FILE",
  "GITHUB_BLOB_URL",
  "DOCUMENTATION_PAGE",
]);
export type CrawlSourceType = z.infer<typeof CrawlSourceTypeEnum>;

/**
 * Mode ekstraksi konten web.
 */
export const CrawlModeEnum = z.enum([
  "EXTRACT_PROMPTS",
  "EXTRACT_GROUNDING_CONTEXT",
]);
export type CrawlMode = z.infer<typeof CrawlModeEnum>;

/**
 * Klasifikasi item hasil ekstraksi crawling.
 */
export const CrawlItemTypeEnum = z.enum([
  "PROMPT_CANDIDATE",
  "GROUNDING_FACT",
]);
export type CrawlItemType = z.infer<typeof CrawlItemTypeEnum>;

/**
 * Skema validasi permintaan crawling (CrawlRequest).
 * Mewajibkan protokol HTTPS dengan batas panjang URL maksimal 2048 karakter.
 */
export const CrawlRequestSchema = z.object({
  targetUrl: z
    .string()
    .url("targetUrl must be a valid URL")
    .max(2048, "targetUrl must not exceed 2048 characters")
    .refine((url) => url.startsWith("https://"), {
      message: "Only HTTPS URLs are allowed for security",
    }),
  sourceType: CrawlSourceTypeEnum,
  mode: CrawlModeEnum,
  idempotencyKey: z.string().optional(),
});
export type CrawlRequest = z.infer<typeof CrawlRequestSchema>;

/**
 * Skema item individual yang berhasil diekstraksi dari halaman sumber.
 */
export const CrawlExtractedItemSchema = z.object({
  id: z.string().optional(),
  itemType: CrawlItemTypeEnum,
  extractedText: z.string().min(1, "extractedText cannot be empty"),
  surroundingContext: z.string().optional(),
  lineStart: z.number().int().nonnegative().optional(),
  lineEnd: z.number().int().nonnegative().optional(),
  confidenceEstimate: z
    .number()
    .min(0, "confidenceEstimate must be >= 0")
    .max(1, "confidenceEstimate must be <= 1"),
  extractionMethod: z.string(),
  warnings: z.array(z.string()).default([]),
});
export type CrawlExtractedItem = z.infer<typeof CrawlExtractedItemSchema>;

/**
 * Metadata teknis dan integritas dari sumber data yang diunduh.
 */
export const CrawlSourceMetadataSchema = z.object({
  contentType: z.string(),
  bytesRead: z.number().int().nonnegative(),
  contentSha256: z.string(),
  licenseHint: z.string().optional(),
});
export type CrawlSourceMetadata = z.infer<typeof CrawlSourceMetadataSchema>;

/**
 * Skema hasil lengkap sesi crawling (CrawlResult).
 */
export const CrawlResultSchema = z.object({
  crawlSessionId: z.string(),
  status: JobStatusEnum,
  sourceUrl: z.string().url(),
  normalizedUrl: z.string().url(),
  fetchedAt: z.string(),
  items: z.array(CrawlExtractedItemSchema),
  sourceMetadata: CrawlSourceMetadataSchema,
});
export type CrawlResult = z.infer<typeof CrawlResultSchema>;
