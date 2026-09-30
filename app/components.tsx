import Link from "next/link";
import { useId } from "react";
import type { CoverArt } from "@/lib/types";

/* ---------------- wordmark ---------------- */
export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="wordmark" style={light ? { color: "var(--paper)" } : undefined}>
      <span className="q">Q</span>
      Quay
      <span
        className="sticker paper"
        style={{ fontSize: 10, padding: "5px 12px", transform: "rotate(3deg)" }}
        title="Pronounced “key”"
      >
        say “key”
      </span>
    </Link>
  );
}

/* ---------------- header ---------------- */
export function Header() {
  return (
    <header className="site-header">
      <div className="wrap bar">
        <Wordmark />
        <nav className="nav-links">
          <Link href="/shop" className="hide-m">Shop</Link>
          <Link href="/switch" className="hide-m">Switch & save</Link>
          <Link href="/#how" className="hide-m">How it works</Link>
          <Link href="/#pricing" className="hide-m">Pricing</Link>
          <Link href="/#faq" className="hide-m">FAQ</Link>
          <Link href="/dashboard" className="btn btn-ink" style={{ padding: "10px 20px", fontSize: 13 }}>
            Seller login
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ---------------- footer ---------------- */
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span className="sticker orange">made for digital sellers</span>
        <div className="giant">
          Quay<span className="dot">.</span>
        </div>
        <div className="footer-grid">
          <div>
            <h4>Quay</h4>
            <p style={{ fontSize: 14, opacity: 0.75, maxWidth: 300 }}>
              Sell digital downloads. Get paid. Deliver instantly. Secure
              expiring links, discount codes, and order bumps — no code required.
            </p>
          </div>
          <div>
            <h4>Shop</h4>
            <Link href="/shop">All products</Link>
            <Link href="/shop?cat=SVG+Bundles">SVG bundles</Link>
            <Link href="/shop?cat=Printables">Printables</Link>
            <Link href="/shop?cat=Presets">Presets</Link>
          </div>
          <div>
            <h4>Sell</h4>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/switch">Switch from SendOwl</Link>
            <Link href="/dashboard">Seller dashboard</Link>
            <Link href="/#faq">FAQ</Link>
          </div>
          <div>
            <h4>Fine print</h4>
            <Link href="/#faq">Refunds</Link>
            <Link href="/#faq">License terms</Link>
            <Link href="/#faq">Support</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Quay. Pronounced “key”. Demo storefront — no real charges.</span>
          <span>Secure delivery · Expiring links · Instant downloads</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- cover art (pure CSS/SVG, no images) ---------------- */
function Pattern({ cover, id }: { cover: CoverArt; id: string }) {
  const { fg, accent } = cover;
  switch (cover.pattern) {
    case "dots":
      return (
        <pattern id={id} width="34" height="34" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="8" r="5" fill={fg} opacity="0.28" />
          <circle cx="25" cy="25" r="5" fill={accent} opacity="0.35" />
        </pattern>
      );
    case "waves":
      return (
        <pattern id={id} width="60" height="24" patternUnits="userSpaceOnUse">
          <path d="M0 12 Q15 0 30 12 T60 12" fill="none" stroke={fg} strokeWidth="3" opacity="0.3" />
        </pattern>
      );
    case "grid":
      return (
        <pattern id={id} width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M30 0 H0 V30" fill="none" stroke={fg} strokeWidth="2" opacity="0.3" />
        </pattern>
      );
    case "stripes":
      return (
        <pattern id={id} width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="13" height="26" fill={fg} opacity="0.22" />
        </pattern>
      );
    case "rings":
      return (
        <pattern id={id} width="70" height="70" patternUnits="userSpaceOnUse">
          <circle cx="35" cy="35" r="22" fill="none" stroke={accent} strokeWidth="4" opacity="0.45" />
          <circle cx="35" cy="35" r="8" fill={fg} opacity="0.3" />
        </pattern>
      );
    case "zigzag":
      return (
        <pattern id={id} width="44" height="22" patternUnits="userSpaceOnUse">
          <path d="M0 22 L11 0 L22 22 L33 0 L44 22" fill="none" stroke={fg} strokeWidth="3" opacity="0.3" />
        </pattern>
      );
  }
}

export function CoverArt({ cover, className = "" }: { cover: CoverArt; className?: string }) {
  const id = `pat-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 400 500" className={className} role="img" aria-label={`${cover.initials} cover art`}
      style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <Pattern cover={cover} id={id} />
      </defs>
      <rect width="400" height="500" fill={cover.bg} />
      <rect width="400" height="500" fill={`url(#${id})`} />
      <circle cx="330" cy="90" r="90" fill={cover.accent} opacity="0.35" />
      <circle cx="60" cy="430" r="70" fill={cover.accent} opacity="0.25" />
      <rect x="48" y="150" width="304" height="200" fill="none" stroke={cover.fg} strokeWidth="7" />
      <text x="200" y="288" textAnchor="middle" fontFamily="Fraunces, Georgia, serif"
        fontWeight="900" fontSize="104" fill={cover.fg} letterSpacing="4">
        {cover.initials}
      </text>
      <text x="200" y="440" textAnchor="middle" fontFamily="Inter, sans-serif"
        fontWeight="800" fontSize="20" letterSpacing="6" fill={cover.fg} opacity="0.8">
        QUAY
      </text>
    </svg>
  );
}

/* ---------------- marquee strip ---------------- */
export function Marquee({ items, green = false }: { items: string[]; green?: boolean }) {
  const row = [...items, ...items];
  return (
    <div className={`marquee${green ? " green" : ""}`} aria-hidden>
      <div className="marquee-track">
        {row.map((t, i) => (
          <span key={i}>✦ {t}</span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- star rating ---------------- */
export function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: "var(--orange)", letterSpacing: 2, fontSize: 15 }} aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

/* ---------------- price ---------------- */
export function Price({ value, compareAt, big = false }: { value: number; compareAt?: number; big?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 10 }}>
      <span className="display" style={{ fontWeight: 900, fontSize: big ? 44 : 26 }}>
        ${value.toFixed(2).replace(/\.00$/, "")}
      </span>
      {compareAt && compareAt > value && (
        <span style={{ textDecoration: "line-through", opacity: 0.55, fontWeight: 700 }}>
          ${compareAt.toFixed(2).replace(/\.00$/, "")}
        </span>
      )}
    </span>
  );
}
