export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/session";
import { store } from "@/lib/store";

/**
 * GET /api/checkout/abandon/list — all abandoned carts (dashboard).
 * Admin-authenticated (same gate as the dashboard middleware).
 */
export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)quay_admin=([^;]*)/);
  const authed =
    (m && (await verifyAdminSession(decodeURIComponent(m[1])))) ||
    (!process.env.ADMIN_PASSWORD_HASH && /(?:^|;\s*)quay_demo=/.test(cookie));
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await store.abandoned.all());
}
