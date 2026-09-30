"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CoverArt } from "@/app/components";
import { money, num } from "@/lib/fmt";

interface Analytics {
  days: { date: string; label: string; revenue: number; orders: number }[];
  totals: { revenue: number; orders: number; conversion: number; aov: number; revenueDelta: number };
  topProducts: { productId: string; name: string; slug?: string; cover?: any; revenue: number; units: number }[];
}

function RevenueChart({ days }: { days: Analytics["days"] }) {
  const W = 720, H = 220, P = 36;
  const max = Math.max(...days.map((d) => d.revenue), 1);
  const pts = days.map((d, i) => [
    P + (i * (W - P * 2)) / (days.length - 1),
    H - P - (d.revenue / max) * (H - P * 2),
  ]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${(W - P).toFixed(1)},${H - P} L${P},${H - P} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={H - P * f - (H - P * 2) * 0} y2={H - P * f - (H - P * 2) * 0}
          stroke="rgba(20,18,16,.12)" strokeDasharray="4 4" transform={`translate(0, ${-(H - P * 2) * (f - 0.25) * 0})`} />
      ))}
      <path d={area} fill="rgba(255,77,0,.15)" />
      <path d={line} fill="none" stroke="var(--orange)" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.filter((_, i) => i % 5 === 0).map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="4.5" fill="var(--orange)" stroke="var(--ink)" strokeWidth="2" />
          <text x={p[0]} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">
            {days[i * 5].label}
          </text>
        </g>
      ))}
      <text x={P} y={20} fontSize="12" fontWeight="800" fill="var(--ink-soft)">
        MAX {money(max)}/DAY
      </text>
    </svg>
  );
}

function OrdersBars({ days }: { days: Analytics["days"] }) {
  const max = Math.max(...days.map((d) => d.orders), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 180 }}>
      {days.map((d) => (
        <div key={d.date} title={`${d.label}: ${d.orders} orders`}
          style={{
            flex: 1,
            height: `${Math.max(4, (d.orders / max) * 100)}%`,
            background: d.orders > 0 ? "var(--green)" : "rgba(20,18,16,.08)",
            borderRadius: "4px 4px 0 0",
            border: "1.5px solid var(--ink)",
            minWidth: 0,
          }} />
      ))}
    </div>
  );
}

export default function OverviewPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return <div className="display" style={{ fontSize: 32, fontWeight: 900 }}>Loading your empire…</div>;
  }

  const t = data.totals;
  const deltaPct = (t.revenueDelta * 100).toFixed(0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="kicker"><span className="tick">✦</span> Dashboard</p>
          <h1 className="display" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 900 }}>
            Good morning, seller<span style={{ color: "var(--orange)" }}>.</span>
          </h1>
        </div>
        <span className="sticker">last 30 days</span>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="num">{money(t.revenue)}</div>
          <div className="lbl">Revenue</div>
          <div className="delta-up">{Number(deltaPct) >= 0 ? "▲" : "▼"} {Math.abs(Number(deltaPct))}% vs prior 30d</div>
        </div>
        <div className="stat">
          <div className="num">{num(t.orders)}</div>
          <div className="lbl">Orders</div>
          <div style={{ fontSize: 13, opacity: 0.6 }}>{(t.orders / 30).toFixed(1)} / day avg</div>
        </div>
        <div className="stat">
          <div className="num">{(t.conversion * 100).toFixed(1)}%</div>
          <div className="lbl">Conversion rate</div>
          <div style={{ fontSize: 13, opacity: 0.6 }}>visitors → buyers</div>
        </div>
        <div className="stat">
          <div className="num">{money(t.aov)}</div>
          <div className="lbl">Avg order value</div>
          <div style={{ fontSize: 13, opacity: 0.6 }}>bumps included</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }} className="ov-grid">
        <div className="card">
          <h3 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>Revenue — last 30 days</h3>
          <RevenueChart days={data.days} />
        </div>
        <div className="card">
          <h3 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>Orders per day</h3>
          <OrdersBars days={data.days} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.6, marginTop: 8 }}>
            <span>{data.days[0].label}</span><span>{data.days[data.days.length - 1].label}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 className="display" style={{ fontSize: 22, fontWeight: 900 }}>Top products</h3>
          <Link href="/dashboard/products" style={{ fontSize: 13, fontWeight: 800 }}>Manage →</Link>
        </div>
        {data.topProducts.map((p, i) => (
          <div key={p.productId} className="leader-row" style={{ padding: "12px 0", borderBottom: i < data.topProducts.length - 1 ? "1px dashed rgba(20,18,16,.2)" : "none" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="display" style={{ fontWeight: 900, color: "var(--orange)", width: 28 }}>#{i + 1}</span>
              {p.cover && <span style={{ width: 40, display: "inline-block" }} className="cover-thumb"><CoverArt cover={p.cover} /></span>}
              <strong style={{ fontSize: 14 }}>{p.name}</strong>
            </span>
            <span className="leader-dots" />
            <span style={{ fontSize: 13, opacity: 0.65 }}>{num(p.units)} sold</span>
            <strong style={{ minWidth: 80, textAlign: "right" }}>{money(p.revenue)}</strong>
          </div>
        ))}
      </div>
      <style>{`@media (max-width: 900px){ .ov-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
