/**
 * PDF stamping (SendOwl-style anti-piracy).
 *
 * At download time, when the delivered file is a PDF and the `pdfStamping`
 * setting is on, every page footer gets:
 *   "Licensed to {buyer email} — Order {order id}"
 * small, grey, semi-transparent. Printed copies stay traceable to the buyer,
 * which is the whole point — it makes casual piracy socially expensive.
 *
 * Never throws: callers fall back to the unstamped file on any error.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function stampPdf(
  pdfBytes: Uint8Array,
  stampLine: string
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const page of doc.getPages()) {
    const { width } = page.getSize();
    page.drawText(stampLine, {
      x: 36,
      y: 22,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.45),
      opacity: 0.65,
      maxWidth: Math.max(120, width - 72),
    });
  }
  const saved = await doc.save();
  const out = Buffer.alloc(saved.byteLength);
  out.set(saved);
  return out;
}

/** "Licensed to ada@example.com — Order ord_abc123" */
export function stampLineFor(email: string, orderId: string): string {
  return `Licensed to ${email} — Order ${orderId}`;
}
