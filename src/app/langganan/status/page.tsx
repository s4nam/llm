"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/header";

function PaymentStatusInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") ?? "";
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "expired">(
    () => (orderId ? "checking" : "expired"),
  );
  const [error, setError] = useState<string | null>(() =>
    orderId ? null : "Tidak ada order yang ditemukan.",
  );

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`/api/payments/status?order_id=${encodeURIComponent(orderId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.status === "paid") setStatus("paid");
        else if (data.status === "expired") setStatus("expired");
        else setStatus("pending");
      } catch {
        if (!cancelled) setError("Gagal memeriksa status.");
      }
    }
    check();
    // cek ulang beberapa kali
    const id = setInterval(check, 5000);
    setTimeout(() => clearInterval(id), 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [orderId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {status === "checking" && (
          <>
            <p className="text-4xl">⏳</p>
            <h1 className="mt-3 text-xl font-bold text-slate-900">
              Memeriksa pembayaran...
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Jika Anda sudah membayar, status akan diperbarui otomatis.
            </p>
          </>
        )}

        {status === "paid" && (
          <>
            <p className="text-4xl">✅</p>
            <h1 className="mt-3 text-xl font-bold text-success">
              Pembayaran berhasil!
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Selamat, akun member Anda sudah aktif. Cek email untuk invoice.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-xl bg-brand px-8 py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              Lanjut Belajar
            </Link>
          </>
        )}

        {status === "pending" && (
          <>
            <p className="text-4xl">⏱️</p>
            <h1 className="mt-3 text-xl font-bold text-slate-900">
              Menunggu pembayaran
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Silakan selesaikan pembayaran Anda. Halaman ini memeriksa
              otomatis. Jika sudah membayar tapi belum berubah, tunggu
              sebentar.
            </p>
            <Link
              href="/langganan"
              className="mt-6 inline-block rounded-xl border border-slate-300 px-8 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Kembali ke Langganan
            </Link>
          </>
        )}

        {status === "expired" && (
          <>
            <p className="text-4xl">⌛</p>
            <h1 className="mt-3 text-xl font-bold text-slate-900">
              Pembayaran kedaluwarsa
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Waktu pembayaran habis. Buat pesanan baru untuk melanjutkan.
            </p>
            <Link
              href="/langganan"
              className="mt-6 inline-block rounded-xl bg-brand px-8 py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              Coba Lagi
            </Link>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>
        )}
      </div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={null}>
      <PaymentStatusInner />
    </Suspense>
  );
}
