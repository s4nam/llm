"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

type Status = "loading" | "ok" | "error";

function detectStatus(): Status {
  if (typeof window === "undefined") return "loading";
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const type = params.get("type");

  if (type === "signup" || type === "recovery" || type === "invite") {
    return "ok";
  }
  if (hash.length === 0) {
    return "error";
  }
  return "ok";
}

export default function AuthConfirmPage() {
  // Selalu mulai "loading" (server & client sama) agar tidak terjadi
  // hydration mismatch. Status sebenarnya dideteksi setelah render di browser.
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const t = setTimeout(() => setStatus(detectStatus()), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {status === "loading" && (
          <p className="text-slate-600">Memproses...</p>
        )}

        {status === "ok" && (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Berhasil!</h1>
            <p className="mt-2 text-slate-600">
              Akun Anda sudah terverifikasi. Silakan masuk untuk mulai
              belajar.
            </p>
            <Link
              href="/masuk"
              className="mt-6 inline-block rounded-xl bg-brand px-8 py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              Masuk
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold text-slate-900">
              Tautan Tidak Valid
            </h1>
            <p className="mt-2 text-slate-600">
              Tautan verifikasi tidak dikenali. Pastikan Anda membuka tautan
              lengkap dari email (berlaku 24 jam).
            </p>
            <Link
              href="/masuk"
              className="mt-6 inline-block rounded-xl bg-brand px-8 py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              Kembali ke Masuk
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
