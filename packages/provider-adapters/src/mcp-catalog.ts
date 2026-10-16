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
    connectorId: "airtable-mcp",
    name: "Airtable MCP",
    category: "productivity",
    badgeType: "MCP · Catalog",
    description:
      "Membaca basis data relasional Airtable dan mengelola record produk, inventaris, atau transaksi.",
    enabled: true,
    installedOnDevice: false,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-airtable"],
      envVars: {
        AIRTABLE_API_KEY: "${AIRTABLE_API_KEY}",
      },
    },
    permissionMode: "write_with_approval",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "list_records",
        description: "Mengambil daftar baris data dari base dan tabel Airtable",
        inputSchema: {
          type: "object",
          properties: {
            baseId: { type: "string" },
            tableId: { type: "string" },
          },
          required: ["baseId", "tableId"],
        },
        isMutating: false,
      },
      {
        name: "create_record",
        description: "Menambahkan baris record baru ke tabel Airtable",
        inputSchema: {
          type: "object",
          properties: {
            baseId: { type: "string" },
            tableId: { type: "string" },
            fields: { type: "object" },
          },
          required: ["baseId", "tableId", "fields"],
        },
        isMutating: true,
      },
    ],
    discoveredResources: [],
  },
  {
    connectorId: "asana-mcp",
    name: "Asana / Linear MCP",
    category: "productivity",
    badgeType: "MCP · Catalog",
    description:
      "Membaca daftar backlog tugas dan membuat tiket kerja dari deliverables fase eksekusi PIEW.",
    enabled: true,
    installedOnDevice: false,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-asana"],
      envVars: {
        ASANA_ACCESS_TOKEN: "${ASANA_ACCESS_TOKEN}",
      },
    },
    permissionMode: "write_with_approval",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "list_tasks",
        description: "Melihat daftar tugas yang belum selesai dalam sebuah proyek",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "string" },
          },
          required: ["projectId"],
        },
        isMutating: false,
      },
      {
        name: "create_task",
        description: "Membuat tugas baru pada papan proyek Asana / Linear",
        inputSchema: {
          type: "object",
          properties: {
            projectId: { type: "string" },
            name: { type: "string" },
            notes: { type: "string" },
          },
          required: ["projectId", "name"],
        },
        isMutating: true,
      },
    ],
    discoveredResources: [],
  },
  {
    connectorId: "algolia-mcp",
    name: "Algolia MCP",
    category: "search",
    badgeType: "MCP · Catalog",
    description:
      "Inspeksi skema facet pencarian, indeks rekaman, dan analitik secara read-only.",
    enabled: true,
    installedOnDevice: false,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "@algolia/mcp-server"],
      envVars: {
        ALGOLIA_APP_ID: "${ALGOLIA_APP_ID}",
        ALGOLIA_API_KEY: "${ALGOLIA_API_KEY}",
      },
    },
    permissionMode: "read_only",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "search_index",
        description: "Mencari data pada indeks Algolia",
        inputSchema: {
          type: "object",
          properties: {
            indexName: { type: "string" },
            query: { type: "string" },
          },
          required: ["indexName", "query"],
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
    connectorId: "spotify-custom-mcp",
    name: "Spotify MCP · Custom",
    category: "custom",
    badgeType: "MCP · Custom",
    description:
      "Konektor lokal kustom terpasang pada perangkat pengguna (On this device) untuk kontrol media dan data pengguna.",
    enabled: true,
    installedOnDevice: true,
    transportType: "stdio",
    stdioConfig: {
      command: "npx",
      args: ["-y", "spotify-mcp-server"],
      envVars: {
        SPOTIFY_CLIENT_ID: "${SPOTIFY_CLIENT_ID}",
      },
    },
    permissionMode: "write_with_approval",
    connectionStatus: "unused",
    discoveredTools: [
      {
        name: "get_current_playback",
        description: "Membaca lagu dan status playback yang sedang diputar di perangkat",
        inputSchema: {
          type: "object",
          properties: {},
        },
        isMutating: false,
      },
      {
        name: "start_playback",
        description: "Memulai atau mengubah pemutaran musik di perangkat",
        inputSchema: {
          type: "object",
          properties: {
            uri: { type: "string" },
          },
          required: ["uri"],
        },
        isMutating: true,
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
