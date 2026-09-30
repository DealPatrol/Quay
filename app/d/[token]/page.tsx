import Link from "next/link";
import { checkToken } from "@/lib/tokens";
import { store } from "@/lib/store";
import { CoverArt } from "@/app/components";
import DownloadPanel from "./DownloadPanel";

function DeadEnd({ title, body }: { title: string; body: string }) {
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 560, textAlign: "center" }}>
        <span className="sticker orange">link unavailable</span>
        <h1 className="display" style={{ fontSize: "clamp(40px, 6vw, 68px)", fontWeight: 900, margin: "20px 0 12px" }}>
          {title}
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 17, marginBottom: 28 }}>{body}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/shop" className="btn btn-primary">Browse the shop</Link>
          <Link href="/#faq" className="btn">Contact support</Link>
        </div>
      </div>
    </section>
  );
}

export default async function DownloadPage({ params }: { params: { token: string } }) {
  const checked = checkToken(params.token);

  if (!checked.ok) {
    return checked.reason === "expired" ? (
      <DeadEnd
        title="This link has expired."
        body="Download links expire after their delivery window to protect sellers from link sharing. Reply to your order email and the seller can re-issue a fresh link in seconds."
      />
    ) : (
      <DeadEnd
        title="That link doesn't look right."
        body="The download link is malformed or wasn't issued by Quay. Double-check the URL from your receipt email."
      />
    );
  }

  const downloads = await store.downloads.all();
  const rec = downloads[params.token];
  if (!rec) {
    return (
      <DeadEnd
        title="Link not found."
        body="This download was never issued or its record was removed. Contact support with your order details."
      />
    );
  }

  const product = (await store.products.all()).find((p) => p.id === rec.productId);
  if (!product) {
    return <DeadEnd title="Product unavailable." body="The product behind this link no longer exists." />;
  }

  const remaining = rec.maxDownloads - rec.used;
  if (remaining <= 0) {
    return (
      <DeadEnd
        title="Download limit reached."
        body={`This link allowed ${rec.maxDownloads} downloads and they've all been used. Sellers can reset or re-issue links — just ask via your receipt email.`}
      />
    );
  }

  // D: surface the license key for this product, if one was issued.
  const order = (await store.orders.all()).find((o) => o.id === rec.orderId);
  const licenseKey = order?.items.find((i) => i.productId === rec.productId)?.licenseKey;

  return (
    <section className="section" style={{ paddingTop: 56 }}>
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link href="/" className="wordmark" style={{ justifyContent: "center" }}>
            <span className="q">Q</span> Quay
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 28, alignItems: "center", marginBottom: 28 }} className="dl-grid">
          <div className="cover-thumb" style={{ boxShadow: "var(--shadow)" }}>
            <CoverArt cover={product.cover} />
          </div>
          <div>
            <span className="sticker green" style={{ fontSize: 10 }}>verified secure link ✓</span>
            <h1 className="display" style={{ fontSize: 34, fontWeight: 900, marginTop: 12 }}>{product.name}</h1>
            <p style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 8 }}>
              Your purchase is ready. This is a personal, expiring link — grab your files below.
            </p>
          </div>
        </div>
        <DownloadPanel
          token={params.token}
          fileName={product.sampleFile}
          expiresAt={rec.expiresAt}
          remaining={remaining}
          maxDownloads={rec.maxDownloads}
        />
        {licenseKey && (
          <div className="card" style={{ marginTop: 20, background: "#fff8ef", textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 8 }}>🔑 Your license key</div>
            <code style={{ fontSize: 18, fontWeight: 800, letterSpacing: 2 }}>{licenseKey}</code>
            <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 0 }}>
              Keep this safe — you&apos;ll need it to activate your purchase. It was also emailed to you.
            </p>
          </div>
        )}
      </div>
      <style>{`@media (max-width: 640px){ .dl-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
