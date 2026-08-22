"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FreeLesson } from "@/lib/types";
import LessonGames from "@/components/lesson-games";

const STORAGE_KEY = "em_free_progress";
type Stored = Record<string, { completed: boolean; bestScore: number }>;

/** Acak array (Fisher–Yates). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadProgress(): Stored {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Stored;
  } catch {
    return {};
  }
}

function saveProgress(stored: Stored) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export default function LessonPlayer({
  lesson,
  nextLesson,
}: {
  lesson: FreeLesson;
  nextLesson: FreeLesson | null;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(lesson.quiz.length).fill(null),
  );
  const [submitted, setSubmitted] = useState(false);
  // Mulai kosong (server & client sama), lalu dimuat setelah mount.
  const [progress, setProgress] = useState<Stored>({});
  const [promptJoin, setPromptJoin] = useState(false);
  // Urutan opsi per soal (index tampilan → index asli). Diacak setelah mount.
  const [optionOrder, setOptionOrder] = useState<number[][]>([]);
  // TTS: mulai true (server & client sama), lalu dideteksi setelah mount.
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const p = loadProgress();
      setProgress(p);
      setPromptJoin(Boolean(p[lesson.id]?.completed));
    }, 0);
    return () => clearTimeout(t);
  }, [lesson.id]);

  // Deteksi TTS setelah mount (hindari hydration mismatch)
  useEffect(() => {
    const t = setTimeout(() => {
      setTtsEnabled(
        typeof window !== "undefined" && "speechSynthesis" in window,
      );
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Acak urutan opsi kuis SETELAH mount (hindari hydration mismatch)
  useEffect(() => {
    const t = setTimeout(() => {
      setOptionOrder(
        lesson.quiz.map((q) => shuffle(q.options.map((_, i) => i))),
      );
    }, 0);
    return () => clearTimeout(t);
  }, [lesson.quiz]);

  const speak = useCallback(
    (text: string, id?: string) => {
      if (!ttsEnabled) return;
      const key = id ?? text;
      if (speakingId === key) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 0.9;
      utter.onend = () => setSpeakingId(null);
      utter.onerror = () => setSpeakingId(null);
      audioRef.current = utter;
      setSpeakingId(key);
      window.speechSynthesis.speak(utter);
    },
    [ttsEnabled, speakingId],
  );

  const answeredCount = answers.filter((a) => a !== null).length;
  const canSubmit = answeredCount === lesson.quiz.length;

  function choose(oIndex: number, qIndex: number) {
    if (submitted) return;
    // oIndex = index TAMPILAN; petakan ke index ASLI sebelum disimpan.
    const order = optionOrder[qIndex];
    const realIndex = order ? order[oIndex] : oIndex;
    const next = [...answers];
    next[qIndex] = realIndex;
    setAnswers(next);
  }

  function submit() {
    if (!canSubmit) return;
    setSubmitted(true);
    const score = lesson.quiz.reduce(
      (acc, q, i) => (answers[i] === q.answerIndex ? acc + 1 : acc),
      0,
    );
    const pct = Math.round((score / lesson.quiz.length) * 100);
    const prevBest = progress[lesson.id]?.bestScore ?? 0;
    const stored: Stored = {
      ...progress,
      [lesson.id]: {
        completed: true,
        bestScore: Math.max(prevBest, pct),
      },
    };
    setProgress(stored);
    saveProgress(stored);
    setPromptJoin(true);
  }

  const score = submitted
    ? lesson.quiz.reduce(
        (acc, q, i) => (answers[i] === q.answerIndex ? acc + 1 : acc),
        0,
      )
    : 0;
  const pct = Math.round((score / lesson.quiz.length) * 100);

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Intro */}
      <div className="rounded-2xl border border-slate-200 bg-surface p-6">
        <p className="text-justify leading-7 text-slate-700">{lesson.intro}</p>
      </div>

      {/* Sections */}
      {lesson.sections.map((section) => (
        <section key={section.heading} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-900">
            {section.heading}
          </h2>
          <div className="mt-3 whitespace-pre-line text-justify leading-7 text-slate-700">
            {section.body}
          </div>
        </section>
      ))}

      {/* Quiz */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Latihan Soal</h2>
        <p className="mt-1 text-sm text-slate-500">
          Jawab semua 5 soal untuk menyelesaikan pelajaran.
        </p>

        <div className="mt-5 flex flex-col gap-6">
          {lesson.quiz.map((q, qIndex) => (
            <div key={qIndex}>
              <p className="font-medium text-slate-800">
                {qIndex + 1}. {q.question}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {q.options.map((option, oIndex) => {
                  // oIndex = index TAMPILAN; order = index asli dalam urutan tampilan.
                  const order = optionOrder[qIndex];
                  const realIndex = order ? order[oIndex] : oIndex;
                  const isSelected = answers[qIndex] === realIndex;
                  const isCorrect =
                    submitted && realIndex === q.answerIndex;
                  const isWrong =
                    submitted && isSelected && realIndex !== q.answerIndex;
                  let cls =
                    "border-slate-200 bg-white hover:border-brand hover:bg-brand-light/40";
                  if (isCorrect) cls = "border-success bg-success/10";
                  else if (isWrong) cls = "border-danger bg-danger/10";
                  else if (isSelected) cls = "border-brand bg-brand-light/40";
                  return (
                    <button
                      key={realIndex}
                      type="button"
                      onClick={() => choose(oIndex, qIndex)}
                      disabled={submitted}
                      className={`rounded-lg border px-4 py-3 text-left text-sm transition ${cls} disabled:cursor-default`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <p
                  className={`mt-2 text-justify text-sm ${
                    answers[qIndex] === q.answerIndex
                      ? "text-success"
                      : "text-slate-600"
                  }`}
                >
                  <span className="font-semibold">
                    {answers[qIndex] === q.answerIndex ? "✓ Benar." : "✗ Kurang tepat."}
                  </span>{" "}
                  {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        {!submitted && (
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="mt-6 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {canSubmit ? "Selesai & Lihat Nilai" : `Jawab dulu ${answeredCount}/${lesson.quiz.length}`}
          </button>
        )}

        {submitted && (
          <div className="mt-6 rounded-xl bg-surface p-4 text-center">
            <p className="text-2xl font-bold text-brand">{pct}%</p>
            <p className="text-sm text-slate-600">
              {pct >= 60
                ? "Bagus! Pelajaran selesai. 🎉"
                : "Pelajaran tetap selesai. Baca lagi materi di atas dan coba sekali lagi untuk nilai lebih tinggi."}
            </p>
          </div>
        )}
      </section>

      {/* Games (latihan tambahan per level CEFR) */}
      <LessonGames games={lesson.games ?? []} speak={speak} ttsEnabled={ttsEnabled} />

      {/* Next / Join CTA */}
      {submitted && (
        <div className="flex flex-col gap-3 rounded-2xl bg-brand p-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div>
            <p className="font-semibold text-white">
              {nextLesson ? "Pelajaran berikutnya siap!" : "Semua pelajaran gratis selesai!"}
            </p>
            <p className="text-sm text-brand-light">
              {nextLesson
                ? "Progress tersimpan di perangkat ini. Daftar gratis agar tersimpan permanen & bisa lanjut di HP lain."
                : "Daftar gratis untuk membuka semua level, materi lengkap, dan sertifikat."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {nextLesson && (
              <Link
                href={`/pelajaran-gratis/${nextLesson.id}`}
                className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand transition hover:bg-brand-light"
              >
                Pelajaran {nextLesson.title}
              </Link>
            )}
            <Link
              href="/daftar"
              className="rounded-xl border border-white/60 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Daftar Gratis
            </Link>
          </div>
        </div>
      )}

      {promptJoin && !submitted && (
        <p className="text-center text-sm text-slate-500">
          ✨ Anda pernah menyelesaikan pelajaran ini di perangkat ini.{" "}
          <Link href="/daftar" className="font-medium text-brand underline">
            Daftar gratis untuk menyimpan progress ke akun
          </Link>
        </p>
      )}
    </div>
  );
}
