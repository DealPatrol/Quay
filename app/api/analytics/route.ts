export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { shortDate } from "@/lib/fmt";

export interface DayPoint { date: string; label: string; revenue: number; orders: number }

/** GET /api/analytics — 30-day series + totals + top products for the dashboard. */
export async function GET() {
  const orders = await store.orders.all();
  const products = await store.products.all();
  const paid = orders.filter((o) => o.status === "paid");

  const days: DayPoint[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, label: shortDate(d.toISOString()), revenue: 0, orders: 0 });
  }
  const byDay = new Map(days.map((d) => [d.date, d]));
  for (const o of paid) {
    const key = o.createdAt.slice(0, 10);
    const d = byDay.get(key);
    if (d) {
      d.revenue = Math.round((d.revenue + o.total) * 100) / 100;
      d.orders += 1;
    }
  }

  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const orderCount = paid.length;
  const conversionBase = 1240; // demo storefront visitors
  const conversion = orderCount / conversionBase;
  const aov = orderCount ? revenue / orderCount : 0;

  // previous 30 days for deltas
  const prevCutoff = Date.now() - 60 * 86400000;
  const prev = paid.filter((o) => new Date(o.createdAt).getTime() < Date.now() - 30 * 86400000 && new Date(o.createdAt).getTime() >= prevCutoff);
  const prevRevenue = prev.reduce((s, o) => s + o.total, 0);
  const revenueDelta = prevRevenue ? (revenue - prevRevenue) / prevRevenue : 0;

  const salesByProduct = new Map<string, { revenue: number; units: number }>();
  for (const o of paid) {
    for (const it of o.items) {
      const cur = salesByProduct.get(it.productId) || { revenue: 0, units: 0 };
      cur.revenue = Math.round((cur.revenue + it.price + it.bumpPrice) * 100) / 100;
      cur.units += 1;
      salesByProduct.set(it.productId, cur);
    }
  }
  const topProducts = Array.from(salesByProduct.entries())
    .map(([productId, s]) => {
      const p = products.find((x) => x.id === productId);
      return { productId, name: p?.name || productId, slug: p?.slug, cover: p?.cover, ...s };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return NextResponse.json({
    days,
    totals: {
      revenue: Math.round(revenue * 100) / 100,
      orders: orderCount,
      conversion,
      aov: Math.round(aov * 100) / 100,
      revenueDelta,
    },
    topProducts,
  });
}
