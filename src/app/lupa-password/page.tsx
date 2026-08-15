"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
    } else {
      setMessage(
        "Jika email terdaftar, kami kirim tautan atur ulang kata sandi. Cek folder inbox/spam (berlaku 24 jam).",
      );
    }
    setPending(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Lupa Kata Sandi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Masukkan email Anda. Kami kirim tautan untuk mengatur ulang kata
          sandi.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>
          )}
          {message && (
            <p className="rounded-lg bg-success/10 p-3 text-sm text-success">{message}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Mengirim..." : "Kirim Tautan Reset"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/masuk" className="font-medium text-brand">
            Kembali ke Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
