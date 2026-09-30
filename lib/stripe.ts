import Stripe from "stripe";

let client: Stripe | null = null;

/** Returns a Stripe client when STRIPE_SECRET_KEY is set, otherwise null (demo mode). */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    client = new Stripe(key);
  }
  return client;
}

/** True when real payments are possible. */
export function isLivePayments(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/** Public base URL for building absolute success/cancel URLs. */
export function siteUrl(req?: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (req) return new URL(req.url).origin;
  return "http://localhost:3000";
}

/**
 * Retrieve-or-create a one-time Stripe coupon mirroring a Quay discount code.
 * Coupon ids are namespaced (`quay_<code>`) so repeat checkouts reuse them.
 */
export async function getCouponForCode(
  stripe: Stripe,
  code: string,
  type: "percent" | "fixed",
  value: number
): Promise<Stripe.Coupon> {
  const id = `quay_${code.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  try {
    return await stripe.coupons.retrieve(id);
  } catch {
    // not found — create it below
  }
  if (type === "percent") {
    return await stripe.coupons.create({ id, percent_off: value, duration: "once", name: `Quay code ${code}` });
  }
  return await stripe.coupons.create({
    id,
    amount_off: Math.round(value * 100),
    currency: "usd",
    duration: "once",
    name: `Quay code ${code}`,
  });
}
