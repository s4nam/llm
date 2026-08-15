"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export default function AdminSetupPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function claim() {
    if (!code.trim()) {
      setMessage({ type: "err", text: "Masukkan kode admin." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage({ type: "err", text: data.error ?? "Gagal." });
      return;
    }
    setMessage({
      type: "ok",
      text: "Selamat! Anda sekarang admin. Mengalihkan ke dashboard admin...",
    });
    setTimeout(() => router.push("/admin"), 1200);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Klaim Admin</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Anda sudah masuk. Masukkan <b>kode admin</b> (dari file{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 text-xs">.env.local</code>)
          untuk menjadi admin pertama aplikasi.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Kode ini hanya berfungsi jika belum ada admin lain di sistem.
        </p>

        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Masukkan kode admin"
          className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
        />

        {message && (
          <p
            className={`mt-3 rounded-xl p-3 text-sm ${
              message.type === "ok"
                ? "bg-success/10 text-success"
                : "bg-danger/10 text-danger"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="button"
          onClick={claim}
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Memproses..." : "Jadikan Saya Admin"}
        </button>
      </div>
    </div>
  );
}
