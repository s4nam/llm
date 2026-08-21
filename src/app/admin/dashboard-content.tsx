"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  total_users: number;
  active_members: number;
  new_users_7d: number;
  trial_used: number;
  trial_converted: number;
  revenue_30d: number;
  total_revenue: number;
  pending_reports: number;
}

interface PopularLesson {
  lesson_id: string;
  title: string;
  level_code: string;
  category: string;
  opens: number;
}

interface SeriesPoint {
  day: string;
  amount?: number;
  count?: number;
}

interface Business {
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  revenue_30d: number;
  revenue_total: number;
  revenue_monthly: number;
  revenue_yearly: number;
  avg_transaction: number;
  paid_orders: number;
  pending_orders: number;
  failed_orders: number;
  reg_today: number;
  reg_week: number;
  reg_month: number;
  new_members_today: number;
  new_members_week: number;
  trial_today: number;
  expiring_7d: number;
  churned: number;
  revenue_series: SeriesPoint[];
  reg_series: SeriesPoint[];
}

const fmtRp = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");

function MiniBarChart({
  data,
  color,
  valueLabel,
}: {
  data: { day: string; value: number }[];
  color: string;
  valueLabel: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="mt-4 flex h-36 items-end gap-[2px]">
      {data.map((d) => (
        <div key={d.day} className="group relative flex-1">
          <div
            className="w-full rounded-t"
            style={{
              backgroundColor: color,
              height: `${Math.max((d.value / max) * 100, 3)}%`,
            }}
          />
          <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
            {d.day}: {valueLabel(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [popular, setPopular] = useState<PopularLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setStats(data.stats);
        setPopular(data.popular);
        setBusiness(data.business);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="mt-8 text-slate-400">Memuat data...</p>;
  }

  if (!stats) {
    return (
      <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
        Data belum tersedia. Pastikan migration database sudah dijalankan dan
        Anda login sebagai admin.
      </p>
    );
  }

  const cards = [
    { label: "Total Pengguna", value: stats.total_users.toString(), color: "text-brand" },
    { label: "Member Aktif", value: stats.active_members.toString(), color: "text-success" },
    { label: "Pendaftar Hari Ini", value: (business?.reg_today ?? 0).toString(), color: "text-brand" },
    { label: "Member Baru Hari Ini", value: (business?.new_members_today ?? 0).toString(), color: "text-success" },
    { label: "Trial Baru Hari Ini", value: (business?.trial_today ?? 0).toString(), color: "text-brand" },
    { label: "Uang Masuk Hari Ini", value: fmtRp(business?.revenue_today ?? 0), color: "text-success" },
    { label: "Uang Masuk Bulan Ini", value: fmtRp(business?.revenue_month ?? 0), color: "text-success" },
    { label: "Uang Masuk 30 Hari", value: fmtRp(business?.revenue_30d ?? stats.revenue_30d), color: "text-success" },
    { label: "Konversi Trial", value: stats.trial_used ? `${Math.round((stats.trial_converted / stats.trial_used) * 100)}%` : "0%", color: "text-brand" },
  ];

  const revenueChart = (business?.revenue_series ?? []).map((p) => ({
    day: p.day,
    value: Number(p.amount || 0),
  }));
  const regChart = (business?.reg_series ?? []).map((p) => ({
    day: p.day,
    value: Number(p.count || 0),
  }));

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Peringatan laporan */}
      {stats.pending_reports > 0 && (
        <Link
          href="/admin/laporan"
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 transition hover:bg-amber-100"
        >
          <div>
            <p className="font-semibold text-amber-800">
              {stats.pending_reports} laporan masalah belum ditangani
            </p>
            <p className="text-sm text-amber-700">
              Klik untuk memeriksa dan memperbaiki materi.
            </p>
          </div>
          <span className="text-2xl">📬</span>
        </Link>
      )}

      {/* Peringatan churn */}
      {business && business.expiring_7d > 0 && (
        <Link
          href="/admin/monetisasi"
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 transition hover:bg-amber-100"
        >
          <div>
            <p className="font-semibold text-amber-800">
              {business.expiring_7d} member akan kedaluwarsa dalam 7 hari
            </p>
            <p className="text-sm text-amber-700">
              Kirim pengingat perpanjangan atau hubungi mereka.
            </p>
          </div>
          <span className="text-2xl">⏳</span>
        </Link>
      )}

      {/* Grafik pendapatan & pendaftar */}
      {business ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Pendapatan 30 Hari
            </h2>
            <p className="text-sm text-slate-500">
              Total: {fmtRp(business.revenue_30d)} • Rata-rata per transaksi:{" "}
              {fmtRp(business.avg_transaction)} • Paket bulanan:{" "}
              {fmtRp(business.revenue_monthly)} • Tahunan:{" "}
              {fmtRp(business.revenue_yearly)}
            </p>
            {revenueChart.length === 0 ? (
              <p className="mt-6 text-sm text-slate-400">
                Belum ada transaksi lunas.
              </p>
            ) : (
              <MiniBarChart data={revenueChart} color="#0891b2" valueLabel={(n) => fmtRp(n)} />
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Pendaftar 30 Hari
            </h2>
            <p className="text-sm text-slate-500">
              Hari ini: {business.reg_today} • Minggu ini: {business.reg_week}{" "}
              • Bulan ini: {business.reg_month}
            </p>
            {regChart.length === 0 ? (
              <p className="mt-6 text-sm text-slate-400">
                Belum ada pendaftar.
              </p>
            ) : (
              <MiniBarChart data={regChart} color="#0d9488" valueLabel={(n) => `${n} user`} />
            )}
          </section>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Grafik & rincian bisnis belum tersedia. Jalankan migration{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">
            supabase/migrations/021_business_report.sql
          </code>{" "}
          di SQL Editor Supabase.
        </div>
      )}

      {/* Pelajaran terpopuler */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Pelajaran Terpopuler
          </h2>
          <p className="text-sm text-slate-500">
            Berdasarkan jumlah kali dibuka oleh siswa.
          </p>
        </div>
        {popular.length === 0 ? (
          <p className="px-6 py-8 text-center text-slate-400">
            Belum ada data. Data muncul setelah siswa mulai belajar.
          </p>
        ) : (
          <ul className="flex flex-col">
            {popular.map((l, i) => (
              <li
                key={l.lesson_id}
                className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-400">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{l.title}</p>
                    <p className="text-xs text-slate-400">
                      {l.level_code} • {l.category}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs text-slate-600">
                  {l.opens}× dibuka
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
