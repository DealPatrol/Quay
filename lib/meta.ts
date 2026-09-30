/**
 * Meta Conversions API (server-side) + config helpers.
 *
 * Setup: paste your Pixel ID into NEXT_PUBLIC_META_PIXEL_ID (browser pixel)
 * and generate an access token in Events Manager → Data sources → your pixel
 * → Settings → "Generate access token" → META_CAPI_TOKEN.
 * META_TEST_EVENT_CODE is optional — set it while testing and events appear
 * in Events Manager → Test events instead of polluting live data.
 *
 * Every event carries a shared `event_id` (generated once per user action and
 * passed to both the browser pixel and CAPI) so Meta dedupes the pair.
 * This function NEVER throws — tracking must never break a sale.
 */
import crypto from "node:crypto";

export function getPixelId(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_META_PIXEL_ID ||
    process.env.META_PIXEL_ID ||
    undefined
  );
}

export function isPixelConfigured(): boolean {
  return !!getPixelId();
}

export function isCapiConfigured(): boolean {
  return !!getPixelId() && !!process.env.META_CAPI_TOKEN;
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

const norm = (s?: string) => (s || "").trim().toLowerCase();
const digits = (s?: string) => (s || "").replace(/\D/g, "");

export interface MetaUserData {
  em?: string; // email
  ph?: string; // phone
  fn?: string; // first name
  ln?: string; // last name
  ct?: string; // city
  st?: string; // state/province
  zp?: string; // zip/postal
  country?: string; // 2-letter country code
  client_ip?: string; // NOT hashed
  client_ua?: string; // NOT hashed
  fbc?: string; // NOT hashed — _fbc click cookie
  fbp?: string; // NOT hashed — _fbp browser cookie
}

export interface TrackMetaEventOpts {
  eventId: string;
  userData?: MetaUserData;
  customData?: Record<string, unknown>;
  eventSourceUrl?: string;
}

/** SHA256-hash the PII fields per Meta's spec; pass through the technical ones. */
export function hashUserData(u: MetaUserData = {}): Record<string, string> {
  const out: Record<string, string> = {};
  if (u.em) out.em = sha256(norm(u.em));
  if (u.ph) out.ph = sha256(digits(u.ph));
  if (u.fn) out.fn = sha256(norm(u.fn));
  if (u.ln) out.ln = sha256(norm(u.ln));
  if (u.ct) out.ct = sha256(norm(u.ct));
  if (u.st) out.st = sha256(norm(u.st));
  if (u.zp) out.zp = sha256(norm(u.zp));
  if (u.country) out.country = sha256(norm(u.country));
  if (u.client_ip) out.client_ip_address = u.client_ip;
  if (u.client_ua) out.client_user_agent = u.client_ua;
  if (u.fbc) out.fbc = u.fbc;
  if (u.fbp) out.fbp = u.fbp;
  return out;
}

/**
 * Send one server-side event to the Conversions API.
 * Skips silently when the pixel id or token is missing; catches everything.
 */
export async function trackMetaEvent(
  name: string,
  opts: TrackMetaEventOpts
): Promise<void> {
  try {
    const pixel = getPixelId();
    const token = process.env.META_CAPI_TOKEN;
    if (!pixel || !token) return; // not configured — nothing to do

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: opts.eventId,
          action_source: "website",
          user_data: hashUserData(opts.userData),
          custom_data: opts.customData || {},
        },
      ],
    };
    if (opts.eventSourceUrl) {
      (payload.data as any[])[0].event_source_url = opts.eventSourceUrl;
    }
    const testCode = process.env.META_TEST_EVENT_CODE;
    if (testCode) payload.test_event_code = testCode;

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[quay] Meta CAPI ${name} rejected (${res.status}): ${text.slice(0, 200)}`);
    }
  } catch (e: any) {
    console.warn(`[quay] Meta CAPI ${name} failed (non-fatal):`, e?.message || e);
  }
}

/** Extract the Meta-relevant request signals (IP, UA, _fbc/_fbp cookies). */
export function metaRequestSignals(req: Request): {
  client_ip?: string;
  client_ua?: string;
  fbc?: string;
  fbp?: string;
} {
  const out: { client_ip?: string; client_ua?: string; fbc?: string; fbp?: string } = {};
  const fwd = req.headers.get("x-forwarded-for");
  out.client_ip = (fwd ? fwd.split(",")[0] : "").trim() || undefined;
  out.client_ua = req.headers.get("user-agent") || undefined;
  const cookie = req.headers.get("cookie") || "";
  const get = (n: string) => {
    const m = cookie.match(new RegExp(`(?:^|;\\s*)${n}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : undefined;
  };
  out.fbc = get("_fbc");
  out.fbp = get("_fbp");
  return out;
}

/** Split "Ada Lovelace" → {fn, ln} for CAPI user_data. */
export function splitName(name?: string): { fn?: string; ln?: string } {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { fn: parts[0] };
  return { fn: parts[0], ln: parts[parts.length - 1] };
}
