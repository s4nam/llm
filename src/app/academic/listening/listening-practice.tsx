"use client";

import { useState } from "react";
import { useCountdown, formatSeconds } from "@/lib/use-countdown";
import { createAudioController } from "@/lib/audio";
import type { AcademicScript } from "@/lib/types-academic";

interface Answer {
  passageIndex: number;
  questionIndex: number;
  answer: number;
}

interface Result {
  correct: boolean;
  answerIndex: number;
  explanation: string;
}

interface SubmitResponse {
  score: number;
  maxScore: number;
  correct: number;
  total: number;
  percent: number;
  results: Result[];
}

export default function ListeningPractice({
  setId,
  title,
  scripts,
}: {
  setId: string;
  title: string;
  scripts: AcademicScript[];
}) {
  const totalQuestions = scripts.reduce((n, s) => n + s.questions.length, 0);
  const timerSeconds = Math.max(10 * 60, totalQuestions * 60);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  // Satu controller audio untuk seluruh set (audio dulu → soal setelah)
  const audio = createAudioController(setPlaying);

  function choose(sIdx: number, qIdx: number, value: number) {
    if (submitted) return;
    const key = sIdx + ":" + qIdx;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalQuestions;

  async function submit(auto: boolean) {
    if (!allAnswered && !auto) return;
    audio.stop();
    setSaving(true);
    setError(null);

    const payload: Answer[] = [];
    scripts.forEach((s, sIdx) => {
      s.questions.forEach((q, qIdx) => {
        const a = answers[sIdx + ":" + qIdx];
        if (typeof a === "number") {
          payload.push({ passageIndex: sIdx, questionIndex: qIdx, answer: a });
        }
      });
    });

    const res = await fetch("/api/academic/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "listening", setId, answers: payload }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal mengirim jawaban.");
      return;
    }
    setResult(data);
    setSubmitted(true);
  }

  const { secondsLeft, reset } = useCountdown(timerSeconds, () => {
    void submit(true);
  });

  let globalOffset = 0;

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
        {scripts.length} audio • {totalQuestions} soal
      </p>

      {submitted && result ? (
        <div className="mt-6">
          <div className="rounded-2xl bg-surface p-5 text-center">
            <p className="text-4xl font-bold text-brand">{result.percent}%</p>
            <p className="mt-1 text-sm text-slate-600">
              Benar {result.correct}/{result.total} • Skor {result.score}/{result.maxScore}
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setResult(null);
                setAnswers({});
                reset();
              }}
              className="mt-4 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ulangi Latihan
            </button>
          </div>

          {/* Pembahasan + transkrip setelah submit */}
          <div className="mt-6 flex flex-col gap-6">
            {scripts.map((s, sIdx) => (
              <div key={sIdx} className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">{s.title}</h3>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-brand">
                    Lihat transkrip
                  </summary>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {s.script}
                  </p>
                </details>
                {s.questions.map((q, qIdx) => {
                  const resIdx = globalOffset++;
                  const r = result.results[resIdx];
                  const chosen = answers[`${sIdx}:${qIdx}`];
                  if (!r) return null;
                  return (
                    <div key={qIdx} className="mt-3 rounded-lg bg-surface p-3">
                      <p className="text-sm font-medium text-slate-800">
                        {r.correct ? "✓" : "✗"} {q.question}
                      </p>
                      {!r.correct && (
                        <p className="mt-1 text-sm text-danger">
                          Jawaban Anda: {typeof chosen === "number" ? q.options[chosen] : "—"}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-slate-600">
                        Jawaban benar: {q.options[r.answerIndex]}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{r.explanation}</p>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {scripts.map((s, sIdx) => (
            <div key={sIdx} className="mt-6">
              <h3 className="text-base font-semibold text-slate-800">{s.title}</h3>

              {/* Mode audio-first: putar audio dulu, soal muncul setelah */}
              <div className="mt-3 rounded-xl border border-slate-200 bg-surface p-4">
                <button
                  type="button"
                  onClick={() => audio.play({ text: s.script, onEnd: () => {} })}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  {playing ? "🔊 Memutar..." : "▶ Putar Audio"}
                </button>
                <p className="mt-2 text-xs text-slate-500">
                  Dengarkan sampai selesai, lalu jawab soal di bawah. Transkrip baru
                  ditampilkan setelah selesai.
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                {s.questions.map((q, qIdx) => (
                  <div key={qIdx}>
                    <p className="font-medium text-slate-800">
                      {qIdx + 1}. {q.question}
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      {q.options.map((opt, oIdx) => {
                        const selected = answers[`${sIdx}:${qIdx}`] === oIdx;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => choose(sIdx, qIdx, oIdx)}
                            className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                              selected
                                ? "border-brand bg-brand-light/40"
                                : "border-slate-200 bg-white hover:border-brand"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {error && (
            <p className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>
          )}

          <button
            type="button"
            onClick={() => submit(false)}
            disabled={!allAnswered || saving}
            className="mt-6 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {saving
              ? "Menilai..."
              : allAnswered
                ? "Selesai & Lihat Nilai"
                : `Jawab dulu ${answeredCount}/${totalQuestions}`}
          </button>
        </>
      )}
    </section>
  );
}
