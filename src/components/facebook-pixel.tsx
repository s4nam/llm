"use client";

import { useState } from "react";

const COOKIE_KEY = "em_cookie_consent";

/**
 * Facebook Pixel — hanya dimuat jika pengguna mengizinkan cookie iklan
 * (kepatuhan UU PDP). Pixel memuat sekali lalu mengirim event.
 */
export default function FacebookPixel() {
  useState(() => {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem(COOKIE_KEY) !== "allowed") return false;
    const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
    if (!pixelId) return false;

    try {
      const w = window as unknown as {
        fbq?: unknown;
        _fbq?: unknown[];
      };
      w._fbq = w._fbq || [];
      // fbq library loader
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.body.appendChild(script);

      w.fbq = (...args: unknown[]) => {
        w._fbq?.push(args);
      };
      const fbq = w.fbq as (cmd: string, ev: string, ...rest: unknown[]) => void;
      fbq("init", pixelId);
      fbq("track", "PageView");
      return true;
    } catch {
      return false;
    }
  });

  return null;
}
