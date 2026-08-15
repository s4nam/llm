"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: { onSuccess?: () => void; onPending?: () => void; onClose?: () => void; onError?: () => void },
      ) => void;
    };
  }
}

interface Coupon {
  code: string;
  discount_type: "percent" | "nominal";
  discount_value: number;
}

export default function SubscriptionManager({
  monthly,
  yearly,
  midtransClientKey,
  midtransReady,
  isMember,
  trialAvailable,
  coupons,
}: {
  monthly: number;
  yearly: number;
  midtransClientKey: string;
  midtransReady: boolean;
  isMember: boolean;
  trialAvailable: boolean;
  coupons: Coupon[];
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [couponCode, setCouponCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [trialMsg, setTrialMsg] = useState<string | null>(null);

  useEffect(() => {
    // Load Snap.js dari Midtrans
    if (midtransReady && !document.getElementById("midtrans-snap-script")) {
      const script = document.createElement("script");
      script.id = "midtrans-snap-script";
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
      script.setAttribute("data-client-key", midtransClientKey);
      document.body.appendChild(script);
    }
  }, [midtransReady, midtransClientKey]);

  const price = plan === "yearly" ? yearly : monthly;

  async function startPayment() {
    if (!midtransReady) {
      setMessage("Pembayaran belum diaktifkan. Hubungi admin.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/payments/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, couponCode: couponCode.trim() }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Gagal membuat pembayaran.");
      return;
    }
    if (window.snap) {
      window.snap.pay(data.snapToken, {
        onSuccess: () => router.push("/langganan/status?order_id=" + data.orderId),
        onPending: () => router.push("/langganan/status?order_id=" + data.orderId),
        onClose: () => setMessage("Pembayaran ditutup. Anda bisa melanjutkan kapan saja."),
        onError: () => setMessage("Terjadi kesalahan saat pembayaran."),
      });
    } else {
      router.push("/langganan/status?order_id=" + data.orderId);
    }
  }

  async function startTrial() {
    setBusy(true);
    setTrialMsg(null);
    const res = await fetch("/api/trial", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setTrialMsg(data.error ?? "Gagal memulai trial.");
      return;
    }
    setTrialMsg("Trial 3 hari aktif! Selamat mencoba akses penuh. 🎉");
    setTimeout(() => router.refresh(), 1500);
  }

  const formatRp = (n: number) => n.toLocaleString("id-ID");

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* Trial */}
      {trialAvailable && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Trial 3 hari gratis
              </h3>
              <p className="text-sm text-slate-500">
                Akses penuh selama 72 jam. Hanya sekali per orang, tanpa kartu.
              </p>
              {trialMsg && <p className="mt-1 text-sm text-success">{trialMsg}</p>}
            </div>
            <button
              type="button"
              onClick={startTrial}
              disabled={busy}
              className="shrink-0 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? "Mengaktifkan..." : "Mulai Trial 3 Hari"}
            </button>
          </div>
        </div>
      )}

      {/* Pilih paket */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Pilih Paket</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Bulanan */}
          <button
            type="button"
            onClick={() => setPlan("monthly")}
            className={`rounded-2xl border-2 p-6 text-left transition ${
              plan === "monthly" ? "border-brand bg-brand-light/30" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <p className="text-sm font-medium text-slate-500">Bulanan</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              Rp {formatRp(monthly)}
              <span className="text-sm font-normal text-slate-400">/bulan</span>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Cocok untuk mencoba. Perpanjang manual tiap bulan.
            </p>
          </button>

          {/* Tahunan */}
          <button
            type="button"
            onClick={() => setPlan("yearly")}
            className={`rounded-2xl border-2 p-6 text-left transition ${
              plan === "yearly" ? "border-brand bg-brand-light/30" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <p className="text-sm font-medium text-slate-500">
              Tahunan{" "}
              <span className="ml-1 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                Hemat {Math.round((1 - yearly / (monthly * 12)) * 100)}%
              </span>
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              Rp {formatRp(yearly)}
              <span className="text-sm font-normal text-slate-400">/tahun</span>
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Pilihan paling hemat untuk belajar serius.
            </p>
          </button>
        </div>

        {/* Kupon */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Kode kupon (jika ada)"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand sm:max-w-xs"
          />
          {coupons.length > 0 && (
            <p className="text-xs text-slate-400">
              Kupon aktif: {coupons.map((c) => c.code).join(", ")}
            </p>
          )}
        </div>

        {message && (
          <p className="mt-3 rounded-xl bg-danger/10 p-3 text-sm text-danger">{message}</p>
        )}

        <button
          type="button"
          onClick={startPayment}
          disabled={busy || isMember}
          className="mt-5 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {isMember
            ? "Anda sudah menjadi member"
            : busy
              ? "Membuat pembayaran..."
              : `Bayar Rp ${formatRp(price)}`}
        </button>
        <p className="mt-2 text-center text-xs text-slate-400">
          Pembayaran aman melalui Midtrans: QRIS, transfer bank (VA), GoPay,
          OVO, DANA, ShopeePay.
        </p>
      </section>
    </div>
  );
}
