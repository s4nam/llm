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

const fmtRp = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [popular, setPopular] = useState<PopularLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setStats(data.stats);
        setPopular(data.popular);
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
    { label: "Pengguna Baru (7 hari)", value: stats.new_users_7d.toString(), color: "text-brand" },
    { label: "Pendapatan 30 hari", value: fmtRp(stats.revenue_30d), color: "text-success" },
    { label: "Total Pendapatan", value: fmtRp(stats.total_revenue), color: "text-success" },
    { label: "Konversi Trial", value: stats.trial_used ? `${Math.round((stats.trial_converted / stats.trial_used) * 100)}%` : "0%", color: "text-brand" },
  ];

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
