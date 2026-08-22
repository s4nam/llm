"use client";

import { useState } from "react";
import { useCountdown, formatSeconds } from "@/lib/use-countdown";
import type { AcademicWritingTask } from "@/lib/types-academic";

interface RubricItem {
  criteria: string;
  score: number;
  comment: string;
}

interface SubmitResponse {
  score: number | null;
  rubric: RubricItem[];
  feedback: string;
  used: number;
  limit: number;
}

export default function WritingPractice({
  setId,
  title,
  task,
}: {
  setId: string;
  title: string;
  task: AcademicWritingTask;
}) {
  const timerSeconds = (task.timeMinutes ?? 30) * 60;

  const [userText, setUserText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { secondsLeft, reset } = useCountdown(timerSeconds, () => {
    void submit(true);
  });

  async function submit(auto: boolean) {
    if (userText.trim().length < 10 && !auto) return;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/academic/writing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        setId,
        taskPrompt: task.prompt,
        context: task.context,
        userText,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal mengirim tulisan.");
      return;
    }
    setResult(data);
    setSubmitted(true);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <span
          className={`rounded-full px-3 py-1 font-mono text-sm font-bold ${
            secondsLeft <= 60 ? "bg-danger/10 text-danger" : "bg-surface text-slate-600"
          }`}
        >
          ⏱ {formatSeconds(secondsLeft)}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {task.taskType === "integrated" ? "Integrated" : "Independent"} • {task.timeMinutes} menit
      </p>

      {task.context && (
        <div className="mt-4 rounded-xl bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bahan bacaan (Integrated)
          </p>
          <p className="mt-1 whitespace-pre-line text-justify text-sm leading-6 text-slate-700">
            {task.context}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <p className="text-justify text-sm font-medium text-slate-800">{task.prompt}</p>
      </div>

      {submitted && result ? (
        <div className="mt-6">
          <div className="rounded-2xl bg-surface p-5 text-center">
            <p className="text-4xl font-bold text-brand">{result.score ?? "—"}/30</p>
            <p className="mt-1 text-sm text-slate-600">
              Kuota bulan ini: {result.used}/{result.limit}
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setResult(null);
                setUserText("");
                reset();
              }}
              className="mt-4 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Tulis Ulang
            </button>
          </div>

          {result.rubric.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
              {result.rubric.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{r.criteria}</p>
                    <p className="text-xs text-slate-500">{r.comment}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-0.5 text-sm font-bold text-brand">
                    {r.score}/30
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-2xl bg-surface p-5">
            <h3 className="text-sm font-semibold text-slate-800">Umpan Balik</h3>
            <p className="mt-2 whitespace-pre-line text-justify text-sm leading-7 text-slate-700">
              {result.feedback}
            </p>
          </div>
        </div>
      ) : (
        <>
          <textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            rows={8}
            placeholder="Tulis esai Anda di sini..."
            className="mt-4 w-full rounded-xl border border-slate-300 p-4 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
          />

          {error && (
            <p className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>
          )}

          <button
            type="button"
            onClick={() => submit(false)}
            disabled={userText.trim().length < 10 || saving}
            className="mt-4 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Menilai..." : "Kirim & Dapatkan Nilai"}
          </button>
          <p className="mt-2 text-center text-xs text-slate-400">
            Skor &amp; umpan balik dinilai AI. Kuota: 10/bulan per section.
          </p>
        </>
      )}
    </section>
  );
}
