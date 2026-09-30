export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store } from "@/lib/store";

/** GET /api/referrals[?affiliateId=] — list referrals (newest first). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const affiliateId = searchParams.get("affiliateId");
  let referrals = await store.referrals.all();
  if (affiliateId) referrals = referrals.filter((r) => r.affiliateId === affiliateId);
  return NextResponse.json(referrals);
}
