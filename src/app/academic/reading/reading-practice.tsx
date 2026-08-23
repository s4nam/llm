"use client";

import { useMemo, useState } from "react";
import { useCountdown, formatSeconds } from "@/lib/use-countdown";
import type { AcademicPassage } from "@/lib/types-academic";
import ReportProblem from "@/components/report-problem";

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

export default function ReadingPractice({
  setId,
  title,
  passages,
}: {
  setId: string;
  title: string;
  passages: AcademicPassage[];
}) {
  const totalQuestions = useMemo(
    () => passages.reduce((n, p) => n + p.questions.length, 0),
    [passages],
  );
  // 1 menit per soal, minimal 15 menit
  const timerSeconds = Math.max(15 * 60, totalQuestions * 60);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choose(pIdx: number, qIdx: number, value: number) {
    if (submitted) return;
    const key = pIdx + ":" + qIdx;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalQuestions;

  async function submit(auto: boolean) {
    if (!allAnswered && !auto) return;
    setSaving(true);
    setError(null);

    const payload: Answer[] = [];
    passages.forEach((p, pIdx) => {
      p.questions.forEach((q, qIdx) => {
        const a = answers[`${pIdx}:${qIdx}`];
        if (typeof a === "number") {
          payload.push({ passageIndex: pIdx, questionIndex: qIdx, answer: a });
        }
      });
    });

    const res = await fetch("/api/academic/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "reading", setId, answers: payload }),
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

  // Indeks jawaban global untuk pembahasan
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
        {passages.length} passage • {totalQuestions} soal • sisa waktu per sesi
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

          {/* Pembahasan */}
          <div className="mt-6 flex flex-col gap-6">
            {passages.map((p, pIdx) =>
              p.questions.map((q, qIdx) => {
                const resIdx = globalOffset++;
                const r = result.results[resIdx];
                const chosen = answers[`${pIdx}:${qIdx}`];
                if (!r) return null;
                return (
                  <div key={`${pIdx}:${qIdx}`} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-medium text-slate-800">
                      {r.correct ? "✓" : "✗"} {q.question}
                    </p>
                    {r.correct ? (
                      <p className="mt-1 text-sm text-success">
                        Jawaban Anda benar.
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-danger">
                        Jawaban Anda: {typeof chosen === "number" ? q.options[chosen] : "—"}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-slate-600">
                      Jawaban benar: {q.options[r.answerIndex]}
                    </p>
                    <p className="mt-1 text-justify text-sm text-slate-500">{r.explanation}</p>
                  </div>
                );
              }),
            )}
          </div>
        </div>
      ) : (
        <>
          {passages.map((p, pIdx) => (
            <div key={pIdx} className="mt-6">
              <h3 className="text-base font-semibold text-slate-800">{p.title}</h3>
              <div className="mt-2 whitespace-pre-line rounded-xl bg-surface p-5 text-justify leading-7 text-slate-700">
                {p.text}
              </div>
              <div className="mt-5 flex flex-col gap-5">
                {p.questions.map((q, qIdx) => (
                  <div key={qIdx}>
                    <p className="font-medium text-slate-800">
                      {qIdx + 1}. {q.question}
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      {q.options.map((opt, oIdx) => {
                        const selected = answers[`${pIdx}:${qIdx}`] === oIdx;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => choose(pIdx, qIdx, oIdx)}
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

      <div className="mt-6">
        <ReportProblem module="toefl" refId={setId} questionCount={totalQuestions} />
      </div>
    </section>
  );
}
