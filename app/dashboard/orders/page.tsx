"use client";

import { useEffect, useMemo, useState } from "react";
import type { Order } from "@/lib/types";
import { money, fullDate } from "@/lib/fmt";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => fetch("/api/orders").then((r) => r.json()).then(setOrders);
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return orders.filter(
      (o) =>
        !s ||
        o.email.toLowerCase().includes(s) ||
        o.name.toLowerCase().includes(s) ||
        o.id.toLowerCase().includes(s) ||
        o.items.some((i) => i.productName.toLowerCase().includes(s))
    );
  }, [orders, q]);

  async function setStatus(id: string, status: "paid" | "refunded") {
    if (status === "refunded" && !confirm("Refund this order? (Demo: just flips the status.)")) return;
    setBusy(id);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setBusy(null);
  }

  const revenue = filtered.filter((o) => o.status === "paid").reduce((s, o) => s + o.total, 0);

  return (
    <>
      <p className="kicker"><span className="tick">✦</span> Dashboard</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
        <h1 className="display" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 900 }}>
          Orders<span style={{ color: "var(--orange)" }}>.</span>
        </h1>
        <span className="sticker green spin">{money(revenue)} in view</span>
      </div>

      <div style={{ margin: "24px 0", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Search by email, name, product, order id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 420, flex: "1 1 260px" }}
        />
        <a
          className="btn"
          href={`/api/orders/export${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          style={{ textDecoration: "none" }}
        >
          ⬇ Export CSV
        </a>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Discount</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id}>
                <td>
                  <div style={{ fontWeight: 800, fontFamily: "monospace", fontSize: 12 }}>{o.id.slice(0, 14)}…</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{fullDate(o.createdAt)}</div>
                </td>
                <td>
                  <div style={{ fontWeight: 700 }}>{o.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{o.email}</div>
                </td>
                <td style={{ fontSize: 13, maxWidth: 260 }}>
                  {o.items.map((i) => (
                    <div key={i.productId} style={{ marginBottom: 4 }}>
                      {i.productName.split("—")[0].trim()}{i.bump && <span style={{ color: "var(--orange-deep)" }}> ⚡</span>}
                      {i.licenseKey && (
                        <div style={{ fontFamily: "monospace", fontSize: 11, opacity: 0.7 }}>
                          🔑 {i.licenseKey}
                        </div>
                      )}
                    </div>
                  ))}
                  {o.subscription && (
                    <div style={{ marginTop: 4 }}>
                      <span className={`pill ${o.subscription.status === "active" ? "paid" : "pending"}`} style={{ fontSize: 11 }}>
                        🔁 {o.subscription.interval === "year" ? "yearly" : "monthly"} · {o.subscription.status}
                      </span>
                    </div>
                  )}
                </td>
                <td style={{ fontSize: 13 }}>{o.discountCode || <span style={{ opacity: 0.4 }}>—</span>}</td>
                <td style={{ fontWeight: 900 }}>{money(o.total)}</td>
                <td><span className={`pill ${o.status}`}>{o.status}</span></td>
                <td>
                  {o.status === "paid" ? (
                    <button className="mini-btn danger" disabled={busy === o.id} onClick={() => setStatus(o.id, "refunded")}>
                      {busy === o.id ? "…" : "Refund"}
                    </button>
                  ) : o.status === "refunded" ? (
                    <button className="mini-btn" disabled={busy === o.id} onClick={() => setStatus(o.id, "paid")}>
                      Un-refund
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, opacity: 0.55 }}>awaiting payment</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>No orders match.</div>
        )}
      </div>
    </>
  );
}
