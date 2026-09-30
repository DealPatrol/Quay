"use client";

import { useEffect } from "react";
import { ensureFbpCookie } from "@/lib/meta-browser";

/**
 * Loads the Meta Pixel base snippet and fires PageView.
 * Rendered by the root layout ONLY when NEXT_PUBLIC_META_PIXEL_ID is set.
 */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  useEffect(() => {
    ensureFbpCookie();
    try {
      const w = window as any;
      if (w.fbq) return;
      const fbq = function (...args: any[]) {
        (fbq as any).callMethod
          ? (fbq as any).callMethod.apply(fbq, args)
          : (fbq as any).queue.push(args);
      };
      w.fbq = fbq;
      if (!w._fbq) w._fbq = fbq;
      (fbq as any).push = fbq;
      (fbq as any).loaded = true;
      (fbq as any).version = "2.0";
      (fbq as any).queue = [];
      const t = document.createElement("script");
      t.async = true;
      t.src = "https://connect.facebook.net/en_US/fbevents.js";
      const s = document.getElementsByTagName("script")[0];
      s.parentNode!.insertBefore(t, s);
      (w.fbq as any)("init", pixelId);
      (w.fbq as any)("track", "PageView");
    } catch {
      /* tracking must never break the page */
    }
  }, [pixelId]);
  return null;
}
