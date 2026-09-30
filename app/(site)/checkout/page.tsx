"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/lib/types";
import { getCart, setCart, clearCart } from "@/lib/cart";
import { CoverArt } from "../../components";
import { money } from "@/lib/fmt";
import { trackPixel, metaEventId } from "@/lib/meta-browser";

interface Line {
  product: Product;
  bump: boolean;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<section className="section"><div className="wrap"><div className="display" style={{ fontSize: 32, fontWeight: 900 }}>Loading checkout…</div></div></section>}>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"loading" | "live" | "demo">("loading");
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<{ amount: number; message: string } | null>(null);
  const [discountErr, setDiscountErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const abandonSent = useRef("");

  const canceled = params.get("canceled") === "1";
  const restoreId = params.get("restore");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setMode(c.live ? "live" : "demo"))
      .catch(() => setMode("demo"));
    fetch("/api/products")
      .then((r) => r.json())
      .then((ps: Product[]) => {
        setProducts(ps);
        const cart = getCart();
        setLines(
          cart
            .map((l) => ({ product: ps.find((p) => p.id === l.productId)!, bump: l.bump }))
            .filter((l) => l.product)
        );
      });
  }, []);

  // Abandoned-cart restore: ?restore=<cartId> from a reminder email.
  useEffect(() => {
    if (!restoreId || products.length === 0) return;
    fetch(`/api/checkout/abandon/${encodeURIComponent(restoreId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (!c || !Array.isArray(c.items) || c.items.length === 0) return;
        const valid = c.items.filter((l: any) => products.some((p) => p.id === l.productId));
        if (valid.length === 0) return;
        setCart(valid.map((l: any) => ({ productId: l.productId, bump: l.bump })));
        setLines(
          valid
            .map((l: any) => ({ product: products.find((p) => p.id === l.productId)!, bump: l.bump }))
            .filter((l: any) => l.product)
        );
        if (c.email) setEmail(c.email);
        if (c.name) setName(c.name);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreId, products.length]);

  // Abandoned-cart capture: once the buyer types a valid email, snapshot the
  // cart server-side (debounced; only re-sends when the cart/email changes).
  useEffect(() => {
    if (!/^\S+@\S+\.\S+$/.test(email) || lines.length === 0) return;
    const sig = `${email}|${lines.map((l) => `${l.product.id}:${l.bump}`).join(",")}`;
    if (abandonSent.current === sig) return;
    const t = setTimeout(() => {
      abandonSent.current = sig;
      fetch("/api/checkout/abandon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          items: lines.map((l) => ({ productId: l.product.id, bump: l.bump })),
        }),
      }).catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, lines]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.product.price + (l.bump && l.product.bump ? l.product.bump.price : 0), 0),
    [lines]
  );
  const total = Math.max(0, subtotal - (discount?.amount || 0));

  function removeLine(id: string) {
    const next = lines.filter((l) => l.product.id !== id);
    setLines(next);
    setCart(next.map((l) => ({ productId: l.product.id, bump: l.bump })));
    setDiscount(null);
  }

  async function applyCode() {
    setDiscountErr("");
    setDiscount(null);
    const res = await fetch("/api/discounts/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal }),
    });
    const data = await res.json();
    if (data.ok) setDiscount({ amount: data.amount, message: data.message });
    else setDiscountErr(data.message);
  }

  async function pay() {
    setErr("");
    setBusy(true);
    // Meta: InitiateCheckout on the pixel + the same event to CAPI for dedup.
    const eid = metaEventId();
    trackPixel(
      "InitiateCheckout",
      {
        content_ids: lines.map((l) => l.product.id),
        content_type: "product",
        value: total,
        currency: "USD",
        num_items: lines.length,
      },
      eid
    );
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          items: lines.map((l) => ({ productId: l.product.id, bump: l.bump })),
          discountCode: discount ? code.trim().toUpperCase() : undefined,
          eventId: eid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed.");
      if (data.url) {
        // LIVE MODE — hand off to Stripe's hosted checkout.
        window.location.href = data.url;
        return;
      }
      // DEMO MODE — order completed instantly, no charge.
      clearCart();
      router.push(`/success?order=${data.orderId}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }

  if (products.length > 0 && lines.length === 0) {
    return (
      <section className="section">
        <div className="wrap" style={{ textAlign: "center", maxWidth: 520 }}>
          <div className="display" style={{ fontSize: 52, fontWeight: 900 }}>Your cart is empty.</div>
          <p style={{ opacity: 0.65, margin: "16px 0 28px" }}>Beautiful digital goods await. Go fill it up.</p>
          <Link href="/shop" className="btn btn-primary">Browse the shop →</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section" style={{ paddingTop: 56 }}>
      <div className="wrap">
        <p className="kicker"><span className="tick">✦</span> Checkout</p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          <h1 className="display" style={{ fontSize: "clamp(40px, 5vw, 68px)", fontWeight: 900 }}>
            Almost yours<span style={{ color: "var(--orange)" }}>.</span>
          </h1>
          {mode === "demo" && <span className="sticker" style={{ fontSize: 11 }}>demo mode — no real charge</span>}
          {mode === "live" && <span className="sticker green" style={{ fontSize: 11 }}>live — secured by stripe</span>}
        </div>

        {canceled && (
          <div className="card" style={{ marginBottom: 24, borderColor: "#a32c00", background: "#fff5f2" }}>
            <strong>Payment canceled.</strong> Your cart is intact — no charge was made. Try again when ready.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40 }} className="co-grid">
          {/* order summary */}
          <div>
            <div className="card" style={{ padding: "8px 24px", marginBottom: 24 }}>
              {lines.map((l) => (
                <div key={l.product.id} style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: "1px dashed rgba(20,18,16,.25)", alignItems: "center" }}>
                  <div style={{ width: 64, flexShrink: 0 }} className="cover-thumb">
                    <CoverArt cover={l.product.cover} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{l.product.name}</div>
                    {l.bump && l.product.bump && (
                      <div style={{ fontSize: 13, color: "var(--orange-deep)", fontWeight: 700 }}>
                        ⚡ + {l.product.bump.name} (${l.product.bump.price})
                      </div>
                    )}
                  </div>
                  <div className="display" style={{ fontWeight: 900, fontSize: 20 }}>
                    {money(l.product.price + (l.bump && l.product.bump ? l.product.bump.price : 0))}
                  </div>
                  <button className="mini-btn" onClick={() => removeLine(l.product.id)}>✕</button>
                </div>
              ))}
            </div>

            {/* discount */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="field">
                <label>Discount code</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input className="input" placeholder="Try WELCOME10" value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())} style={{ textTransform: "uppercase" }} />
                  <button className="btn" onClick={applyCode} disabled={!code}>Apply</button>
                </div>
              </div>
              {discount && <p style={{ color: "var(--green)", fontWeight: 700, margin: "12px 0 0" }}>✓ {discount.message}</p>}
              {discountErr && <p style={{ color: "#a32c00", fontWeight: 700, margin: "12px 0 0" }}>{discountErr}</p>}
              <p style={{ fontSize: 12, opacity: 0.55, margin: "10px 0 0" }}>
                Demo codes: WELCOME10 (10% off) · BUNDLE20 (20% off $30+) · FLASH50 (50% off, limited uses)
              </p>
            </div>

            {/* totals */}
            <div className="ticket">
              <div className="leader-row light"><span style={{ opacity: 0.7 }}>Subtotal</span><span className="leader-dots" /><strong>{money(subtotal)}</strong></div>
              {discount && (
                <div className="leader-row light" style={{ marginTop: 8 }}>
                  <span style={{ opacity: 0.7 }}>Discount ({code})</span><span className="leader-dots" />
                  <strong style={{ color: "var(--gold)" }}>−{money(discount.amount)}</strong>
                </div>
              )}
              <div className="leader-row light" style={{ marginTop: 8 }}><span style={{ opacity: 0.7 }}>Delivery</span><span className="leader-dots" /><strong>Instant ⚡</strong></div>
              <div className="perf" />
              <div className="leader-row light" style={{ fontSize: 20 }}>
                <span className="display" style={{ fontWeight: 900 }}>Total</span><span className="leader-dots" />
                <span className="display" style={{ fontWeight: 900, fontSize: 34 }}>{money(total)}</span>
              </div>
            </div>
          </div>

          {/* payment form */}
          <div>
            <div className="card">
              <h2 className="display" style={{ fontSize: 26, fontWeight: 900, marginBottom: 20 }}>Your details</h2>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Full name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
              </div>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Email — download links go here</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" />
              </div>

              <h2 className="display" style={{ fontSize: 26, fontWeight: 900, margin: "28px 0 6px" }}>Payment</h2>
              {mode === "live" ? (
                <div className="card" style={{ background: "#eef4ff", borderColor: "var(--green)", boxShadow: "none", padding: 18, marginTop: 12 }}>
                  <strong>🔒 Secured by Stripe.</strong>
                  <p style={{ fontSize: 14, margin: "8px 0 0", opacity: 0.75 }}>
                    Clicking pay takes you to Stripe&apos;s hosted checkout to enter your card safely.
                    Quay never sees or stores card numbers.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13, background: "var(--gold)", border: "2px solid var(--ink)", borderRadius: 10, padding: "10px 14px", fontWeight: 700 }}>
                    ★ Demo mode — no real charge. Card fields are decorative until Stripe is connected.
                  </p>
                  <div className="field" style={{ marginBottom: 16, marginTop: 16 }}>
                    <label>Card number</label>
                    <input className="input" defaultValue="4242 4242 4242 4242" inputMode="numeric" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                    <div className="field"><label>Expiry</label><input className="input" defaultValue="12/28" /></div>
                    <div className="field"><label>CVC</label><input className="input" defaultValue="123" inputMode="numeric" /></div>
                  </div>
                </>
              )}

              {err && <p style={{ color: "#a32c00", fontWeight: 700 }}>{err}</p>}
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", fontSize: 18, padding: 18, marginTop: 16 }}
                onClick={pay} disabled={busy || lines.length === 0 || mode === "loading"}>
                {busy ? "Processing…" : mode === "live" ? `Pay ${money(total)} with Stripe →` : `Pay ${money(total)} →`}
              </button>
              <p style={{ fontSize: 12, opacity: 0.55, textAlign: "center", marginTop: 12 }}>
                Secure checkout · Instant delivery · Links expire in 72h
              </p>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 860px){ .co-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
