"use client";

import { useEffect, useMemo, useState } from "react";
import type { Order } from "@/lib/types";
import { money } from "@/lib/fmt";

const INTEREST_STACKS: { title: string; interests: string[]; note: string }[] = [
  {
    title: "The craft-seller stack",
    interests: ["Etsy", "Cricut", "Silhouette (cutting machine)", "Print on demand", "Canva"],
    note: "Your buyers make things to sell. Stack 2–3 of these as interests, then narrow by Engaged Shoppers.",
  },
  {
    title: "The digital-product stack",
    interests: ["Gumroad", "Shopify", "Digital planner", "Notion (software)", "Creative Market"],
    note: "People already buying digital goods from independent sellers — the closest thing to your exact audience.",
  },
  {
    title: "The side-hustle stack",
    interests: ["Side hustle", "Passive income", "Freelancing", "Small business", "Entrepreneurship"],
    note: "Broader reach, cheaper CPMs. Works best as the top of a lookalike → retargeting funnel.",
  },
];

export default function AudiencesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [cfg, setCfg] = useState<{ pixel: boolean; capi: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/orders").then((r) => r.json()).then(setOrders).catch(() => {});
    fetch("/api/config").then((r) => r.json()).then(setCfg).catch(() => {});
  }, []);

  const { purchasers, emails } = useMemo(() => {
    const paid = orders.filter((o) => o.status === "paid");
    const set = new Set(paid.map((o) => o.email.trim().toLowerCase()).filter(Boolean));
    return { purchasers: paid.length, emails: set.size };
  }, [orders]);

  const status = (on: boolean, label: string) => (
    <span className={`sticker ${on ? "green" : "orange"}`} style={{ fontSize: 11 }}>
      {on ? "● " : "○ "}{label}
    </span>
  );

  return (
    <>
      <p className="kicker"><span className="tick">✦</span> Dashboard</p>
      <h1 className="display" style={{ fontSize: "clamp(36px, 4.5vw, 56px)", fontWeight: 900, marginBottom: 24 }}>
        Ad Audiences<span style={{ color: "var(--orange)" }}>.</span>
      </h1>

      {/* status */}
      <div className="card" style={{ marginBottom: 18 }}>
        <h3 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>Meta tracking status</h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          {status(!!cfg?.pixel, "Browser Pixel")}
          {status(!!cfg?.capi, "Conversions API")}
        </div>
        {(!cfg?.pixel || !cfg?.capi) && (
          <ol style={{ fontSize: 14, lineHeight: 1.7, margin: 0, paddingLeft: 20 }}>
            <li>Go to <strong>Meta Events Manager → Data sources → Add → Web → Meta Pixel</strong>, name it after your store, and copy the <strong>Pixel ID</strong> into <code>NEXT_PUBLIC_META_PIXEL_ID</code>.</li>
            <li>In the same pixel&apos;s <strong>Settings</strong> tab, scroll to <strong>Conversions API → Generate access token</strong> and paste it into <code>META_CAPI_TOKEN</code>.</li>
            <li>While testing, set <code>META_TEST_EVENT_CODE</code> to the code shown under <strong>Test events</strong> — events land there instead of live reporting.</li>
            <li>Redeploy. Quay fires <code>ViewContent → AddToCart → InitiateCheckout → Purchase</code> on the pixel <em>and</em> server-side, deduped by event id.</li>
          </ol>
        )}
        {cfg?.pixel && cfg?.capi && (
          <p style={{ fontSize: 14, margin: 0, opacity: 0.75 }}>
            ✓ Fully wired. Purchases are sent from both the browser and your server with matching event ids, so ad-blocked checkouts still get attributed.
          </p>
        )}
      </div>

      {/* exports */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }} className="aud-grid">
        <div className="card">
          <h3 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Custom Audience list</h3>
          <p style={{ fontSize: 14, opacity: 0.75, marginTop: 0 }}>
            <strong>{emails}</strong> unique purchaser emails ({purchasers} paid orders). Hashed to
            Meta&apos;s upload format — import at <strong>Ads Manager → Audiences → Create audience →
            Custom audience → Customer list</strong>, then build 1–3% lookalikes off it.
          </p>
          <a className="btn btn-primary" href="/api/audiences/export?format=hashed" style={{ textDecoration: "none" }}>
            ⬇ Download customer list (Meta format)
          </a>
        </div>
        <div className="card">
          <h3 className="display" style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Plain purchaser emails</h3>
          <p style={{ fontSize: 14, opacity: 0.75, marginTop: 0 }}>
            Same list, unhashed, for your own email tool. Your buyers are your asset —
            export them any time, no platform lock-in.
          </p>
          <a className="btn" href="/api/audiences/export?format=plain" style={{ textDecoration: "none" }}>
            ⬇ Download purchaser emails (plain)
          </a>
        </div>
      </div>

      {/* playbook */}
      <div className="card" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <h3 className="display" style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>
          🎯 Competitor-conquest playbook
        </h3>
        <p style={{ fontSize: 14, opacity: 0.8, marginTop: 0, maxWidth: 720 }}>
          Meta won&apos;t let you target “people who bought from SendOwl” directly — there&apos;s no
          such interest, and uploading someone else&apos;s customer list would break the rules. Here&apos;s
          the compliant path that gets you the same buyers anyway:
        </p>

        <h4 style={{ fontSize: 16, fontWeight: 900, margin: "18px 0 10px" }}>1. Start with interest stacks, not single interests</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {INTEREST_STACKS.map((s) => (
            <div key={s.title} style={{ background: "rgba(250,246,238,.07)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{s.title}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {s.interests.map((i) => (
                  <span key={i} style={{ fontSize: 11, background: "rgba(250,246,238,.14)", borderRadius: 20, padding: "3px 10px" }}>{i}</span>
                ))}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{s.note}</div>
            </div>
          ))}
        </div>

        <h4 style={{ fontSize: 16, fontWeight: 900, margin: "18px 0 10px" }}>2. Graduate to lookalikes of purchasers</h4>
        <p style={{ fontSize: 14, opacity: 0.8, margin: 0, maxWidth: 720 }}>
          Once your hashed list passes ~100 emails, interest targeting becomes your <em>testing</em>
          budget and lookalikes become your <em>scaling</em> budget. A 1% US lookalike of verified
          purchasers consistently beats interest stacks on ROAS for digital products — Meta finds the
          behavioral pattern (buys SVGs, owns a Cricut, shops Etsy) better than you can describe it.
          Refresh the seed list monthly; it compounds.
        </p>

        <h4 style={{ fontSize: 16, fontWeight: 900, margin: "18px 0 10px" }}>3. Retargeting windows that work for digital goods</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 13 }}>
          <div style={{ background: "rgba(250,246,238,.07)", borderRadius: 12, padding: 14 }}>
            <strong>ViewContent · 30 days</strong><br />
            <span style={{ opacity: 0.7 }}>Product viewers who didn&apos;t buy. Show the product in use — Cricut cutting it, Etsy listing mockup.</span>
          </div>
          <div style={{ background: "rgba(250,246,238,.07)", borderRadius: 12, padding: 14 }}>
            <strong>AddToCart · 14 days</strong><br />
            <span style={{ opacity: 0.7 }}>Highest intent. Testimonial creative + a gentle nudge; this is where most digital sellers leave money.</span>
          </div>
          <div style={{ background: "rgba(250,246,238,.07)", borderRadius: 12, padding: 14 }}>
            <strong>InitiateCheckout · 7 days</strong><br />
            <span style={{ opacity: 0.7 }}>They nearly paid. Short window, direct creative: “Your download is one click away.”</span>
          </div>
          <div style={{ background: "rgba(250,246,238,.07)", borderRadius: 12, padding: 14 }}>
            <strong>Purchasers · exclude 180 days</strong><br />
            <span style={{ opacity: 0.7 }}>Exclude buyers from acquisition campaigns (or upsell them your other bundles instead).</span>
          </div>
        </div>

        <p style={{ fontSize: 12, opacity: 0.55, marginTop: 18, marginBottom: 0 }}>
          Quay fires all four events to both the browser pixel and the Conversions API with matching
          event ids, so iOS opt-outs and ad blockers don&apos;t silently eat your attribution.
        </p>
      </div>
      <style>{`@media (max-width: 860px){ .aud-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
