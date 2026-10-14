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
function getAllowedOrigins(requestUrl: string): Set<string> {
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
    const url = new URL(requestUrl);
    origins.add(url.origin);
  } catch {
    // URL tidak valid, skip
  }

  // 3. Development fallback
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:3124");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://127.0.0.1:3124");
  }

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
  const allowedOrigins = getAllowedOrigins(request.url);

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

  // Tidak ada Origin atau Referer header:
  // Ini bisa terjadi pada request programmatic (curl, Postman, server-to-server).
  // Pada MVP, kita izinkan request tanpa origin header untuk kompatibilitas testing
  // dan penggunaan API langsung, tetapi catat sebagai risiko.
  // Untuk hardening produksi: ubah ke { allowed: false } dan tambahkan API token auth.
  return { allowed: true };
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
