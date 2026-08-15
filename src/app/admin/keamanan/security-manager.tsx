"use client";

import { useEffect, useState } from "react";

export default function SecurityManager() {
  const [enabled, setEnabled] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(false);
  const [provisioningUri, setProvisioningUri] = useState("");
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "showCodes" | "disable">("idle");
  const [secret, setSecret] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/security")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setEnabled(data.enabled);
        setHasRecovery(data.hasRecovery);
        setProvisioningUri(data.provisioningUri ?? "");
      })
      .catch(() => {});
  }, []);

  async function startSetup() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage({ type: "err", text: data.error });
      return;
    }
    setSecret(data.secret);
    setRecoveryCodes(data.recoveryCodes);
    setProvisioningUri(data.provisioningUri);
    setStep("setup");
  }

  async function verifySetup() {
    if (!token.trim()) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", token }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage({ type: "err", text: data.error });
      return;
    }
    setEnabled(true);
    setStep("showCodes");
    setMessage({ type: "ok", text: "2FA berhasil diaktifkan! Simpan kode cadangan di bawah." });
  }

  async function disable2fa() {
    if (!token.trim()) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable", token }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage({ type: "err", text: data.error });
      return;
    }
    setEnabled(false);
    setHasRecovery(false);
    setStep("idle");
    setMessage({ type: "ok", text: "2FA dinonaktifkan." });
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      {message && (
        <p
          className={`rounded-xl p-4 text-sm ${
            message.type === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Verifikasi Dua Langkah (2FA)
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Lindungi akun admin dengan kode dari aplikasi autentikator (Google
          Authenticator, Authy, dll).
        </p>

        <div className="mt-4">
          {!enabled ? (
            <>
              {step === "idle" && (
                <button
                  onClick={startSetup}
                  disabled={busy}
                  className="rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {busy ? "Menyiapkan..." : "Aktifkan 2FA"}
                </button>
              )}

              {step === "setup" && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    {provisioningUri && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(provisioningUri)}&size=200x200`}
                        alt="QR Code untuk aplikasi autentikator"
                        width={180}
                        height={180}
                        className="rounded-xl border border-slate-200"
                      />
                    )}
                    <div className="text-sm text-slate-600">
                      <p className="font-medium text-slate-800">
                        1. Buka aplikasi autentikator & pindai QR di samping.
                      </p>
                      <p className="mt-2">Atau masukkan kode secret ini secara manual:</p>
                      <code className="mt-1 block rounded-lg bg-surface px-3 py-2 font-mono text-xs text-brand">
                        {secret}
                      </code>
                      <p className="mt-3 font-medium text-slate-800">
                        2. Masukkan kode 6 digit dari aplikasi:
                      </p>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="123456"
                          inputMode="numeric"
                          maxLength={6}
                          className="w-40 rounded-lg border border-slate-300 px-4 py-2.5 text-center font-mono text-lg tracking-widest outline-none focus:border-brand"
                        />
                        <button
                          onClick={verifySetup}
                          disabled={busy || !token}
                          className="rounded-xl bg-success px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {busy ? "Memeriksa..." : "Aktifkan"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === "showCodes" && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
                  <h3 className="font-semibold text-amber-900">
                    ⚠️ Simpan kode cadangan ini di tempat aman
                  </h3>
                  <p className="mt-1 text-sm text-amber-800">
                    Setiap kode hanya bisa dipakai sekali. Gunakan saat ponsel
                    Anda hilang atau aplikasi autentikator tidak bisa dibuka.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {recoveryCodes.map((c) => (
                      <code
                        key={c}
                        className="rounded-lg bg-white px-2 py-1.5 text-center font-mono text-xs font-bold text-slate-800"
                      >
                        {c}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm text-success">
                ✓ 2FA aktif {hasRecovery ? "• kode cadangan tersimpan" : ""}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Kode 6 digit untuk menonaktifkan"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full max-w-xs rounded-lg border border-slate-300 px-4 py-2.5 font-mono tracking-widest outline-none focus:border-brand"
                />
                <button
                  onClick={disable2fa}
                  disabled={busy || !token}
                  className="rounded-xl border border-danger px-5 py-2.5 font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
                >
                  {busy ? "Memproses..." : "Nonaktifkan 2FA"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
