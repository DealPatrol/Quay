"use client";

import { useEffect, useMemo, useState } from "react";
import type { AbandonedCart } from "@/lib/types";
import { money, fullDate, timeAgo } from "@/lib/fmt";

export default function AbandonedPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = () => fetch("/api/checkout/abandon/list").then((r) => r.json()).then(setCarts);
  useEffect(() => { load(); }, []);

  const open = useMemo(() => carts.filter((c) => !c.recoveredOrderId), [carts]);
  const recovered = carts.length - open.length;
  const openValue = open.reduce((s, c) => s + c.total, 0);

  async function remind(id: string) {
    setBusy(id);
    setNote("");
    const r = await fetch("/api/checkout/abandon/remind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const d = await r.json();
    setNote(r.ok ? "✓ Reminder sent." : `✗ ${d.error || "Send failed."}`);
    await load();
    setBusy(null);
  }

  return (
    <>
      <p className="kicker"><span className="tick">✦</span> Dashboard</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
        <h1 className="display" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 900 }}>
          Abandoned carts<span style={{ color: "var(--orange)" }}>.</span>
        </h1>
        <span className="sticker orange spin">{money(openValue)} left on the table</span>
      </div>

      <div className="card" style={{ margin: "24px 0", background: "#fff8ef" }}>
        <strong>How it works.</strong>{" "}
        <span style={{ fontSize: 14, opacity: 0.75 }}>
          When a buyer types their email at checkout, Quay snapshots their cart. Send a one-click
          reminder below, or automate it: set <code>CRON_SECRET</code> and point any cron provider at{" "}
          <code>POST /api/checkout/abandon/remind</code> with <code>{`{"cronSecret": "…"}`}</code> —
          carts older than 4 hours get one reminder automatically. {recovered} cart{recovered === 1 ? "" : "s"} recovered so far.
        </span>
      </div>

      {note && <p style={{ fontWeight: 800 }}>{note}</p>}

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Buyer</th>
              <th>Cart</th>
              <th>Total</th>
              <th>Abandoned</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {carts.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{c.name || <span style={{ opacity: 0.4 }}>—</span>}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{c.email}</div>
                </td>
                <td style={{ fontSize: 13, maxWidth: 280 }}>
                  {c.items.map((i) => (
                    <div key={i.productId}>{i.productName}</div>
                  ))}
                </td>
                <td style={{ fontWeight: 900 }}>{money(c.total)}</td>
                <td style={{ fontSize: 13 }}>{timeAgo(c.updatedAt)}</td>
                <td style={{ fontSize: 13 }}>
                  {c.recoveredOrderId ? (
                    <span className="pill paid">✓ recovered</span>
                  ) : c.remindedAt ? (
                    <span className="pill off">reminded</span>
                  ) : (
                    <span className="pill pending">waiting</span>
                  )}
                </td>
                <td>
                  {!c.recoveredOrderId && (
                    <button className="mini-btn" disabled={busy === c.id} onClick={() => remind(c.id)}>
                      {busy === c.id ? "…" : c.remindedAt ? "Remind again" : "Send reminder"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {carts.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>
            No abandoned carts yet. They appear here once a buyer enters their email at checkout.
          </div>
        )}
      </div>
    </>
  );
}
