import { NextResponse } from "next/server";
import { checkCsrf, csrfForbiddenResponse } from "../../../../lib/csrf";
import { loadRawProvidersData } from "../../../../lib/providers-store";
import {
  testProviderConnection,
  discoverEndpointModels,
} from "@prompt-workspace/provider-adapters";

/**
 * POST /api/providers/test
 * Memanggil testProviderConnection dan discoverEndpointModels dari @prompt-workspace/provider-adapters
 * untuk menguji koneksi secara real-time dan mengambil daftar model otomatis dari /v1/models.
 *
 * Mengembalikan: { ok, latencyMs, detectedApiMode, discoveredModels, message }
 * serta fallback kompatibilitas { success, status, models }.
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
        { ok: false, success: false, error: "Payload JSON tidak valid." },
        { status: 400 }
      );
    }

    const endpointUrl = typeof body.endpointUrl === "string" ? body.endpointUrl.trim() : "";
    if (!endpointUrl) {
      return NextResponse.json(
        { ok: false, success: false, error: "URL endpoint wajib diisi." },
        { status: 400 }
      );
    }

    // Ambil apiKey yang di-input atau dari store jika sedang edit endpoint yang ada
    let effectiveApiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    if (!effectiveApiKey && typeof body.endpointId === "string") {
      const rawData = loadRawProvidersData();
      const existing = rawData.customEndpoints.find((e) => e.id === body.endpointId);
      if (existing?.apiKey) {
        effectiveApiKey = existing.apiKey;
      }
    }

    const apiModeParam = body.apiMode;
    const modelParam = typeof body.model === "string" ? body.model : undefined;
    const providerIdParam = typeof body.providerId === "string" ? body.providerId : undefined;

    // Normalisasi API mode ke enum ProviderApiMode
    let apiModeNormalized: any = "auto_detect";
    if (apiModeParam === "Chat Completions" || apiModeParam === "chat_completions") {
      apiModeNormalized = "chat_completions";
    } else if (apiModeParam === "Responses API" || apiModeParam === "responses_api") {
      apiModeNormalized = "responses_api";
    } else if (apiModeParam === "Anthropic Messages" || apiModeParam === "anthropic_messages") {
      apiModeNormalized = "anthropic_messages";
    }

    const testRes = await testProviderConnection({
      endpointUrl,
      apiKey: effectiveApiKey,
      apiMode: apiModeNormalized,
      model: modelParam,
      providerId: providerIdParam,
    });

    let models = testRes.discoveredModels || [];
    // Jika discoverModels diminta eksplisit dan daftar kosong, coba panggil discoverEndpointModels
    if (body.discoverModels && models.length === 0) {
      try {
        models = await discoverEndpointModels(endpointUrl, effectiveApiKey);
      } catch {}
    }

    return NextResponse.json(
      {
        ok: testRes.ok,
        success: testRes.ok,
        status: testRes.ok ? "connected" : "failed",
        latencyMs: testRes.latencyMs,
        detectedApiMode: testRes.detectedApiMode,
        discoveredModels: models,
        models,
        message: testRes.message,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const errorMsg = (err as Error).message || "Terjadi kesalahan internal saat menguji provider.";
    return NextResponse.json(
      {
        ok: false,
        success: false,
        status: "failed",
        latencyMs: 0,
        detectedApiMode: "chat_completions",
        discoveredModels: [],
        models: [],
        error: errorMsg,
        message: errorMsg,
      },
      { status: 200 }
    );
  }
}
