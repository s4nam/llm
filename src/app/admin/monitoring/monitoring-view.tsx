"use client";

import { useEffect, useState } from "react";

interface UsageRow {
  provider: string;
  model: string;
  purpose: string;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_idr: number;
  created_at: string;
}

export default function MonitoringView() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/monitoring").then((r) => r.json()),
    ])
      .then(([data]) => {
        if (data.error) return;
        setRows(data.rows ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalCost = rows.reduce((s, r) => s + Number(r.estimated_cost_idr || 0), 0);

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Total estimasi biaya (tercatat)</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          Rp {totalCost.toLocaleString("id-ID")}
        </p>
        <p className="mt-2 rounded-lg bg-brand-light/40 p-3 text-xs leading-5 text-slate-600">
          💡 Angka ini <b>hanya perkiraan</b> (berdasarkan harga publik model).
          Jika memakai <b>Gemini API gratis</b>, Anda <b>tidak akan ditagih</b> —
          ini hanya tolok ukur seandainya berbayar. Anda juga bisa lihat jumlah
          token di tabel di bawah.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-surface text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Tujuan</th>
              <th className="px-4 py-3 font-medium">Token</th>
              <th className="px-4 py-3 font-medium">Biaya</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Memuat...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Belum ada data pemakaian.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5 text-slate-500">
                  {new Date(r.created_at).toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-2.5 capitalize">{r.provider}</td>
                <td className="px-4 py-2.5">{r.model}</td>
                <td className="px-4 py-2.5 capitalize">{r.purpose}</td>
                <td className="px-4 py-2.5">
                  {r.prompt_tokens + r.completion_tokens}
                </td>
                <td className="px-4 py-2.5">
                  Rp {Number(r.estimated_cost_idr || 0).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
