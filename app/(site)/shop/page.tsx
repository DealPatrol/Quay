import { cookies } from "next/headers";
import { store } from "@/lib/store";
import ShopGrid from "./ShopGrid";

export const metadata = {
  title: "Shop digital designs — Quay",
  description:
    "Browse Quay's digital design bundles — SVG packs, line-art collections and more with commercial licenses. Instant secure download on checkout.",
  openGraph: {
    title: "Shop digital designs — Quay",
    description: "Digital design bundles with commercial licenses. Instant secure download.",
  },
};

export default async function ShopPage() {
  const products = await store.products.all();
  const refCode = cookies().get("quay_ref")?.value;
  const affiliates = refCode ? await store.affiliates.all() : [];
  const referrer = affiliates.find((a) => a.code.toLowerCase() === refCode!.toLowerCase());
  return (
    <section className="section" style={{ paddingTop: 64 }}>
      <div className="wrap">
        <p className="kicker"><span className="tick">✦</span> The shop</p>
        <h1 className="display" style={{ fontSize: "clamp(44px, 6vw, 84px)", fontWeight: 900, marginBottom: 8 }}>
          Digital designs, ready tonight<span style={{ color: "var(--orange)" }}>.</span>
        </h1>
        {referrer && (
          <p className="sticker" style={{ marginBottom: 16 }}>
            ✦ referred by {referrer.name} — thanks for supporting them
          </p>
        )}
        <p style={{ color: "var(--ink-soft)", fontSize: 17, maxWidth: 560, marginBottom: 36 }}>
          Every purchase delivers instantly through a secure, expiring download link.
          Demo checkout — no real charges.
        </p>
        <ShopGrid products={products} />
      </div>
    </section>
  );
}
