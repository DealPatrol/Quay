export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdminRequest } from "@/lib/admin-auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const products = await store.products.all();
  const i = products.findIndex((p) => p.id === params.id);
  if (i === -1) return NextResponse.json({ error: "not found" }, { status: 404 });
  products[i] = { ...products[i], ...body, id: products[i].id };
  await store.products.save(products);
  return NextResponse.json(products[i]);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const products = (await store.products.all()).filter((p) => p.id !== params.id);
  await store.products.save(products);
  return NextResponse.json({ ok: true });
}
