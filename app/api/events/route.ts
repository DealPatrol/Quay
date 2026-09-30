export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import {
  trackMetaEvent,
  metaRequestSignals,
  splitName,
} from "@/lib/meta";
import { store } from "@/lib/store";

/**
 * POST /api/events — fire a Meta CAPI event from the browser.
 * Body: { name, eventId, productId?, email?, name? , value? }
 * The browser pixel fires the same event with the same eventId; Meta dedupes.
 * Public and never throws — tracking must never break the shop.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, eventId } = body as {
      name?: string;
      eventId?: string;
      productId?: string;
      email?: string;
      buyerName?: string;
      value?: number;
    };
    if (!name || !eventId || typeof name !== "string") {
      return NextResponse.json({ ok: false, error: "name + eventId required" }, { status: 400 });
    }

    const sig = metaRequestSignals(req);
    let customData: Record<string, unknown> = {};
    if (body.productId) {
      const p = (await store.products.all()).find((x) => x.id === body.productId);
      if (p) {
        customData = {
          content_ids: [p.id],
          content_name: p.name,
          content_type: "product",
          value: body.value ?? p.price,
          currency: "USD",
        };
      }
    }

    const { fn, ln } = splitName((body as any).buyerName);
    await trackMetaEvent(name, {
      eventId,
      userData: { em: (body as any).email, fn, ln, ...sig },
      customData,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.warn("[quay] /api/events failed (non-fatal):", e?.message || e);
    return NextResponse.json({ ok: true });
  }
}
