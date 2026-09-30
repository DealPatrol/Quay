import { verifyAdminSession } from "@/lib/session";

/**
 * Shared admin gate for dashboard API routes.
 *
 * PASSWORD MODE (ADMIN_PASSWORD_HASH set): requires a valid `quay_admin`
 * httpOnly session cookie (HMAC-signed with QUAY_SECRET), issued by
 * POST /api/auth/login.
 *
 * DEMO MODE (no hash): accepts the `quay_demo` cookie — same behavior as
 * the dashboard middleware, so local dev keeps working.
 */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)quay_admin=([^;]*)/);
  return !!(
    (m && (await verifyAdminSession(decodeURIComponent(m[1])))) ||
    (!process.env.ADMIN_PASSWORD_HASH && /(?:^|;\s*)quay_demo=/.test(cookie))
  );
}
