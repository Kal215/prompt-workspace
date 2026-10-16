import { NextResponse } from "next/server";
import {
  listProviderCapabilities,
  listCatalogProviders,
  getGlobalProviderHealthTracker,
} from "@prompt-workspace/provider-adapters";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import {
  getSanitizedProvidersConfig,
  saveCloudProviderKey,
  deleteCloudProviderKey,
  saveCustomEndpoint,
  deleteCustomEndpoint,
  setActiveCustomEndpoint,
} from "../../../lib/providers-store";
import { checkCsrf, csrfForbiddenResponse } from "../../../lib/csrf";

// Pastikan environment variables ter-load di server Next.js
if (!process.env.GROQ_API_KEY_1) {
  const rootEnv = path.resolve(process.cwd(), "../../.env");
  const localEnv = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
  } else if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
  }
}

/**
 * GET /api/providers
 * Mengembalikan kapabilitas provider inti (groq, gemini, openrouter, ollama)
 * serta konfigurasi custom endpoints dan status masking API key cloud.
 */
export async function GET() {
  try {
    const capabilities = listProviderCapabilities();
    const catalogProviders = listCatalogProviders(process.env);
    const config = getSanitizedProvidersConfig();
    const localModels = ["llama3.2", "qwen2.5-coder", "mistral", "minicpm-v", "deepseek-r1:14b"];

    const healthTracker = getGlobalProviderHealthTracker();
    const healthReport = healthTracker.getHealthReport();

    const activeEndpoint = config.customEndpoints.find(
      (e) => e.id === config.activeEndpointId || e.isActive
    );

    const cascadeChain = [
      ...(activeEndpoint
        ? [{ id: activeEndpoint.id, name: activeEndpoint.name, type: "custom" as const }]
        : []),
      { id: "groq", name: "Groq LPU", type: "cloud" as const, defaultModel: "llama-3.3-70b-versatile" },
      { id: "gemini", name: "Google Gemini", type: "cloud" as const, defaultModel: "gemini-2.5-flash" },
      { id: "openrouter", name: "OpenRouter", type: "cloud" as const, defaultModel: "meta-llama/llama-3.3-70b-instruct" },
      { id: "ollama", name: "Local Ollama", type: "local" as const, defaultModel: "llama3.2" },
    ];

    return NextResponse.json(
      {
        success: true,
        providers: capabilities,
        catalogProviders,
        customEndpoints: config.customEndpoints,
        cloudKeys: config.cloudKeys,
        activeEndpointId: config.activeEndpointId,
        localModels,
        health: healthReport,
        cascadeChain,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("[API_PROVIDERS_GET_ERROR]", (err as Error).message);
    return NextResponse.json(
      {
        success: false,
        error: "Gagal mengambil daftar kapabilitas provider.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/providers
 * Mengelola penambahan, pembaruan, dan aktivasi custom endpoints & API keys.
 */
export async function POST(request: Request) {
  try {
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Payload JSON tidak valid." },
        { status: 400 }
      );
    }

    const action = body.action || "save-endpoint";

    if (action === "save-cloud-key") {
      const { providerId, apiKey } = body;
      if (!providerId || typeof providerId !== "string") {
        return NextResponse.json(
          { success: false, error: "Parameter providerId wajib disertakan." },
          { status: 400 }
        );
      }
      const res = saveCloudProviderKey(providerId, typeof apiKey === "string" ? apiKey : "");
      return NextResponse.json({ success: res.success, message: res.message });
    }

    if (action === "delete-cloud-key") {
      const { providerId } = body;
      if (!providerId || typeof providerId !== "string") {
        return NextResponse.json(
          { success: false, error: "Parameter providerId wajib disertakan." },
          { status: 400 }
        );
      }
      const res = deleteCloudProviderKey(providerId);
      return NextResponse.json({ success: res.success, message: res.message });
    }

    if (action === "use-endpoint") {
      const { id } = body;
      if (!id || typeof id !== "string") {
        return NextResponse.json(
          { success: false, error: "ID endpoint wajib disertakan." },
          { status: 400 }
        );
      }
      const res = setActiveCustomEndpoint(id);
      return NextResponse.json({
        success: res.success,
        activeEndpointId: res.activeEndpointId,
        message: `Endpoint ${id} kini aktif digunakan.`,
      });
    }

    if (action === "delete-endpoint") {
      const { id } = body;
      if (!id || typeof id !== "string") {
        return NextResponse.json(
          { success: false, error: "ID endpoint wajib disertakan." },
          { status: 400 }
        );
      }
      const res = deleteCustomEndpoint(id);
      return NextResponse.json({ success: res.success, message: res.message });
    }

    // Default: save-endpoint
    const endpointData = body.endpoint || body;
    if (!endpointData.name || !endpointData.endpointUrl) {
      return NextResponse.json(
        { success: false, error: "Nama dan URL endpoint wajib diisi." },
        { status: 400 }
      );
    }

    const saveRes = saveCustomEndpoint(endpointData);
    const updatedConfig = getSanitizedProvidersConfig();

    return NextResponse.json({
      success: true,
      endpoint: saveRes.endpoint,
      activeEndpointId: saveRes.activeEndpointId,
      customEndpoints: updatedConfig.customEndpoints,
      message: "Custom endpoint berhasil disimpan.",
    });
  } catch (err: unknown) {
    console.error("[API_PROVIDERS_POST_ERROR]", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Gagal memproses konfigurasi provider." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/providers
 * Memperbarui data custom endpoint.
 */
export async function PUT(request: Request) {
  try {
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Payload JSON tidak valid." },
        { status: 400 }
      );
    }

    const endpointData = body.endpoint || body;
    if (!endpointData.name || !endpointData.endpointUrl) {
      return NextResponse.json(
        { success: false, error: "Nama dan URL endpoint wajib diisi." },
        { status: 400 }
      );
    }

    const saveRes = saveCustomEndpoint(endpointData);
    const updatedConfig = getSanitizedProvidersConfig();

    return NextResponse.json({
      success: true,
      endpoint: saveRes.endpoint,
      activeEndpointId: saveRes.activeEndpointId,
      customEndpoints: updatedConfig.customEndpoints,
      message: "Custom endpoint berhasil diperbarui.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/providers
 * Menghapus endpoint atau cloud key.
 */
export async function DELETE(request: Request) {
  try {
    const csrf = checkCsrf(request);
    if (!csrf.allowed) {
      return csrfForbiddenResponse(csrf.reason || "CSRF validation failed.");
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const providerId = url.searchParams.get("providerId");

    if (id) {
      const res = deleteCustomEndpoint(id);
      return NextResponse.json(res);
    }

    if (providerId) {
      const res = deleteCloudProviderKey(providerId);
      return NextResponse.json(res);
    }

    const body = await request.json().catch(() => null);
    if (body?.id) {
      const res = deleteCustomEndpoint(body.id);
      return NextResponse.json(res);
    }
    if (body?.providerId) {
      const res = deleteCloudProviderKey(body.providerId);
      return NextResponse.json(res);
    }

    return NextResponse.json(
      { success: false, error: "Parameter ID atau providerId tidak ditemukan." },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
