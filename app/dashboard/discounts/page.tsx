"use client";

import { useEffect, useState } from "react";
import type { Discount } from "@/lib/types";

const EMPTY = { code: "", type: "percent", value: 10, minOrder: "", maxUses: "", active: true };

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [modal, setModal] = useState<null | { mode: "add" } | { mode: "edit"; d: Discount }>(null);
  const [form, setForm] = useState<any>(EMPTY);

  const load = () => fetch("/api/discounts").then((r) => r.json()).then(setDiscounts);
  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ ...EMPTY }); setModal({ mode: "add" }); }
  function openEdit(d: Discount) {
    setForm({ code: d.code, type: d.type, value: d.value, minOrder: d.minOrder || "", maxUses: d.maxUses || "", active: d.active });
    setModal({ mode: "edit", d });
  }

  async function save() {
    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minOrder: form.minOrder ? Number(form.minOrder) : undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      active: form.active,
    };
    if (!payload.code || !(payload.value > 0)) { alert("Code and a positive value are required."); return; }
    const url = modal && modal.mode === "edit" ? `/api/discounts/${modal.d.id}` : "/api/discounts";
    const res = await fetch(url, {
      method: modal && modal.mode === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const d = await res.json(); alert(d.error || "Save failed."); return; }
    setModal(null);
    load();
  }

  async function remove(d: Discount) {
    if (!confirm(`Delete code ${d.code}?`)) return;
    await fetch(`/api/discounts/${d.id}`, { method: "DELETE" });
    load();
  }

  async function toggle(d: Discount) {
    await fetch(`/api/discounts/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !d.active }),
    });
    load();
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <>
      <p className="kicker"><span className="tick">✦</span> Dashboard</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
        <h1 className="display" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 900 }}>
          Discounts<span style={{ color: "var(--orange)" }}>.</span>
        </h1>
        <button className="btn btn-primary" onClick={openAdd}>+ New code</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18, marginTop: 24 }}>
        {discounts.map((d) => (
          <div key={d.id} className="card" style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="display" style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.04em" }}>{d.code}</span>
              <button className={`pill ${d.active ? "active" : "off"}`} style={{ cursor: "pointer" }} onClick={() => toggle(d)} title="Toggle active">
                {d.active ? "active" : "off"}
              </button>
            </div>
            <div style={{ margin: "14px 0" }}>
              <div className="leader-row" style={{ fontSize: 14, padding: "4px 0" }}>
                <span>Discount</span><span className="leader-dots" />
                <strong>{d.type === "percent" ? `${d.value}% off` : `$${d.value} off`}</strong>
              </div>
              <div className="leader-row" style={{ fontSize: 14, padding: "4px 0" }}>
                <span>Min order</span><span className="leader-dots" />
                <strong>{d.minOrder ? `$${d.minOrder}` : "none"}</strong>
              </div>
              <div className="leader-row" style={{ fontSize: 14, padding: "4px 0" }}>
                <span>Uses</span><span className="leader-dots" />
                <strong>{d.usedCount}{d.maxUses ? ` / ${d.maxUses}` : " ∞"}</strong>
              </div>
            </div>
            {d.maxUses && (
              <div style={{ height: 8, border: "2px solid var(--ink)", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
                <div style={{ width: `${Math.min(100, (d.usedCount / d.maxUses) * 100)}%`, height: "100%", background: "var(--orange)" }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="mini-btn" onClick={() => openEdit(d)}>Edit</button>
              <button className="mini-btn danger" onClick={() => remove(d)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="modal-back" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="display" style={{ fontSize: 28, fontWeight: 900, marginBottom: 20 }}>
              {modal.mode === "add" ? "New discount code" : `Edit ${modal.d.code}`}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div className="field"><label>Code</label><input className="input" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="SUMMER25" style={{ textTransform: "uppercase", fontWeight: 800 }} /></div>
              <div className="field"><label>Type</label>
                <select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>
                  <option value="percent">Percent %</option>
                  <option value="fixed">Fixed $</option>
                </select>
              </div>
              <div className="field"><label>Value</label><input className="input" type="number" min="1" step="0.01" value={form.value} onChange={(e) => set("value", e.target.value)} /></div>
              <div className="field"><label>Min order $ (optional)</label><input className="input" type="number" min="0" step="0.01" value={form.minOrder} onChange={(e) => set("minOrder", e.target.value)} placeholder="none" /></div>
              <div className="field"><label>Max uses (optional)</label><input className="input" type="number" min="1" step="1" value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="unlimited" /></div>
              <div className="field"><label>Status</label>
                <select className="select" value={form.active ? "1" : "0"} onChange={(e) => set("active", e.target.value === "1")}>
                  <option value="1">Active</option>
                  <option value="0">Disabled</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{modal.mode === "add" ? "Create code" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
