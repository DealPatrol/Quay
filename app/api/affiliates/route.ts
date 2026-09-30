export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store, uid } from "@/lib/store";
import type { Affiliate } from "@/lib/types";

/** GET /api/affiliates — list all affiliates (newest first). */
export async function GET() {
  return NextResponse.json(await store.affiliates.all());
}

function makeCode(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${slug || "partner"}-${rand}`;
}

/**
 * POST /api/affiliates — { name, email, commissionPct? }
 * Creates an affiliate with an auto-generated referral code.
 * The shareable link is: <site>/r/<code>
 */
export async function POST(req: Request) {
  const { name, email, commissionPct } = (await req.json()) as {
    name?: string;
    email?: string;
    commissionPct?: number;
  };
  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "A name and valid email are required." }, { status: 400 });
  }
  const settings = await store.settings.get();
  const affiliates = await store.affiliates.all();
  if (affiliates.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "An affiliate with that email already exists." }, { status: 409 });
  }
  let code = makeCode(name);
  while (affiliates.some((a) => a.code === code)) code = makeCode(name);

  const pct =
    commissionPct === undefined || commissionPct === null
      ? settings.defaultCommissionPct
      : Math.min(100, Math.max(0, Number(commissionPct)));

  const aff: Affiliate = {
    id: uid("aff_"),
    name,
    email,
    code,
    commissionPct: pct,
    createdAt: new Date().toISOString(),
  };
  affiliates.unshift(aff);
  await store.affiliates.save(affiliates);
  return NextResponse.json(aff, { status: 201 });
}
