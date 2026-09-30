export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store, uid } from "@/lib/store";
import type { AbandonedCart } from "@/lib/types";

/**
 * POST /api/checkout/abandon — snapshot an in-progress checkout.
 * Body: { name?, email, items: [{ productId, bump }] }
 *
 * Called from the checkout page once the buyer types a valid email.
 * Upserts by email (latest cart wins); recovered carts are left alone.
 * Public and never throws — tracking must never break the shop.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, items } = body as {
      name?: string;
      email?: string;
      items?: { productId: string; bump?: boolean }[];
    };
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "valid email required" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, error: "empty cart" }, { status: 400 });
    }

    const products = await store.products.all();
    const snap = [];
    for (const it of items) {
      const p = products.find((x) => x.id === it.productId);
      if (!p) continue;
      const bumpPrice = it.bump && p.bump ? p.bump.price : 0;
      snap.push({
        productId: p.id,
        productName: p.bump && it.bump ? `${p.name} + ${p.bump.name}` : p.name,
        price: p.price,
        bump: !!(it.bump && p.bump),
        bumpPrice,
      });
    }
    if (snap.length === 0) {
      return NextResponse.json({ ok: false, error: "no valid products" }, { status: 400 });
    }
    const total = Math.round(snap.reduce((s, i) => s + i.price + i.bumpPrice, 0) * 100) / 100;

    const all = await store.abandoned.all();
    const now = new Date().toISOString();
    const existing = all.find(
      (c) => !c.recoveredOrderId && c.email.toLowerCase() === email.toLowerCase()
    );
    let cart: AbandonedCart;
    if (existing) {
      existing.name = name || existing.name;
      existing.items = snap;
      existing.total = total;
      existing.updatedAt = now;
      // A fresh cart snapshot resets the reminder state — the buyer is back.
      existing.remindedAt = undefined;
      cart = existing;
    } else {
      cart = {
        id: uid("aban_"),
        email,
        name,
        items: snap,
        total,
        createdAt: now,
        updatedAt: now,
      };
      all.unshift(cart);
    }
    await store.abandoned.save(all);
    return NextResponse.json({ ok: true, id: cart.id });
  } catch (e: any) {
    console.warn("[quay] /api/checkout/abandon failed (non-fatal):", e?.message || e);
    return NextResponse.json({ ok: true });
  }
}
