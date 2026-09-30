"use client";

import { useEffect, useState } from "react";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setS);
  }, []);

  async function save() {
    if (!s) return;
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  if (!s) return <div className="display" style={{ fontSize: 32, fontWeight: 900 }}>Loading settings…</div>;

  const set = (k: keyof Settings, v: any) => setS({ ...s, [k]: v });

  return (
    <>
      <p className="kicker"><span className="tick">✦</span> Dashboard</p>
      <h1 className="display" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 900, marginBottom: 24 }}>
        Settings<span style={{ color: "var(--orange)" }}>.</span>
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="set-grid">
        <div className="card">
          <h3 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 18 }}>Store</h3>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Store name</label>
            <input className="input" value={s.storeName} onChange={(e) => set("storeName", e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Tagline</label>
            <input className="input" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </div>
          <div className="field">
            <label>Support email</label>
            <input className="input" type="email" value={s.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
          </div>
        </div>

        <div className="card">
          <h3 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 18 }}>Secure delivery</h3>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Link expiry (hours)</label>
            <input className="input" type="number" min="1" value={s.linkExpiryHours}
              onChange={(e) => set("linkExpiryHours", Number(e.target.value))} />
            <p style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
              Download links stop working this long after purchase. Applies to new orders.
            </p>
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Downloads per link</label>
            <input className="input" type="number" min="1" value={s.downloadLimit}
              onChange={(e) => set("downloadLimit", Number(e.target.value))} />
            <p style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
              How many times each purchased file can be downloaded.
            </p>
          </div>
          <div className="field">
            <label>Default affiliate commission (%)</label>
            <input className="input" type="number" min="0" max="100" value={s.defaultCommissionPct ?? 20}
              onChange={(e) => set("defaultCommissionPct", Number(e.target.value))} />
            <p style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
              Applies to new affiliates (per-partner overrides aren&apos;t editable yet). Referred orders record this % of the order total.
            </p>
          </div>
        </div>

        <div className="card">
          <h3 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 18 }}>Delivery & payments</h3>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 14, marginBottom: 16 }}>
            <input type="checkbox" checked={s.pdfStamping !== false} onChange={(e) => set("pdfStamping", e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--orange)", marginTop: 2 }} />
            <span>
              <strong>PDF stamping</strong><br />
              <span style={{ opacity: 0.65 }}>Stamp “Licensed to buyer@email — Order id” on every page footer of PDF downloads. SendOwl-style anti-piracy.</span>
            </span>
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 14 }}>
            <input type="checkbox" checked={!!s.stripeTax} onChange={(e) => set("stripeTax", e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--orange)", marginTop: 2 }} />
            <span>
              <strong>Stripe Tax on checkout</strong><br />
              <span style={{ opacity: 0.65 }}>Let Stripe calculate and collect sales tax / VAT automatically on live checkouts. Requires Stripe Tax enabled in your Stripe dashboard.</span>
            </span>
          </label>
        </div>

        <div className="card" style={{ background: "var(--ink)", color: "var(--paper)" }}>
          <h3 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Going live checklist</h3>
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            <div className="leader-row light" style={{ padding: "6px 0" }}><span>☐ Set QUAY_SECRET env var</span><span className="leader-dots" /></div>
            <div className="leader-row light" style={{ padding: "6px 0" }}><span>☐ Connect Stripe keys</span><span className="leader-dots" /></div>
            <div className="leader-row light" style={{ padding: "6px 0" }}><span>☐ Set Stripe webhook secret</span><span className="leader-dots" /></div>
            <div className="leader-row light" style={{ padding: "6px 0" }}><span>☐ Set ADMIN_PASSWORD_HASH (real admin login)</span><span className="leader-dots" /></div>
            <div className="leader-row light" style={{ padding: "6px 0" }}><span>☐ Swap JSON store → Postgres</span><span className="leader-dots" /></div>
          </div>
          <p style={{ fontSize: 12, opacity: 0.6, marginTop: 12 }}>See README.md for the full production guide.</p>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: 14 }}>
          <p style={{ margin: 0, fontSize: 15, color: "var(--ink-soft)" }}>
            Changes apply to new orders immediately. Existing download links keep the
            expiry and limits they were minted with.
          </p>
          <button className="btn btn-primary" onClick={save}>Save settings</button>
          {saved && <span className="rise" style={{ color: "var(--green)", fontWeight: 800 }}>✓ Saved</span>}
        </div>
      </div>
      <style>{`@media (max-width: 860px){ .set-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
