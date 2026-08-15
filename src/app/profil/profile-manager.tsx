"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/actions/login";

export default function ProfileManager({
  userId,
  name: initialName,
  email,
  provider,
  hasPassword,
}: {
  userId: string;
  name: string;
  email: string;
  provider?: string;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(url: string, method: string, body: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "err", text: data.error ?? "Terjadi kesalahan." });
      return { ok: false, data };
    }
    return { ok: true, data };
  }

  async function saveName() {
    setBusy("name");
    setMessage(null);
    const res = await act("/api/profile", "PATCH", { name });
    setBusy(null);
    if (res.ok) {
      setMessage({ type: "ok", text: "Nama diperbarui." });
      router.refresh();
    }
  }

  async function saveEmail() {
    if (!newEmail) return;
    setBusy("email");
    setMessage(null);
    const res = await act("/api/profile", "POST", { action: "change-email", email: newEmail });
    setBusy(null);
    if (res.ok) {
      setMessage({
        type: "ok",
        text: "Email verifikasi dikirim ke alamat baru Anda. Setelah verifikasi, email berubah.",
      });
      setNewEmail("");
    }
  }

  async function savePassword() {
    if (!currentPassword || !newPassword) {
      setMessage({ type: "err", text: "Isi kata sandi lama dan baru." });
      return;
    }
    setBusy("password");
    setMessage(null);
    const res = await act("/api/profile", "POST", {
      action: "change-password",
      currentPassword,
      newPassword,
    });
    setBusy(null);
    if (res.ok) {
      setMessage({ type: "ok", text: "Kata sandi berhasil diubah." });
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  async function exportData() {
    setBusy("export");
    setMessage(null);
    const res = await act("/api/profile", "POST", { action: "export" });
    setBusy(null);
    if (res.ok) {
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data-englishmudah-${userId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "ok", text: "Data berhasil diunduh (format JSON)." });
    }
  }

  async function deleteAccount() {
    const confirmText = window.prompt(
      "Ketik kata HAPUS untuk menghapus akun Anda secara permanen. Sertifikat dan semua data akan hilang dan tidak bisa dipulihkan.",
    );
    if (confirmText !== "HAPUS") {
      setMessage({ type: "err", text: "Dibatalkan. Ketik HAPUS untuk melanjutkan." });
      return;
    }
    setBusy("delete");
    setMessage(null);
    const res = await act("/api/profile", "POST", { action: "delete" });
    if (res.ok) {
      // logout lalu ke beranda
      await logout();
      router.push("/");
    } else {
      setBusy(null);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light";

  return (
    <div className="mt-6 flex flex-col gap-6">
      {message && (
        <p
          className={`rounded-xl p-4 text-sm ${
            message.type === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Nama */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Nama Tampilan</h2>
        <p className="mt-1 text-sm text-slate-500">
          Dipakai di sertifikat dan email.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            className={inputCls}
          />
          <button
            onClick={saveName}
            disabled={busy !== null}
            className="shrink-0 rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy === "name" ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </section>

      {/* Email */}
      {hasPassword && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Ganti Email</h2>
          <p className="mt-1 text-sm text-slate-500">
            Saat ini: <span className="font-medium text-slate-700">{email}</span>.
            Anda akan menerima email verifikasi ke alamat baru.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email-baru@anda.com"
              className={inputCls}
            />
            <button
              onClick={saveEmail}
              disabled={busy !== null}
              className="shrink-0 rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {busy === "email" ? "Mengirim..." : "Ganti Email"}
            </button>
          </div>
        </section>
      )}

      {/* Password */}
      {hasPassword && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Ganti Kata Sandi</h2>
          <div className="mt-4 flex flex-col gap-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Kata sandi saat ini"
              className={inputCls}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Kata sandi baru (min. 8 karakter)"
              minLength={8}
              className={inputCls}
            />
            <button
              onClick={savePassword}
              disabled={busy !== null}
              className="self-start rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {busy === "password" ? "Mengubah..." : "Ubah Kata Sandi"}
            </button>
          </div>
        </section>
      )}

      {provider === "google" && !hasPassword && (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Anda masuk dengan Google. Untuk mengganti email atau kata sandi,
          kelola lewat akun Google Anda.
        </p>
      )}

      {/* Data */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Data Pribadi</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sesuai UU PDP, Anda berhak mengunduh salinan data Anda.
        </p>
        <button
          onClick={exportData}
          disabled={busy !== null}
          className="mt-4 rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {busy === "export" ? "Menyiapkan..." : "Unduh Data Saya (JSON)"}
        </button>
      </section>

      {/* Hapus akun */}
      <section className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
        <h2 className="text-lg font-semibold text-danger">Hapus Akun</h2>
        <p className="mt-1 text-sm text-slate-600">
          Menghapus akun menghilangkan seluruh data: progress, skor, dan
          sertifikat secara permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
        <button
          onClick={deleteAccount}
          disabled={busy !== null}
          className="mt-4 rounded-xl bg-danger px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy === "delete" ? "Menghapus..." : "Hapus Akun"}
        </button>
      </section>
    </div>
  );
}
