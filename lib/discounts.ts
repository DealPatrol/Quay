import { store } from "./store";

/** Shared discount evaluation: returns {ok, amount, message}. */
export async function evaluateDiscount(code: string, subtotal: number) {
  const d = (await store.discounts.all()).find((x) => x.code.toLowerCase() === code.trim().toLowerCase());
  if (!d) return { ok: false as const, amount: 0, message: "That code doesn't exist." };
  if (!d.active) return { ok: false as const, amount: 0, message: "That code is no longer active." };
  if (d.maxUses && d.usedCount >= d.maxUses)
    return { ok: false as const, amount: 0, message: "That code has run out of uses." };
  if (d.minOrder && subtotal < d.minOrder)
    return { ok: false as const, amount: 0, message: `That code needs a $${d.minOrder}+ order.` };
  const amount =
    d.type === "percent"
      ? Math.round(subtotal * (d.value / 100) * 100) / 100
      : Math.min(d.value, subtotal);
  return { ok: true as const, amount, message: `${d.code} applied — you save $${amount.toFixed(2)}.` };
}
