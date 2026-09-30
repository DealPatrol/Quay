export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { sendAbandonedReminder } from "@/lib/email";
import { siteUrl } from "@/lib/stripe";
import type { AbandonedCart } from "@/lib/types";

/**
 * POST /api/checkout/abandon/remind — send an abandoned-cart reminder.
 *
 * TWO modes:
 *   1. Manual (dashboard button): body { id } — sends to that cart now.
 *      Protected by the dashboard auth middleware (route lives outside
 *      /dashboard, so it checks the admin session cookie itself).
 *   2. Cron (automatic): body { cronSecret } or header x-cron-secret matching
 *      the CRON_SECRET env var — sends to every un-reminded, un-recovered
 *      cart older than REMIND_AFTER_HOURS (default 4). Point any cron
 *      provider (cron-job.org, Vercel Cron, EasyCron) at this endpoint.
 */
const REMIND_AFTER_HOURS = Number(process.env.ABANDON_REMIND_AFTER_HOURS || 4);

async function sendTo(cart: AbandonedCart, base: string): Promise<boolean> {
  const settings = await store.settings.get();
  const ok = await sendAbandonedReminder(cart, settings, base);
  if (ok) {
    const all = await store.abandoned.all();
    const c = all.find((x) => x.id === cart.id);
    if (c) {
      c.remindedAt = new Date().toISOString();
      await store.abandoned.save(all);
    }
  }
  return ok;
}

export async function POST(req: Request) {
  const base = siteUrl(req);
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }

  // --- Cron mode -----------------------------------------------------------
  const secret = body.cronSecret || req.headers.get("x-cron-secret");
  if (secret) {
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "bad cron secret" }, { status: 401 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: true, sent: 0, note: "RESEND_API_KEY not set — skipping" });
    }
    const cutoff = Date.now() - REMIND_AFTER_HOURS * 3600 * 1000;
    const due = (await store.abandoned.all()).filter(
      (c) =>
        !c.recoveredOrderId &&
        !c.remindedAt &&
        new Date(c.updatedAt).getTime() < cutoff
    );
    let sent = 0;
    for (const cart of due) {
      if (await sendTo(cart, base)) sent++;
    }
    console.log(`[quay] abandoned-cart cron: ${sent}/${due.length} reminders sent`);
    return NextResponse.json({ ok: true, sent, due: due.length });
  }

  // --- Manual mode (dashboard button) --------------------------------------
  const { id } = body as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // This route is outside /dashboard, so check admin auth ourselves.
  const { verifyAdminSession } = await import("@/lib/session");
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)quay_admin=([^;]*)/);
  const authed =
    (m && (await verifyAdminSession(decodeURIComponent(m[1])))) ||
    (!process.env.ADMIN_PASSWORD_HASH &&
      /(?:^|;\s*)quay_demo=/.test(cookie));
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const cart = (await store.abandoned.all()).find((c) => c.id === id);
  if (!cart) return NextResponse.json({ error: "cart not found" }, { status: 404 });
  if (cart.recoveredOrderId) {
    return NextResponse.json({ error: "cart already recovered" }, { status: 400 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not set — email is not configured." },
      { status: 400 }
    );
  }
  const ok = await sendTo(cart, base);
  return NextResponse.json({ ok, sent: ok ? 1 : 0 });
}
