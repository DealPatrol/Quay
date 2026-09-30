export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { store, uid } from "@/lib/store";
import { finalizeOrder } from "@/lib/finalize";
import { getStripe, getCouponForCode, isLivePayments, siteUrl } from "@/lib/stripe";
import { evaluateDiscount } from "@/lib/discounts";
import { trackMetaEvent, metaRequestSignals, splitName } from "@/lib/meta";
import type { CartItemInput, Order } from "@/lib/types";

/**
 * POST /api/checkout
 * Body: { name, email, items: [{productId, bump}], discountCode?, eventId? }
 *
 * LIVE MODE (STRIPE_SECRET_KEY set): validates the cart, creates a PENDING
 * order, spins up a Stripe Checkout Session (line items incl. order bump,
 * discount code applied as a Stripe coupon), and returns { url } — the client
 * redirects the buyer to Stripe. Tokens are minted later by the webhook
 * (or /api/checkout/confirm) once payment succeeds.
 *
 * DEMO MODE (no STRIPE_SECRET_KEY): completes the order instantly with no
 * charge — tokens are minted immediately. A console warning makes this loud.
 *
 * SUBSCRIPTIONS: a cart containing recurring products must contain ONLY
 * recurring products with one interval; the Stripe session is created in
 * `subscription` mode (J: Stripe Tax applies when enabled in settings).
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, items, discountCode } = body as {
    name?: string;
    email?: string;
    items?: CartItemInput[];
    discountCode?: string;
    eventId?: string;
  };

  if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "A valid name and email are required." }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const products = await store.products.all();
  const settings = await store.settings.get();

  // Validate cart server-side (never trust client prices).
  const orderItems = [];
  const intervals = new Set<string>();
  let hasRecurring = false;
  let hasOnce = false;
  for (const it of items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p) return NextResponse.json({ error: `Unknown product: ${it.productId}` }, { status: 400 });
    const bumpPrice = it.bump && p.bump ? p.bump.price : 0;
    const recurring = p.billing === "recurring";
    if (recurring) {
      hasRecurring = true;
      intervals.add(p.recurringInterval || "month");
    } else {
      hasOnce = true;
    }
    orderItems.push({
      productId: p.id,
      productName: p.bump && it.bump ? `${p.name} + ${p.bump.name}` : p.name,
      price: p.price,
      bump: it.bump && !!p.bump,
      bumpPrice,
    });
  }
  if (hasRecurring && hasOnce) {
    return NextResponse.json(
      { error: "Subscriptions must be purchased on their own — please check out one-time items separately." },
      { status: 400 }
    );
  }
  if (intervals.size > 1) {
    return NextResponse.json(
      { error: "Subscriptions with different billing intervals must be purchased separately." },
      { status: 400 }
    );
  }
  const subInterval = hasRecurring ? (intervals.values().next().value as "month" | "year") : undefined;

  const subtotal = orderItems.reduce((s, it) => s + it.price + it.bumpPrice, 0);

  let discountAmount = 0;
  let appliedCode: string | undefined;
  if (discountCode) {
    const res = await evaluateDiscount(discountCode, subtotal);
    if (!res.ok) return NextResponse.json({ error: res.message }, { status: 400 });
    discountAmount = res.amount;
    appliedCode = discountCode.trim().toUpperCase();
  }
  const total = Math.round((subtotal - discountAmount) * 100) / 100;

  const orderId = uid("ord_");
  const referralCode = cookies().get("quay_ref")?.value || undefined;
  // A: one event id shared between the browser pixel and CAPI (dedup).
  const metaEventId = body.eventId || crypto.randomUUID();
  const order: Order = {
    id: orderId,
    email,
    name,
    items: orderItems,
    subtotal,
    discountCode: appliedCode,
    discountAmount,
    total,
    status: "pending",
    createdAt: new Date().toISOString(),
    tokens: [],
    referralCode,
    metaEventId,
    subscription: hasRecurring
      ? { status: "active", interval: subInterval! }
      : undefined,
  };
  const orders = await store.orders.all();
  orders.unshift(order);
  await store.orders.save(orders);

  // A: Meta CAPI InitiateCheckout (the pixel fires the same event with the
  // same eventId from the browser; Meta dedupes the pair).
  const sig = metaRequestSignals(req);
  const { fn, ln } = splitName(name);
  trackMetaEvent("InitiateCheckout", {
    eventId: metaEventId,
    userData: { em: email, fn, ln, ...sig },
    customData: {
      content_ids: orderItems.map((i) => i.productId),
      content_type: "product",
      value: total,
      currency: "USD",
      num_items: orderItems.length,
    },
  });

  const stripe = getStripe();
  if (!stripe) {
    // ---------------- DEMO MODE ----------------
    console.warn("[quay] STRIPE_SECRET_KEY is not set — DEMO checkout, no real charge. Set STRIPE_SECRET_KEY to take real payments.");
    if (order.subscription) {
      order.subscription.stripeSubscriptionId = `sub_demo_${orderId}`;
      // The order was already saved above — persist the demo subscription id.
      const all = await store.orders.all();
      const saved = all.find((o) => o.id === orderId);
      if (saved?.subscription) {
        saved.subscription.stripeSubscriptionId = order.subscription.stripeSubscriptionId;
        await store.orders.save(all);
      }
    }
    const done = await finalizeOrder(orderId);
    return NextResponse.json({ orderId, tokens: done?.tokens || [], total, live: false, metaEventId });
  }

  // ---------------- LIVE MODE: Stripe Checkout ----------------
  let couponId: string | undefined;
  if (appliedCode) {
    const d = (await store.discounts.all()).find((x) => x.code === appliedCode)!;
    const coupon = await getCouponForCode(stripe, d.code, d.type, d.value);
    couponId = coupon.id;
  }

  const base = siteUrl(req);
  let session;
  try {
    const lineItems = orderItems.map((it) => ({
      price_data: {
        currency: "usd",
        unit_amount: Math.round((it.price + it.bumpPrice) * 100),
        product_data: { name: it.productName },
        ...(hasRecurring ? { recurring: { interval: subInterval! } } : {}),
      },
      quantity: 1,
    }));
    session = await stripe.checkout.sessions.create({
      mode: hasRecurring ? "subscription" : "payment",
      customer_email: email,
      line_items: lineItems as any,
      discounts: couponId ? [{ coupon: couponId }] : [],
      ...(hasRecurring ? { subscription_data: { metadata: { orderId, customerName: name } } } : {}),
      // J: Stripe Tax — toggle in dashboard Settings.
      ...(settings.stripeTax ? { automatic_tax: { enabled: true } } : {}),
      metadata: { orderId, customerName: name },
      success_url: `${base}/success?order=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/checkout?canceled=1`,
    });
    // Capture the real subscription id once the session exists (webhook
    // re-syncs it on checkout.session.completed too).
    if (hasRecurring && session.subscription) {
      const all = await store.orders.all();
      const o = all.find((x) => x.id === orderId);
      if (o?.subscription) {
        o.subscription.stripeSubscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await store.orders.save(all);
      }
    }
  } catch (e: any) {
    console.error(`[quay] Stripe checkout session failed: ${e.message}`);
    return NextResponse.json(
      { error: "Couldn't start the Stripe checkout. Check your Stripe keys and try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ orderId, url: session.url, live: true, metaEventId });
}
