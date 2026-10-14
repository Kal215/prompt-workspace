import dns from "node:dns/promises";
import net from "node:net";

export class CrawlerSecurityError extends Error {
  public code: string;
  constructor(message: string, code: string = "SSRF_BLOCKED") {
    super(message);
    this.name = "CrawlerSecurityError";
    this.code = code;
  }
}

/**
 * P0 Allowlist Domain Sesuai ADR-002 Lampiran B.1
 */
export const ALLOWED_DOMAINS = [
  "raw.githubusercontent.com",
  "github.com",
] as const;

/**
 * Normalisasi URL GitHub blob menjadi direct raw content URL.
 * Contoh: https://github.com/owner/repo/blob/main/prompt.md -> https://raw.githubusercontent.com/owner/repo/main/prompt.md
 */
export function normalizeTargetUrl(rawUrl: string): { normalizedUrl: string; wasConverted: boolean } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.toLowerCase() === "github.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      // Format: /<owner>/<repo>/blob/<branch>/<...path>
      if (parts.length >= 4 && parts[2] === "blob") {
        const owner = parts[0];
        const repo = parts[1];
        const branchAndPath = parts.slice(3).join("/");
        return {
          normalizedUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branchAndPath}`,
          wasConverted: true,
        };
      }
    }
    return { normalizedUrl: rawUrl, wasConverted: false };
  } catch {
    return { normalizedUrl: rawUrl, wasConverted: false };
  }
}

/**
 * Validasi ketat format URL target (P0):
 * - Wajib skema HTTPS
 * - Port hanya default (tanpa port) atau 443
 * - Tanpa username / password credentials
 * - Panjang maksimal 2048 karakter
 * - Hostname harus ada di ALLOWED_DOMAINS
 */
export function validateTargetUrl(rawUrl: string): URL {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new CrawlerSecurityError("targetUrl must be a non-empty string", "INVALID_URL");
  }

  if (rawUrl.length > 2048) {
    throw new CrawlerSecurityError("targetUrl exceeds maximum length of 2048 characters", "URL_TOO_LONG");
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (err: unknown) {
    throw new CrawlerSecurityError(`Invalid URL format: ${(err as Error).message}`, "MALFORMED_URL");
  }

  if (parsed.protocol !== "https:") {
    throw new CrawlerSecurityError(`Only https: scheme is permitted, got "${parsed.protocol}"`, "DISALLOWED_PROTOCOL");
  }

  if (parsed.username || parsed.password) {
    throw new CrawlerSecurityError("Embedding credentials (username:password@) is forbidden", "CREDENTIALS_FORBIDDEN");
  }

  if (parsed.port && parsed.port !== "443") {
    throw new CrawlerSecurityError(`Disallowed port "${parsed.port}", only port 443 is permitted`, "DISALLOWED_PORT");
  }

  const hostname = parsed.hostname.toLowerCase();

  // Hostname tidak boleh berupa IP literal
  if (net.isIP(hostname)) {
    throw new CrawlerSecurityError(`Direct IP literals are forbidden: ${hostname}`, "IP_LITERAL_FORBIDDEN");
  }

  const isAllowed = ALLOWED_DOMAINS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );

  if (!isAllowed) {
    throw new CrawlerSecurityError(
      `Domain "${hostname}" is not in the allowed list: [${ALLOWED_DOMAINS.join(", ")}]`,
      "DOMAIN_NOT_ALLOWED"
    );
  }

  return parsed;
}

/**
 * Konversi IPv4 string ke representasi unsigned 32-bit integer.
 */
function ipv4ToInt(ip: string): number {
  const octets = ip.split(".").map((n) => parseInt(n, 10));
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
    throw new CrawlerSecurityError(`Invalid IPv4 address: ${ip}`, "INVALID_IP");
  }
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

/**
 * Deteksi apakah sebuah alamat IP adalah IP Private, Loopback, Link-Local, atau Reserved.
 * Mencakup IPv4, IPv6, dan IPv4-mapped IPv6.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!net.isIP(ip)) {
    return true; // Alamat tidak valid dianggap tidak aman (fail-closed)
  }

  // Tangani IPv4-mapped IPv6 (misal ::ffff:127.0.0.1)
  const lowerIp = ip.toLowerCase();
  if (lowerIp.startsWith("::ffff:")) {
    const extractedIpv4 = lowerIp.slice(7);
    if (net.isIPv4(extractedIpv4)) {
      return isPrivateOrReservedIp(extractedIpv4);
    }
  }

  // IPv4 Evaluation
  if (net.isIPv4(ip)) {
    const ipInt = ipv4ToInt(ip);

    // Helper rentang CIDR
    const inRange = (prefix: string, bits: number): boolean => {
      const prefixInt = ipv4ToInt(prefix);
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (ipInt & mask) === (prefixInt & mask);
    };

    // 0.0.0.0/8 (Current network)
    if (inRange("0.0.0.0", 8)) return true;

    // 10.0.0.0/8 (Private-Use RFC 1918)
    if (inRange("10.0.0.0", 8)) return true;

    // 100.64.0.0/10 (Shared Address Space / CGNAT RFC 6598)
    if (inRange("100.64.0.0", 10)) return true;

    // 127.0.0.0/8 (Loopback)
    if (inRange("127.0.0.0", 8)) return true;

    // 169.254.0.0/16 (Link Local / Cloud Metadata 169.254.169.254)
    if (inRange("169.254.0.0", 16)) return true;

    // 172.16.0.0/12 (Private-Use RFC 1918)
    if (inRange("172.16.0.0", 12)) return true;

    // 192.168.0.0/16 (Private-Use RFC 1918)
    if (inRange("192.168.0.0", 16)) return true;

    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (inRange("192.0.0.0", 24)) return true;

    // 192.0.2.0/24 (TEST-NET-1)
    if (inRange("192.0.2.0", 24)) return true;

    // 198.51.100.0/24 (TEST-NET-2)
    if (inRange("198.51.100.0", 24)) return true;

    // 203.0.113.0/24 (TEST-NET-3)
    if (inRange("203.0.113.0", 24)) return true;

    // 224.0.0.0/4 (Multicast RFC 5771)
    if (inRange("224.0.0.0", 4)) return true;

    // 240.0.0.0/4 (Reserved RFC 1112)
    if (inRange("240.0.0.0", 4)) return true;

    // 255.255.255.255/32 (Limited Broadcast)
    if (ip === "255.255.255.255") return true;

    return false;
  }

  // IPv6 Evaluation
  if (net.isIPv6(ip)) {
    // ::1 (Loopback)
    if (lowerIp === "::1" || lowerIp === "0:0:0:0:0:0:0:1") return true;

    // :: (Unspecified)
    if (lowerIp === "::" || lowerIp === "0:0:0:0:0:0:0:0") return true;

    // fc00::/7 (Unique Local Address)
    if (lowerIp.startsWith("fc") || lowerIp.startsWith("fd")) return true;

    // fe80::/10 (Link-Local)
    if (
      lowerIp.startsWith("fe80:") ||
      lowerIp.startsWith("fe9") ||
      lowerIp.startsWith("fea") ||
      lowerIp.startsWith("feb")
    ) {
      return true;
    }

    // ff00::/8 (Multicast)
    if (lowerIp.startsWith("ff")) return true;

    return false;
  }

  return true;
}

/**
 * Melakukan verifikasi DNS host sebelum koneksi dibuka untuk mencegah TOCTOU DNS Rebinding.
 * Seluruh record IP yang dikembalikan oleh DNS server harus merupakan IP publik yang valid.
 */
export async function verifyHostDnsSafe(hostname: string): Promise<string[]> {
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new CrawlerSecurityError(`DNS resolution returned no records for host: ${hostname}`, "DNS_EMPTY");
    }

    for (const record of addresses) {
      if (isPrivateOrReservedIp(record.address)) {
        throw new CrawlerSecurityError(
          `Security Alert: Host "${hostname}" resolves to private/reserved IP: ${record.address}`,
          "DNS_RESOLVES_TO_PRIVATE_IP"
        );
      }
    }

    return addresses.map((a) => a.address);
  } catch (err: unknown) {
    if (err instanceof CrawlerSecurityError) {
      throw err;
    }
    throw new CrawlerSecurityError(
      `DNS lookup failed for host "${hostname}": ${(err as Error).message}`,
      "DNS_LOOKUP_FAILED"
    );
  }
}
