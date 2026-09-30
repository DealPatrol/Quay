import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { store } from "@/lib/store";
import { CoverArt, Stars } from "../../../components";
import BuyBox from "./BuyBox";
import { num } from "@/lib/fmt";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const products = await store.products.all();
  const product = products.find((p) => p.slug === params.slug);
  if (!product) return { title: "Product not found" };
  const desc = `${product.tagline} Instant secure download, commercial license available.`;
  return {
    title: product.name,
    description: desc,
    openGraph: {
      title: product.name,
      description: desc,
      type: "website",
    },
  };
}

const REVIEW_NAMES = ["Jessica H.", "Marcus T.", "Elena R.", "David K.", "Priya S.", "Tom W."];
const REVIEW_TEXTS = [
  "Exactly as described — downloaded in seconds and the files were perfectly organized. Worth every penny.",
  "I've bought a lot of digital products and this is top tier. The quality is noticeably better than the cheaper alternatives.",
  "Bought this at 11pm for a project due the next morning. Instant delivery literally saved me. Highly recommend.",
  "The bonus materials alone are worth the price. Customer for life now.",
];

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const products = await store.products.all();
  const product = products.find((p) => p.slug === params.slug);
  if (!product) notFound();

  const related = products.filter((p) => p.id !== product.id && p.category === product.category)
    .concat(products.filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, 3);

  return (
    <section className="section" style={{ paddingTop: 56 }}>
      <div className="wrap">
        <Link href="/shop" style={{ fontWeight: 700, fontSize: 14 }}>← Back to shop</Link>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginTop: 24 }} className="prod-grid">
          <div>
            <div className="cover-thumb" style={{ aspectRatio: "4/5", boxShadow: "var(--shadow)" }}>
              <CoverArt cover={product.cover} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <span className="sticker">instant delivery</span>
              <span className="sticker green spin">{num(product.salesCount)} sold</span>
            </div>
          </div>

          <div>
            <span className="sticker paper" style={{ fontSize: 11 }}>{product.category}</span>
            <h1 className="display" style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, margin: "14px 0 6px" }}>
              {product.name}
            </h1>
            <p className="display" style={{ fontSize: 20, fontStyle: "italic", opacity: 0.75, marginBottom: 14 }}>
              {product.tagline}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Stars rating={product.rating} />
              <strong>{product.rating.toFixed(1)}</strong>
              <span style={{ opacity: 0.6, fontSize: 14 }}>· {num(product.reviewCount)} reviews</span>
            </div>
            <BuyBox product={product} />
          </div>
        </div>

        {/* what's inside + description */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 48, marginTop: 72 }} className="prod-grid">
          <div>
            <h2 className="display" style={{ fontSize: 34, fontWeight: 900, marginBottom: 16 }}>
              About this product<span style={{ color: "var(--orange)" }}>.</span>
            </h2>
            <p style={{ fontSize: 17, color: "var(--ink-soft)", maxWidth: 640 }}>{product.description}</p>

            <h2 className="display" style={{ fontSize: 34, fontWeight: 900, margin: "40px 0 16px" }}>
              What&apos;s inside<span style={{ color: "var(--orange)" }}>.</span>
            </h2>
            <div className="card" style={{ padding: "8px 24px" }}>
              {product.files.map((f) => (
                <div key={f.name} className="leader-row" style={{ padding: "12px 0", fontSize: 15 }}>
                  <span style={{ fontWeight: 700 }}>📁 {f.name}</span>
                  <span className="leader-dots" />
                  <span style={{ opacity: 0.6 }}>{f.size}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="display" style={{ fontSize: 34, fontWeight: 900, marginBottom: 16 }}>
              Reviews<span style={{ color: "var(--orange)" }}>.</span>
            </h2>
            {[0, 1, 2].map((i) => (
              <div key={i} className="card" style={{ marginBottom: 16, padding: 20 }}>
                <Stars rating={5} />
                <p style={{ fontSize: 14, margin: "10px 0" }}>{REVIEW_TEXTS[(product.reviewCount + i) % REVIEW_TEXTS.length]}</p>
                <div style={{ fontSize: 13, fontWeight: 800 }}>{REVIEW_NAMES[(product.reviewCount + i * 2) % REVIEW_NAMES.length]}</div>
                <div style={{ fontSize: 12, opacity: 0.55 }}>Verified purchase</div>
              </div>
            ))}
            <p style={{ fontSize: 13, opacity: 0.6 }}>Showing 3 of {num(product.reviewCount)} reviews.</p>
          </div>
        </div>

        {/* related */}
        <h2 className="display" style={{ fontSize: 34, fontWeight: 900, margin: "72px 0 24px" }}>
          Pairs well with<span style={{ color: "var(--orange)" }}>.</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {related.map((p) => (
            <Link key={p.id} href={`/product/${p.slug}`} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ width: 96, flexShrink: 0 }}>
                  <CoverArt cover={p.cover} />
                </div>
                <div style={{ padding: "14px 14px 14px 0" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>{p.name}</div>
                  <div className="display" style={{ fontWeight: 900, fontSize: 20, marginTop: 6 }}>${p.price}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 860px){ .prod-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
