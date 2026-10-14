/**
 * Session Identity Module — Signed HttpOnly Session Cookie & Bearer Token
 *
 * Menggunakan Web standard Request & Response headers:
 * - Tidak bergantung pada next/headers sehingga kompatibel 100% dengan Next.js App Router
 *   dan unit test runner (node:test).
 * - Format cookie / token: <userId>.<timestamp>.<hmacSignature>
 * - Jika tidak ada cookie atau token dikirim, session di-generate secara otomatis.
 */

import crypto from "crypto";

export const SESSION_COOKIE_NAME = "piw_session";

// Secret untuk HMAC signing: gunakan SESSION_SECRET dari env atau server default stabil
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    if (!secret || secret.trim().length < 32) {
      throw new Error(
        "CRITICAL_SECURITY_ERROR: SESSION_SECRET wajib disetel di environment produksi dengan panjang minimal 32 karakter."
      );
    }
    return secret.trim();
  }
  return secret || "prompt-workspace-piw-session-internal-hmac-secret-v1";
}

/**
 * Interface data sesi pengguna
 */
export interface SessionData {
  userId: string;
  createdAt: number;
  isNew: boolean;
  token: string;
  cookieHeaderValue: string;
}

/**
 * Membuat token bertanda tangan HMAC-SHA256 untuk userId tertentu.
 */
export function signSession(userId: string, timestamp: number = Date.now()): string {
  const payload = `${userId}.${timestamp}`;
  const hmac = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${hmac}`;
}

/**
 * Memverifikasi validitas token sesi.
 */
export function verifySessionToken(token: string): {
  valid: boolean;
  userId?: string;
  createdAt?: number;
} {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false };
    }

    const [userId, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    if (!userId || isNaN(timestamp) || !signature) {
      return { valid: false };
    }

    const expectedPayload = `${userId}.${timestampStr}`;
    const expectedHmac = crypto
      .createHmac("sha256", getSessionSecret())
      .update(expectedPayload)
      .digest("hex");

    // Timing-safe comparison untuk mencegah timing attack
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedHmac);
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return { valid: false };
    }

    return { valid: true, userId, createdAt: timestamp };
  } catch {
    return { valid: false };
  }
}

/**
 * Mengekstrak raw token sesi dari cookie header atau Authorization header.
 */
export function extractSessionToken(request?: Request): string | null {
  if (!request) return null;

  // 1. Cek Authorization: Bearer <token>
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  // 2. Cek x-session-id: <token>
  const xSessionHeader = request.headers.get("x-session-id");
  if (xSessionHeader && xSessionHeader.trim()) {
    return xSessionHeader.trim();
  }

  // 3. Cek Cookie header
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    for (const cookie of cookies) {
      const [name, ...val] = cookie.split("=");
      if (name === SESSION_COOKIE_NAME) {
        return val.join("=");
      }
    }
  }

  return null;
}

/**
 * Membentuk string Set-Cookie HttpOnly standar.
 */
export function formatSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 24 * 365; // 1 tahun
  const secureFlag = isProd ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secureFlag}`;
}

/**
 * Mendapatkan sesi aktif atau membuat sesi baru jika tidak ada.
 */
export function getOrCreateSession(request?: Request): SessionData {
  const rawToken = extractSessionToken(request);

  if (rawToken) {
    const verification = verifySessionToken(rawToken);
    if (verification.valid && verification.userId && verification.createdAt) {
      return {
        userId: verification.userId,
        createdAt: verification.createdAt,
        isNew: false,
        token: rawToken,
        cookieHeaderValue: formatSessionCookie(rawToken),
      };
    }
  }

  // Generate sesi baru
  const newUserId = `usr_${crypto.randomUUID()}`;
  const now = Date.now();
  const newToken = signSession(newUserId, now);

  return {
    userId: newUserId,
    createdAt: now,
    isNew: true,
    token: newToken,
    cookieHeaderValue: formatSessionCookie(newToken),
  };
}

/**
 * Memverifikasi sesi secara ketat. Jika tidak ada sesi valid, mengembalikan null.
 */
export function getAuthenticatedSession(request?: Request): SessionData | null {
  const rawToken = extractSessionToken(request);
  if (!rawToken) return null;

  const verification = verifySessionToken(rawToken);
  if (!verification.valid || !verification.userId || !verification.createdAt) {
    return null;
  }

  return {
    userId: verification.userId,
    createdAt: verification.createdAt,
    isNew: false,
    token: rawToken,
    cookieHeaderValue: formatSessionCookie(rawToken),
  };
}

export interface SessionResolution {
  status: "authenticated" | "anonymous" | "invalid";
  session?: SessionData;
  error?: string;
}

/**
 * Menyelesaikan status sesi dari Request:
 * - 'authenticated': Cookie/Bearer valid terverifikasi.
 * - 'anonymous': Tidak ada cookie atau token.
 * - 'invalid': Token dikirim namun signature palsu / rusak.
 */
export function resolveSession(request?: Request): SessionResolution {
  const rawToken = extractSessionToken(request);
  if (!rawToken) {
    return { status: "anonymous" };
  }

  const verification = verifySessionToken(rawToken);
  if (!verification.valid || !verification.userId || !verification.createdAt) {
    return {
      status: "invalid",
      error: "Token sesi tidak valid atau tanda tangan HMAC telah dimanipulasi.",
    };
  }

  return {
    status: "authenticated",
    session: {
      userId: verification.userId,
      createdAt: verification.createdAt,
      isNew: false,
      token: rawToken,
      cookieHeaderValue: formatSessionCookie(rawToken),
    },
  };
}
