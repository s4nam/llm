"use client";

import { useState } from "react";

export default function ClaimCertificate({
  levelCode,
  existingCode,
}: {
  levelCode: string;
  existingCode?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(existingCode ?? null);

  async function claim() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/certificate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ levelCode }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Terjadi kesalahan.");
      return;
    }
    if (data.eligible) {
      setCode(data.code);
      setMessage("Selamat! Sertifikat level ini sudah diterbitkan. 🎉");
    } else {
      setMessage(
        `Belum bisa mengklaim. Selesaikan dulu semua pelajaran dengan nilai ≥60% (${data.completed}/${data.total} selesai).`,
      );
    }
  }

  return (
    <div className="rounded-2xl border-2 border-brand bg-brand-light/30 p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        🏅 Sertifikat Level {levelCode}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Selesaikan semua pelajaran di level ini dengan nilai minimal 60% untuk
        mendapatkan sertifikat.
      </p>
      {code ? (
        <div className="mt-4">
          <p className="text-sm text-success">Sertifikat Anda sudah siap!</p>
          <a
            href={`/cek-sertifikat/${code}`}
            className="mt-3 inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
          >
            Lihat Sertifikat
          </a>
        </div>
      ) : (
        <button
          type="button"
          onClick={claim}
          disabled={loading}
          className="mt-4 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "Memeriksa..." : "Klaim Sertifikat"}
        </button>
      )}
      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    </div>
  );
}
