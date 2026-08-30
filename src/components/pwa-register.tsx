"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Jangan register di development localhost jika SW belum ada
    const swUrl = "/sw.js";
    let cancelled = false;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });
        // Jika ada update, langsung aktifkan
        if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (nw) {
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                // Versi baru siap — bisa tampilkan toast "Update tersedia, refresh"
                // Untuk TWA/PWA ini skipWaiting sudah dipanggil di SW, jadi reload otomatis next visit
              }
            });
          }
        });

        // Cek update tiap 60 menit
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      } catch {
        // SW gagal register tidak mengganggu aplikasi
      }
    };

    // Register setelah load agar tidak block first paint
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      cancelled = true;
      void cancelled;
    };
  }, []);

  return null;
}
