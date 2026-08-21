"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  signup,
  resendVerification,
  changeEmailBeforeVerify,
} from "@/app/actions/auth";
import { Logo } from "@/components/logo";

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

const KNOWN_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "proton.me",
  "yahoo.co.id",
  "gmail.co.id",
  "yandex.com",
  "aol.com",
];

function suggestEmailCorrection(email: string): string | null {
  if (!email.includes("@")) return null;
  const [local, domain] = email.trim().split("@");
  if (!local || !domain) return null;
  const d = domain.toLowerCase().trim().replace(/\.$/, "");
  const candidates = KNOWN_DOMAINS.filter(
    (known) => known.length - d.length <= 3 && d.length - known.length <= 2,
  );
  let best: { domain: string; dist: number } | null = null;
  for (const known of candidates) {
    const dist = levenshtein(d, known);
    if (dist <= 2 && dist < d.length) {
      if (!best || dist < best.dist) best = { domain: known, dist };
    }
  }
  return best && best.domain !== d ? `${local}@${best.domain}` : null;
}

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendState, setResendState] = useState<{
    loading: boolean;
    message?: string;
  }>({ loading: false });
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [changeState, changeAction, changePending] = useActionState(
    changeEmailBeforeVerify,
    undefined,
  );

  async function handleResend() {
    const emailInput = document.getElementById(
      "email",
    ) as HTMLInputElement | null;
    const email = emailInput?.value.trim();
    if (!email) return;
    setResendState({ loading: true });
    const res = await resendVerification(email);
    setResendState({ loading: false, message: res.message });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Buat Akun</h1>
        <p className="mt-1 text-sm text-slate-500">
          Mulai belajar Bahasa Inggris dengan mudah.
        </p>

        <form action={action} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
              Nama Lengkap
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Rina Puspita"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
            />
            {state?.errors?.name && (
              <p className="mt-1 text-sm text-danger">{state.errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
            />
            {state?.errors?.email && (
              <p className="mt-1 text-sm text-danger">{state.errors.email}</p>
            )}
            {email && !state?.errors?.email && (
              <EmailSuggestion
                email={email}
                onChange={setEmail}
              />
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-12 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {state?.errors?.password && (
              <ul className="mt-1 text-sm text-danger">
                {state.errors.password.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <label className="flex items-start gap-2">
              <input type="checkbox" name="consent" required className="mt-1" />
              <span>
                Saya menyetujui{" "}
                <Link href="/syarat-ketentuan" className="text-brand underline">
                  Syarat &amp; Ketentuan
                </Link>{" "}
                dan{" "}
                <Link href="/kebijakan-privasi" className="text-brand underline">
                  Kebijakan Privasi
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="parentalConsent" required className="mt-1" />
              <span>
                Saya berusia 17 tahun ke atas, atau memiliki izin dari orang
                tua/wali.
              </span>
            </label>
          </div>

          {state?.message && (
            <div className="rounded-lg bg-success/10 p-3 text-sm text-success">
              <p>{state.message}</p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState.loading}
                className="mt-2 font-semibold underline disabled:opacity-50"
              >
                {resendState.loading
                  ? "Mengirim ulang..."
                  : "Kirim ulang email verifikasi"}
              </button>
              {resendState.message && (
                <p className="mt-2 text-slate-600">{resendState.message}</p>
              )}
              <p className="mt-2 text-slate-600">
                Tidak menerima email verifikasi dalam 5 menit? Cek folder spam,
                lalu pastikan alamat email yang Anda daftarkan benar.
              </p>
              <button
                type="button"
                onClick={() => setShowChangeEmail((v) => !v)}
                className="mt-1 font-semibold text-brand underline"
              >
                {showChangeEmail ? "Tutup" : "Email salah? Ubah email"}
              </button>

              {showChangeEmail && (
                <form
                  action={changeAction}
                  className="mt-3 flex flex-col gap-2 border-t border-success/20 pt-3 text-left"
                >
                  <div>
                    <label
                      htmlFor="oldEmail"
                      className="mb-1 block text-xs font-medium text-slate-700"
                    >
                      Email yang didaftarkan
                    </label>
                    <input
                      id="oldEmail"
                      name="oldEmail"
                      type="email"
                      required
                      defaultValue={email}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="newEmail"
                      className="mb-1 block text-xs font-medium text-slate-700"
                    >
                      Email yang benar
                    </label>
                    <input
                      id="newEmail"
                      name="newEmail"
                      type="email"
                      required
                      placeholder="kamu@email.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
                    />
                  </div>
                  {changeState?.errors?.email && (
                    <p className="text-sm text-danger">
                      {changeState.errors.email}
                    </p>
                  )}
                  {changeState?.message && (
                    <p className="text-sm text-success">
                      {changeState.message}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={changePending}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
                  >
                    {changePending ? "Mengubah..." : "Ubah Email"}
                  </button>
                </form>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Membuat akun..." : "Daftar"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <a
            href="/auth/google"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Lanjutkan dengan Google
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-medium text-brand">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}

function EmailSuggestion({
  email,
  onChange,
}: {
  email: string;
  onChange: (v: string) => void;
}) {
  const suggestion = suggestEmailCorrection(email);
  if (!suggestion) return null;
  return (
    <p className="mt-1 text-sm text-amber-700">
      Mungkin maksud Anda <span className="font-medium">{suggestion}</span>?{" "}
      <button
        type="button"
        onClick={() => onChange(suggestion)}
        className="font-semibold text-brand underline hover:text-brand-dark"
      >
        Gunakan
      </button>
    </p>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}
