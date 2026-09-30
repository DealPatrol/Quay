export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store } from "@/lib/store";

/** GET /api/orders/[id] — order + per-token delivery info for the success page. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const order = (await store.orders.all()).find((o) => o.id === params.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const downloads = await store.downloads.all();
  const products = await store.products.all();
  const items = order.items.map((it) => {
    const token = order.tokens.find((t) => downloads[t]?.productId === it.productId);
    const rec = token ? downloads[token] : undefined;
    const product = products.find((p) => p.id === it.productId);
    return {
      ...it,
      token,
      productSlug: product?.slug,
      cover: product?.cover,
      expiresAt: rec?.expiresAt,
      maxDownloads: rec?.maxDownloads,
      used: rec?.used ?? 0,
    };
  });

  return NextResponse.json({ ...order, delivery: items });
}

/** PATCH /api/orders/[id] — e.g. { status: "refunded" } to issue a refund. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const orders = await store.orders.all();
  const order = orders.find((o) => o.id === params.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (body.status === "refunded" || body.status === "paid") {
    order.status = body.status;
    await store.orders.save(orders);
  }
  // STRIPE-READY: call stripe.refunds.create({ payment_intent }) here for real refunds.
  return NextResponse.json(order);
}
