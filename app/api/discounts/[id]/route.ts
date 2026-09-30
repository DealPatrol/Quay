export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const discounts = await store.discounts.all();
  const i = discounts.findIndex((d) => d.id === params.id);
  if (i === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  discounts[i] = { ...discounts[i], ...body, id: discounts[i].id, code: String(body.code || discounts[i].code).toUpperCase() };
  await store.discounts.save(discounts);
  return NextResponse.json(discounts[i]);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await store.discounts.save((await store.discounts.all()).filter((d) => d.id !== params.id));
  return NextResponse.json({ ok: true });
}
