import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Secure checkout — your digital downloads are delivered instantly through expiring, signed download links.",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
