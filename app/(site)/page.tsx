import Link from "next/link";
import LiveTicket from "./LiveTicket";
import { Marquee, CoverArt, Stars } from "../components";
import { store } from "@/lib/store";
import { money, num } from "@/lib/fmt";

export const metadata = {
  title: "Quay — Sell digital downloads. Get paid. Deliver instantly.",
  description:
    "Quay is the simple storefront for digital products: instant secure download links, discount codes, order bumps, affiliate referrals, and seller analytics.",
  openGraph: {
    title: "Quay — Sell digital downloads. Get paid. Deliver instantly.",
    description:
      "Instant secure download links, discount codes, order bumps, affiliates, and analytics — everything a digital seller needs.",
  },
};

const FEATURES = [
  {
    t: "Expiring secure links",
    d: "Every purchase mints HMAC-signed download links that expire on your schedule and cap redownloads. No more “please send it again” emails.",
    bg: "var(--orange)",
  },
  {
    t: "Discount codes",
    d: "Percentage or fixed-amount codes with minimums and usage caps. WELCOME10, FLASH50 — run a sale in sixty seconds.",
    bg: "var(--green)",
  },
  {
    t: "Order bumps",
    d: "One-click add-ons at checkout — commercial licenses, extended packs, bonus presets. Average order value goes brrr.",
    bg: "var(--gold)",
  },
  {
    t: "Affiliates",
    d: "Give partners their own cut of every sale they drive. Track referrals and payouts from the same dashboard.",
    bg: "var(--rose)",
  },
  {
    t: "Analytics that matter",
    d: "Revenue, conversion, and top products over the last 30 days — drawn as clean charts, not spreadsheet soup.",
    bg: "var(--ink)",
  },
  {
    t: "PDF stamping",
    d: "Stamp each buyer's email into their PDFs automatically. Your work, watermarked against casual piracy.",
    bg: "#5b8c5a",
  },
];

const TESTIMONIALS = [
  {
    q: "I moved 40 SVG listings off a marketplace and my margins doubled overnight. The expiring links killed my refund scammers.",
    n: "Priya S.",
    r: "SVG bundle seller · 8.3k sales",
  },
  {
    q: "Setup took an afternoon. My first sale came while I was asleep and the download just… delivered itself. I nearly cried.",
    n: "Marcus D.",
    r: "Preset creator · 2.9k sales",
  },
  {
    q: "Order bumps are cheat codes. 34% of buyers add the commercial license. That's an extra $6k a month I was leaving on the table.",
    n: "Elena R.",
    r: "Printable shop owner · 12.4k sales",
  },
];

const FAQS = [
  {
    q: "How do I get paid?",
    a: "Connect Stripe in the dashboard settings and payouts land in your bank account on Stripe's normal schedule. Checkout runs in demo mode (no real charges) until your Stripe keys are set — then buyers pay through Stripe's secure hosted checkout and download links are minted automatically on payment.",
  },
  {
    q: "What stops buyers from sharing their download link?",
    a: "Links are HMAC-signed, expire after a configurable window (default 72 hours), and allow a limited number of downloads (default 5). Used-up or expired links return a friendly expired page, and buyers can contact support for a re-issue.",
  },
  {
    q: "Can I sell on my own domain?",
    a: "Yes. Deploy Quay to Vercel, point your domain at it, and your shop, checkout, and download pages all live under your brand.",
  },
  {
    q: "What are the fees?",
    a: "Free plan takes 5% per sale. Starter ($18/mo) drops it to 2%, and Pro ($39/mo) to 0% — you only ever pay Stripe's processing on top.",
  },
  {
    q: "Do I keep my customer emails?",
    a: "Every order captures the buyer's name and email, stored in your own database. Export anytime. Your list is yours — Quay never markets to your customers.",
  },
];

