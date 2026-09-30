"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CoverArt } from "../../components";
import { money, countdown } from "@/lib/fmt";
import { trackPixel } from "@/lib/meta-browser";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

type Phase = "loading" | "confirming" | "ready" | "error";

export default function SuccessPage() {
  return (
    <Suspense fallback={<section className="section"><div className="wrap" style={{ textAlign: "center" }}><div className="display" style={{ fontSize: 32, fontWeight: 900 }}>Loading…</div></div></section>}>
      <SuccessInner />
    </Suspense>
  );
}

function SuccessInner() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const sessionId = params.get("session_id");
  const [order, setOrder] = useState<any>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [note, setNote] = useState("");
  const [related, setRelated] = useState<any[]>([]);
  const purchaseFired = useRef(false);
  const now = useNow();

  useEffect(() => {
    if (!orderId) {
      setPhase("error");
      setNote("No order specified.");
      return;
    }
    let stop = false;

    async function fetchOrder() {
      const r = await fetch(`/api/orders/${orderId}`);
      if (!r.ok) throw new Error("missing");
      return r.json();
    }

    async function demoPath() {
      try {
        const o = await fetchOrder();
        if (!stop) {
          setOrder(o);
          setPhase("ready");
        }
      } catch {
        if (!stop) {
          setPhase("error");
          setNote("Couldn't find that order. Check your email for the receipt.");
        }
      }
    }

    async function livePath() {
      // Belt-and-suspenders: confirm the Stripe session directly (works even
      // if the webhook is delayed), then poll until tokens are minted.
      try {
        const c = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, sessionId }),
        });
        if (c.ok && !stop) {
          const o = await c.json();
          if (o.delivery?.every((d: any) => d.token)) {
            setOrder(o);
            setPhase("ready");
            return;
          }
        }
      } catch {
        /* fall through to polling — the webhook may finalize it */
      }
      if (!stop) setPhase("confirming");
      for (let i = 0; i < 20 && !stop; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const o = await fetchOrder();
          if (!stop) setOrder(o);
          if (o.status === "paid" && o.delivery?.every((d: any) => d.token)) {
            if (!stop) setPhase("ready");
            return;
          }
        } catch {
          /* keep polling */
        }
      }
      if (!stop) {
        setPhase("error");
        setNote(
          "Your payment went through, but your download links are still being generated. " +
          "They'll arrive by email shortly — or contact support with your order id."
        );
      }
    }

    if (sessionId) livePath();
    else demoPath();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, sessionId]);

  // Meta: Purchase on the pixel with the SAME event id the server used for
  // CAPI in finalizeOrder — Meta dedupes the pair. Fires once per page load.
  // K: also load "frequently bought together" products.
  useEffect(() => {
    if (phase !== "ready" || !order || purchaseFired.current) return;
    purchaseFired.current = true;
    trackPixel(
      "Purchase",
      {
        content_ids: order.items.map((i: any) => i.productId),
        content_type: "product",
        value: order.total,
        currency: "USD",
        num_items: order.items.length,
        order_id: order.id,
      },
      order.metaEventId
    );
    const bought = new Set(order.items.map((i: any) => i.productId));
    fetch("/api/products")
      .then((r) => r.json())
      .then((ps: any[]) => setRelated(ps.filter((p) => !bought.has(p.id)).slice(0, 3)))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, order?.id]);

  if (phase === "error") {
    return (
      <section className="section"><div className="wrap" style={{ textAlign: "center", maxWidth: 560 }}>
        <div className="display" style={{ fontSize: 44, fontWeight: 900 }}>Hmm.</div>
        <p style={{ opacity: 0.65 }}>{note}</p>
        <Link href="/shop" className="btn">Back to shop</Link>
      </div></section>
    );
  }

  if (phase === "loading" || phase === "confirming") {
    return (
      <section className="section"><div className="wrap" style={{ textAlign: "center", maxWidth: 560 }}>
        <span className="sticker green"><span className="live-dot" style={{ marginRight: 8 }} />confirming payment</span>
        <div className="display" style={{ fontSize: 40, fontWeight: 900, marginTop: 20 }}>
          {phase === "loading" ? "Wrapping your order…" : "Payment received — minting your secure links…"}
        </div>
        <p style={{ opacity: 0.65 }}>This usually takes a few seconds. Don&apos;t close this tab.</p>
      </div></section>
    );
  }

  if (!order) return null;

  return (
    <section className="section" style={{ paddingTop: 56 }}>
      <div className="wrap" style={{ maxWidth: 760 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span className="sticker green">payment successful</span>
          <h1 className="display" style={{ fontSize: "clamp(44px, 6vw, 76px)", fontWeight: 900, marginTop: 18 }}>
            Thank you, {order.name.split(" ")[0]}<span style={{ color: "var(--orange)" }}>!</span>
          </h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 17 }}>
            Order <strong>{order.id}</strong> · receipt sent to <strong>{order.email}</strong>
          </p>
        </div>

        {/* receipt ticket */}
        <div className="ticket" style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stub-label">Quay receipt</span>
            <span className="stub-label">{new Date(order.createdAt).toLocaleString()}</span>
          </div>
          <div style={{ marginTop: 16 }}>
            {order.items.map((it: any) => (
              <div key={it.productId} className="leader-row light" style={{ padding: "8px 0", fontSize: 15 }}>
                <span>
                  {it.productName}
                  {it.bump && <span style={{ color: "var(--gold)" }}> ⚡ bump</span>}
                </span>
                <span className="leader-dots" />
                <strong>{money(it.price + it.bumpPrice)}</strong>
              </div>
            ))}
            <div className="leader-row light" style={{ padding: "8px 0", fontSize: 15 }}>
              <span style={{ opacity: 0.7 }}>Subtotal</span><span className="leader-dots" /><span>{money(order.subtotal)}</span>
            </div>
            {order.discountCode && (
              <div className="leader-row light" style={{ padding: "8px 0", fontSize: 15 }}>
                <span style={{ opacity: 0.7 }}>Discount ({order.discountCode})</span><span className="leader-dots" />
                <span style={{ color: "var(--gold)" }}>−{money(order.discountAmount)}</span>
              </div>
            )}
          </div>
          <div className="perf" />
          <div className="leader-row light">
            <span className="display" style={{ fontWeight: 900, fontSize: 22 }}>Total paid</span>
            <span className="leader-dots" />
            <span className="display" style={{ fontWeight: 900, fontSize: 32 }}>{money(order.total)}</span>
          </div>
        </div>

        {/* download links */}
        <h2 className="display" style={{ fontSize: 32, fontWeight: 900, marginBottom: 18 }}>
          Your secure downloads<span style={{ color: "var(--orange)" }}>.</span>
        </h2>
        {order.delivery.map((d: any) => {
          const left = d.expiresAt - now;
          const remaining = d.maxDownloads - d.used;
          return (
            <div key={d.productId} className="card" style={{ marginBottom: 18, display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ width: 84, flexShrink: 0 }} className="cover-thumb">
                {d.cover && <CoverArt cover={d.cover} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{d.productName}</div>
                {d.licenseKey && (
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    <span style={{ fontWeight: 800 }}>🔑 License key:</span>{" "}
                    <code style={{ background: "#f4f0e6", border: "2px solid var(--ink)", borderRadius: 8, padding: "4px 10px", fontWeight: 800, letterSpacing: 1 }}>
                      {d.licenseKey}
                    </code>
                  </div>
                )}
                <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
                  ⏳ Expires in <strong>{countdown(left)}</strong> · {remaining} of {d.maxDownloads} downloads left
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 11, opacity: 0.5, marginTop: 4, wordBreak: "break-all" }}>
                  /d/{d.token?.slice(0, 18)}…
                </div>
              </div>
              <Link href={`/d/${d.token}`} className="btn btn-primary" style={{ flexShrink: 0 }}>
                Download ↓
              </Link>
            </div>
          );
        })}
        <p style={{ fontSize: 13, opacity: 0.6, textAlign: "center", marginTop: 8 }}>
          Links are personal to you — sharing them publicly will burn through your download limit.
        </p>

        {/* K: frequently bought together */}
        {related.length > 0 && (
          <div style={{ marginTop: 56 }}>
            <h2 className="display" style={{ fontSize: 30, fontWeight: 900, marginBottom: 6, textAlign: "center" }}>
              Frequently bought together<span style={{ color: "var(--orange)" }}>.</span>
            </h2>
            <p style={{ textAlign: "center", opacity: 0.6, fontSize: 14, marginBottom: 20 }}>
              Complete the collection while you&apos;re here.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              {related.map((p) => (
                <Link key={p.id} href={`/product/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="card" style={{ padding: 14, height: "100%" }}>
                    <div className="cover-thumb" style={{ marginBottom: 12 }}>
                      {p.cover && <CoverArt cover={p.cover} />}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.35 }}>{p.name.split("—")[0].trim()}</div>
                    <div className="display" style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>
                      {money(p.price)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
