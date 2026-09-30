export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { evaluateDiscount } from "@/lib/discounts";

export async function POST(req: Request) {
  const { code, subtotal } = await req.json();
  if (!code || typeof subtotal !== "number") {
    return NextResponse.json({ ok: false, amount: 0, message: "Code and subtotal are required." }, { status: 400 });
  }
  return NextResponse.json(await evaluateDiscount(code, subtotal));
}
