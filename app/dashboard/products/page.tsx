"use client";

import { useEffect, useState } from "react";
import type { Product, CoverArt as CoverArtType } from "@/lib/types";
import { CoverArt, Stars } from "@/app/components";
import { money, num } from "@/lib/fmt";

const PATTERNS: CoverArtType["pattern"][] = ["dots", "waves", "grid", "stripes", "rings", "zigzag"];

const EMPTY: any = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  category: "SVG Bundles",
  price: 19,
  compareAt: "",
  cover: { bg: "#FF4D00", fg: "#FAF6EE", accent: "#141210", pattern: "dots", initials: "Q" },
  filesText: "main-files.zip | 120 MB\nlicense.txt | 4 KB",
  bumpName: "",
  bumpDescription: "",
  bumpPrice: 19,
  sampleFile: "license.txt",
  requiresLicense: false,
  billing: "once",
  recurringInterval: "month",
};

function toPayload(f: typeof EMPTY) {
  return {
    name: f.name,
    slug: f.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    tagline: f.tagline,
    description: f.description,
    category: f.category,
    price: Number(f.price),
    compareAt: f.compareAt ? Number(f.compareAt) : undefined,
    cover: f.cover,
    files: String(f.filesText)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, size] = l.split("|").map((s) => s.trim());
        return { name, size: size || "—" };
      }),
    bump: f.bumpName
      ? { name: f.bumpName, description: f.bumpDescription, price: Number(f.bumpPrice) }
      : undefined,
    sampleFile: f.sampleFile,
    requiresLicense: !!f.requiresLicense,
    billing: f.billing === "recurring" ? "recurring" : "once",
    recurringInterval: f.billing === "recurring" ? f.recurringInterval : undefined,
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [modal, setModal] = useState<null | { mode: "add" } | { mode: "edit"; product: Product }>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => fetch("/api/products").then((r) => r.json()).then(setProducts);
  useEffect(() => { load(); }, []);

  function openAdd() {
    setForm({ ...EMPTY });
    setModal({ mode: "add" });
  }
  function openEdit(p: Product) {
    setForm({
      ...EMPTY,
      name: p.name,
      slug: p.slug,
      tagline: p.tagline,
      description: p.description,
      category: p.category,
      price: p.price,
      compareAt: p.compareAt || "",
      cover: { ...p.cover },
      filesText: p.files.map((f) => `${f.name} | ${f.size}`).join("\n"),
      bumpName: p.bump?.name || "",
      bumpDescription: p.bump?.description || "",
      bumpPrice: p.bump?.price || 19,
      sampleFile: p.sampleFile,
      requiresLicense: !!p.requiresLicense,
      billing: p.billing === "recurring" ? "recurring" : "once",
      recurringInterval: p.recurringInterval || "month",
    });
    setModal({ mode: "edit", product: p });
  }

  async function save() {
    const payload = toPayload(form);
    if (!payload.name || !payload.slug) {
      alert("Name and slug are required.");
      return;
    }
    const url = modal && modal.mode === "edit" ? `/api/products/${modal.product.id}` : "/api/products";
    const res = await fetch(url, {
      method: modal && modal.mode === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || "Save failed.");
      return;
    }
    setModal(null);
    load();
  }

  async function remove(p: Product) {
    if (!confirm(`Delete “${p.name}”?`)) return;
    await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    load();
  }

  async function runImport() {
    if (!importText.trim()) return;
    setImporting(true);
    setImportResult(null);
    const res = await fetch("/api/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: importText }),
    });
    const d = await res.json();
    setImportResult(res.ok ? d : { errors: [{ row: 0, error: d.error || "Import failed." }], created: [] });
    if (res.ok && d.created?.length) load();
    setImporting(false);
  }

  function copySnippet(slug: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const snippet = `<script src="${origin}/quay-embed.js" data-product="${slug}" data-label="Buy now"></script>`;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setCover = (k: string, v: any) => setForm((f: any) => ({ ...f, cover: { ...f.cover, [k]: v } }));

  return (
    <>
      <p className="kicker"><span className="tick">✦</span> Dashboard</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
        <h1 className="display" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 900 }}>
          Products<span style={{ color: "var(--orange)" }}>.</span>
        </h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={() => { setImportOpen(true); setImportResult(null); }}>⬆ Import CSV</button>
          <button className="btn btn-primary" onClick={openAdd}>+ New product</button>
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 24 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Rating</th>
              <th>Sales</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 44, display: "inline-block" }} className="cover-thumb">
                      <CoverArt cover={p.cover} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 800 }}>{p.name}</div>
                      <div style={{ fontSize: 12, opacity: 0.55, fontFamily: "monospace" }}>/{p.slug}</div>
                    </div>
                  </div>
                </td>
                <td><span className="pill off">{p.category}</span></td>
                <td style={{ fontWeight: 900 }}>{money(p.price)}</td>
                <td><Stars rating={p.rating} /> <span style={{ fontSize: 12, opacity: 0.6 }}>({num(p.reviewCount)})</span></td>
                <td>{num(p.salesCount)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="mini-btn" onClick={() => copySnippet(p.slug)} style={{ marginRight: 8 }}>
                    {copied === p.slug ? "✓ Copied!" : "⧉ Embed"}
                  </button>
                  <button className="mini-btn" onClick={() => openEdit(p)} style={{ marginRight: 8 }}>Edit</button>
                  <button className="mini-btn danger" onClick={() => remove(p)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-back" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(880px, 96vw)" }}>
            <h2 className="display" style={{ fontSize: 30, fontWeight: 900, marginBottom: 20 }}>
              {modal.mode === "add" ? "New product" : "Edit product"}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 28 }} className="pm-grid">
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="field"><label>Name</label><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
                  <div className="field"><label>Slug</label><input className="input" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="my-product" /></div>
                </div>
                <div className="field" style={{ marginTop: 14 }}><label>Tagline</label><input className="input" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></div>
                <div className="field" style={{ marginTop: 14 }}><label>Description</label><textarea className="textarea" value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 14 }}>
                  <div className="field"><label>Category</label><input className="input" value={form.category} onChange={(e) => set("category", e.target.value)} /></div>
                  <div className="field"><label>Price ($)</label><input className="input" type="number" min="1" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} /></div>
                  <div className="field"><label>Compare-at ($)</label><input className="input" type="number" min="0" step="0.01" value={form.compareAt} onChange={(e) => set("compareAt", e.target.value)} placeholder="optional" /></div>
                </div>

                <h3 className="display" style={{ fontSize: 20, fontWeight: 900, margin: "24px 0 12px" }}>Billing & licensing</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="field"><label>Billing type</label>
                    <select className="select" value={form.billing} onChange={(e) => set("billing", e.target.value)}>
                      <option value="once">One-time purchase</option>
                      <option value="recurring">Recurring subscription</option>
                    </select>
                  </div>
                  {form.billing === "recurring" && (
                    <div className="field"><label>Billing interval</label>
                      <select className="select" value={form.recurringInterval} onChange={(e) => set("recurringInterval", e.target.value)}>
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                      </select>
                    </div>
                  )}
                </div>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, cursor: "pointer", fontSize: 14 }}>
                  <input type="checkbox" checked={!!form.requiresLicense} onChange={(e) => set("requiresLicense", e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "var(--orange)", marginTop: 2 }} />
                  <span>
                    <strong>Issue a license key on purchase</strong><br />
                    <span style={{ opacity: 0.65 }}>Buyer gets a unique XXXX-XXXX-XXXX-XXXX key on the success page, download page, and receipt email.</span>
                  </span>
                </label>

                <h3 className="display" style={{ fontSize: 20, fontWeight: 900, margin: "24px 0 12px" }}>Cover art <span style={{ fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 600, opacity: 0.6 }}>— generated, no images needed</span></h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  <div className="field"><label>Background</label><input type="color" value={form.cover.bg} onChange={(e) => setCover("bg", e.target.value)} style={{ width: "100%", height: 44, border: "2px solid var(--ink)", borderRadius: 8, background: "#fff" }} /></div>
                  <div className="field"><label>Foreground</label><input type="color" value={form.cover.fg} onChange={(e) => setCover("fg", e.target.value)} style={{ width: "100%", height: 44, border: "2px solid var(--ink)", borderRadius: 8, background: "#fff" }} /></div>
                  <div className="field"><label>Accent</label><input type="color" value={form.cover.accent} onChange={(e) => setCover("accent", e.target.value)} style={{ width: "100%", height: 44, border: "2px solid var(--ink)", borderRadius: 8, background: "#fff" }} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                  <div className="field"><label>Pattern</label>
                    <select className="select" value={form.cover.pattern} onChange={(e) => setCover("pattern", e.target.value)}>
                      {PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Initials</label><input className="input" maxLength={4} value={form.cover.initials} onChange={(e) => setCover("initials", e.target.value.toUpperCase())} /></div>
                </div>

                <div className="field" style={{ marginTop: 14 }}>
                  <label>What&apos;s inside — one file per line: name | size</label>
                  <textarea className="textarea" value={form.filesText} onChange={(e) => set("filesText", e.target.value)} style={{ fontFamily: "monospace", fontSize: 13 }} />
                </div>

                <h3 className="display" style={{ fontSize: 20, fontWeight: 900, margin: "24px 0 12px" }}>Order bump <span style={{ fontSize: 13, fontFamily: "var(--font-body)", fontWeight: 600, opacity: 0.6 }}>— leave name empty for none</span></h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="field"><label>Bump name</label><input className="input" value={form.bumpName} onChange={(e) => set("bumpName", e.target.value)} placeholder="Add Commercial License" /></div>
                  <div className="field"><label>Bump price ($)</label><input className="input" type="number" min="1" step="0.01" value={form.bumpPrice} onChange={(e) => set("bumpPrice", e.target.value)} /></div>
                </div>
                <div className="field" style={{ marginTop: 14 }}><label>Bump description</label><input className="input" value={form.bumpDescription} onChange={(e) => set("bumpDescription", e.target.value)} /></div>
                <div className="field" style={{ marginTop: 14 }}><label>Sample file (in public/samples)</label><input className="input" value={form.sampleFile} onChange={(e) => set("sampleFile", e.target.value)} style={{ fontFamily: "monospace", fontSize: 13 }} /></div>
              </div>

              <div>
                <div className="field"><label>Live preview</label></div>
                <div className="cover-thumb" style={{ boxShadow: "var(--shadow-sm)" }}>
                  <CoverArt cover={form.cover} />
                </div>
                <p style={{ fontSize: 12, opacity: 0.6, marginTop: 10 }}>
                  This exact art renders on the shop, product page, and receipts.
                </p>
                {modal.mode === "edit" && (
                  <div style={{ marginTop: 20, background: "#f4f0e6", border: "2px dashed var(--ink)", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6 }}>Sell anywhere — embed snippet</div>
                    <p style={{ fontSize: 12, opacity: 0.65, margin: "0 0 10px" }}>
                      Paste on any website to render a buy button that opens this product&apos;s checkout in a modal.
                    </p>
                    <button className="mini-btn" onClick={() => copySnippet(modal.product.slug)}>
                      {copied === modal.product.slug ? "✓ Copied to clipboard!" : "⧉ Copy embed snippet"}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 28 }}>
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>
                {modal.mode === "add" ? "Create product" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@media (max-width: 760px){ .pm-grid{ grid-template-columns: 1fr !important; } }`}</style>

      {importOpen && (
        <div className="modal-back" onClick={() => setImportOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: "min(720px, 96vw)" }}>
            <h2 className="display" style={{ fontSize: 30, fontWeight: 900, marginBottom: 12 }}>
              Import products from CSV
            </h2>
            <p style={{ fontSize: 14, opacity: 0.7, marginTop: 0 }}>
              Columns: <code>name, slug?, price, compareAt?, description, fileUrl, bumpName?, bumpPrice?</code><br />
              <code>name</code> and <code>price</code> are required. <code>fileUrl</code> must be an
              http(s) link — Quay downloads it into the store (max 200 MB per file). Paste CSV or
              pick a file:
            </p>
            <div style={{ marginBottom: 12 }}>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const r = new FileReader();
                    r.onload = () => setImportText(String(r.result || ""));
                    r.readAsText(f);
                  }
                }}
              />
            </div>
            <textarea
              className="textarea"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"name,slug,price,compareAt,description,fileUrl,bumpName,bumpPrice\n\"Sunset Presets\",sunset-presets,24,39,\"10 golden-hour Lightroom presets\",https://example.com/presets.zip,,"}
              style={{ fontFamily: "monospace", fontSize: 12, minHeight: 160 }}
            />
            {importResult && (
              <div className="card" style={{ marginTop: 14, background: "#fbf9f4" }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>
                  ✓ Created {importResult.created?.length || 0} product{(importResult.created?.length || 0) === 1 ? "" : "s"}
                  {importResult.errors?.length ? ` · ✗ ${importResult.errors.length} row${importResult.errors.length === 1 ? "" : "s"} failed` : ""}
                </div>
                {importResult.errors?.map((er: any, i: number) => (
                  <div key={i} style={{ fontSize: 13, color: "#a32c00" }}>
                    Row {er.row}: {er.error}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn" onClick={() => setImportOpen(false)}>Close</button>
              <button className="btn btn-primary" onClick={runImport} disabled={importing || !importText.trim()}>
                {importing ? "Importing…" : "Run import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
