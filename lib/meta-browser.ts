"use client";

/**
 * Browser-side Meta Pixel helpers (client components only).
 * No-ops when the pixel isn't loaded — the snippet only renders when
 * NEXT_PUBLIC_META_PIXEL_ID is set.
 */
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

/** One id per user action — pass the SAME id to CAPI for dedup. */
export function metaEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

/** fbq track with an optional dedup eventID. Safe no-op without the pixel. */
export function trackPixel(
  name: string,
  params?: Record<string, unknown>,
  eventId?: string
): void {
  try {
    if (typeof window === "undefined" || typeof window.fbq !== "function") return;
    if (eventId) window.fbq("track", name, params || {}, { eventID: eventId });
    else window.fbq("track", name, params || {});
  } catch {
    /* tracking must never break the page */
  }
}

/** Ensure a first-party _fbp cookie exists (used by CAPI for matching). */
export function ensureFbpCookie(): void {
  try {
    if (typeof document === "undefined") return;
    if (/(?:^|;\s*)_fbp=/.test(document.cookie)) return;
    const v = `fb.1.${Date.now()}.${Math.floor(Math.random() * 1e10)}`;
    document.cookie = `_fbp=${v}; path=/; max-age=${90 * 24 * 3600}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}
