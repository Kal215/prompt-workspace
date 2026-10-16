import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// MCP Connector Hub & Tool Bridge Contracts (Zod)
// Kontrak tipe untuk Dual-Role MCP Host & 2-Way Connector Hub
// ─────────────────────────────────────────────────────────────

export const McpTransportTypeEnum = z.enum(["stdio", "sse", "streamable_http"]);
export type McpTransportType = z.infer<typeof McpTransportTypeEnum>;

export const McpPermissionModeEnum = z.enum([
  "read_only",
  "write_with_approval",
  "full_trusted",
]);
export type McpPermissionMode = z.infer<typeof McpPermissionModeEnum>;

export const McpConnectorCategoryEnum = z.enum([
  "design",
  "database",
  "devtools",
  "productivity",
  "search",
  "analytics",
  "custom",
]);
export type McpConnectorCategory = z.infer<typeof McpConnectorCategoryEnum>;

export const McpBadgeTypeEnum = z.enum([
  "MCP · Catalog",
  "MCP · Custom",
  "Managed",
]);
export type McpBadgeType = z.infer<typeof McpBadgeTypeEnum>;

export const McpConnectionStatusEnum = z.enum([
  "connected",
  "unused",
  "error",
  "unconfigured",
]);
export type McpConnectionStatus = z.infer<typeof McpConnectionStatusEnum>;

export const McpAuthHeaderTypeEnum = z.enum([
  "bearer",
  "api_key",
  "custom",
  "none",
]);
export type McpAuthHeaderType = z.infer<typeof McpAuthHeaderTypeEnum>;

/**
 * Skema Tool yang di-expose oleh MCP Server eksternal
 */
export const McpToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  inputSchema: z.record(z.any()).default({}),
  isMutating: z.boolean().default(false),
});
export type McpTool = z.infer<typeof McpToolSchema>;

/**
 * Skema Resource yang di-expose oleh MCP Server eksternal
 */
export const McpResourceSchema = z.object({
  uri: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});
export type McpResource = z.infer<typeof McpResourceSchema>;

/**
 * Konfigurasi Transport Stdio (Local Child Process)
 */
export const McpStdioTransportConfigSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  envVars: z.record(z.string()).default({}),
});
export type McpStdioTransportConfig = z.infer<typeof McpStdioTransportConfigSchema>;

/**
 * Konfigurasi Transport HTTP / SSE (Remote MCP Server)
 */
export const McpHttpTransportConfigSchema = z.object({
  endpointUrl: z.string().url(),
  authHeaderType: McpAuthHeaderTypeEnum.default("bearer"),
  apiKeyOrToken: z.string().optional(),
  customHeaders: z.record(z.string()).default({}),
});
export type McpHttpTransportConfig = z.infer<typeof McpHttpTransportConfigSchema>;

/**
 * Konfigurasi Lengkap sebuah MCP Connector
 */
export const McpConnectorConfigSchema = z.object({
  connectorId: z.string().min(1),
  name: z.string().min(1),
  category: McpConnectorCategoryEnum,
  badgeType: McpBadgeTypeEnum.default("MCP · Catalog"),
  description: z.string(),
  enabled: z.boolean().default(true),
  installedOnDevice: z.boolean().default(false),
  transportType: McpTransportTypeEnum.default("stdio"),
  stdioConfig: McpStdioTransportConfigSchema.optional(),
  httpConfig: McpHttpTransportConfigSchema.optional(),
  permissionMode: McpPermissionModeEnum.default("write_with_approval"),
  discoveredTools: z.array(McpToolSchema).default([]),
  discoveredResources: z.array(McpResourceSchema).default([]),
  lastTestedAt: z.string().optional(),
  latencyMs: z.number().optional(),
  connectionStatus: McpConnectionStatusEnum.default("unused"),
  errorMessage: z.string().optional(),
  icon: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type McpConnectorConfig = z.infer<typeof McpConnectorConfigSchema>;

/**
 * Input untuk registrasi / pembaruan konektor kustom
 */
export const McpConnectorInputSchema = z.object({
  connectorId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  category: McpConnectorCategoryEnum.default("custom"),
  badgeType: McpBadgeTypeEnum.default("MCP · Custom"),
  description: z.string().default(""),
  enabled: z.boolean().default(true),
  installedOnDevice: z.boolean().default(false),
  transportType: McpTransportTypeEnum.default("stdio"),
  stdioConfig: McpStdioTransportConfigSchema.optional(),
  httpConfig: McpHttpTransportConfigSchema.optional(),
  permissionMode: McpPermissionModeEnum.default("write_with_approval"),
  icon: z.string().optional(),
});
export type McpConnectorInput = z.infer<typeof McpConnectorInputSchema>;

/**
 * Hasil Uji Koneksi & Tool Discovery MCP (Tombol ⚡️ Test & Discover)
 */
export const McpConnectionDiscoveryResultSchema = z.object({
  ok: z.boolean(),
  connectorId: z.string(),
  connectionStatus: McpConnectionStatusEnum,
  latencyMs: z.number(),
  discoveredTools: z.array(McpToolSchema),
  discoveredResources: z.array(McpResourceSchema),
  message: z.string(),
});
export type McpConnectionDiscoveryResult = z.infer<
  typeof McpConnectionDiscoveryResultSchema
>;

/**
 * Permintaan Eksekusi Tool MCP dengan Safety Gate
 */
export const McpToolExecutionRequestSchema = z.object({
  connectorId: z.string().min(1),
  toolName: z.string().min(1),
  args: z.record(z.any()).default({}),
  userApproved: z.boolean().optional(),
});
export type McpToolExecutionRequest = z.infer<
  typeof McpToolExecutionRequestSchema
>;

/**
 * Status Hasil Eksekusi Tool
 */
export const McpToolExecutionResultStatusEnum = z.enum([
  "SUCCESS",
  "PENDING_HUMAN_APPROVAL",
  "REJECTED",
  "ERROR",
]);
export type McpToolExecutionResultStatus = z.infer<
  typeof McpToolExecutionResultStatusEnum
>;

/**
 * Hasil Eksekusi Tool MCP
 */
export const McpToolExecutionResultSchema = z.object({
  status: McpToolExecutionResultStatusEnum,
  result: z.any().optional(),
  approvalPayloadPreview: z.record(z.any()).optional(),
  message: z.string(),
  latencyMs: z.number().optional(),
});
export type McpToolExecutionResult = z.infer<
  typeof McpToolExecutionResultSchema
>;

/**
 * Konteks Eksternal Terstruktur yang Diperkaya (Arah 1: Inbound Context Enrichment)
 */
export const McpEnrichedContextSchema = z.object({
  connectorId: z.string(),
  connectorName: z.string(),
  sourceType: z.string(),
  sourceIdentifier: z.string(),
  extractedContext: z.string(),
  entities: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
});
export type McpEnrichedContext = z.infer<typeof McpEnrichedContextSchema>;
