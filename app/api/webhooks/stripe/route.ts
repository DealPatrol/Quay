export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { finalizeOrder } from "@/lib/finalize";
import { store } from "@/lib/store";

/**
 * POST /api/webhooks/stripe
 *
 * Verifies the Stripe signature with STRIPE_WEBHOOK_SECRET (returns 400 on a
 * bad signature). On `checkout.session.completed`, finalizes the order:
 * marks it paid and mints the HMAC download tokens.
 *
 * Without STRIPE_WEBHOOK_SECRET this runs in demo mode and just acknowledges.
 *
 * Stripe Dashboard setup: Developers → Webhooks → Add endpoint →
 *   https://<your-domain>/api/webhooks/stripe
 * Select events: `checkout.session.completed`, `invoice.payment_succeeded`,
 * `customer.subscription.deleted` (and `charge.refunded` if you want
 * automatic refund handling). Copy the Signing secret → STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();

  if (!secret || !stripe) {
    console.log("[quay] stripe webhook received (demo mode — signature not verified, set STRIPE_WEBHOOK_SECRET)");
    return NextResponse.json({ received: true, mode: "demo" });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.warn("[quay] webhook rejected: missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    console.warn(`[quay] webhook rejected: bad signature — ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const orderId = session.metadata?.orderId;
      if (!orderId) {
        console.warn("[quay] checkout.session.completed without orderId metadata");
        break;
      }
      if (session.payment_status !== "paid") {
        console.log(`[quay] session ${session.id} completed but payment_status=${session.payment_status} — not finalizing`);
        break;
      }
      const order = await finalizeOrder(orderId);
      // E: keep the real Stripe subscription id on the order (for renewals).
      if (session.subscription && order?.subscription) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        if (order.subscription.stripeSubscriptionId !== subId) {
          const orders = await store.orders.all();
          const o = orders.find((x) => x.id === orderId);
          if (o?.subscription) {
            o.subscription.stripeSubscriptionId = subId;
            o.subscription.status = "active";
            await store.orders.save(orders);
          }
        }
      }
      console.log(`[quay] order ${orderId} finalized via webhook (${order?.total} paid)`);
      break;
    }
    case "charge.refunded": {
      // Optional: map the charge back to an order via metadata and mark refunded.
      console.log(`[quay] charge.refunded received — handle manually or extend this case to auto-mark orders refunded`);
      break;
    }
    // E: subscriptions — renew download access on each successful renewal,
    // mark the order's subscription cancelled when Stripe ends it.
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as any;
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (!subId) break;
      let orderId: string | undefined;
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        orderId = (sub.metadata as any)?.orderId;
      } catch (e: any) {
        console.warn(`[quay] could not retrieve subscription ${subId}: ${e.message}`);
        break;
      }
      if (!orderId) {
        console.warn(`[quay] invoice.payment_succeeded for subscription ${subId} without orderId metadata`);
        break;
      }
      const orders = await store.orders.all();
      const order = orders.find((o) => o.id === orderId);
      if (!order?.subscription) break;
      if (order.subscription.status === "canceled") break; // no renewal on a cancelled sub
      // Skip the very first invoice — finalizeOrder (via checkout.session.completed)
      // already minted the initial access.
      if (!order.tokens.length) {
        console.log(`[quay] first invoice for order ${orderId} — initial access handled by checkout.session.completed`);
        break;
      }
      const settings = await store.settings.get();
      const intervalMs = order.subscription.interval === "year" ? 365 * 86400000 : 30 * 86400000;
      const downloads = await store.downloads.all();
      for (const t of order.tokens) {
        const rec = downloads[t];
        if (rec) {
          rec.used = 0; // fresh download credits for the new billing period
          rec.expiresAt = Date.now() + Math.max(intervalMs, settings.linkExpiryHours * 3600000);
        }
      }
      await store.downloads.save(downloads);
      order.subscription.status = "active";
      order.subscription.currentPeriodEnd = new Date(Date.now() + intervalMs).toISOString();
      await store.orders.save(orders);
      console.log(`[quay] subscription ${subId} renewed — order ${orderId} access extended`);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as any;
      const orderId = (sub.metadata as any)?.orderId;
      if (!orderId) break;
      const orders = await store.orders.all();
      const order = orders.find((o) => o.id === orderId);
      if (order?.subscription) {
        order.subscription.status = "canceled";
        await store.orders.save(orders);
        console.log(`[quay] subscription for order ${orderId} cancelled`);
      }
      break;
    }
    default:
      console.log(`[quay] webhook event ignored: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
