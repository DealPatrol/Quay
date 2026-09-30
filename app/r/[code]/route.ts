export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { REFERRAL_COOKIE, REFERRAL_TTL_SECONDS } from "@/lib/affiliates";

/**
 * GET /r/[code] — affiliate referral link.
 * Sets a 30-day `quay_ref` cookie and redirects to the shop. Unknown codes
 * still redirect to /shop (without setting the cookie).
 */
export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const code = params.code || "";
  const affiliates = await store.affiliates.all();
  const aff = affiliates.find((a) => a.code.toLowerCase() === code.toLowerCase());

  const res = NextResponse.redirect(new URL("/shop", _req.url), 302);
  if (aff) {
    res.cookies.set(REFERRAL_COOKIE, aff.code, {
      path: "/",
      maxAge: REFERRAL_TTL_SECONDS,
      sameSite: "lax",
    });
  }
  return res;
}
