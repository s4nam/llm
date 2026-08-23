"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Report {
  id: string;
  user_email: string | null;
  user_name: string | null;
  module: string;
  ref_id: string | null;
  title: string | null;
  detail: string | null;
  note: string | null;
  question_indices: number[] | null;
  status: string;
  admin_reply: string | null;
  created_at: string;
  resolved_at: string | null;
}

const MODULE_LABELS: Record<string, string> = {
  lesson: "Materi",
  toefl: "Akademik",
  situational: "Situasional",
  placement: "Placement",
};

/** Tanggapan siap pakai untuk dropdown — admin tidak perlu mengetik. */
const REPLY_SUGGESTIONS = [
  "Terima kasih atas laporannya. Kami sudah memeriksa dan memperbaiki materi ini. Silakan coba lagi.",
  "Terima kasih atas laporannya. Kunci jawaban sudah kami perbaiki.",
  "Terima kasih atas laporannya. Kesalahan tata bahasa / terjemahan sudah diperbaiki.",
  "Terima kasih atas laporannya. Setelah kami periksa, materi ini sudah benar. Terus semangat belajar!",
  "Terima kasih atas laporannya. Masalah ini akan kami tinjau kembali oleh tim.",
];

/** Tautan untuk admin membuka konten yang dilaporkan agar bisa diperbaiki & publish ulang. */
function contentUrl(module: string, refId: string | null): string | null {
  if (!refId) return null;
  switch (module) {
    case "lesson":
      return `/admin/materi/${refId}`;
    case "toefl":
      return `/admin/academic/${refId}`;
    case "situational":
      return `/admin/situasional/${refId}`;
    default:
      return null;
  }
}

export default function ReportsList() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/reports")
      .then((r) => r.json())
      .then((data) => {
        if (data.reports) setReports(data.reports);
      })
      .finally(() => setLoading(false));
  }, []);

  async function resolve(id: string) {
    setBusyId(id);
    const reply = replyDraft[id] ?? "";
    await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: id, reply }),
    });
    setBusyId(null);
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
      {reports.map((r) => {
        const url = contentUrl(r.module, r.ref_id);
        return (
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
                {r.module && (
                  <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                    {MODULE_LABELS[r.module] ?? r.module}
                  </span>
                )}
                {r.detail && (
                  <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                    {r.detail}
                  </span>
                )}
                {r.title && (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-slate-600">
                    {r.title}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {new Date(r.created_at).toLocaleString("id-ID")}
              </span>
            </div>
            <p className="mt-3 text-slate-700">{r.note}</p>
            {r.question_indices && r.question_indices.length > 0 && (
              <p className="mt-2 text-sm text-brand">
                <span className="font-medium">Soal dilaporkan:</span>{" "}
                {[...r.question_indices]
                  .sort((a, b) => a - b)
                  .map((n) => `#${n}`)
                  .join(", ")}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Dilaporkan oleh: {r.user_name || r.user_email || "anonim"}
            </p>

            {r.status === "open" ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Buka Konten untuk Perbaiki →
                  </a>
                )}
                <label className="text-xs font-medium text-slate-500">
                  Tanggapan untuk siswa (pilih salah satu)
                </label>
                <select
                  value={replyDraft[r.id] ?? ""}
                  onChange={(e) =>
                    setReplyDraft((prev) => ({
                      ...prev,
                      [r.id]: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
                >
                  <option value="">— Pilih tanggapan —</option>
                  {REPLY_SUGGESTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => resolve(r.id)}
                  disabled={busyId === r.id}
                  className="mt-1 rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busyId === r.id ? "Menyimpan..." : "Tandai Selesai"}
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-surface p-4">
                <p className="text-xs font-semibold text-slate-500">
                  Tanggapan tim
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {r.admin_reply || "—"}
                </p>
                {r.resolved_at && (
                  <p className="mt-2 text-xs text-slate-400">
                    Selesai {new Date(r.resolved_at).toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}