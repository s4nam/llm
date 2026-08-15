"use client";

import Link from "next/link";
import { useState } from "react";

const COOKIE_KEY = "em_cookie_consent";

function hasConsent(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(COOKIE_KEY) !== null;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => !hasConsent());

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
