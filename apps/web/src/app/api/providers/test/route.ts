import { NextResponse } from "next/server";
import { checkCsrf, csrfForbiddenResponse } from "../../../../lib/csrf";
import { loadRawProvidersData } from "../../../../lib/providers-store";

/**
 * POST /api/providers/test
 * Menguji koneksi ke endpoint URL OpenAI-compatible / LLM server
 * serta melakukan auto-discovery daftar model yang tersedia (/v1/models).
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

    const endpointUrl = typeof body.endpointUrl === "string" ? body.endpointUrl.trim() : "";
    if (!endpointUrl) {
      return NextResponse.json(
        { success: false, error: "URL endpoint wajib diisi." },
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

    // Normalisasi URL endpoint target
    const cleanBaseUrl = endpointUrl.replace(/\/+$/, "");
    const candidateUrls: string[] = [];

    if (cleanBaseUrl.endsWith("/v1")) {
      candidateUrls.push(`${cleanBaseUrl}/models`);
    } else {
      candidateUrls.push(`${cleanBaseUrl}/v1/models`);
      candidateUrls.push(`${cleanBaseUrl}/models`);
    }
    candidateUrls.push(cleanBaseUrl);

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (effectiveApiKey) {
      headers["Authorization"] = `Bearer ${effectiveApiKey}`;
    }

    const startTime = Date.now();
    let discoveredModels: string[] = [];
    let isConnected = false;
    let lastError = "Gagal terhubung ke endpoint.";
    let responseStatus = 0;

    for (const testUrl of candidateUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(testUrl, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        responseStatus = res.status;

        if (res.ok) {
          isConnected = true;
          const json = await res.json().catch(() => null);
          if (json && typeof json === "object") {
            if (Array.isArray(json.data)) {
              discoveredModels = json.data
                .map((m: { id?: string; name?: string }) => m.id || m.name || "")
                .filter((id: string) => id.length > 0);
            } else if (Array.isArray(json.models)) {
              discoveredModels = json.models
                .map((m: { id?: string; name?: string }) => m.name || m.id || "")
                .filter((id: string) => id.length > 0);
            }
          }
          break;
        } else if (res.status === 401 || res.status === 403) {
          lastError = "Autentikasi ditolak (HTTP 401/403). Periksa API Key Anda.";
          break;
        }
      } catch (err: unknown) {
        lastError = (err as Error).name === "AbortError"
          ? "Waktu tunggu habis (Timeout > 6 detik)."
          : (err as Error).message;
      }
    }

    const latencyMs = Date.now() - startTime;

    if (isConnected) {
      return NextResponse.json({
        success: true,
        status: "connected",
        latencyMs,
        models: discoveredModels,
        message: `Koneksi berhasil (${latencyMs}ms)${
          discoveredModels.length > 0 ? ` • Ditemukan ${discoveredModels.length} model` : ""
        }`,
      });
    }

    return NextResponse.json(
      {
        success: false,
        status: "failed",
        latencyMs,
        responseStatus,
        models: [],
        error: lastError,
      },
      { status: 200 } // Kembalikan 200 agar UI dapat menampilkan badge status gagal secara elegan
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
