import { store, uid } from "./store";
import { mintToken } from "./tokens";
import { siteUrl } from "./stripe";
import { sendOrderReceipt } from "./email";
import { makeLicenseKey } from "./licenses";
import { trackMetaEvent, splitName } from "./meta";
import type { Order } from "./types";

/**
 * Finalize an order: mark paid, mint HMAC download tokens, record download
 * limits, increment discount usage, bump product sales counts, record any
 * affiliate referral, and email the buyer their receipt + download links.
 *
 * IDEMPOTENT — safe to call from both the Stripe webhook and the
 * /api/checkout/confirm endpoint (whichever lands first wins).
 *
 * Works against the JSON or Postgres adapter (see lib/store.ts).
 */
export async function finalizeOrder(orderId: string): Promise<Order | null> {
  const orders = await store.orders.all();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;
  if (order.status === "paid" && order.tokens.length > 0) return order; // already done

  const settings = await store.settings.get();
  const expiresAt = Date.now() + settings.linkExpiryHours * 3600 * 1000;

  const products = await store.products.all();

  const downloads = await store.downloads.all();
  const tokens: string[] = [];
  for (const it of order.items) {
    const token = mintToken(orderId, it.productId, expiresAt);
    tokens.push(token);
    downloads[token] = {
      orderId,
      productId: it.productId,
      expiresAt,
      maxDownloads: settings.downloadLimit,
      used: 0,
      createdAt: Date.now(),
    };
    // D: mint a license key per unit of license-gated products (idempotent —
    // finalizeOrder is safe to call twice, we only mint when none exists).
    const p = products.find((x) => x.id === it.productId);
    if (p?.requiresLicense && !it.licenseKey) {
      it.licenseKey = makeLicenseKey();
    }
  }
  await store.downloads.save(downloads);

  if (order.discountCode) {
    const discounts = await store.discounts.all();
    const d = discounts.find((x) => x.code === order.discountCode);
    if (d) {
      d.usedCount += 1;
      await store.discounts.save(discounts);
    }
  }

  for (const it of order.items) {
    const p = products.find((x) => x.id === it.productId);
    if (p) p.salesCount += 1;
  }
  await store.products.save(products);

  // Affiliate referral: commission = order total × affiliate's % (or the
  // store default). Recorded once per order (guarded for idempotency).
  if (order.referralCode) {
    const affiliates = await store.affiliates.all();
    const aff = affiliates.find(
      (a) => a.code.toLowerCase() === order.referralCode!.toLowerCase()
    );
    if (aff) {
      const pct = aff.commissionPct ?? settings.defaultCommissionPct;
      const referrals = await store.referrals.all();
      if (!referrals.some((r) => r.orderId === order.id)) {
        referrals.unshift({
          id: uid("ref_"),
          affiliateId: aff.id,
          orderId: order.id,
          amount: Math.round(order.total * pct) / 100,
          status: "unpaid",
          createdAt: new Date().toISOString(),
        });
        await store.referrals.save(referrals);
      }
    }
  }

  order.status = "paid";
  order.tokens = tokens;
  await store.orders.save(orders);

  // F: mark any matching abandoned cart as recovered so it stops being nagged.
  try {
    const abandoned = await store.abandoned.all();
    let changed = false;
    for (const c of abandoned) {
      if (
        !c.recoveredOrderId &&
        c.email.toLowerCase() === order.email.toLowerCase()
      ) {
        c.recoveredOrderId = order.id;
        c.updatedAt = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) await store.abandoned.save(abandoned);
  } catch (e: any) {
    console.warn("[quay] abandoned-cart recovery marking failed (non-fatal):", e?.message || e);
  }

  // Receipt email — must NEVER break checkout; sendOrderReceipt catches everything.
  const base = siteUrl();
  const links = order.items.map((it, i) => ({
    name: it.productName,
    url: `${base}/d/${tokens[i]}`,
  }));
  await sendOrderReceipt(order, links, settings);

  // A: Meta CAPI Purchase — same event_id the success page fires on the
  // pixel, so Meta dedupes the pair. Never throws (trackMetaEvent catches).
  const { fn, ln } = splitName(order.name);
  trackMetaEvent("Purchase", {
    eventId: order.metaEventId || uid("evt_"),
    userData: { em: order.email, fn, ln },
    customData: {
      content_ids: order.items.map((i) => i.productId),
      content_type: "product",
      value: order.total,
      currency: "USD",
      num_items: order.items.length,
      order_id: order.id,
    },
  });

  return order;
}
