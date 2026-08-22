"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SITUATIONAL_TOPICS, type SituationalTopicId } from "@/lib/types-situational";

export default function SituationalManager() {
  const router = useRouter();
  const [topic, setTopic] = useState<SituationalTopicId>("hotel");
  const [title, setTitle] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Progress estimasi (respons AI satu request — ini indikator agar admin tahu sedang berjalan)
  function startProgress() {
    setProgress(3);
    stopTimer();
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.max(0.4, (92 - p) * 0.03) + Math.random() * 0.6;
        return Math.min(next, 92);
      });
    }, 250);
  }

  function phase(p: number): string {
    if (p < 20) return "Menyiapkan prompt...";
    if (p < 45) return "Memanggil model AI...";
    if (p < 70) return "AI sedang menulis dialog...";
    if (p < 92) return "Memvalidasi hasil & menyimpan...";
    return "Selesai";
  }

  async function generate() {
    if (!title.trim()) {
      setMessage({ type: "err", text: "Isi judul set terlebih dahulu." });
      return;
    }
    setBusy(true);
    setMessage(null);
    startProgress();
    try {
      const res = await fetch("/api/admin/generate-situational", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, title: title.trim(), isFree }),
      });
      const data = await res.json();
      if (!res.ok) {
        stopTimer();
        setProgress(0);
        setMessage({ type: "err", text: data.error ?? "Gagal generate." });
      } else {
        stopTimer();
        setProgress(100);
        setMessage({ type: "ok", text: "Set berhasil dibuat sebagai draft." });
        setTitle("");
        router.refresh();
        setTimeout(() => setProgress(0), 1500);
      }
    } catch {
      stopTimer();
      setProgress(0);
      setMessage({ type: "err", text: "Terjadi kesalahan. Coba lagi." });
    }
    setBusy(false);
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      {busy && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">
              Men-generate set percakapan...
            </h2>
            <span className="text-sm font-bold text-brand">{Math.round(progress)}%</span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{phase(progress)}</p>
        </section>
      )}

      {message && (
        <p
          className={`rounded-xl p-4 text-sm ${
            message.type === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Generate Set Percakapan (AI)
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Pilih topik dan judul situasi, lalu AI membuat dialog + kosakata + kuis + role-play.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Topik</label>
            <select
              value={topic}
              onChange={(e) => {
                const next = e.target.value as SituationalTopicId;
                setTopic(next);
                const t = SITUATIONAL_TOPICS.find((x) => x.id === next);
                setTitle(t?.suggestedTitle ?? "");
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand sm:max-w-xs"
            >
              {SITUATIONAL_TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Judul situasi
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Check-in di hotel, Memesan makanan di restoran"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-brand"
            />
            Jadikan gratis (bisa dilihat non-member)
          </label>

          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50 sm:w-auto"
          >
            {busy ? "Men-generate..." : "Generate Set (AI)"}
          </button>
        </div>
      </section>
    </div>
  );
}