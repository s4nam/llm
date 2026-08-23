"use client";

import { useState } from "react";

/**
 * Tombol "Laporkan masalah" untuk semua modul (pelajaran, akademik,
 * situasional, placement). User bisa memilih lebih dari 1 soal yang
 * bermasalah (jika `questionCount` diberikan), plus catatan opsional.
 * Mengirim laporan ke /api/report.
 */
export default function ReportProblem({
  module,
  refId,
  label = "Laporkan masalah",
  questionCount,
}: {
  module: "lesson" | "toefl" | "situational" | "placement";
  refId: string;
  label?: string;
  /** Jumlah soal pada konten ini. Jika diisi, tampil checkbox per soal. */
  questionCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const max = questionCount && questionCount > 0 ? questionCount : 0;

  function toggle(q: number) {
    setSelected((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q],
    );
  }

  function reset() {
    setSelected([]);
    setNote("");
    setMessage(null);
  }

  async function submit() {
    if (selected.length === 0 && !note.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, refId, note, questionIndices: selected }),
      });
      const data = await res.json();
      setBusy(false);
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Gagal mengirim laporan." });
        return;
      }
      setMessage({
        type: "ok",
        text: "Terima kasih! Laporan Anda sudah terkirim ke tim.",
      });
      reset();
      setOpen(false);
    } catch {
      setBusy(false);
      setMessage({ type: "err", text: "Gagal menghubungi server. Coba lagi." });
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4">
      {!open ? (
        <div className="flex w-full flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-sm text-slate-500">
            Ada yang salah di materi ini? (mis. kunci jawaban, tata bahasa,
            terjemahan)
          </p>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setMessage(null);
            }}
            className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {label}
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-2">
          {max > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-600">
                Pilih soal yang bermasalah (bisa lebih dari satu):
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
                  const active = selected.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggle(n)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                        active
                          ? "border-brand bg-brand-light/40 text-brand"
                          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {selected.length > 0 && (
                <p className="mt-1.5 text-xs text-brand">
                  Dipilih: {[...selected].sort((a, b) => a - b).join(", ")}
                </p>
              )}
            </div>
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Opsional: jelaskan masalahnya (mis. 'kunci jawaban seharusnya C')."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
          />
          {message && (
            <p
              className={`text-sm ${
                message.type === "ok" ? "text-success" : "text-danger"
              }`}
            >
              {message.text}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={busy || (selected.length === 0 && !note.trim())}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? "Mengirim..." : "Kirim Laporan"}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}