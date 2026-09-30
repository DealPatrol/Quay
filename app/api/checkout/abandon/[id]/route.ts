export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store } from "@/lib/store";

/**
 * GET /api/checkout/abandon/[id] — fetch an abandoned cart for the restore
 * link in reminder emails (?restore=<id>). The id is an unguessable uid, so
 * no auth is needed; recovered carts are not restorable.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const cart = (await store.abandoned.all()).find((c) => c.id === params.id);
  if (!cart || cart.recoveredOrderId) {
    return NextResponse.json({ error: "Cart not found." }, { status: 404 });
  }
  return NextResponse.json({
    id: cart.id,
    email: cart.email,
    name: cart.name,
    items: cart.items.map((i) => ({ productId: i.productId, bump: i.bump })),
    total: cart.total,
  });
}
