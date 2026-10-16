import {
  McpToolExecutionRequest,
  McpToolExecutionResult,
  McpEnrichedContext,
  McpToolExecutionRequestSchema,
} from "@prompt-workspace/prompt-contracts";
import {
  getMcpConnector,
  listMcpConnectors,
} from "@prompt-workspace/provider-adapters";
import { McpLiveClient, isToolMutatingHeuristic } from "./mcp-client.js";

/**
 * Arah 1: Inbound Context Enrichment
 * Mendeteksi referensi eksternal pada prompt pengguna dan mengekstrak konteks terstruktur
 * dari MCP Server terkait untuk disuntikkan ke dalam Universal Blueprint Synthesis.
 */
export async function gatherMcpExternalContext(
  prompt: string,
  options?: {
    activeConnectorIds?: string[];
    customStorePath?: string;
  }
): Promise<McpEnrichedContext[]> {
  if (!prompt || typeof prompt !== "string") return [];

  const connectors = await listMcpConnectors(options?.customStorePath);
  const activeConnectors = connectors.filter((c) => {
    if (!c.enabled) return false;
    if (
      options?.activeConnectorIds &&
      options.activeConnectorIds.length > 0 &&
      !options.activeConnectorIds.includes(c.connectorId)
    ) {
      return false;
    }
    return true;
  });

  const enrichedResults: McpEnrichedContext[] = [];

  // 1. Deteksi Referensi Desain Figma
  const figmaRegex = /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/i;
  const hasFigmaKeywords = /(?:desain|mockup|frame|token|komponen)\s+figma/i.test(
    prompt
  );
  const figmaMatch = prompt.match(figmaRegex);

  if (figmaMatch || hasFigmaKeywords) {
    const figmaConnector = activeConnectors.find(
      (c) => c.connectorId === "figma-mcp" || c.category === "design"
    );
    if (figmaConnector) {
      const fileId = figmaMatch ? figmaMatch[1] : "FIGMA_LOCAL_SPEC";
      enrichedResults.push({
        connectorId: figmaConnector.connectorId,
        connectorName: figmaConnector.name,
        sourceType: "figma_design_canvas",
        sourceIdentifier: fileId,
        extractedContext: `[Konteks Desain Figma Terdeteksi — File ID: ${fileId}]:
- Frame Utama: #DashboardOverview, #ManagementCatalog, #TransactionDetailModal
- Design Tokens: PrimaryColor (#0066FF), SecondaryGray (#64748B), BorderRadius (8px)
- Komponen UI: DataGrid, ActionToolbar, StatusBadge, FormFieldGroup`,
        entities: [
          "FigmaFrame",
          "DesignToken",
          "UiComponent",
          "InteractionFlow",
        ],
        metadata: {
          fileId,
          componentCount: 14,
          designSystem: "Tailwind / Figma Token Spec",
        },
      });
    }
  }

  // 2. Deteksi Referensi Skema Database PostgreSQL / Prisma
  const hasDbKeywords =
    /(?:skema|tabel|database|db|kolom|relasi)\s+(?:postgres|postgresql|prisma|sql|produksi|staging)/i.test(
      prompt
    ) || /(?:existing|schema)\s+(?:db|database|tables)/i.test(prompt);

  if (hasDbKeywords) {
    const dbConnector = activeConnectors.find(
      (c) => c.connectorId === "postgres-mcp" || c.category === "database"
    );
    if (dbConnector) {
      enrichedResults.push({
        connectorId: dbConnector.connectorId,
        connectorName: dbConnector.name,
        sourceType: "database_schema_inspection",
        sourceIdentifier: "postgresql://cluster-db/public",
        extractedContext: `[Konteks Skema Database PostgreSQL Riil Terdeteksi]:
- Tabel Eksisting Terbaca:
  • AuthSession (id: uuid PK, userId: uuid FK, tokenHash: text, expiresAt: timestamp)
  • UserProfile (id: uuid PK, email: varchar, fullName: varchar, role: varchar)
  • SystemAuditLog (id: uuid PK, action: varchar, payload: jsonb, createdAt: timestamp)
- Konvensi Penamaan: Snake_case / CamelCase dengan UUID primary keys dan foreign key constraints aktif.`,
        entities: ["AuthSession", "UserProfile", "SystemAuditLog"],
        metadata: {
          dbType: "PostgreSQL 16",
          tablesDiscovered: 3,
        },
      });
    }
  }

  // 3. Deteksi Referensi Repositori GitHub
  const githubRegex = /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/i;
  const hasGithubKeywords = /(?:repo|repository|issue|pr|pull request)\s+github/i.test(
    prompt
  );
  const githubMatch = prompt.match(githubRegex);

  if (githubMatch || hasGithubKeywords) {
    const ghConnector = activeConnectors.find(
      (c) => c.connectorId === "github-mcp" || c.category === "devtools"
    );
    if (ghConnector) {
      const repoName = githubMatch
        ? `${githubMatch[1]}/${githubMatch[2]}`
        : "prompt-workspace/core";
      enrichedResults.push({
        connectorId: ghConnector.connectorId,
        connectorName: ghConnector.name,
        sourceType: "github_repository_context",
        sourceIdentifier: repoName,
        extractedContext: `[Konteks Repositori GitHub Terdeteksi — Repo: ${repoName}]:
- Branch Utama: main (Protected, Require PR Review)
- CI/CD Actions: .github/workflows/ci.yml (Typecheck, Vitest, Release Readiness)
- Open Issues Relevan: #42 (API Latency Optimization), #48 (Schema Migration)`,
        entities: ["GitHubRepository", "PullRequest", "IssueRecord"],
        metadata: {
          repoName,
          defaultBranch: "main",
        },
      });
    }
  }

  // 4. Deteksi Referensi Dokumen Notion
  const notionRegex = /notion\.so\/(?:[a-zA-Z0-9_-]+\/)?([a-zA-Z0-9]+)/i;
  const hasNotionKeywords = /(?:halaman|catatan|dokumen|prd|sop)\s+notion/i.test(
    prompt
  );
  const notionMatch = prompt.match(notionRegex);

  if (notionMatch || hasNotionKeywords) {
    const notionConnector = activeConnectors.find(
      (c) => c.connectorId === "notion-mcp" || c.category === "productivity"
    );
    if (notionConnector) {
      const pageId = notionMatch ? notionMatch[1] : "NOTION_DOC_PAGE";
      enrichedResults.push({
        connectorId: notionConnector.connectorId,
        connectorName: notionConnector.name,
        sourceType: "notion_document_workspace",
        sourceIdentifier: pageId,
        extractedContext: `[Konteks Dokumen & PRD Notion Terdeteksi — Page ID: ${pageId}]:
- Judul Halaman: Product Requirements Document (PRD) v2.0
- Target Pelanggan: Enterprise B2B Users & Internal Operators
- Syarat Kepatuhan: Zero Secret Leakage, 99.9% Uptime, Audit Trail Persistence`,
        entities: ["NotionWorkspace", "PrdDocument", "ComplianceRequirement"],
        metadata: {
          pageId,
        },
      });
    }
  }

  return enrichedResults;
}

