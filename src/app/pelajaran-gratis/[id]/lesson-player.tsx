"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Poppins } from "next/font/google";
import type { FreeLesson } from "@/lib/types";
import LessonGames from "@/components/lesson-games";
import ReportProblem from "@/components/report-problem";

const poppinsBold = Poppins({ subsets: ["latin"], weight: ["700"], display: "swap" });

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
        <p className={`${poppinsBold.className} text-justify leading-7 text-slate-700`}>{lesson.intro}</p>
      </div>

      {/* Sections */}
      {lesson.sections.map((section) => (
        <section key={section.heading} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className={`${poppinsBold.className} text-xl text-slate-900`}>
            {section.heading}
          </h2>
          <div className={`${poppinsBold.className} mt-3 whitespace-pre-line text-justify leading-7 text-slate-700`}>
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
          {lesson.quiz.map((q, qIndex) => {
            const answered = answers[qIndex];
            const isCorrectQ = submitted && answered === q.answerIndex;
            const isWrongQ = submitted && answered !== null && answered !== q.answerIndex;
            return (
            <div
              key={qIndex}
              className={`rounded-2xl border p-4 sm:p-5 transition ${
                !submitted
                  ? "border-slate-200 bg-white"
                  : isCorrectQ
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-red-200 bg-red-50/60"
              }`}
            >
              <p className="text-xs font-medium text-slate-400">Soal {qIndex + 1}</p>
              <p className={`${poppinsBold.className} mt-2 text-slate-800`}>{q.question}</p>
              {q.questionEN && q.question !== q.questionEN && (
                <p className="mt-1 text-sm italic text-slate-500">{q.questionEN}</p>
              )}
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {q.options.map((_, oIndex) => {
                  const order = optionOrder[qIndex];
                  const realIndex = order ? order[oIndex] : oIndex;
                  const label = String.fromCharCode(65 + oIndex);
                  const primary = q.options[realIndex];
                  const secondary = q.optionsEN?.[realIndex] || q.optionsID?.[realIndex];
                  const isSelected = answered === realIndex;
                  const isCorrect = submitted && realIndex === q.answerIndex;
                  const isWrong = submitted && isSelected && realIndex !== q.answerIndex;
                  let cls = "border-slate-200 bg-white hover:border-slate-300";
                  if (submitted) {
                    if (isCorrect) cls = "border-emerald-500 bg-emerald-500 text-white";
                    else if (isWrong) cls = "border-red-500 bg-red-500 text-white";
                    else cls = "border-slate-200 bg-white text-slate-700 opacity-90";
                  } else if (isSelected) {
                    cls = "border-brand bg-brand-light/40 text-slate-900";
                  }
                  return (
                    <button
                      key={realIndex}
                      type="button"
                      onClick={() => choose(oIndex, qIndex)}
                      disabled={submitted}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-medium transition disabled:cursor-default ${cls}`}
                    >
                      <span className={`text-xs font-bold ${submitted && (isCorrect || isWrong) ? "text-white" : "text-slate-400"}`}>
                        {label}.
                      </span>
                      <span className="flex-1">
                        {primary}
                        {secondary && secondary !== primary && (
                          <span className={`ml-1 text-xs ${submitted && (isCorrect || isWrong) ? "text-white/80" : "text-slate-400"}`}>
                            — {secondary}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback card — seperti referensi: tampilkan semua penjelasan saat salah */}
              {submitted && (
                <div className={`mt-4 rounded-xl border p-3 sm:p-4 ${isCorrectQ ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"}`}>
                  <p className={`flex items-center gap-1.5 text-sm font-bold ${isCorrectQ ? "text-emerald-600" : "text-red-600"}`}>
                    {isCorrectQ ? "✅ Benar!" : `❌ Jawaban yang benar: "${q.options[q.answerIndex]}"`}
                  </p>
                  <div className="mt-2.5 rounded-xl border border-slate-100 bg-white p-3 sm:p-3.5">
                    <p className="text-sm font-bold text-slate-800">Explanation:</p>
                    <div className="mt-1.5 text-sm leading-6 text-slate-700 whitespace-pre-line">
                      {q.explanation}
                    </div>
                    {(() => {
                      const tip = q.explanations?.[q.answerIndex];
                      const cleanTip = tip?.replace(/^✓\s*Benar!\s*/i, "").replace(/^✓\s*/i, "").trim();
                      const isDuplicate = cleanTip && cleanTip === q.explanation.trim();
                      if (!cleanTip || isDuplicate) return null;
                      return (
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          <span className="mr-1">📌</span>
                          <span className="font-semibold">Tips:</span> {cleanTip}
                        </p>
                      );
                    })()}
                  </div>
                  {isWrongQ && (
                    <div className="mt-3">
                      <p className="text-sm font-bold text-slate-800">Wrong Answer Explanations:</p>
                      <div className="mt-2 flex flex-col gap-2">
                        {(q.explanations
                          ? q.explanations.map((exp, eIdx) => {
                              if (eIdx === q.answerIndex) return null;
                              const optLabel = q.options[eIdx];
                              const secondary = q.optionsEN?.[eIdx] || q.optionsID?.[eIdx];
                              const cleanExp = exp.replace(/^✓\s*/i, "").trim();
                              const correctOpt = q.options[q.answerIndex];
                              const rawEn = (q.questionEN || q.question || "") as string;
                              let example: string | null = null;
                              if (rawEn) {
                                if (/_{2,}|…+/.test(rawEn)) {
                                  let ex = rawEn.replace(/_{2,}|…+/, optLabel).replace(/\s+/g, " ").trim();
                                  const quoted = ex.match(/['"`]([^'"`]*?)['"`]/);
                                  if (quoted && quoted[1].includes(optLabel)) ex = quoted[1].trim();
                                  if (ex.split(" ").length >= 2) example = ex;
                                } else if (!/Apa arti|Apa yang|Berapa|Siapa|Pilih kata|Choose the correct/.test(rawEn)) {
                                  let clean = rawEn.replace(/\.{3,}/g, "").trim();
                                  if (clean.toLowerCase().startsWith(correctOpt.toLowerCase())) {
                                    clean = clean.slice(correctOpt.length).trim().replace(/^[\s—–-]+/, "");
                                  }
                                  if (!clean.toLowerCase().startsWith(optLabel.toLowerCase())) {
                                    let ex = `${optLabel} ${clean}`.replace(/\s+/g, " ").trim();
                                    if (rawEn.trim().endsWith("?") && !ex.endsWith("?")) ex += "?";
                                    ex = ex.replace(/\?\?/g, "?");
                                    if (ex.split(" ").length >= 3) example = ex;
                                  } else {
                                    example = clean;
                                  }
                                }
                              }
                              if (!example) {
                                const quotedFallback = (q.questionEN || q.question || "").match(/['"`]([^'"`]+)['"`]/);
                                if (quotedFallback) {
                                  let fb = quotedFallback[1].replace(/_{2,}|…+/g, optLabel).trim();
                                  if (fb) example = fb;
                                }
                                if (!example) example = `Contoh: "${optLabel}" → kalimat dengan "${optLabel}"`;
                              }
                              const label = String.fromCharCode(65 + eIdx);
                              const hasExample = example && cleanExp.includes(example);
                              return (
                                <div key={eIdx} className="rounded-xl bg-white border border-slate-100 px-3.5 py-2.5">
                                  <p className="text-sm font-bold text-slate-800">{label}:</p>
                                  <p className="mt-1 text-sm leading-6 text-slate-700">"{optLabel}" {cleanExp}</p>
                                  {example && !hasExample && <p className="mt-1 text-sm leading-6 text-slate-700">"{example}"</p>}
                                </div>
                              );
                            })
                          : q.options.map((opt, eIdx) => {
                              if (eIdx === q.answerIndex) return null;
                              const secondary = q.optionsEN?.[eIdx] || q.optionsID?.[eIdx];
                              const correctOpt = q.options[q.answerIndex];
                              const rawEn = (q.questionEN || q.question || "") as string;
                              let example: string | null = null;
                              if (rawEn) {
                                if (/_{2,}|…+/.test(rawEn)) {
                                  let ex = rawEn.replace(/_{2,}|…+/, opt).replace(/\s+/g, " ").trim();
                                  const quoted = ex.match(/['"`]([^'"`]*?)['"`]/);
                                  if (quoted && quoted[1].includes(opt)) ex = quoted[1].trim();
                                  if (ex.split(" ").length >= 2) example = ex;
                                } else if (!/Apa arti|Apa yang|Berapa|Siapa|Pilih kata|Choose the correct/.test(rawEn)) {
                                  let clean = rawEn.replace(/\.{3,}/g, "").trim();
                                  if (clean.toLowerCase().startsWith(correctOpt.toLowerCase())) {
                                    clean = clean.slice(correctOpt.length).trim().replace(/^[\s—–-]+/, "");
                                  }
                                  if (!clean.toLowerCase().startsWith(opt.toLowerCase())) {
                                    let ex = `${opt} ${clean}`.replace(/\s+/g, " ").trim();
                                    if (rawEn.trim().endsWith("?") && !ex.endsWith("?")) ex += "?";
                                    ex = ex.replace(/\?\?/g, "?");
                                    if (ex.split(" ").length >= 3) example = ex;
                                  } else {
                                    example = clean;
                                  }
                                }
                              }
                              if (!example) {
                                const quotedFallback = (q.questionEN || q.question || "").match(/['"`]([^'"`]+)['"`]/);
                                if (quotedFallback) {
                                  let fb = quotedFallback[1].replace(/_{2,}|…+/g, opt).trim();
                                  if (fb) example = fb;
                                }
                              }
                              const getShortDesc = (o: string) => {
                                const v = o.toLowerCase().trim();
                                if (v === "studying") return "adalah Verb-ing. Untuk menggunakan studying, diperlukan to be:";
                                if (v === "studies") return 'digunakan untuk He/She/It. Untuk They, gunakan "study".';
                                if (v === "is" || v === "is studying" || v.includes("is studying")) return 'menggunakan "are", bukan "is". Selain itu, setelah to be untuk aktivitas yang sedang berlangsung, gunakan Verb-ing:';
                                if (v === "when did") return "menanyakan WAKTU (kapan, secara umum)";
                                if (v === "what did") return "menanyakan OBJEK / APA yang dilakukan";
                                if (v === "how did") return "menanyakan CARA / BAGAIMANA";
                                if (v === "where did") return "menanyakan TEMPAT";
                                if (v === "why did") return "menanyakan ALASAN";
                                if (v === "who did") return "menanyakan ORANG";
                                if (v === "lives") return "untuk subjek he/she/it.";
                                if (v === "live") return "untuk subjek I/you/we/they.";
                                if (v === "are") return "untuk subjek you/we/they.";
                                if (v === "am") return "untuk subjek I.";
                                return "untuk konteks berbeda.";
                              };
                              const shortDesc = getShortDesc(opt);
                              const label = String.fromCharCode(65 + eIdx);
                              const desc = shortDesc.endsWith(".") || shortDesc.endsWith(":") ? shortDesc : `${shortDesc}.`;
                              return (
                                <div key={eIdx} className="rounded-xl bg-white border border-slate-100 px-3.5 py-2.5">
                                  <p className="text-sm font-bold text-slate-800">{label}:</p>
                                  <p className="mt-1 text-sm leading-6 text-slate-700">"{opt}" {desc}</p>
                                  {example && <p className="mt-1 text-sm leading-6 text-slate-700">"{example}"</p>}
                                </div>
                              );
                            }))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
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

      {/* Report issue */}
      <ReportProblem module="lesson" refId={lesson.id} questionCount={lesson.quiz.length} />

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
