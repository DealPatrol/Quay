"use client";

export interface CartLine {
  productId: string;
  bump: boolean;
}

const KEY = "quay_cart_v1";

export function getCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as CartLine[];
  } catch {
    return [];
  }
}

export function setCart(lines: CartLine[]): void {
  localStorage.setItem(KEY, JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent("quay:cart"));
}

export function addToCart(productId: string, bump = false): void {
  const cart = getCart();
  if (!cart.some((l) => l.productId === productId)) {
    cart.push({ productId, bump });
    setCart(cart);
  }
}

export function clearCart(): void {
  setCart([]);
}
