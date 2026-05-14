import { URL } from "url";

/**
 * List of private IP ranges and localhost addresses blocked to prevent SSRF.
 */
const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^fd[0-9a-f]{2}:/i,
];

/**
 * Validates and normalises a user-supplied URL.
 *
 * - Only allows http:// and https:// schemes.
 * - Blocks private/loopback IP ranges to prevent SSRF.
 * - Returns a canonical string form.
 *
 * @throws {Error} when the URL is invalid or blocked.
 */
export function sanitizeUrl(input: string): string {
  let parsed: URL;

  try {
    // Prepend scheme if missing
    const raw = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid URL: could not parse the supplied address.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid URL: only HTTP and HTTPS are allowed.");
  }

  const hostname = parsed.hostname;

  if (BLOCKED_HOSTS.some((re) => re.test(hostname))) {
    throw new Error(
      "Blocked URL: targeting private or loopback addresses is not permitted."
    );
  }

  // Remove default ports for cleaner comparisons
  parsed.port = "";

  // Strip trailing slash from origin so we have a canonical base
  return parsed.toString().replace(/\/$/, "");
}

/**
 * Returns whether `target` belongs to the same origin as `base`.
 */
export function isSameOrigin(base: string, target: string): boolean {
  try {
    const b = new URL(base);
    const t = new URL(target);
    return b.origin === t.origin;
  } catch {
    return false;
  }
}

/**
 * Resolves a potentially relative URL against a base URL.
 * Returns null if the result is not a valid absolute URL.
 */
export function resolveUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/**
 * Strips query strings and fragments for deduplication purposes.
 */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/**
 * Extracts the display domain from a URL (e.g. "example.com").
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
