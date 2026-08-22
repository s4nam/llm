"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface LessonDetail {
  id: string;
  level_code: string;
  category: string;
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
  quiz: { question: string; options: string[]; answerIndex: number; explanation: string }[];
  games: unknown[];
  is_free: boolean;
  status: string;
}

export default function LessonDetailView({ lesson }: { lesson: LessonDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  // Mulai true (server & client sama) agar tidak terjadi hydration mismatch;
  // status sebenarnya dideteksi setelah render di browser.
  const [ttsSupported, setTtsSupported] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setTtsSupported(
        typeof window !== "undefined" && "speechSynthesis" in window,
      );
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported) return;
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 0.9;
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utter);
    },
    [ttsSupported, speaking],
  );

  async function act(action: string) {
    setBusy(action);
    setMessage(null);
    const res = await fetch("/api/admin/lesson-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lesson.id, action }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage(data.error ?? "Gagal.");
      return;
    }
    if (action === "approve") {
      setMessage("Materi disetujui dan kini tampil untuk siswa. ✓");
      router.refresh();
    } else if (action === "reject") {
      router.push("/admin/materi/list");
    } else {
      setMessage("Materi digenerate ulang (draft baru). Periksa kembali di bawah.");
      router.refresh();
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {message && (
        <p className="rounded-xl bg-success/10 p-4 text-sm text-success">{message}</p>
      )}

      {/* Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {lesson.level_code} • {lesson.category} {lesson.is_free ? "• Gratis" : ""}
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{lesson.title}</h2>
          <p className="text-sm text-slate-500">
            Status: {lesson.status === "published" ? "✓ Tampil untuk siswa" : "Draft (belum tampil)"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lesson.status === "draft" && (
            <button
              onClick={() => act("approve")}
              disabled={busy !== null}
              className="rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy === "approve" ? "Menyetujui..." : "Setujui & Tampilkan"}
            </button>
          )}
          <button
            onClick={() => act("regenerate")}
            disabled={busy !== null}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy === "regenerate" ? "Mengganti..." : "Regenerate"}
          </button>
          {lesson.status === "draft" && (
            <button
              onClick={() => act("reject")}
              disabled={busy !== null}
              className="rounded-xl border border-danger px-5 py-2.5 text-sm font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
            >
              {busy === "reject" ? "Menghapus..." : "Tolak"}
            </button>
          )}
        </div>
      </div>

      {/* Intro */}
      <div className="rounded-2xl border border-slate-200 bg-surface p-6">
        <h3 className="font-semibold text-slate-900">Intro</h3>
        <p className="mt-2 text-justify leading-7 text-slate-700">{lesson.intro}</p>
      </div>

      {/* Sections */}
      {lesson.sections.map((s, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">{s.heading}</h3>
          {lesson.category === "listening" && i === 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => speak(s.body)}
                disabled={!ttsSupported}
                className="mb-3 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {speaking ? "⏸ Berhenti" : "🔊 Dengarkan"}
              </button>
              {!ttsSupported && (
                <p className="mb-2 text-sm text-slate-500">
                  Browser ini tidak mendukung suara. Anda tetap bisa cek transkrip di bawah.
                </p>
              )}
            </div>
          )}
          <div className="mt-2 whitespace-pre-line text-justify leading-7 text-slate-700">{s.body}</div>
        </div>
      ))}

      {/* Quiz */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Latihan Soal ({lesson.quiz.length})</h3>
        <div className="mt-4 flex flex-col gap-5">
          {lesson.quiz.map((q, i) => (
            <div key={i}>
              <p className="font-medium text-slate-800">
                {i + 1}. {q.question}
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {q.options.map((opt, oi) => (
                  <li
                    key={oi}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      oi === q.answerIndex
                        ? "bg-success/10 font-medium text-success"
                        : "bg-surface text-slate-600"
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}. {opt}
                    {oi === q.answerIndex && " ✓ (jawaban)"}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-justify text-sm text-slate-500">💡 {q.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Games */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">
          Games Tambahan ({(lesson.games ?? []).length})
        </h3>
        {(lesson.games ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Tidak ada latihan tambahan untuk pelajaran ini.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {(lesson.games as { type?: string }[]).map((g, gi) => (
              <div key={gi} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  {g.type ?? "?"}
                </p>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-3 text-xs text-slate-700">
                  {JSON.stringify(g, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
