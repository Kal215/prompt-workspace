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
      const fullConnector = await getMcpConnector(
        figmaConnector.connectorId,
        options?.customStorePath,
        true
      );
      const figmaToken =
        fullConnector?.savedApiKeyOrToken ||
        fullConnector?.savedEnvSecrets?.["FIGMA_ACCESS_TOKEN"] ||
        (fullConnector?.stdioConfig?.envVars?.["FIGMA_ACCESS_TOKEN"] &&
        !fullConnector.stdioConfig.envVars["FIGMA_ACCESS_TOKEN"].includes("••••")
          ? fullConnector.stdioConfig.envVars["FIGMA_ACCESS_TOKEN"]
          : undefined) ||
        process.env.FIGMA_ACCESS_TOKEN;

      let extractedContext = "";
      let entities: string[] = ["FigmaFrame", "DesignToken", "UiComponent"];
      let componentCount = 0;

      if (figmaToken && figmaMatch) {
        try {
          const res = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
            headers: { "X-Figma-Token": figmaToken },
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            const data: any = await res.json();
            const documentName = data.name || "Figma Document";
            const frames = (data.document?.children?.[0]?.children || [])
              .slice(0, 5)
              .map((c: any) => `#${c.name}`)
              .join(", ");
            componentCount = Object.keys(data.components || {}).length;
            extractedContext = `[Konteks Desain Figma Riil (Live API) — File ID: ${fileId}]:\n- Dokumen: ${documentName}\n- Frame Terbaca: ${frames || "None"}\n- Total Komponen Terdaftar: ${componentCount}`;
          } else {
            extractedContext = `[Koneksi Figma API Gagal (${res.status} ${res.statusText}) — File ID: ${fileId}]. Pastikan FIGMA_ACCESS_TOKEN valid. Sistem tidak menggunakan data skema rekayasa.`;
          }
        } catch (err: any) {
          extractedContext = `[Koneksi Figma API Timeout/Offline — File ID: ${fileId}]. Error: ${err.message}. Sistem tidak menggunakan data rekayasa.`;
        }
      } else {
        extractedContext = `[Referensi Figma Terdeteksi — File ID: ${fileId}]:\n- Status: Kredensial FIGMA_ACCESS_TOKEN belum disetel pada konektor figma-mcp.\n- Panduan: Konfigurasikan token Figma pada Settings Konektor untuk menginspeksi frame dan token desain riil secara otomatis. Sistem menolak mengarang data frame/komponen fiktif.`;
      }

      enrichedResults.push({
        connectorId: figmaConnector.connectorId,
        connectorName: figmaConnector.name,
        sourceType: "figma_design_canvas",
        sourceIdentifier: fileId,
        extractedContext,
        entities,
        metadata: {
          fileId,
          componentCount,
          designSystem: "Figma Token Spec",
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
      const fullConnector = await getMcpConnector(
        dbConnector.connectorId,
        options?.customStorePath,
        true
      );
      const dbUrl =
        fullConnector?.savedApiKeyOrToken ||
        fullConnector?.savedEnvSecrets?.["DATABASE_URL"] ||
        (fullConnector?.stdioConfig?.envVars?.["DATABASE_URL"] &&
        !fullConnector.stdioConfig.envVars["DATABASE_URL"].includes("••••")
          ? fullConnector.stdioConfig.envVars["DATABASE_URL"]
          : undefined) ||
        process.env.DATABASE_URL;

      let extractedContext = "";
      let entities: string[] = ["DatabaseTable", "SchemaDefinition"];
      let tablesDiscovered = 0;

      if (dbUrl) {
        extractedContext = `[Konteks Skema Database PostgreSQL Riil Terkonfigurasi]:\n- Connection URI: Terpasang (disensor untuk privasi).\n- Status: Siap diinspeksi melalui tools konektor 'postgres-mcp'. Skema tabel akan diselaraskan dengan database fisik tanpa data tiruan.`;
      } else {
        extractedContext = `[Referensi Database PostgreSQL Terdeteksi]:\n- Status: DATABASE_URL belum dikonfigurasi pada konektor postgres-mcp.\n- Panduan: Masukkan connection string database pada Settings Konektor untuk introspeksi skema tabel langsung. Sistem menolak mengarang tabel atau kolom tiruan.`;
      }

      enrichedResults.push({
        connectorId: dbConnector.connectorId,
        connectorName: dbConnector.name,
        sourceType: "database_schema_inspection",
        sourceIdentifier: "postgresql://target-db/public",
        extractedContext,
        entities,
        metadata: {
          dbType: "PostgreSQL",
          tablesDiscovered,
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
      const fullConnector = await getMcpConnector(
        ghConnector.connectorId,
        options?.customStorePath,
        true
      );
      const ghToken =
        fullConnector?.savedApiKeyOrToken ||
        fullConnector?.savedEnvSecrets?.["GITHUB_TOKEN"] ||
        (fullConnector?.stdioConfig?.envVars?.["GITHUB_TOKEN"] &&
        !fullConnector.stdioConfig.envVars["GITHUB_TOKEN"].includes("••••")
          ? fullConnector.stdioConfig.envVars["GITHUB_TOKEN"]
          : undefined) ||
        process.env.GITHUB_TOKEN;

      let extractedContext = "";
      let entities: string[] = ["GitHubRepository", "PullRequest", "IssueRecord"];

      if (ghToken && githubMatch) {
        try {
          const res = await fetch(`https://api.github.com/repos/${repoName}`, {
            headers: {
              Authorization: `Bearer ${ghToken}`,
              "User-Agent": "PIEW-MCP-Engine",
            },
            signal: AbortSignal.timeout(4000),
          });
          if (res.ok) {
            const data: any = await res.json();
            extractedContext = `[Konteks Repositori GitHub Riil (Live API) — Repo: ${repoName}]:\n- Default Branch: ${data.default_branch}\n- Open Issues / PRs: ${data.open_issues_count}\n- Deskripsi: ${data.description || "No description"}`;
          } else {
            extractedContext = `[Koneksi GitHub API Gagal (${res.status} ${res.statusText}) — Repo: ${repoName}]. Sistem menolak mengarang branch atau issue fiktif.`;
          }
        } catch (err: any) {
          extractedContext = `[Koneksi GitHub API Timeout/Offline — Repo: ${repoName}]. Error: ${err.message}.`;
        }
      } else {
        extractedContext = `[Referensi Repositori GitHub Terdeteksi — Repo: ${repoName}]:\n- Status: GITHUB_TOKEN belum dikonfigurasi pada konektor github-mcp.\n- Panduan: Konfigurasikan token GitHub pada Settings Konektor untuk sinkronisasi PR/Issue otomatis. Sistem menolak mengarang issue/branch tiruan.`;
      }

      enrichedResults.push({
        connectorId: ghConnector.connectorId,
        connectorName: ghConnector.name,
        sourceType: "github_repository_context",
        sourceIdentifier: repoName,
        extractedContext,
        entities,
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
      const fullConnector = await getMcpConnector(
        notionConnector.connectorId,
        options?.customStorePath,
        true
      );
      const notionToken =
        fullConnector?.savedApiKeyOrToken ||
        fullConnector?.savedEnvSecrets?.["NOTION_API_KEY"] ||
        (fullConnector?.stdioConfig?.envVars?.["NOTION_API_KEY"] &&
        !fullConnector.stdioConfig.envVars["NOTION_API_KEY"].includes("••••")
          ? fullConnector.stdioConfig.envVars["NOTION_API_KEY"]
          : undefined) ||
        process.env.NOTION_API_KEY;

      let extractedContext = "";
      if (notionToken) {
        extractedContext = `[Konteks Dokumen Notion Riil Terkonfigurasi — Page ID: ${pageId}]:\n- Status: Kredensial Notion aktif. Konten halaman akan diakses melalui tool notion-mcp secara terverifikasi.`;
      } else {
        extractedContext = `[Referensi Dokumen Notion Terdeteksi — Page ID: ${pageId}]:\n- Status: NOTION_API_KEY belum dikonfigurasi pada konektor notion-mcp.\n- Panduan: Setel integrasi token Notion pada Settings Konektor. Sistem menolak membuat kutipan PRD fiktif.`;
      }

      enrichedResults.push({
        connectorId: notionConnector.connectorId,
        connectorName: notionConnector.name,
        sourceType: "notion_document_workspace",
        sourceIdentifier: pageId,
        extractedContext,
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
