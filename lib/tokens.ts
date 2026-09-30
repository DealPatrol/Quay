import crypto from "node:crypto";

function secret(): string {
  const s = process.env.QUAY_SECRET;
  if (!s) {
    console.warn(
      "[quay] QUAY_SECRET is not set — using an insecure dev fallback. Set QUAY_SECRET in production."
    );
    return "quay-dev-secret-change-me";
  }
  return s;
}

const b64url = {
  encode: (buf: Buffer) =>
    buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  decode: (s: string) =>
    Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
};

/**
 * Mint a download token for one product in an order.
 * Token format: base64url("orderId:productId:expiresAt").hexHmac
 * The signature is HMAC-SHA256 over the payload, so tokens can't be forged.
 */
export function mintToken(
  orderId: string,
  productId: string,
  expiresAtMs: number
): string {
  const payload = `${orderId}:${productId}:${expiresAtMs}`;
  const sig = crypto
    .createHmac("sha256", secret())
    .update(payload, "utf8")
    .digest("hex");
  return `${b64url.encode(Buffer.from(payload, "utf8"))}.${sig}`;
}

export interface TokenPayload {
  orderId: string;
  productId: string;
  expiresAt: number;
}

/** Parse + verify the HMAC signature. Returns null when forged/malformed. */
export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  let payload: string;
  try {
    payload = b64url.decode(parts[0]).toString("utf8");
  } catch {
    return null;
  }
  const expected = crypto
    .createHmac("sha256", secret())
    .update(payload, "utf8")
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(parts[1], "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [orderId, productId, exp] = payload.split(":");
  const expiresAt = Number(exp);
  if (!orderId || !productId || !Number.isFinite(expiresAt)) return null;
  return { orderId, productId, expiresAt };
}

export type TokenStatus =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: "invalid" | "expired" };

/** Verify signature and check expiry. Download-count checks happen in the route. */
export function checkToken(token: string, now = Date.now()): TokenStatus {
  const payload = verifyToken(token);
  if (!payload) return { ok: false, reason: "invalid" };
  if (payload.expiresAt <= now) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}
