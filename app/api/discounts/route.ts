export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store, uid } from "@/lib/store";
import type { Discount } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await store.discounts.all());
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.code || !body.type || typeof body.value !== "number") {
    return NextResponse.json({ error: "code, type, and numeric value are required" }, { status: 400 });
  }
  const discounts = await store.discounts.all();
  if (discounts.some((d) => d.code.toLowerCase() === String(body.code).toLowerCase())) {
    return NextResponse.json({ error: "code already exists" }, { status: 400 });
  }
  const d: Discount = {
    id: uid("dsc_"),
    code: String(body.code).toUpperCase(),
    type: body.type === "fixed" ? "fixed" : "percent",
    value: body.value,
    minOrder: body.minOrder,
    maxUses: body.maxUses,
    usedCount: 0,
    active: body.active !== false,
  };
  discounts.push(d);
  await store.discounts.save(discounts);
  return NextResponse.json(d, { status: 201 });
}
