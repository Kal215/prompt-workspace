import { NextResponse } from "next/server";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";
import { getMcpRateLimiter, extractClientIP } from "../../../lib/rate-limiter";
import {
  listMcpConnectors,
  saveMcpConnector,
  toggleMcpConnector,
  deleteMcpConnector,
  getMcpConnector,
  BUILTIN_MCP_CONNECTORS_CATALOG,
} from "@prompt-workspace/provider-adapters";
import {
  testAndDiscoverMcpConnector,
  executeMcpConnectorTool,
} from "@prompt-workspace/prompt-engine";

/**
 * GET /api/mcp-connectors
 * Mengembalikan seluruh daftar konektor MCP publik (katalog bawaan + custom dari ~/.piew/mcp-connectors.json)
 * dengan jaminan Zero Secret Leakage (seluruh kunci & token diredaksi otomatis).
 */
export async function GET() {
  try {
    const connectors = await listMcpConnectors();
    const existingIds = new Set(connectors.map((c) => c.connectorId));
    const merged = [...connectors];
    for (const builtin of BUILTIN_MCP_CONNECTORS_CATALOG) {
      if (!existingIds.has(builtin.connectorId)) {
        merged.push(builtin);
      }
    }

    // Zero Secret Leakage guarantee: buang field internal savedEnvSecrets dan sembunyikan raw token
    const sanitizedConnectors = merged.map((c) => {
      const cloned = JSON.parse(JSON.stringify(c));
      delete cloned.savedEnvSecrets;
      if (cloned.stdioConfig?.envVars) {
        for (const [k, v] of Object.entries(cloned.stdioConfig.envVars)) {
          if (
            typeof v === "string" &&
            (v.startsWith("figd_") || v.startsWith("ghp_") || /token|key|secret|password|auth|pat/i.test(k))
          ) {
            if (!v.startsWith("${")) {
              cloned.stdioConfig.envVars[k] = v.length > 8 ? `${v.slice(0, 4)}••••${v.slice(-4)}` : "••••••••";
            }
          }
        }
      }
      return cloned;
    });

    return NextResponse.json(
      {
        success: true,
        connectors: sanitizedConnectors,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[API_MCP_CONNECTORS_GET_ERROR]", (err as Error).message);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil daftar konektor MCP.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp-connectors
 * Mengelola penambahan, pembaruan konfigurasi, toggle on/off, uji handshake & auto-discovery tools,
 * serta eksekusi alat 2-arah dengan perlindungan Safety Gate (Human-in-the-Loop).
 */
export async function POST(request: Request) {
  try {
    // 1. CSRF Fail-Closed Check
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    // 2. Rate Limiting
    const clientIP = extractClientIP(request);
    const rl = getMcpRateLimiter().check(`mcp:${clientIP}`);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Terlalu banyak permintaan ke layanan MCP. Silakan tunggu beberapa saat.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfter),
          },
        }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Payload JSON tidak valid." },
        { status: 400 }
      );
    }

    const action = body.action || "upsert";

    // Aksi 1: Toggle On / Off
    if (action === "toggle") {
      const connectorId = typeof body.connectorId === "string" ? body.connectorId.trim() : "";
      if (!connectorId) {
        return NextResponse.json(
          { success: false, error: "connectorId wajib diisi untuk aksi toggle." },
          { status: 400 }
        );
      }
      const updated = await toggleMcpConnector(connectorId, Boolean(body.enabled));
      return NextResponse.json(
        {
          success: true,
          connector: updated,
          message: `Konektor '${updated.name}' berhasil di-${body.enabled ? "aktifkan" : "nonaktifkan"}.`,
        },
        { status: 200 }
      );
    }

    // Aksi 2: Test Handshake & Auto-Discover Tools
    if (action === "test_and_discover") {
      const connectorId = typeof body.connectorId === "string" ? body.connectorId.trim() : "";
      if (!connectorId) {
        return NextResponse.json(
          { success: false, error: "connectorId wajib diisi untuk pengujian handshake." },
          { status: 400 }
        );
      }

      // Auto-heal figma-mcp args & env vars jika masih menunjuk ke package 404 (@figma/mcp-server)
      if (connectorId === "figma-mcp") {
        try {
          const currentFigma = await getMcpConnector("figma-mcp", undefined, true);
          if (currentFigma && currentFigma.stdioConfig) {
            let changed = false;
            const args = [...(currentFigma.stdioConfig.args || [])];
            if (args.includes("@figma/mcp-server")) {
              currentFigma.stdioConfig.args = args.map((a) => (a === "@figma/mcp-server" ? "figma-mcp" : a));
              changed = true;
            }
            const token =
              currentFigma.stdioConfig.envVars?.AUTH_TOKEN ||
              currentFigma.stdioConfig.envVars?.FIGMA_ACCESS_TOKEN ||
              process.env.FIGMA_ACCESS_TOKEN ||
              process.env.FIGMA_API_KEY;
            if (token && !currentFigma.stdioConfig.envVars?.FIGMA_API_KEY) {
              currentFigma.stdioConfig.envVars = {
                ...(currentFigma.stdioConfig.envVars || {}),
                FIGMA_API_KEY: token,
                FIGMA_ACCESS_TOKEN: token,
              };
              changed = true;
            }
            if (changed) {
              await saveMcpConnector(currentFigma);
            }
          }
        } catch {}
      }

      const discoveryResult = await testAndDiscoverMcpConnector(connectorId);
      return NextResponse.json(
        {
          success: discoveryResult.ok,
          ok: discoveryResult.ok,
          latencyMs: discoveryResult.latencyMs,
          connectionStatus: discoveryResult.connectionStatus,
          discoveredTools: discoveryResult.discoveredTools,
          discoveredResources: discoveryResult.discoveredResources,
          message: discoveryResult.message,
          errorMessage: discoveryResult.ok ? undefined : discoveryResult.message,
          result: discoveryResult,
        },
        { status: 200 }
      );
    }

    // Aksi 3: Execute Outbound Tool with Safety Gate
    if (action === "execute_tool") {
      const connectorId = typeof body.connectorId === "string" ? body.connectorId.trim() : "";
      const toolName = typeof body.toolName === "string" ? body.toolName.trim() : "";
      if (!connectorId || !toolName) {
        return NextResponse.json(
          { success: false, error: "connectorId dan toolName wajib diisi untuk eksekusi tool." },
          { status: 400 }
        );
      }

      const executionResult = await executeMcpConnectorTool({
        connectorId,
        toolName,
        args: body.args && typeof body.args === "object" ? body.args : {},
        userApproved: Boolean(body.userApproved),
      });

      const isSuccess = executionResult.status === "SUCCESS";
      const isPending = executionResult.status === "PENDING_HUMAN_APPROVAL";

      return NextResponse.json(
        {
          success: isSuccess || isPending,
          ok: isSuccess,
          executionStatus: executionResult.status,
          safetyApprovalRequired: isPending,
          ...executionResult,
        },
        { status: 200 }
      );
    }

    // Aksi 4: Upsert Connector (Add your own atau Configure catalog)
    const connectorInput = body.connector || body;
    if (!connectorInput.name || typeof connectorInput.name !== "string") {
      return NextResponse.json(
        { success: false, error: "Nama konektor (name) wajib diisi." },
        { status: 400 }
      );
    }

    // Normalisasi argumen package figma-mcp jika menunjuk ke @figma/mcp-server (404 npm)
    if (connectorInput.connectorId === "figma-mcp" && connectorInput.stdioConfig?.args) {
      connectorInput.stdioConfig.args = connectorInput.stdioConfig.args.map((a: string) =>
        a === "@figma/mcp-server" ? "figma-mcp" : a
      );
    }

    const saved = await saveMcpConnector({
      connectorId: connectorInput.connectorId,
      name: connectorInput.name,
      category: connectorInput.category || "custom",
      badgeType: connectorInput.badgeType || "MCP · Custom",
      description: connectorInput.description || "Custom Model Context Protocol Connector",
      enabled: connectorInput.enabled ?? true,
      installedOnDevice: connectorInput.installedOnDevice ?? true,
      transportType: connectorInput.transportType || "stdio",
      stdioConfig: connectorInput.stdioConfig,
      httpConfig: connectorInput.httpConfig,
      permissionMode: connectorInput.permissionMode || "write_with_approval",
      icon: connectorInput.icon,
    });

    return NextResponse.json(
      {
        success: true,
        connector: saved,
        message: `Konektor '${saved.name}' berhasil disimpan.`,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[API_MCP_CONNECTORS_POST_ERROR]", (err as Error).message);
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || "Terjadi kesalahan internal saat memproses konektor MCP.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mcp-connectors?id=...
 * Menghapus konektor kustom atau menonaktifkan konektor katalog bawaan.
 */
export async function DELETE(request: Request) {
  try {
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !id.trim()) {
      return NextResponse.json(
        { success: false, error: "Parameter 'id' wajib disertakan." },
        { status: 400 }
      );
    }

    const success = await deleteMcpConnector(id.trim());
    if (!success) {
      return NextResponse.json(
        { success: false, error: `Konektor dengan ID '${id}' tidak ditemukan.` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Konektor '${id}' berhasil dihapus atau dinonaktifkan.`,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[API_MCP_CONNECTORS_DELETE_ERROR]", (err as Error).message);
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || "Gagal menghapus konektor MCP.",
      },
      { status: 500 }
    );
  }
}
