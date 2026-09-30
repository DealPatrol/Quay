export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store } from "@/lib/store";

/** PATCH /api/referrals/[id] — { status: "paid" | "unpaid" }. Marks a commission paid/unpaid. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { status } = (await req.json()) as { status?: string };
  if (status !== "paid" && status !== "unpaid") {
    return NextResponse.json({ error: 'status must be "paid" or "unpaid".' }, { status: 400 });
  }
  const referrals = await store.referrals.all();
  const r = referrals.find((x) => x.id === params.id);
  if (!r) return NextResponse.json({ error: "Referral not found." }, { status: 404 });
  r.status = status;
  await store.referrals.save(referrals);
  return NextResponse.json(r);
}
