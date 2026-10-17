import {
  McpConnectorConfig,
  McpConnectorConfigSchema,
} from "@prompt-workspace/prompt-contracts";

/**
 * Katalog Built-in MCP Connectors bawaan PIEW (Minimal 10 Konektor Populer)
 */
export const BUILTIN_MCP_CONNECTORS_CATALOG: McpConnectorConfig[] = [
  {
    connectorId: "figma-mcp",
    name: "Figma MCP",
    category: "design",
    badgeType: "MCP · Catalog",
    description:
      "Membaca frame desain, komponen UI, tokens desain dari link Figma, serta menambahkan review/komentar implementasi.",
    enabled: true,
    installedOnDevice: false,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@figma/mcp-server"],
      envVars: {
        FIGMA_ACCESS_TOKEN: "${FIGMA_ACCESS_TOKEN}",
      },
    },
    permissionMode: "write_with_approval",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "get_file",
        description: "Membaca struktur file Figma (nodes, frames, components, tokens)",
        inputSchema: {
          type: "object",
          properties: {
            fileKey: { type: "string", description: "Kunci ID file Figma" },
          },
          required: ["fileKey"],
        },
        isMutating: false,
      },
      {
        name: "get_comments",
        description: "Mengambil daftar komentar revisi pada canvas Figma",
        inputSchema: {
          type: "object",
          properties: {
            fileKey: { type: "string", description: "Kunci ID file Figma" },
          },
          required: ["fileKey"],
        },
        isMutating: false,
      },
      {
        name: "post_comment",
        description: "Menulis komentar baru pada node atau posisi canvas Figma",
        inputSchema: {
          type: "object",
          properties: {
            fileKey: { type: "string", description: "Kunci ID file Figma" },
            message: { type: "string", description: "Isi komentar" },
          },
          required: ["fileKey", "message"],
        },
        isMutating: true,
      },
    ],
    discoveredResources: [],
  },
  {
    connectorId: "github-mcp",
    name: "GitHub MCP",
    category: "devtools",
    badgeType: "MCP · Catalog",
    description:
      "Membaca isi repository, PR, issue, dan membuat Issue / PR otomatis berdasarkan fase eksekusi Blueprint PIEW.",
    enabled: true,
    installedOnDevice: true,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      envVars: {
        GITHUB_PERSONAL_ACCESS_TOKEN: "${GITHUB_TOKEN}",
      },
    },
    permissionMode: "write_with_approval",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "search_repositories",
        description: "Mencari repository GitHub publik maupun privat pengguna",
        inputSchema: {
          type: "object",
          properties: {
            q: { type: "string", description: "Query pencarian" },
          },
          required: ["q"],
        },
        isMutating: false,
      },
      {
        name: "get_file_contents",
        description: "Membaca isi file mentah dari suatu repository GitHub",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            path: { type: "string" },
          },
          required: ["owner", "repo", "path"],
        },
        isMutating: false,
      },
      {
        name: "create_issue",
        description: "Membuat issue baru pada repository GitHub",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            title: { type: "string" },
            body: { type: "string" },
          },
          required: ["owner", "repo", "title"],
        },
        isMutating: true,
      },
    ],
    discoveredResources: [],
  },
  {
    connectorId: "postgres-mcp",
    name: "PostgreSQL / Prisma MCP",
    category: "database",
    badgeType: "MCP · Catalog",
    description:
      "Inspeksi skema database nyata (tabel, kolom, PK/FK, constraints) untuk akurasi diagram ERD Mermaid 100%.",
    enabled: true,
    installedOnDevice: false,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres"],
      envVars: {
        DATABASE_URL: "${DATABASE_URL}",
      },
    },
    permissionMode: "read_only",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "describe_tables",
        description: "Mengambil daftar seluruh tabel beserta kolom, tipe data, dan relasi FK",
        inputSchema: {
          type: "object",
          properties: {},
        },
        isMutating: false,
      },
      {
        name: "query_schema",
        description: "Menjalankan query SQL read-only untuk meta-skema sistem (information_schema)",
        inputSchema: {
          type: "object",
          properties: {
            sql: { type: "string" },
          },
          required: ["sql"],
        },
        isMutating: false,
      },
    ],
    discoveredResources: [],
  },
  {
    connectorId: "notion-mcp",
    name: "Notion MCP",
    category: "productivity",
    badgeType: "MCP · Catalog",
    description:
      "Membaca dokumen PRD/SOP dari Notion dan mengekspor Master Blueprint 10-Bagian ke halaman dokumen Notion.",
    enabled: true,
    installedOnDevice: false,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-notion"],
      envVars: {
        NOTION_API_KEY: "${NOTION_API_KEY}",
      },
    },
    permissionMode: "write_with_approval",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "read_page",
        description: "Membaca teks, tabel, dan blok dari halaman Notion",
        inputSchema: {
          type: "object",
          properties: {
            pageId: { type: "string" },
          },
          required: ["pageId"],
        },
        isMutating: false,
      },
      {
        name: "create_page",
        description: "Membuat halaman dokumen baru di workspace Notion",
        inputSchema: {
          type: "object",
          properties: {
            parentId: { type: "string" },
            title: { type: "string" },
            content: { type: "string" },
          },
          required: ["parentId", "title", "content"],
        },
        isMutating: true,
      },
    ],
    discoveredResources: [],
  },
  {
    connectorId: "filesystem-mcp",
    name: "Local Filesystem MCP",
    category: "devtools",
    badgeType: "MCP · Catalog",
    description:
      "Membaca struktur direktori, berkas konfigurasi, package.json, dan skema kode lokal pengguna untuk grounding kontekstual.",
    enabled: true,
    installedOnDevice: true,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "."],
      envVars: {},
    },
    permissionMode: "read_only",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "list_directory",
        description: "Melihat daftar berkas dan subdirektori dalam path lokal yang diizinkan",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path direktori relatif atau absolut" },
          },
          required: ["path"],
        },
        isMutating: false,
      },
      {
        name: "read_file",
        description: "Membaca isi teks mentah dari berkas kode sumber atau konfigurasi lokal",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path berkas yang akan dibaca" },
          },
          required: ["path"],
        },
        isMutating: false,
      },
    ],
    discoveredResources: [],
  },
  {
    connectorId: "linear-mcp",
    name: "Linear MCP",
    category: "productivity",
    badgeType: "MCP · Catalog",
    description:
      "Sinkronisasi tiket rekayasa perangkat lunak, issue backlog, dan status sprint dari proyek Linear tim engineering.",
    enabled: true,
    installedOnDevice: false,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-linear"],
      envVars: {
        LINEAR_API_KEY: "${LINEAR_API_KEY}",
      },
    },
    permissionMode: "write_with_approval",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "list_issues",
        description: "Mengambil daftar tiket issue aktif pada tim atau proyek Linear",
        inputSchema: {
          type: "object",
          properties: {
            teamKey: { type: "string", description: "Kunci identifikasi tim (misal: ENG)" },
          },
        },
        isMutating: false,
      },
      {
        name: "create_issue",
        description: "Membuat tiket issue atau tugas rekayasa baru pada workspace Linear",
        inputSchema: {
          type: "object",
          properties: {
            teamId: { type: "string", description: "ID tim Linear sasaran" },
            title: { type: "string", description: "Judul tiket issue" },
            description: { type: "string", description: "Deskripsi teknis atau spesifikasi acceptance criteria" },
          },
          required: ["teamId", "title"],
        },
        isMutating: true,
      },
    ],
    discoveredResources: [],
  },
  {
    connectorId: "docker-mcp",
    name: "Docker MCP",
    category: "devtools",
    badgeType: "MCP · Catalog",
    description:
      "Inspeksi konfigurasi Dockerfile, docker-compose.yml, dan status kontainer aktif untuk validasi topologi deployment.",
    enabled: true,
    installedOnDevice: false,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-docker"],
      envVars: {},
    },
    permissionMode: "read_only",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "list_containers",
        description: "Melihat daftar kontainer Docker aktif beserta port mapping dan status runtime",
        inputSchema: {
          type: "object",
          properties: {},
        },
        isMutating: false,
      },
      {
        name: "inspect_container",
        description: "Mengambil metadata konfigurasi mendalam (env, mounts, networks) dari suatu kontainer",
        inputSchema: {
          type: "object",
          properties: {
            containerId: { type: "string", description: "ID atau nama kontainer Docker" },
          },
          required: ["containerId"],
        },
        isMutating: false,
      },
    ],
    discoveredResources: [],
  },
  {
    connectorId: "aws-knowledge-mcp",
    name: "AWS Knowledge MCP",
    category: "devtools",
    badgeType: "MCP · Catalog",
    description:
      "Referensi resmi arsitektur AWS, pola Well-Architected Framework, dan rekomendasi infrastruktur cloud.",
    enabled: true,
    installedOnDevice: false,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@aws/mcp-knowledge-server"],
      envVars: {},
    },
    permissionMode: "read_only",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "search_aws_docs",
        description: "Mencari dokumentasi resmi arsitektur dan best practices AWS",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
        isMutating: false,
      },
    ],
    discoveredResources: [],
  },
  {
    connectorId: "brave-search-mcp",
    name: "Brave Search / Web Fetch MCP",
    category: "search",
    badgeType: "MCP · Catalog",
    description:
      "Pencarian konteks web real-time untuk memperkaya data pasar, regulasi industri, dan teknologi terkini.",
    enabled: true,
    installedOnDevice: true,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-brave-search"],
      envVars: {
        BRAVE_API_KEY: "${BRAVE_API_KEY}",
      },
    },
    permissionMode: "read_only",
    connectionStatus: "connected",
    discoveredTools: [
      {
        name: "brave_web_search",
        description: "Melakukan pencarian web menggunakan Brave Search API",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
        isMutating: false,
      },
    ],
    discoveredResources: [],
  },
  {
    connectorId: "sentry-mcp",
    name: "Sentry MCP",
    category: "analytics",
    badgeType: "MCP · Catalog",
    description:
      "Menarik log pengecualian produksi (unhandled exceptions, stack traces, breadcrumbs) untuk analisis akar masalah dan perbaikan bug.",
    enabled: true,
    installedOnDevice: false,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-sentry"],
      envVars: {
        SENTRY_AUTH_TOKEN: "${SENTRY_AUTH_TOKEN}",
      },
    },
    permissionMode: "read_only",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "list_issues",
        description: "Mengambil daftar insiden galat atau pengecualian produksi terbaru pada proyek Sentry",
        inputSchema: {
          type: "object",
          properties: {
            organizationSlug: { type: "string" },
            projectSlug: { type: "string" },
          },
          required: ["organizationSlug", "projectSlug"],
        },
        isMutating: false,
      },
      {
        name: "get_issue_details",
        description: "Mengambil rincian stack trace dan konteks breadcrumbs dari insiden galat tertentu",
        inputSchema: {
          type: "object",
          properties: {
            issueId: { type: "string" },
          },
          required: ["issueId"],
        },
        isMutating: false,
      },
    ],
    discoveredResources: [],
  },
];

/**
 * Mendapatkan daftar katalog bawaan yang telah divalidasi skema
 */
export function getBuiltinMcpConnectors(): McpConnectorConfig[] {
  return BUILTIN_MCP_CONNECTORS_CATALOG.map((item) =>
    McpConnectorConfigSchema.parse(item)
  );
}