export default async function Home() {
  const products = (await store.products.all()).slice(0, 3);
  const orders = (await store.orders.all()).filter((o) => o.status === "paid");
  const revenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="section" style={{ paddingTop: 72, paddingBottom: 64, position: "relative", overflow: "hidden" }}>
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 56, alignItems: "center" }}>
          <div>
            <span className="sticker">pronounced “key” — get it?</span>
            <h1 className="display" style={{ fontSize: "clamp(52px, 7.5vw, 108px)", fontWeight: 900, marginTop: 22 }}>
              Sell digital
              <br />
              downloads<span style={{ color: "var(--orange)" }}>.</span>
              <br />
              Get paid<span style={{ color: "var(--orange)" }}>.</span>
              <br />
              Deliver instantly<span style={{ color: "var(--green)" }}>.</span>
            </h1>
            <p style={{ fontSize: 19, maxWidth: 520, marginTop: 24, color: "var(--ink-soft)" }}>
              Quay is the storefront for people who sell files, not boxes. Upload
              your SVGs, presets, and printables — we handle checkout, discount
              codes, order bumps, and secure delivery links that expire on your terms.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
              <Link href="/shop" className="btn btn-primary">Browse the demo shop →</Link>
              <Link href="/#pricing" className="btn">See pricing</Link>
            </div>
            <div style={{ display: "flex", gap: 36, marginTop: 40 }}>
              {[
                [money(revenue), "paid out (demo data)"],
                [num(products.reduce((s, p) => s + p.salesCount, 0)) + "+", "downloads delivered"],
                ["72h", "secure link expiry"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="display" style={{ fontSize: 30, fontWeight: 900 }}>{n}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.6 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", placeItems: "center" }}>
            <LiveTicket />
            <span className="sticker spin" style={{ marginTop: 26 }}>no monthly fee to start</span>
          </div>
        </div>
      </section>

      <Marquee items={["instant delivery", "expiring secure links", "discount codes", "order bumps", "0% fees on Pro", "your customer list"]} />

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="section">
        <div className="wrap">
          <p className="kicker"><span className="tick">✦</span> How it works</p>
          <h2 className="display" style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900, maxWidth: 700 }}>
            From file to first sale in an afternoon<span style={{ color: "var(--orange)" }}>.</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 48 }}>
            {[
              ["01", "Upload your goods", "Drop in your ZIPs, PDFs, and SVGs. Set a price, write a description, pick cover colors — Quay generates the product art for you.", "var(--gold)"],
              ["02", "Share your link", "Every product gets a beautiful page with reviews, what's-inside, and a one-click order bump. Post the link anywhere.", "var(--orange)"],
              ["03", "Get paid, auto-delivered", "Buyers check out, and Quay mints a secure, expiring download link instantly. You watch the revenue roll in on the dashboard.", "var(--green)"],
            ].map(([n, t, d, bg], i) => (
              <div key={n} className={`card ${i === 1 ? "tilt-r" : i === 2 ? "tilt-l" : ""}`} style={{ position: "relative" }}>
                <div className="display" style={{
                  fontSize: 64, fontWeight: 900, color: bg as string,
                  WebkitTextStroke: "2px var(--ink)", lineHeight: 1,
                }}>{n}</div>
                <h3 className="display" style={{ fontSize: 26, fontWeight: 700, margin: "16px 0 10px" }}>{t}</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="section" style={{ background: "var(--ink)", color: "var(--paper)", borderTop: "2px solid var(--ink)", borderBottom: "2px solid var(--ink)" }}>
        <div className="wrap">
          <p className="kicker" style={{ color: "var(--paper)" }}><span className="tick">✦</span> Everything in the box</p>
          <h2 className="display" style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900, maxWidth: 760 }}>
            The whole digital-sales toolkit, none of the duct tape<span style={{ color: "var(--orange)" }}>.</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 48 }}>
            {FEATURES.map((f) => (
              <div key={f.t} style={{
                border: "2px solid var(--paper)", borderRadius: "var(--r)",
                padding: 28, background: "rgba(250,246,238,0.03)",
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12, background: f.bg,
                  border: "2px solid var(--paper)", marginBottom: 18,
                  display: "grid", placeItems: "center", fontSize: 22, fontWeight: 900,
                }}>✦</div>
                <h3 className="display" style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>{f.t}</h3>
                <p style={{ opacity: 0.75, fontSize: 15 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SHOP TEASER ================= */}
      <section className="section">
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <p className="kicker"><span className="tick">✦</span> Fresh off the press</p>
              <h2 className="display" style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900 }}>
                Bestsellers<span style={{ color: "var(--orange)" }}>.</span>
              </h2>
            </div>
            <Link href="/shop" className="btn">Shop all →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 40 }}>
            {products.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} style={{ textDecoration: "none" }}>
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="cover-thumb" style={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
                    <CoverArt cover={p.cover} />
                  </div>
                  <div style={{ padding: "20px 22px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Stars rating={p.rating} />
                      <span style={{ fontSize: 13, opacity: 0.65 }}>({num(p.reviewCount)})</span>
                    </div>
                    <h3 className="display" style={{ fontSize: 21, fontWeight: 700 }}>{p.name}</h3>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                      <span className="display" style={{ fontSize: 24, fontWeight: 900 }}>${p.price}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--orange-deep)" }}>{num(p.salesCount)} sold →</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Marquee green items={["sellers keep 100% on Pro", "your list is yours", "no code required", "cancel anytime"]} />

      {/* ================= PRICING ================= */}
      <section id="pricing" className="section">
        <div className="wrap">
          <p className="kicker"><span className="tick">✦</span> Pricing</p>
          <h2 className="display" style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900, maxWidth: 700 }}>
            Start free. Upgrade when the sales roll in<span style={{ color: "var(--orange)" }}>.</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 48, alignItems: "stretch" }}>
            {[
              { n: "Hobby", p: "$0", per: "forever", f: "5% fee per sale", rows: ["10 products", "Secure expiring links", "Basic analytics", "quay.shop/yourname"], hot: false },
              { n: "Starter", p: "$18", per: "/month", f: "2% fee per sale", rows: ["Unlimited products", "Discount codes + order bumps", "Custom domain", "Email receipts"], hot: true },
              { n: "Pro", p: "$39", per: "/month", f: "0% fees, ever", rows: ["Everything in Starter", "Affiliates + PDF stamping", "Advanced analytics", "Priority support"], hot: false },
            ].map((t) => (
              <div key={t.n} className="card" style={{
                ...(t.hot ? { background: "var(--ink)", color: "var(--paper)", transform: "rotate(-1deg) scale(1.03)" } : {}),
                display: "flex", flexDirection: "column",
              }}>
                {t.hot && <span className="sticker orange" style={{ alignSelf: "flex-start", marginBottom: 16 }}>most popular</span>}
                <h3 className="display" style={{ fontSize: 26, fontWeight: 700 }}>{t.n}</h3>
                <div style={{ margin: "12px 0 4px" }}>
                  <span className="display" style={{ fontSize: 52, fontWeight: 900 }}>{t.p}</span>
                  <span style={{ opacity: 0.6 }}>{t.per}</span>
                </div>
                <div style={{ fontWeight: 800, color: t.hot ? "var(--gold)" : "var(--orange-deep)", marginBottom: 16 }}>{t.f}</div>
                {t.rows.map((r) => (
                  <div key={r} className={`leader-row ${t.hot ? "light" : ""}`} style={{ fontSize: 14, padding: "8px 0" }}>
                    <span>✓</span><span>{r}</span><span className="leader-dots" />
                  </div>
                ))}
                <Link href="/dashboard" className={`btn ${t.hot ? "btn-primary" : ""}`} style={{ marginTop: 24, justifyContent: "center" }}>
                  {t.n === "Hobby" ? "Start free" : `Choose ${t.n}`}
                </Link>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", opacity: 0.6, fontSize: 14, marginTop: 24 }}>
            Prices are illustrative for this demo. Stripe processing fees apply on paid plans.
          </p>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="section" style={{ background: "var(--paper-2)", borderTop: "2px solid var(--ink)", borderBottom: "2px solid var(--ink)" }}>
        <div className="wrap">
          <p className="kicker"><span className="tick">✦</span> Seller stories</p>
          <h2 className="display" style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900, maxWidth: 700 }}>
            People getting paid while they sleep<span style={{ color: "var(--orange)" }}>.</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 48 }}>
            {TESTIMONIALS.map((t, i) => (
              <figure key={t.n} className={`card ${i === 0 ? "tilt-l" : i === 2 ? "tilt-r" : ""}`} style={{ margin: 0 }}>
                <div style={{ fontSize: 40, color: "var(--orange)", lineHeight: 1 }}>“</div>
                <blockquote style={{ margin: "8px 0 20px", fontSize: 16 }}>{t.q}</blockquote>
                <figcaption>
                  <div style={{ fontWeight: 800 }}>{t.n}</div>
                  <div style={{ fontSize: 13, opacity: 0.6 }}>{t.r}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="section">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <p className="kicker"><span className="tick">✦</span> Questions</p>
          <h2 className="display" style={{ fontSize: "clamp(36px, 5vw, 64px)", fontWeight: 900 }}>
            Asked a lot<span style={{ color: "var(--orange)" }}>.</span>
          </h2>
          <div style={{ marginTop: 36 }}>
            {FAQS.map((f) => (
              <details key={f.q} style={{
                border: "2px solid var(--ink)", borderRadius: 12, marginBottom: 14,
                background: "#fff", boxShadow: "var(--shadow-sm)",
              }}>
                <summary style={{ padding: "18px 22px", fontWeight: 800, cursor: "pointer", fontSize: 16 }}>
                  {f.q}
                </summary>
                <p style={{ padding: "0 22px 20px", margin: 0, color: "var(--ink-soft)" }}>{f.a}</p>
              </details>
            ))}
          </div>
          <div className="card" style={{ marginTop: 48, textAlign: "center", background: "var(--green)", color: "var(--paper)", borderColor: "var(--ink)" }}>
            <h3 className="display" style={{ fontSize: 34, fontWeight: 900 }}>Ready to sell your first file?</h3>
            <p style={{ opacity: 0.85, margin: "12px 0 24px" }}>Free to start. Your download links are waiting.</p>
            <Link href="/shop" className="btn btn-primary">Open the demo shop →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
