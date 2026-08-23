"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import ReportProblem from "@/components/report-problem";

interface Question {
  question: string;
  options: string[];
}

type Phase = "intro" | "test" | "result";

export default function PlacementPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    recommendedLevel: string;
    saved?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/placement")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setQuestions(data.questions);
        setAnswers(Array(data.questions.length).fill(-1));
      })
      .catch(() => setError("Gagal memuat soal."));
  }, []);

  async function submit() {
    if (answers.includes(-1)) return;
    setLoading(true);
    const res = await fetch("/api/placement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan.");
      return;
    }
    setResult(data);
    setPhase("result");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {phase === "intro" && (
          <>
            <h1 className="text-2xl font-bold text-slate-900">
              Tes Penempatan Level
            </h1>
            <p className="mt-2 text-slate-600">
              12 soal singkat untuk membantu kami menyarankan level yang tepat
              (A1–C2). Tidak ada nilai benar/salah yang dihukum — ini hanya
              panduan. Anda tetap bebas memilih level manual.
            </p>
            {error && (
              <p className="mt-4 rounded-xl bg-danger/10 p-4 text-sm text-danger">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={questions.length === 0}
              onClick={() => setPhase("test")}
              className="mt-6 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {questions.length === 0 ? "Memuat soal..." : "Mulai Tes"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-3 w-full rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Lewati, pilih manual
            </button>
          </>
        )}

        {phase === "test" && questions.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">
                Soal {current + 1} dari {questions.length}
              </span>
              <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
                {Math.round(((current + 1) / questions.length) * 100)}%
              </span>
            </div>
            <div className="mb-4 h-1.5 w-full rounded-full bg-surface">
              <div
                className="h-1.5 rounded-full bg-brand transition-all"
                style={{ width: `${((current + 1) / questions.length) * 100}%` }}
              />
            </div>
            <p className="text-lg font-medium text-slate-800">
              {questions[current].question}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {questions[current].options.map((opt, oi) => {
                const selected = answers[current] === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => {
                      const next = [...answers];
                      next[current] = oi;
                      setAnswers(next);
                    }}
                    className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                      selected
                        ? "border-brand bg-brand-light/40"
                        : "border-slate-200 bg-white hover:border-brand"
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}. {opt}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                disabled={current === 0}
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              {current < questions.length - 1 ? (
                <button
                  type="button"
                  disabled={answers[current] === -1}
                  onClick={() => setCurrent((c) => c + 1)}
                  className="flex-1 rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
                >
                  Berikutnya
                </button>
              ) : (
                <button
                  type="button"
                  disabled={answers.includes(-1) || loading}
                  onClick={submit}
                  className="flex-1 rounded-xl bg-success px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-40"
                >
                  {loading ? "Menilai..." : "Selesai & Lihat Hasil"}
                </button>
              )}
            </div>
          </>
        )}

        {phase === "result" && result && (
          <>
            <div className="text-center">
              <p className="text-5xl font-bold text-brand">
                {result.recommendedLevel}
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                Level yang disarankan untuk Anda
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Skor: {result.score} dari {result.total} benar
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Ini hanya saran. Anda bisa memilih level mana pun secara manual
              kapan saja dari dashboard.
            </p>
            {result.saved === false && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                Hasil belum disimpan.{" "}
                <Link href="/masuk" className="font-semibold text-brand underline">
                  Masuk
                </Link>{" "}
                untuk menyimpan hasil ke dashboard Anda.
              </p>
            )}
            <button
              type="button"
              onClick={() =>
                router.push(result.saved === false ? "/masuk" : "/dashboard")
              }
              className="mt-6 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              {result.saved === false ? "Masuk untuk Simpan Hasil" : "Lanjut ke Dashboard"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAnswers(Array(questions.length).fill(-1));
                setCurrent(0);
                setPhase("intro");
              }}
              className="mt-3 w-full rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ulangi Tes
            </button>
          </>
        )}

        {(phase === "test" || phase === "result") && (
          <div className="mt-6">
            <ReportProblem module="placement" refId="placement" questionCount={questions.length} />
          </div>
        )}
      </div>
    </div>
  );
}
