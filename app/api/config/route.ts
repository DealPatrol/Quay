export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { isLivePayments } from "@/lib/stripe";
import { store } from "@/lib/store";

/** GET /api/config — public runtime config for the storefront (e.g. demo vs live payments). */
export async function GET() {
  const s = await store.settings.get();
  return NextResponse.json({
    live: isLivePayments(),
    authMode: process.env.ADMIN_PASSWORD_HASH ? "password" : "demo",
    storeName: s.storeName,
    tagline: s.tagline,
    // A: Meta tracking status (booleans only — no secrets leak).
    pixel: !!(process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID),
    capi: !!(
      (process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID) &&
      process.env.META_CAPI_TOKEN
    ),
  });
}
