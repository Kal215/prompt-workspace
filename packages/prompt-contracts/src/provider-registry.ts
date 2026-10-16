import { z } from "zod";

// ──────────────────────────────────────────────
// Provider & Custom Endpoints Registry Schemas
// ──────────────────────────────────────────────

export const ProviderApiModeEnum = z.enum([
  "auto_detect",
  "chat_completions",
  "responses_api",
  "anthropic_messages",
]);
export type ProviderApiMode = z.infer<typeof ProviderApiModeEnum>;

export const ProviderCategoryEnum = z.enum([
  "accounts",
  "api_keys",
  "custom_endpoints",
  "local_models",
]);
export type ProviderCategory = z.infer<typeof ProviderCategoryEnum>;

/**
 * Item katalog provider bawaan (built-in providers)
 */
export const CatalogProviderItemSchema = z.object({
  providerId: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string(),
  getKeyUrl: z.string(),
  configured: z.boolean(),
  maskedKeyHint: z.string().optional(),
  defaultModel: z.string(),
  availableModels: z.array(z.string()),
});
export type CatalogProviderItem = z.infer<typeof CatalogProviderItemSchema>;

/**
 * Konfigurasi custom endpoint (OpenAI-compatible, vLLM, llama.cpp, 9Router, Ollama, Hermes, dll.)
 */
export const CustomEndpointConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  providerId: z.string().min(1), // Slug unik (misal: "lyra-pc", "local-vision")
  endpointUrl: z.string().url(),
  apiMode: ProviderApiModeEnum.default("auto_detect"),
  defaultModel: z.string().min(1),
  contextLength: z.union([z.literal("auto"), z.number().int().positive()]).default("auto"),
  envKeyRef: z.string().optional(),
  hasSavedKey: z.boolean().default(false),
  useForNewChats: z.boolean().default(false),
  discoverModels: z.boolean().default(true),
  isActive: z.boolean().default(false),
  isLocal: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type CustomEndpointConfig = z.infer<typeof CustomEndpointConfigSchema>;

/**
 * Input untuk create / update custom endpoint
 */
export const CustomEndpointInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  providerId: z.string().optional(), // Jika kosong, auto-slug dari name
  endpointUrl: z.string().url("Valid URL is required"),
  apiMode: ProviderApiModeEnum.default("auto_detect"),
  defaultModel: z.string().min(1, "Default model is required"),
  contextLength: z.union([z.literal("auto"), z.number().int().positive()]).default("auto"),
  apiKey: z.string().optional(), // Jika kosong / undefined saat update: pertahankan key lama
  envKeyRef: z.string().optional(),
  useForNewChats: z.boolean().default(false),
  discoverModels: z.boolean().default(true),
  isActive: z.boolean().default(true),
  isLocal: z.boolean().optional(),
});
export type CustomEndpointInput = z.input<typeof CustomEndpointInputSchema>;

/**
 * Hasil uji koneksi provider / custom endpoint
 */
export const ProviderConnectionTestResultSchema = z.object({
  ok: z.boolean(),
  latencyMs: z.number().nonnegative(),
  detectedApiMode: z.string(),
  discoveredModels: z.array(z.string()),
  message: z.string(),
});
export type ProviderConnectionTestResult = z.infer<typeof ProviderConnectionTestResultSchema>;
