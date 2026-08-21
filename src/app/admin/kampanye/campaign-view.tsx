"use client";

import { Fragment, useState } from "react";

interface CampaignRow {
  code: string;
  discount_type: "percent" | "nominal";
  discount_value: number;
  max_uses: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  deleted_at: string | null;
  paid_orders: number;
  pending_orders: number;
  revenue: number;
  discount_given: number;
  paid_users: number;
}

interface DetailRow {
  id: string;
  user_email: string | null;
  user_name: string | null;
  amount: number;
  discount_amount: number | null;
  plan: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

const fmtRp = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");

function statusBadge(c: CampaignRow) {
  const now = Date.now();
  const expired = c.expires_at && new Date(c.expires_at).getTime() < now;
  if (c.deleted_at) return { label: "Dihapus", cls: "bg-slate-100 text-slate-500" };
  if (expired) return { label: "Kedaluwarsa", cls: "bg-slate-100 text-slate-500" };
  if (c.active) return { label: "Aktif", cls: "bg-success/10 text-success" };
  return { label: "Nonaktif", cls: "bg-amber-100 text-amber-700" };
}

export default function CampaignView({ report }: { report: CampaignRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailRow[] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function toggleDetail(code: string) {
    if (open === code) {
      setOpen(null);
      setDetail(null);
      return;
    }
    setOpen(code);
    setDetail(null);
    setDetailError(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/campaign?code=${encodeURIComponent(code)}`);
      const data = await res.json();
      if (data.error) {
        setDetailError(data.error);
      } else {
        setDetail(data.detail ?? []);
      }
    } catch {
      setDetailError("Gagal memuat detail.");
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">Kode</th>
            <th className="px-4 py-3 font-medium">Diskon</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Order Lunas</th>
            <th className="px-4 py-3 font-medium">Pending</th>
            <th className="px-4 py-3 font-medium">Pendapatan</th>
            <th className="px-4 py-3 font-medium">Diskon Diberikan</th>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Dibuat</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {report.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                Belum ada kupon. Buat kupon di halaman Monetisasi.
              </td>
            </tr>
          )}
          {report.map((c) => {
            const badge = statusBadge(c);
            return (
              <Fragment key={c.code}>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{c.code}</p>
                    <p className="text-xs text-slate-400">Maks. {c.max_uses} pakai</p>
                  </td>
                  <td className="px-4 py-3">
                    {c.discount_type === "percent"
                      ? `${c.discount_value}%`
                      : fmtRp(c.discount_value)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">{Number(c.paid_orders || 0)}</td>
                  <td className="px-4 py-3 text-slate-500">{Number(c.pending_orders || 0)}</td>
                  <td className="px-4 py-3 font-medium text-success">
                    {fmtRp(c.revenue)}
                  </td>
                  <td className="px-4 py-3 text-danger">{fmtRp(c.discount_given)}</td>
                  <td className="px-4 py-3">{Number(c.paid_users || 0)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.created_at
                      ? new Date(c.created_at).toLocaleDateString("id-ID")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleDetail(c.code)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                    >
                      {open === c.code ? "Tutup" : "Detail"}
                    </button>
                  </td>
                </tr>
                {open === c.code && (
                  <tr className="border-t border-slate-100 bg-slate-50">
                    <td colSpan={10} className="px-6 py-4">
                      <h3 className="mb-3 text-sm font-semibold text-slate-700">
                        Transaksi dengan kupon {c.code}
                      </h3>
                      {loadingDetail && <p className="text-sm text-slate-400">Memuat...</p>}
                      {detailError && (
                        <p className="text-sm text-danger">{detailError}</p>
                      )}
                      {!loadingDetail && !detailError && detail && detail.length === 0 && (
                        <p className="text-sm text-slate-400">Belum ada transaksi.</p>
                      )}
                      {!loadingDetail && detail && detail.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-surface text-slate-600">
                              <tr>
                                <th className="px-3 py-2 font-medium">User</th>
                                <th className="px-3 py-2 font-medium">Paket</th>
                                <th className="px-3 py-2 font-medium">Dibayar</th>
                                <th className="px-3 py-2 font-medium">Diskon</th>
                                <th className="px-3 py-2 font-medium">Status</th>
                                <th className="px-3 py-2 font-medium">Tanggal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.map((d) => (
                                <tr key={d.id} className="border-t border-slate-100">
                                  <td className="px-3 py-2">
                                    <p className="font-medium text-slate-900">
                                      {d.user_name || "-"}
                                    </p>
                                    <p className="text-slate-400">{d.user_email || "-"}</p>
                                  </td>
                                  <td className="px-3 py-2 capitalize">{d.plan}</td>
                                  <td className="px-3 py-2">{fmtRp(d.amount)}</td>
                                  <td className="px-3 py-2 text-danger">
                                    {d.discount_amount ? fmtRp(d.discount_amount) : "-"}
                                  </td>
                                  <td className="px-3 py-2 capitalize">{d.status}</td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {d.paid_at
                                      ? new Date(d.paid_at).toLocaleString("id-ID")
                                      : new Date(d.created_at).toLocaleString("id-ID")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
