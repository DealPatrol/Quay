import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { CoverArt } from "@/app/components";
import EmbedBuyForm from "./EmbedBuyForm";

/**
 * GET /embed/checkout/[slug] — minimal checkout page designed to live inside
 * the quay-embed.js modal iframe. No site header/footer.
 */
export default async function EmbedCheckoutPage({ params }: { params: { slug: string } }) {
  const product = (await store.products.all()).find((p) => p.slug === params.slug);
  if (!product) notFound();
  const settings = await store.settings.get();

  return (
    <div style={{
      fontFamily: "Georgia, serif",
      background: "#FAF6EE",
      color: "#141210",
      minHeight: "100vh",
      padding: "28px 24px",
    }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={{ fontWeight: 900, fontSize: 20 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: 8, background: "#FF4D00",
            color: "#fff", marginRight: 8, fontSize: 18,
          }}>Q</span>
          {settings.storeName}
        </span>
      </div>

      <div style={{ width: 120, margin: "0 auto 16px" }}>
        <CoverArt cover={product.cover} />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 900, textAlign: "center", margin: "0 0 6px" }}>
        {product.name}
      </h1>
      <p style={{ textAlign: "center", fontSize: 14, opacity: 0.65, margin: "0 0 20px" }}>
        {product.tagline}
      </p>

      <EmbedBuyForm
        productId={product.id}
        productName={product.name}
        price={product.price}
        billing={product.billing}
        recurringInterval={product.recurringInterval}
      />

      <p style={{ textAlign: "center", fontSize: 12, opacity: 0.55, marginTop: 18 }}>
        🔒 Secure checkout · Instant delivery
      </p>
    </div>
  );
}
