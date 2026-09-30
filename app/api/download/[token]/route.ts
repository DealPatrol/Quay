export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { checkToken } from "@/lib/tokens";
import { store } from "@/lib/store";
import { stampPdf, stampLineFor } from "@/lib/pdfstamp";

/**
 * GET /api/download/[token] — streams the product's sample file.
 * Validates: HMAC signature → expiry → remaining download count.
 * Increments the count on every successful stream.
 *
 * PDF STAMPING (C): when the file is a PDF and the `pdfStamping` setting is
 * on, each page footer is stamped "Licensed to {buyer email} — Order {id}"
 * before streaming. Stamping never breaks delivery — any error falls back
 * to the unstamped file.
 *
 * Swap `sampleFile` for the real product ZIP (e.g. S3/R2 signed URL) in production.
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const checked = checkToken(params.token);
  if (!checked.ok) {
    return NextResponse.json(
      { error: checked.reason === "expired" ? "This download link has expired." : "Invalid download link." },
      { status: 410 }
    );
  }

  const downloads = await store.downloads.all();
  const rec = downloads[params.token];
  if (!rec) {
    return NextResponse.json({ error: "Download record not found." }, { status: 410 });
  }
  if (rec.used >= rec.maxDownloads) {
    return NextResponse.json({ error: "Download limit reached for this link." }, { status: 410 });
  }

  const product = (await store.products.all()).find((p) => p.id === rec.productId);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const filePath = path.join(process.cwd(), "public", "samples", product.sampleFile);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File missing on server." }, { status: 500 });
  }

  rec.used += 1;
  await store.downloads.save(downloads);

  let buf: Uint8Array = fs.readFileSync(filePath);
  const ext = path.extname(product.sampleFile).toLowerCase();

  // C: stamp PDFs with the buyer's identity (SendOwl-style anti-piracy).
  if (ext === ".pdf") {
    const settings = await store.settings.get();
    if (settings.pdfStamping !== false) {
      try {
        const order = (await store.orders.all()).find((o) => o.id === rec.orderId);
        const email = order?.email || "licensed buyer";
        buf = await stampPdf(buf, stampLineFor(email, rec.orderId));
      } catch (e: any) {
        console.warn("[quay] PDF stamping failed, serving unstamped (non-fatal):", e?.message || e);
      }
    }
  }

  const contentType =
    ext === ".svg"
      ? "image/svg+xml"
      : ext === ".pdf"
        ? "application/pdf"
        : ext === ".zip"
          ? "application/zip"
          : "text/plain";

  const bodyBytes = new Uint8Array(
    buf.buffer as ArrayBuffer,
    buf.byteOffset,
    buf.byteLength
  );
  return new NextResponse(bodyBytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${product.sampleFile}"`,
      "Cache-Control": "no-store",
      "X-Downloads-Remaining": String(rec.maxDownloads - rec.used),
    },
  });
}
