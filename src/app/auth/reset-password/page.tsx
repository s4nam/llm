"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    if (password.length < 8) {
      setMessage({ type: "err", text: "Kata sandi minimal 8 karakter." });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: "err", text: "Konfirmasi kata sandi tidak cocok." });
      return;
    }
    setPending(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setMessage({ type: "err", text: data.error ?? "Terjadi kesalahan. Coba lagi." });
      return;
    }
    setMessage({
      type: "ok",
      text: "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.",
    });
    setPassword("");
    setConfirm("");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Atur Ulang Kata Sandi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Masukkan kata sandi baru untuk akun Anda.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Kata Sandi Baru
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              suppressHydrationWarning
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-slate-700">
              Konfirmasi Kata Sandi
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              suppressHydrationWarning
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
            />
          </div>

          {message && (
            <p
              className={`rounded-xl p-3 text-sm ${
                message.type === "ok"
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            suppressHydrationWarning
            disabled={pending}
            className="rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Menyimpan..." : "Simpan Kata Sandi"}
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