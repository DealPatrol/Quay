export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { store, uid } from "@/lib/store";
import { isAdminRequest } from "@/lib/admin-auth";
import type { Product } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await store.products.all());
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name || !body.slug || typeof body.price !== "number") {
    return NextResponse.json({ error: "name, slug, and numeric price are required" }, { status: 400 });
  }
  const products = await store.products.all();
  if (products.some((p) => p.slug === body.slug)) {
    return NextResponse.json({ error: "slug already exists" }, { status: 400 });
  }
  const product: Product = {
    id: uid("prod_"),
    slug: body.slug,
    name: body.name,
    tagline: body.tagline || "",
    description: body.description || "",
    category: body.category || "Uncategorized",
    price: body.price,
    compareAt: body.compareAt,
    rating: 5,
    reviewCount: 0,
    salesCount: 0,
    cover: body.cover || { bg: "#FF4D00", fg: "#FAF6EE", accent: "#141210", pattern: "dots", initials: "Q" },
    files: body.files || [],
    sampleFile: body.sampleFile || "license.txt",
    bump: body.bump,
    requiresLicense: !!body.requiresLicense,
    billing: body.billing === "recurring" ? "recurring" : "once",
    recurringInterval: body.billing === "recurring" ? (body.recurringInterval || "month") : undefined,
    createdAt: new Date().toISOString(),
  };
  products.push(product);
  await store.products.save(products);
  return NextResponse.json(product, { status: 201 });
}
