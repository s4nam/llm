"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACADEMIC_SECTIONS, ACADEMIC_SECTION_LABELS } from "@/lib/types-academic";

const TOPIC_SUGGESTIONS: Record<string, string> = {
  reading: "Contoh: The History of Coffee, Climate Change Debate, The Rise of Renewable Energy",
  listening: "Contoh: A University Lecture on Memory, Campus Conversation, A Talk on Ocean Pollution",
  writing: "Contoh: Should Students Have Part-Time Jobs?, Benefits of Remote Work",
  speaking: "Contoh: Opinions and Campus Life, Academic Lecture Summary",
};

export default function AcademicManager() {
  const router = useRouter();
  const [section, setSection] = useState<"reading" | "listening" | "writing" | "speaking">("reading");
  const [topic, setTopic] = useState("");
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

  // Progress simulasi: naik pelan menuju ~92% sambil menunggu respons AI,
  // lalu lompat ke 100% saat selesai (respons AI satu request, jadi tidak ada
  // persentase nyata dari server — ini estimasi agar admin tahu sedang berjalan).
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
    if (p < 70) return "AI sedang menulis konten...";
    if (p < 92) return "Memvalidasi hasil & menyimpan...";
    return "Selesai";
  }

  async function generate() {
    if (!topic.trim()) {
      setMessage({ type: "err", text: "Isi topik terlebih dahulu." });
      return;
    }
    setBusy(true);
    setMessage(null);
    startProgress();
    try {
      const res = await fetch("/api/admin/generate-academic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, topic: topic.trim(), isFree }),
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
        setTopic("");
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
              Men-generate set {ACADEMIC_SECTION_LABELS[section]}...
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
          Generate Set Latihan (AI)
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Konten dibuat otomatis oleh AI dalam bentuk draft. Pratinjau lalu setujui
          sebelum tampil ke siswa. Konten dijamin orisinal (bukan materi ETS).
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Section
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as typeof section)}
              disabled={busy}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand disabled:opacity-50"
            >
              {ACADEMIC_SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {ACADEMIC_SECTION_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Topik
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={busy}
              placeholder={TOPIC_SUGGESTIONS[section]}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light disabled:opacity-50"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} disabled={busy} className="rounded" />
          Jadikan set gratis (bisa diakses non-member)
        </label>

        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="mt-4 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Menghasilkan..." : "Generate Set (AI)"}
        </button>
      </section>
    </div>
  );
}