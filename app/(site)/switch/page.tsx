import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Switch from SendOwl or Gumroad",
  description:
    "Quay does everything SendOwl does — PDF stamping, license keys, affiliates, subscriptions — for $18/mo with 0% platform fees. Migrate in an afternoon.",
};

/**
 * /switch — the SendOwl/Gumroad switcher landing page.
 * Honest comparison + migration checklist. Pricing verified Sept 2026;
 * footnote says to double-check their sites.
 */
const ROWS: { feature: string; quay: string; sendowl: string; gumroad: string }[] = [
  { feature: "Monthly price", quay: "$18/mo flat", sendowl: "From $39/mo", gumroad: "$0/mo + 10% of every sale" },
  { feature: "Platform cut of your sales", quay: "0%", sendowl: "0%", gumroad: "10% + $0.50 per sale" },
  { feature: "Your own Stripe account", quay: "✓", sendowl: "✓", gumroad: "✗ — Gumroad is the merchant of record" },
  { feature: "PDF stamping (anti-piracy)", quay: "✓", sendowl: "✓", gumroad: "—" },
  { feature: "License keys", quay: "✓", sendowl: "✓", gumroad: "—" },
  { feature: "Affiliates", quay: "✓", sendowl: "✓", gumroad: "✓" },
  { feature: "Subscriptions", quay: "✓", sendowl: "✓", gumroad: "✓" },
  { feature: "Abandoned-cart recovery", quay: "✓ built in", sendowl: "—", gumroad: "—" },
  { feature: "Embeddable buy buttons", quay: "✓", sendowl: "✓", gumroad: "✓" },
  { feature: "Meta Pixel + Conversions API", quay: "✓ server-side", sendowl: "—", gumroad: "—" },
  { feature: "CSV product import", quay: "✓", sendowl: "—", gumroad: "—" },
  { feature: "Customer list export (yours to keep)", quay: "✓", sendowl: "✓", gumroad: "✓" },
];

const STEPS = [
  {
    title: "Export your catalog",
    body: "Download your product list from SendOwl (Products) or Gumroad (your products page) as a CSV. Grab your file URLs too — Quay pulls the files straight from the links.",
  },
  {
    title: "Import into Quay",
    body: "Dashboard → Products → Import CSV. One paste and your whole catalog exists in Quay — files download automatically, prices and order bumps included.",
  },
  {
    title: "Connect Stripe",
    body: "Paste your Stripe keys (the same account — your customers, your payouts, your data stay yours). Turn on the webhook and Stripe Tax if you need it.",
  },
  {
    title: "Swap your buy buttons",
    body: "Replace old buy links with Quay's embed snippet — a one-line script tag that opens your checkout in a modal on any site. Or just link straight to your Quay product pages.",
  },
  {
    title: "Turn on ad tracking",
    body: "Drop in your Meta Pixel ID + Conversions API token. Every ViewContent, AddToCart, InitiateCheckout and Purchase fires server-side too, so your lookalike audiences keep working as iOS privacy tightens.",
  },
  {
    title: "Email your list once",
    body: "Tell buyers the new download links live at your Quay store. Then cancel the old subscription — most sellers are fully moved in an afternoon.",
  },
];

export default function SwitchPage() {
  return (
    <>
      <section className="section" style={{ paddingTop: 64 }}>
        <div className="wrap" style={{ maxWidth: 880 }}>
          <p className="kicker"><span className="tick">✦</span> Switch to Quay</p>
          <h1 className="display" style={{ fontSize: "clamp(44px, 6vw, 84px)", fontWeight: 900, lineHeight: 1.02 }}>
            Everything SendOwl does.<br />
            Half the price<span style={{ color: "var(--orange)" }}>. Zero % fees.</span>
          </h1>
          <p style={{ fontSize: 19, color: "var(--ink-soft)", maxWidth: 640, marginTop: 20 }}>
            PDF stamping, license keys, affiliates, subscriptions, expiring download links —
            the whole SendOwl playbook, plus the things it never built (abandoned-cart recovery,
            server-side Meta tracking, embeddable buy buttons). Migrate in an afternoon.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <Link href="/dashboard/products" className="btn btn-primary" style={{ fontSize: 17, padding: "16px 28px" }}>
              Start the switch →
            </Link>
            <Link href="/shop" className="btn" style={{ fontSize: 17, padding: "16px 28px" }}>
              See a live store
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 980 }}>
          <h2 className="display" style={{ fontSize: 36, fontWeight: 900, marginBottom: 20 }}>
            The honest comparison<span style={{ color: "var(--orange)" }}>.</span>
          </h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th></th>
                  <th style={{ color: "var(--orange-deep)" }}>Quay</th>
                  <th>SendOwl</th>
                  <th>Gumroad</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.feature}>
                    <td style={{ fontWeight: 700 }}>{r.feature}</td>
                    <td style={{ fontWeight: 800 }}>{r.quay}</td>
                    <td style={{ opacity: 0.75 }}>{r.sendowl}</td>
                    <td style={{ opacity: 0.75 }}>{r.gumroad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, opacity: 0.55, marginTop: 10 }}>
            Pricing as of September 2026 — SendOwl $39–$159/mo plans, Gumroad 10% + $0.50 per direct
            sale, Quay $18/mo. Platforms change plans; verify on their sites. “—” means not listed as
            a native feature.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="wrap" style={{ maxWidth: 880 }}>
          <h2 className="display" style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>
            Moved in an afternoon<span style={{ color: "var(--orange)" }}>.</span>
          </h2>
          <p style={{ opacity: 0.7, marginBottom: 32 }}>The migration checklist our switchers follow:</p>
          <div style={{ display: "grid", gap: 14 }}>
            {STEPS.map((s, i) => (
              <div key={s.title} className="card" style={{ background: "rgba(250,246,238,.06)", borderColor: "rgba(250,246,238,.2)", display: "flex", gap: 18 }}>
                <div className="display" style={{ fontWeight: 900, fontSize: 28, color: "var(--orange)", flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>{s.title}</div>
                  <div style={{ fontSize: 14, opacity: 0.75, marginTop: 6 }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <Link href="/dashboard/products" className="btn btn-primary" style={{ fontSize: 18, padding: "18px 36px" }}>
              Import your catalog now →
            </Link>
            <p style={{ fontSize: 13, opacity: 0.6, marginTop: 14 }}>
              No credit card to try. Your Stripe account, your customers, your data.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
