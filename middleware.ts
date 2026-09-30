import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAdminSession } from "./lib/session";

/**
 * Dashboard auth gate.
 *
 * PASSWORD MODE (ADMIN_PASSWORD_HASH set): requires a valid `quay_admin`
 * httpOnly session cookie (HMAC-signed with QUAY_SECRET, 7-day expiry),
 * issued by POST /api/auth/login.
 *
 * DEMO MODE (no hash): falls back to the old any-email `quay_demo` gate,
 * with a visible "demo auth" sticker in the dashboard. Set
 * ADMIN_PASSWORD_HASH before going live:
 *   node scripts/make-admin-hash.mjs "your-password"
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/login")) {
    const admin = req.cookies.get("quay_admin")?.value;
    if (admin && (await verifyAdminSession(admin))) {
      return NextResponse.next();
    }
    if (!process.env.ADMIN_PASSWORD_HASH && req.cookies.get("quay_demo")) {
      return NextResponse.next(); // demo fallback
    }
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
