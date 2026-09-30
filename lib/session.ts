/**
 * Admin session tokens: HMAC-SHA256 signed, 7-day expiry.
 *
 * Implemented ONLY on Web Crypto (`crypto.subtle`) + btoa/atob so the same
 * module runs in the edge middleware AND in Node API routes — no node:crypto,
 * no Buffer, no extra deps.
 *
 * Token format: base64url("email:expiresAtMs").hexHmac
 * Cookie name: `quay_admin` (httpOnly, set by /api/auth/login).
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function sessionSecret(): string {
  const s = process.env.QUAY_SECRET;
  if (!s) {
    // Matches lib/tokens.ts dev fallback so sessions work out of the box.
    return "quay-dev-secret-change-me";
  }
  return s;
}

async function hmacHex(key: string, data: string): Promise<string> {
  const ck = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", ck, enc.encode(data));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

/** Constant-time string comparison (edge-safe, no timingSafeEqual). */
function constEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const SESSION_COOKIE = "quay_admin";
export const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

/** Mint a signed session token for an admin email. */
export async function createAdminSession(email: string): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = b64urlEncode(enc.encode(`${email}:${exp}`));
  const sig = await hmacHex(sessionSecret(), payload);
  return `${payload}.${sig}`;
}

/** Verify a session token. Returns the admin email, or null when invalid/expired. */
export async function verifyAdminSession(token: string): Promise<string | null> {
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacHex(sessionSecret(), payload);
  if (!constEq(expected, sig)) return null;
  let raw: string;
  try {
    raw = dec.decode(b64urlDecode(payload));
  } catch {
    return null;
  }
  const i = raw.lastIndexOf(":");
  const email = raw.slice(0, i);
  const exp = Number(raw.slice(i + 1));
  if (!email || !Number.isFinite(exp) || exp <= Date.now()) return null;
  return email;
}
