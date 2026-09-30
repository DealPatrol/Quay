import { Resend } from "resend";
import type { AbandonedCart, Order, Settings } from "./types";
import { money } from "./fmt";

/**
 * Order receipt emails via Resend.
 *
 * Active ONLY when RESEND_API_KEY is set. From address is RESEND_FROM, or
 * falls back to `Quay <orders@<site-host]>>` derived from NEXT_PUBLIC_SITE_URL.
 *
 * Failures NEVER break checkout: sendOrderReceipt catches everything,
 * logs a warning, and resolves. Called from lib/finalize.ts.
 */

function fromAddress(): string {
  if (process.env.RESEND_FROM) return process.env.RESEND_FROM;
  let host = "quay.store";
  try {
    host = new URL(
      (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
    ).hostname;
  } catch {
    /* keep fallback */
  }
  return `Quay <orders@${host}>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface DownloadLink {
  name: string;
  url: string;
}

export async function sendOrderReceipt(
  order: Order,
  links: DownloadLink[],
  settings: Settings
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // email not configured — skip silently

  try {
    const resend = new Resend(key);
    const itemRows = order.items
      .map(
        (it) =>
          `<tr><td style="padding:8px 0;border-bottom:1px dashed #ddd;">${esc(it.productName)}</td>` +
          `<td style="padding:8px 0;border-bottom:1px dashed #ddd;text-align:right;">${money(it.price + it.bumpPrice)}</td></tr>`
      )
      .join("");
    const linkRows = links
      .map(
        (l) =>
          `<p style="margin:10px 0;"><a href="${esc(l.url)}" style="display:inline-block;background:#FF4D00;color:#fff;` +
          `text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;">⬇ Download: ${esc(l.name)}</a></p>`
      )
      .join("");
    // D: license keys, when any purchased product requires them.
    const licensed = order.items.filter((it) => it.licenseKey);
    const licenseBlock = licensed.length
      ? `<h2 style="font-size:20px;margin-top:24px;">Your license key${licensed.length > 1 ? "s" : ""}</h2>` +
        licensed
          .map(
            (it) =>
              `<p style="margin:8px 0;font-size:14px;">${esc(it.productName)}<br/>` +
              `<code style="font-size:16px;font-weight:700;letter-spacing:1px;background:#f4f0e6;padding:6px 12px;border-radius:8px;display:inline-block;margin-top:4px;">${esc(it.licenseKey!)}</code></p>`
          )
          .join("") +
        `<p style="color:#666;font-size:13px;">Keep these safe — you'll need them to activate your purchase.</p>`
      : "";

    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: order.email,
      subject: `Your ${esc(settings.storeName)} order is ready — download links inside`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#141210;">
          <h1 style="font-size:28px;">Thanks, ${esc(order.name.split(" ")[0] || "friend")} — your downloads are ready.</h1>
          <p>Order <strong>${esc(order.id)}</strong> · ${money(order.total)} paid.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">${itemRows}</table>
          ${
            order.discountCode
              ? `<p>Discount applied: <strong>${esc(order.discountCode)}</strong> (−${money(order.discountAmount)})</p>`
              : ""
          }
          ${licenseBlock}
          <h2 style="font-size:20px;margin-top:24px;">Your secure download links</h2>
          ${linkRows}
          <p style="color:#666;font-size:13px;">Links expire in ${settings.linkExpiryHours} hours and allow ${settings.downloadLimit} downloads each. Questions? Reply to this email or write to ${esc(settings.supportEmail)}.</p>
          <p style="color:#999;font-size:12px;">— ${esc(settings.storeName)}</p>
        </div>`,
    });
    if (error) console.warn("[quay] receipt email rejected by Resend:", error.message);
  } catch (e: any) {
    console.warn("[quay] receipt email failed (non-fatal):", e?.message || e);
  }
}

/**
 * Abandoned-cart reminder (F). Sent manually from the dashboard or by the
 * cron endpoint. Includes the cart contents and a one-click restore link.
 * Never throws.
 */
export async function sendAbandonedReminder(
  cart: AbandonedCart,
  settings: Settings,
  base: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const resend = new Resend(key);
    const rows = cart.items
      .map(
        (it) =>
          `<tr><td style="padding:8px 0;border-bottom:1px dashed #ddd;">${esc(it.productName)}</td>` +
          `<td style="padding:8px 0;border-bottom:1px dashed #ddd;text-align:right;">${money(it.price + it.bumpPrice)}</td></tr>`
      )
      .join("");
    const restoreUrl = `${base.replace(/\/$/, "")}/checkout?restore=${encodeURIComponent(cart.id)}`;
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: cart.email,
      subject: `You left something in your cart at ${settings.storeName} 🛒`,
      html: `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#141210;">
          <h1 style="font-size:28px;">Still thinking it over${cart.name ? `, ${esc(cart.name.split(" ")[0])}` : ""}?</h1>
          <p>Your cart at <strong>${esc(settings.storeName)}</strong> is saved — one click brings it all back:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>
          <p style="margin:22px 0;"><a href="${esc(restoreUrl)}" style="display:inline-block;background:#FF4D00;color:#fff;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:10px;">Complete my purchase →</a></p>
          <p style="color:#666;font-size:13px;">Digital delivery is instant once you check out. Questions? Reply to this email or write to ${esc(settings.supportEmail)}.</p>
          <p style="color:#999;font-size:12px;">— ${esc(settings.storeName)}</p>
        </div>`,
    });
    if (error) {
      console.warn("[quay] abandoned reminder rejected by Resend:", error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn("[quay] abandoned reminder failed (non-fatal):", e?.message || e);
    return false;
  }
}
