import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/stripe";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/", "/d/", "/success", "/checkout"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
