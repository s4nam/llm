"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const COOKIE_KEY = "em_cookie_consent";

export default function CookieBanner() {
  // Selalu mulai tersembunyi (server & client sama) agar tidak terjadi
  // hydration mismatch. Banner muncul setelah render di browser.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (typeof window !== "undefined" && !localStorage.getItem(COOKIE_KEY)) {
        setVisible(true);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function decide(choice: "allowed" | "denied") {
    localStorage.setItem(COOKIE_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Pengaturan cookie"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-600">
          Kami menggunakan cookie untuk iklan dan analitik agar pengalaman
          belajar Anda lebih baik. Materi belajar tetap bisa dipakai tanpa
          izin.{" "}
          <Link href="/kebijakan-privasi" className="text-brand underline">
            Baca Kebijakan Privasi
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("denied")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Tolak
          </button>
          <button
            type="button"
            onClick={() => decide("allowed")}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Izinkan
          </button>
        </div>
      </div>
    </div>
  );
}
