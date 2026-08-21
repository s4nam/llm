"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export default function TwoFactorLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  async function verify(useRecovery: boolean) {
    const value = useRecovery ? code : token;
    if (!value.trim()) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/login-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(useRecovery ? { code: value } : { token: value }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage({ type: "err", text: data.error ?? "Kode salah." });
      return;
    }
    setMessage({ type: "ok", text: "Verifikasi berhasil. Mengalihkan..." });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Verifikasi Dua Langkah</h1>
        <p className="mt-1 text-sm text-slate-500">
          Akun admin Anda dilindungi 2FA. Masukkan kode dari aplikasi autentikator
          untuk melanjutkan.
        </p>

        {!showRecovery ? (
          <div className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="token" className="mb-1 block text-sm font-medium text-slate-700">
                Kode 6 digit
              </label>
              <input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center font-mono text-lg tracking-widest text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
              />
            </div>
            <button
              type="button"
              onClick={() => verify(false)}
              disabled={busy || !token}
              className="rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? "Memeriksa..." : "Verifikasi"}
            </button>
            <button
              type="button"
              onClick={() => setShowRecovery(true)}
              disabled={busy}
              className="text-sm font-medium text-brand hover:underline disabled:opacity-50"
            >
              Gunakan kode cadangan
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              Masukkan salah satu kode cadangan yang Anda simpan saat mengaktifkan 2FA.
            </p>
            <div>
              <label htmlFor="code" className="mb-1 block text-sm font-medium text-slate-700">
                Kode cadangan
              </label>
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                maxLength={12}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center font-mono text-lg tracking-widest text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
              />
            </div>
            <button
              type="button"
              onClick={() => verify(true)}
              disabled={busy || !code}
              className="rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? "Memeriksa..." : "Verifikasi"}
            </button>
            <button
              type="button"
              onClick={() => setShowRecovery(false)}
              disabled={busy}
              className="text-sm font-medium text-brand hover:underline disabled:opacity-50"
            >
              Kembali ke kode biasa
            </button>
          </div>
        )}

        {message && (
          <p
            className={`mt-4 rounded-xl p-3 text-sm ${
              message.type === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
