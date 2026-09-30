import type { MetadataRoute } from "next";
import { store } from "@/lib/store";
import { siteUrl } from "@/lib/stripe";

/** Sitemap: static storefront routes + every product page. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  let products: { slug: string }[] = [];
  try {
    products = await store.products.all();
  } catch {
    products = [];
  }
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/checkout`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
