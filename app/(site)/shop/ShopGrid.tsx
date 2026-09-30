"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { CoverArt, Stars } from "../../components";
import { num } from "@/lib/fmt";

export default function ShopGrid({ products }: { products: Product[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const cats = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);

  const filtered = products.filter((p) => {
    const hitCat = cat === "All" || p.category === cat;
    const hitQ =
      !q ||
      (p.name + " " + p.tagline + " " + p.description).toLowerCase().includes(q.toLowerCase());
    return hitCat && hitQ;
  });

  return (
    <>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          className="input"
          placeholder="Search designs, presets, bundles…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 340 }}
        />
      </div>
      <div className="tabs" style={{ marginTop: 0 }}>
        {cats.map((c) => (
          <button key={c} className={`tab ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div className="display" style={{ fontSize: 30, fontWeight: 900 }}>Nothing matches “{q}”.</div>
          <p style={{ opacity: 0.65 }}>Try a different search — or browse everything.</p>
          <button className="btn" onClick={() => { setQ(""); setCat("All"); }}>Clear filters</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 }}>
        {filtered.map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`} style={{ textDecoration: "none" }}>
            <div className="card" style={{ padding: 0, overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
              <div className="cover-thumb" style={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
                <CoverArt cover={p.cover} />
              </div>
              <div style={{ padding: "18px 20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
                <span className="sticker paper" style={{ alignSelf: "flex-start", fontSize: 10, marginBottom: 10, transform: "rotate(-2deg)" }}>
                  {p.category}
                </span>
                <h3 className="display" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.15 }}>{p.name}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <Stars rating={p.rating} />
                  <span style={{ fontSize: 12, opacity: 0.6 }}>({num(p.reviewCount)})</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 14 }}>
                  <span>
                    <span className="display" style={{ fontSize: 24, fontWeight: 900 }}>${p.price}</span>
                    {p.compareAt && (
                      <span style={{ textDecoration: "line-through", opacity: 0.5, fontSize: 14, marginLeft: 8 }}>${p.compareAt}</span>
                    )}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--orange-deep)" }}>{num(p.salesCount)} sold</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
