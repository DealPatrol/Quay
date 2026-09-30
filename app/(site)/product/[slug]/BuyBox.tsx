"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { addToCart } from "@/lib/cart";
import { money } from "@/lib/fmt";
import { trackPixel, metaEventId } from "@/lib/meta-browser";

export default function BuyBox({ product }: { product: Product }) {
  const [bump, setBump] = useState(false);
  const [added, setAdded] = useState(false);

  const total = product.price + (bump && product.bump ? product.bump.price : 0);
  const recurring = product.billing === "recurring";
  const perLabel = recurring ? (product.recurringInterval === "year" ? "/yr" : "/mo") : "";

  // Meta Pixel: ViewContent (pixel-only; no server call for views).
  useEffect(() => {
    trackPixel("ViewContent", {
      content_ids: [product.id],
      content_name: product.name,
      content_type: "product",
      value: product.price,
      currency: "USD",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  function onAdd() {
    addToCart(product.id, bump);
    setAdded(true);
    // Meta: AddToCart on the pixel + the same event to CAPI for dedup.
    const eid = metaEventId();
    trackPixel(
      "AddToCart",
      { content_ids: [product.id], content_type: "product", value: total, currency: "USD" },
      eid
    );
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "AddToCart", eventId: eid, productId: product.id, value: total }),
    }).catch(() => {});
  }

  return (
    <div className="card" style={{ position: "sticky", top: 96 }}>
      <div className="leader-row" style={{ marginBottom: 6 }}>
        <span style={{ fontWeight: 700 }}>Price</span>
        <span className="leader-dots" />
        <span className="display" style={{ fontSize: 34, fontWeight: 900 }}>
          {money(total)}{perLabel && <span style={{ fontSize: 16, fontWeight: 700, opacity: 0.6 }}>{perLabel}</span>}
        </span>
      </div>
      {recurring && (
        <div style={{ marginBottom: 12 }}>
          <span className="sticker" style={{ fontSize: 10 }}>
            🔁 {product.recurringInterval === "year" ? "yearly" : "monthly"} subscription
          </span>
        </div>
      )}
      {product.compareAt && (
        <div style={{ textAlign: "right", marginBottom: 12 }}>
          <span style={{ textDecoration: "line-through", opacity: 0.55 }}>${product.compareAt}</span>
          <span className="sticker orange" style={{ marginLeft: 10, fontSize: 10 }}>
            save ${(product.compareAt - product.price).toFixed(0)}
          </span>
        </div>
      )}

      {product.bump && (
        <label style={{
          display: "flex", gap: 12, alignItems: "flex-start",
          border: "2px dashed var(--orange)", borderRadius: 12,
          padding: 16, margin: "16px 0", cursor: "pointer", background: "#fff",
        }}>
          <input
            type="checkbox"
            checked={bump}
            onChange={(e) => setBump(e.target.checked)}
            style={{ width: 20, height: 20, accentColor: "var(--orange)", marginTop: 2 }}
          />
          <span>
            <strong style={{ display: "block", fontSize: 15 }}>
              ⚡ {product.bump.name} <span style={{ color: "var(--orange-deep)" }}>+${product.bump.price}</span>
            </strong>
            <span style={{ fontSize: 13, opacity: 0.7 }}>{product.bump.description}</span>
          </span>
        </label>
      )}

      {!added ? (
        <button
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", fontSize: 17, padding: "16px" }}
          onClick={onAdd}
        >
          Add to cart — {money(total)}
        </button>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <div className="card" style={{ background: "#dff3e6", borderColor: "var(--green)", boxShadow: "none", padding: 14, textAlign: "center", fontWeight: 800 }}>
            ✓ In your cart
          </div>
          <Link href="/checkout" className="btn btn-ink" style={{ justifyContent: "center", fontSize: 17, padding: "16px" }}>
            Go to checkout →
          </Link>
          <Link href="/shop" style={{ textAlign: "center", fontSize: 14, fontWeight: 700 }}>
            Keep browsing
          </Link>
        </div>
      )}

      <div style={{ marginTop: 18, fontSize: 13, color: "var(--ink-soft)" }}>
        <div className="leader-row" style={{ padding: "5px 0" }}><span>✓ Instant delivery</span><span className="leader-dots" /></div>
        <div className="leader-row" style={{ padding: "5px 0" }}><span>✓ Secure expiring link</span><span className="leader-dots" /></div>
        <div className="leader-row" style={{ padding: "5px 0" }}><span>✓ 5 downloads · 72 hours</span><span className="leader-dots" /></div>
      </div>
    </div>
  );
}
