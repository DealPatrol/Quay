"use client";

import { useEffect, useMemo, useState } from "react";
import type { Affiliate, Referral, Settings } from "@/lib/types";
import { money, fullDate } from "@/lib/fmt";

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    const [a, r, s] = await Promise.all([
      fetch("/api/affiliates").then((x) => x.json()),
      fetch("/api/referrals").then((x) => x.json()),
      fetch("/api/settings").then((x) => x.json()),
    ]);
    setAffiliates(a);
    setReferrals(r);
    setSettings(s);
  };
  useEffect(() => { load(); }, []);

  const byAffiliate = useMemo(() => {
    const m = new Map<string, Referral[]>();
    for (const r of referrals) {
      const arr = m.get(r.affiliateId) || [];
      arr.push(r);
      m.set(r.affiliateId, arr);
    }
    return m;
  }, [referrals]);

  const owed = referrals.filter((r) => r.status === "unpaid").reduce((s, r) => s + r.amount, 0);
  const paidOut = referrals.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);

  const affName = (id: string) => affiliates.find((a) => a.id === id)?.name || "—";

  function linkFor(code: string) {
    return `${window.location.origin}/r/${code}`;
  }

  function copyLink(code: string) {
    navigator.clipboard.writeText(linkFor(code)).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy("create");
    const res = await fetch("/api/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setErr(data.error || "Couldn't create affiliate.");
      return;
    }
    setName("");
    setEmail("");
    await load();
  }

  async function setPaid(id: string, status: "paid" | "unpaid") {
    setBusy(id);
    await fetch(`/api/referrals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
    setBusy(null);
  }

  return (
    <>
      <p className="kicker"><span className="tick">✦</span> Dashboard</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
        <h1 className="display" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 900 }}>
          Affiliates<span style={{ color: "var(--orange)" }}>.</span>
        </h1>
        <div style={{ display: "flex", gap: 10 }}>
          <span className="sticker green spin">{money(owed)} owed</span>
          <span className="sticker">{money(paidOut)} paid out</span>
        </div>
      </div>

      <div className="card" style={{ margin: "24px 0" }}>
        <strong>How it works:</strong> give each partner their <code>/r/&lt;code&gt;</code> link.
        Visitors get a 30-day referral cookie; when they buy, a commission record
        ({settings?.defaultCommissionPct ?? 20}% by default — change it in Settings) is created automatically.
      </div>

      {/* create */}
      <div className="card tilt-r" style={{ marginBottom: 32 }}>
        <span className="sticker">new partner</span>
        <h3 className="display" style={{ fontSize: 24, fontWeight: 900, margin: "12px 0 16px" }}>Add an affiliate</h3>
        <form onSubmit={create} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12 }} className="aff-grid">
          <div className="field"><label>Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maya Chen" />
          </div>
          <div className="field"><label>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maya@example.com" />
          </div>
          <button className="btn btn-primary" disabled={busy === "create"} style={{ alignSelf: "end" }}>
            {busy === "create" ? "…" : "Create + get link →"}
          </button>
        </form>
        {err && <p style={{ color: "#a32c00", fontWeight: 700, marginBottom: 0 }}>{err}</p>}
        <p style={{ fontSize: 12, opacity: 0.55, marginBottom: 0 }}>
          A unique referral code is generated automatically. The commission % defaults to your store setting
          ({settings?.defaultCommissionPct ?? 20}%).
        </p>
      </div>

      {/* affiliates table */}
      <h2 className="display" style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>Partners</h2>
      <div className="table-wrap" style={{ marginBottom: 32 }}>
        <table className="data">
          <thead><tr><th>Partner</th><th>Referral link</th><th>Commission</th><th>Sales</th><th>Owed</th></tr></thead>
          <tbody>
            {affiliates.map((a) => {
              const refs = byAffiliate.get(a.id) || [];
              const aOwed = refs.filter((r) => r.status === "unpaid").reduce((s, r) => s + r.amount, 0);
              return (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 800 }}>{a.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{a.email}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    <code style={{ fontSize: 12 }}>/r/{a.code}</code>{" "}
                    <button className="mini-btn" onClick={() => copyLink(a.code)}>
                      {copied === a.code ? "✓ copied" : "copy link"}
                    </button>
                  </td>
                  <td style={{ fontWeight: 800 }}>{a.commissionPct}%</td>
                  <td>{refs.length}</td>
                  <td style={{ fontWeight: 900, color: aOwed > 0 ? "var(--orange-deep)" : undefined }}>
                    {money(aOwed)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {affiliates.length === 0 && <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>No affiliates yet — add your first partner above.</div>}
      </div>

      {/* referrals table */}
      <h2 className="display" style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>Referrals</h2>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Date</th><th>Affiliate</th><th>Order</th><th>Commission</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {referrals.map((r) => (
              <tr key={r.id}>
                <td style={{ fontSize: 13 }}>{fullDate(r.createdAt)}</td>
                <td style={{ fontWeight: 700 }}>{affName(r.affiliateId)}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.orderId.slice(0, 14)}…</td>
                <td style={{ fontWeight: 900 }}>{money(r.amount)}</td>
                <td><span className={`pill ${r.status}`}>{r.status}</span></td>
                <td>
                  {r.status === "unpaid" ? (
                    <button className="mini-btn" disabled={busy === r.id} onClick={() => setPaid(r.id, "paid")}>
                      {busy === r.id ? "…" : "Mark paid"}
                    </button>
                  ) : (
                    <button className="mini-btn danger" disabled={busy === r.id} onClick={() => setPaid(r.id, "unpaid")}>
                      Undo
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {referrals.length === 0 && <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>No referred sales yet. Share a referral link to get started.</div>}
      </div>
      <style>{`@media (max-width: 860px){ .aff-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
