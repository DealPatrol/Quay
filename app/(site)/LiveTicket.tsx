"use client";

import { useEffect, useState } from "react";

const FEED = [
  { buyer: "Maya R.", item: "Ultimate SVG Bundle", total: "$26.10", code: "WELCOME10" },
  { buyer: "James T.", item: "Branding Kit + Client Pack", total: "$58.00", code: "—" },
  { buyer: "Sofia L.", item: "Wall Art Bundle", total: "$8.50", code: "FLASH50" },
  { buyer: "Ethan K.", item: "Coloring Mega Pack", total: "$14.00", code: "—" },
  { buyer: "Ava M.", item: "Golden Hour Presets", total: "$19.20", code: "BUNDLE20" },
  { buyer: "Liam P.", item: "Boho Invitation Suite", total: "$17.10", code: "WELCOME10" },
];

/** A "live" delivery ticket that cycles through recent sales. Pure CSS + tiny timer. */
export default function LiveTicket() {
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setI((v) => (v + 1) % FEED.length);
      setTick((v) => v + 1);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const order = FEED[i];

  return (
    <div className="ticket floaty" style={{ maxWidth: 420 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="stub-label">Secure delivery</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, letterSpacing: "0.14em" }}>
          <span className="live-dot" /> LIVE
        </span>
      </div>
      <div className="display" style={{ fontSize: 44, fontWeight: 900, marginTop: 8 }}>
        Order delivered<span style={{ color: "var(--orange)" }}>.</span>
      </div>

      <div key={tick} className="rise" style={{ marginTop: 16 }}>
        <div className="leader-row light" style={{ fontSize: 14 }}>
          <span style={{ opacity: 0.7 }}>Buyer</span>
          <span className="leader-dots" />
          <strong>{order.buyer}</strong>
        </div>
        <div className="leader-row light" style={{ fontSize: 14, marginTop: 10 }}>
          <span style={{ opacity: 0.7 }}>Product</span>
          <span className="leader-dots" />
          <strong>{order.item}</strong>
        </div>
        <div className="leader-row light" style={{ fontSize: 14, marginTop: 10 }}>
          <span style={{ opacity: 0.7 }}>Discount</span>
          <span className="leader-dots" />
          <strong>{order.code}</strong>
        </div>
        <div className="leader-row light" style={{ fontSize: 14, marginTop: 10 }}>
          <span style={{ opacity: 0.7 }}>Charged</span>
          <span className="leader-dots" />
          <strong style={{ color: "var(--gold)", fontSize: 18 }}>{order.total}</strong>
        </div>
      </div>

      <div className="perf" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div>
          <div className="stub-label" style={{ marginBottom: 6 }}>Download link</div>
          <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.85 }}>
            quay.shop/d/9f2…e41a
          </div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>expires in 72h · 5 downloads</div>
        </div>
        <div className="barcode" style={{ width: 110 }} />
      </div>
    </div>
  );
}
