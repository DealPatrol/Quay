export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { finalizeOrder } from "@/lib/finalize";
import { store } from "@/lib/store";

/**
 * POST /api/checkout/confirm
 * Body: { orderId, sessionId }
 *
 * Belt-and-suspenders finalization for the success page: retrieves the Stripe
 * Checkout Session directly and finalizes the order when payment succeeded.
 * Idempotent — safe to call even if the webhook already finalized the order.
 */
export async function POST(req: Request) {
  const { orderId, sessionId } = await req.json();
  if (!orderId || !sessionId) {
    return NextResponse.json({ error: "orderId and sessionId are required." }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.orderId !== orderId) {
    return NextResponse.json({ error: "Session does not match this order." }, { status: 400 });
  }
  if (session.payment_status !== "paid") {
    return NextResponse.json({ error: "Payment not completed yet.", paymentStatus: session.payment_status }, { status: 402 });
  }

  const order = await finalizeOrder(orderId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const downloads = await store.downloads.all();
  const products = await store.products.all();
  const delivery = order.items.map((it) => {
    const token = order.tokens.find((t) => downloads[t]?.productId === it.productId);
    const rec = token ? downloads[token] : undefined;
    const product = products.find((p) => p.id === it.productId);
    return { ...it, token, productSlug: product?.slug, cover: product?.cover, expiresAt: rec?.expiresAt, maxDownloads: rec?.maxDownloads, used: rec?.used ?? 0 };
  });

  return NextResponse.json({ ...order, delivery });
}