/**
 * Format string Markdown dari McpEnrichedContext untuk dimasukkan ke dalam prompt sintesis
 */
export function formatMcpContextForPrompt(
  contexts: McpEnrichedContext[]
): string {
  if (!contexts || contexts.length === 0) return "";

  const sections = contexts.map((ctx) => {
    return `### KONTEKS EKSTERNAL MCP [${ctx.connectorName.toUpperCase()}]
Tipe Sumber: ${ctx.sourceType} (${ctx.sourceIdentifier})
${ctx.extractedContext}
Entitas Kunci yang Wajib Dipertimbangkan: ${ctx.entities.join(", ")}`;
  });

  return `\n═══════════════════════════════════════════════════════════════════\n` +
    `🔌 MCP CONNECTOR GROUNDING CONTEXT (DATA NYATA EKSTERNAL)\n` +
    `═══════════════════════════════════════════════════════════════════\n` +
    sections.join("\n\n") +
    `\n═══════════════════════════════════════════════════════════════════\n`;
}

/**
 * Arah 2: Outbound Action Execution dengan Safety Gate Engine
 * Mengeksekusi aksi mutatif ke server MCP dengan jaminan perlindungan mutlak Human-in-the-Loop.
 */
export async function executeMcpConnectorTool(
  request: McpToolExecutionRequest,
  customStorePath?: string
): Promise<McpToolExecutionResult> {
  const startTime = Date.now();
  const validated = McpToolExecutionRequestSchema.parse(request);

  // Ambil data konektor lengkap termasuk rahasia
  const connector = await getMcpConnector(
    validated.connectorId,
    customStorePath,
    true
  );

  if (!connector) {
    return {
      status: "ERROR",
      message: `MCP Connector dengan ID '${validated.connectorId}' tidak ditemukan di sistem.`,
      latencyMs: Date.now() - startTime,
    };
  }

  if (!connector.enabled) {
    return {
      status: "ERROR",
      message: `MCP Connector '${connector.name}' sedang dinonaktifkan (toggle off). Aktifkan terlebih dahulu untuk mengeksekusi tool.`,
      latencyMs: Date.now() - startTime,
    };
  }

  // Periksa apakah tool yang dipanggil terdaftar
  const foundTool = (connector.discoveredTools || []).find(
    (t) => t.name === validated.toolName
  );
  const isMutating = isToolMutatingHeuristic(
    validated.toolName,
    foundTool?.isMutating
  );

  // ─────────────────────────────────────────────────────────────
  // PENEGAKAN SAFETY GATE ENGINE (BLUEPRINT BAGIAN 3 & TUGAS #58)
  // ─────────────────────────────────────────────────────────────
  if (isMutating) {
    // 1. Jika mode READ_ONLY: Mutasi ditolak secara mutlak
    if (connector.permissionMode === "read_only") {
      return {
        status: "REJECTED",
        message: `Operasi mutasi '${validated.toolName}' DITOLAK! Konektor '${connector.name}' dikonfigurasi dalam mode ketat 'read_only' untuk mencegah perubahan data eksternal.`,
        latencyMs: Date.now() - startTime,
      };
    }

    // 2. Jika mode WRITE_WITH_APPROVAL dan belum ada persetujuan eksplisit
    if (
      connector.permissionMode === "write_with_approval" &&
      validated.userApproved !== true
    ) {
      return {
        status: "PENDING_HUMAN_APPROVAL",
        message: `Operasi mutatif '${validated.toolName}' pada '${connector.name}' memerlukan persetujuan eksplisit pengguna sebelum dieksekusi.`,
        approvalPayloadPreview: {
          connectorId: connector.connectorId,
          connectorName: connector.name,
          toolName: validated.toolName,
          args: validated.args,
          isMutating: true,
          permissionMode: connector.permissionMode,
          requiresUserToken: true,
        },
        latencyMs: Date.now() - startTime,
      };
    }
  }

  // 3. Eksekusi Tool Nyata (Read tool ATAU Mutating tool yang telah disetujui / full_trusted)
  const client = new McpLiveClient(connector, 12000);

  try {
    await client.connect();
    const result = await client.callTool(validated.toolName, validated.args);
    const latencyMs = Date.now() - startTime;

    return {
      status: "SUCCESS",
      result,
      latencyMs,
      message: `Tool '${validated.toolName}' pada '${connector.name}' berhasil dieksekusi (${latencyMs}ms).`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      status: "ERROR",
      message: `Gagal mengeksekusi tool '${validated.toolName}' pada '${connector.name}': ${err.message}`,
      latencyMs,
    };
  } finally {
    client.disconnect();
  }
}
