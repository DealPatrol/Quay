import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { MetaPixel } from "./components/MetaPixel";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "600", "700", "900"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
  ),
  title: {
    default: "Quay — Sell digital downloads. Get paid. Deliver instantly.",
    template: "%s — Quay",
  },
  description:
    "Quay (pronounced “key”) is the simple storefront for digital products: secure expiring download links, discount codes, order bumps, affiliates, and analytics.",
  openGraph: {
    type: "website",
    siteName: "Quay",
    title: "Quay — Sell digital downloads. Get paid. Deliver instantly.",
    description:
      "The simple storefront for digital products: secure expiring download links, discount codes, order bumps, affiliates, and analytics.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quay — Sell digital downloads",
    description: "Get paid. Deliver instantly. Secure expiring download links for digital products.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        {pixelId ? <MetaPixel pixelId={pixelId} /> : null}
        {children}
      </body>
    </html>
  );
}
