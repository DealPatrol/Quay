export const dynamic = "force-dynamic";
import { store } from "@/lib/store";

/**
 * GET /api/orders/export[?q=]
 * Returns the (optionally search-filtered) order list as a CSV download.
 * Same filter semantics as the dashboard Orders page search box.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();

  let orders = await store.orders.all();
  if (q) {
    orders = orders.filter(
      (o) =>
        o.email.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.items.some((i) => i.productName.toLowerCase().includes(q))
    );
  }

  const esc = (v: string | number | undefined): string => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = [
    "order_id",
    "created_at",
    "customer_name",
    "customer_email",
    "items",
    "subtotal",
    "discount_code",
    "discount_amount",
    "total",
    "status",
    "referral_code",
  ];
  const lines = [header.join(",")];
  for (const o of orders) {
    lines.push(
      [
        esc(o.id),
        esc(o.createdAt),
        esc(o.name),
        esc(o.email),
        esc(o.items.map((i) => i.productName).join(" | ")),
        esc(o.subtotal.toFixed(2)),
        esc(o.discountCode || ""),
        esc(o.discountAmount.toFixed(2)),
        esc(o.total.toFixed(2)),
        esc(o.status),
        esc(o.referralCode || ""),
      ].join(",")
    );
  }

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="quay-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
