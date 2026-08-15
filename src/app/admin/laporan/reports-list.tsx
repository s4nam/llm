"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Report {
  id: string;
  user_email: string | null;
  user_name: string | null;
  lesson_title: string | null;
  level_code: string | null;
  note: string | null;
  status: string;
  created_at: string;
}

export default function ReportsList() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/reports")
      .then((r) => r.json())
      .then((data) => {
        if (data.reports) setReports(data.reports);
      })
      .finally(() => setLoading(false));
  }, []);

  async function resolve(id: string) {
    await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: id }),
    });
    setReports((rs) => rs.filter((r) => r.id !== id));
    router.refresh();
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      {loading && <p className="text-slate-400">Memuat...</p>}
      {!loading && reports.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Tidak ada laporan masalah. Bagus! 🎉
        </p>
      )}
      {reports.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  r.status === "open"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-success/10 text-success"
                }`}
              >
                {r.status === "open" ? "Menunggu" : "Selesai"}
              </span>
              {r.level_code && (
                <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                  {r.level_code}
                </span>
              )}
              {r.lesson_title && (
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-slate-600">
                  {r.lesson_title}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">
              {new Date(r.created_at).toLocaleString("id-ID")}
            </span>
          </div>
          <p className="mt-3 text-slate-700">{r.note}</p>
          <p className="mt-2 text-xs text-slate-400">
            Dilaporkan oleh: {r.user_name || r.user_email || "anonim"}
          </p>
          {r.status === "open" && (
            <button
              onClick={() => resolve(r.id)}
              className="mt-3 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Tandai Selesai
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
