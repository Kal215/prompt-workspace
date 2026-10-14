/**
 * CSRF Protection — Validasi Origin/Referer + Content-Type enforcement
 *
 * Strategi berlapis:
 * 1. Content-Type enforcement: Semua request mutasi WAJIB Content-Type: application/json.
 *    HTML form default mengirim application/x-www-form-urlencoded, sehingga serangan
 *    form-based CSRF akan tertolak.
 * 2. Origin/Referer validation: Memeriksa bahwa request berasal dari domain yang diizinkan.
 *    Mencegah request lintas situs dari tab/iframe asing.
 * 3. SameSite cookie: Session cookie di-set SameSite=Lax, mencegah browser mengirim
 *    cookie pada cross-origin POST request.
 *
 * Catatan:
 * - Preflight CORS pada Content-Type: application/json sudah menjadi perlindungan inheren
 *   karena browser akan mengirim OPTIONS terlebih dahulu.
 * - Untuk deployment multi-domain, tambahkan ALLOWED_ORIGINS ke env var.
 */
import { NextResponse } from "next/server";

/**
 * Mendapatkan daftar origin yang diizinkan.
 * Sumber: env var ALLOWED_ORIGINS (comma-separated) atau default dari host request.
 */
function getAllowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();

  // 1. Dari env var
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    envOrigins.split(",").forEach((o) => {
      const trimmed = o.trim();
      if (trimmed) origins.add(trimmed);
    });
  }

  // 2. Dari request URL sendiri (self-origin)
  try {
    const url = new URL(request.url);
    origins.add(url.origin);
  } catch {
    // URL tidak valid, skip
  }

  // 3. Dari Host header request (self-origin fallback)
  try {
    const host = request.headers.get("host");
    if (host) {
      const proto = request.headers.get("x-forwarded-proto") || "http";
      origins.add(`${proto}://${host}`);
    }
  } catch {
    // skip
  }

  // 4. Default loopback origins untuk testing / dev lokal
  origins.add("http://localhost:3000");
  origins.add("http://localhost:3124");
  origins.add("http://127.0.0.1:3000");
  origins.add("http://127.0.0.1:3124");

  return origins;
}

export interface CsrfCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Memeriksa proteksi CSRF pada request mutasi.
 * Dipanggil pada handler POST, DELETE, PUT, PATCH.
 *
 * @param request - Request object dari Next.js
 * @returns CsrfCheckResult dengan status allowed dan alasan penolakan
 */
export function checkCsrf(request: Request): CsrfCheckResult {
  const method = request.method.toUpperCase();

  // GET/HEAD/OPTIONS tidak membutuhkan CSRF check
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { allowed: true };
  }

  // 1. Content-Type enforcement
  const contentType = request.headers.get("content-type");
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    if (!contentType || !contentType.includes("application/json")) {
      return {
        allowed: false,
        reason: "Content-Type harus application/json untuk request mutasi.",
      };
    }
  }

  // 2. Origin validation
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowedOrigins = getAllowedOrigins(request);

  // Cek Origin header terlebih dahulu (lebih reliabel)
  if (origin) {
    if (allowedOrigins.has(origin)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Request dari origin yang tidak diizinkan.",
    };
  }

  // Fallback ke Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (allowedOrigins.has(refererUrl.origin)) {
        return { allowed: true };
      }
    } catch {
      // Referer tidak valid
    }
    return {
      allowed: false,
      reason: "Request dari referer yang tidak diizinkan.",
    };
  }

  // 3. Tidak ada Origin atau Referer header pada request mutasi:
  // Terapkan Fail-Closed: Tolak dengan 403 Forbidden secara default.
  // Request mutasi wajib menyertakan header Origin atau Referer yang valid.
  return {
    allowed: false,
    reason:
      "Request mutasi wajib menyertakan header Origin atau Referer yang valid.",
  };
}

/**
 * Membuat respons HTTP 403 Forbidden standar untuk penolakan CSRF.
 */
export function csrfForbiddenResponse(reason: string): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: "Forbidden: " + reason,
    },
    { status: 403 }
  );
}
