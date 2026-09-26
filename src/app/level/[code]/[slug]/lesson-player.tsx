"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LessonDetail } from "@/lib/types";
import LessonGames from "@/components/lesson-games";
import SaveToStudySet from "@/components/save-to-study-set";
import ReportProblem from "@/components/report-problem";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { Poppins } from "next/font/google";

const poppinsBold = Poppins({ subsets: ["latin"], weight: ["700"], display: "swap" });

const FREE_STORAGE_KEY = "em_free_progress";

/** Acak array (Fisher–Yates). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LessonPlayer({
  lesson,
  isMember,
}: {
  lesson: LessonDetail;
  isMember: boolean;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(lesson.quiz.length).fill(null),
  );
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  // Urutan opsi per soal (index tampilan → index asli). Diacak setelah mount.
  const [optionOrder, setOptionOrder] = useState<number[][]>([]);
  const [result, setResult] = useState<boolean[]>([]);
  const [saving, setSaving] = useState(false);
  // Selalu true di awal (server & client sama), lalu diperiksa ulang setelah mount.
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [writingText, setWritingText] = useState("");
  const [writingFeedback, setWritingFeedback] = useState<string | null>(null);
  const [writingScore, setWritingScore] = useState<number | null>(null);
  const [writingRubric, setWritingRubric] = useState<
    { criteria: string; score: number; comment: string }[] | null
  >(null);
  const [writingQuota, setWritingQuota] = useState<{ used: number; limit: number } | null>(null);
  const [writingLoading, setWritingLoading] = useState(false);
  const audioRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Deteksi dukungan TTS setelah mount (hindari hydration mismatch)
  useEffect(() => {
    const t = setTimeout(() => {
      setTtsEnabled(
        typeof window !== "undefined" && "speechSynthesis" in window,
      );
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Acak urutan opsi kuis SETELAH mount (hindari hydration mismatch).
  // answers tetap menyimpan index ASLI; hanya urutan tampilan yang diacak.
  useEffect(() => {
    const t = setTimeout(() => {
      setOptionOrder(
        lesson.quiz.map((q) => shuffle(q.options.map((_, i) => i))),
      );
    }, 0);
    return () => clearTimeout(t);
  }, [lesson.quiz]);

  // Catat akses pelajaran + bump streak (hanya jika login)
  useEffect(() => {
    if (isMember) {
      fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "open", lessonId: lesson.id }),
      }).catch(() => {});
      if (lesson.category === "writing") {
        fetch("/api/writing")
          .then((r) => r.json())
          .then((d) => setWritingQuota(d))
          .catch(() => {});
      }
    }
  }, [lesson.id, isMember, lesson.category]);

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

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);

    if (isMember) {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit-quiz", lessonId: lesson.id, answers }),
      });
      const data = await res.json();
      setSaving(false);
      if (res.ok) {
        setScore(data.score);
        setResult(data.results);
        setSubmitted(true);
      }
      return;
    }

    // Non-member: hitung lokal
    const correct = lesson.quiz.map((q, i) => answers[i] === q.answerIndex);
    const pct = Math.round(
      (correct.filter(Boolean).length / lesson.quiz.length) * 100,
    );
    // Simpan progress ke localStorage (untuk di-gabung saat daftar)
    try {
      const stored = JSON.parse(localStorage.getItem(FREE_STORAGE_KEY) ?? "{}");
      const prevBest = stored[lesson.slug]?.bestScore ?? 0;
      stored[lesson.slug] = {
        slug: lesson.slug,
        bestScore: Math.max(prevBest, pct),
        completed: pct >= 60,
      };
      localStorage.setItem(FREE_STORAGE_KEY, JSON.stringify(stored));
    } catch {}
    setScore(pct);
    setResult(correct);
    setSubmitted(true);
    setSaving(false);
  }

  async function submitWriting() {
    if (writingText.trim().length < 5) return;
    setWritingLoading(true);
    setWritingFeedback(null);
    setWritingRubric(null);
    const res = await fetch("/api/writing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId: lesson.id,
        prompt: lesson.title,
        userText: writingText,
      }),
    });
    const data = await res.json();
    setWritingLoading(false);
    if (!res.ok) {
      setWritingFeedback(data.error ?? "Terjadi kesalahan.");
      setWritingScore(null);
      return;
    }
    setWritingFeedback(data.feedback);
    setWritingScore(data.score);
    if (Array.isArray(data.rubric)) setWritingRubric(data.rubric);
    setWritingQuota((q) => (q ? { ...q, used: q.used + 1 } : q));
  }

  const mediaType = lesson.media?.type ?? "classic";
  const youtubeEmbed = mediaType === "youtube" && lesson.media?.youtube_url ? youtubeEmbedUrl(lesson.media.youtube_url) : null;
  const imageUrl = mediaType === "image" ? lesson.media?.image_url : null;
  const [lightbox, setLightbox] = useState(false);

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Media Penjelasan Dinamis */}
      {mediaType === "youtube" && youtubeEmbed ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
          <div className="aspect-video w-full">
            <iframe
              src={youtubeEmbed}
              title={lesson.title}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      ) : mediaType === "image" && imageUrl ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={lesson.title}
            className="max-h-[480px] w-full cursor-zoom-in rounded-xl object-contain"
            onClick={() => setLightbox(true)}
          />
          <p className="mt-2 text-center text-xs text-slate-400">Klik gambar untuk memperbesar</p>
          {lightbox && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setLightbox(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={lesson.title} className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Classic: Intro */}
          <div className="rounded-2xl border border-slate-200 bg-surface p-6">
            <p className={`${poppinsBold.className} text-justify leading-7 text-slate-700`}>{lesson.intro}</p>
          </div>

          {/* Classic: Sections */}
          {lesson.sections.map((section, sIdx) => (
            <section key={section.heading} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className={`${poppinsBold.className} text-xl text-slate-900`}>{section.heading}</h2>
              {lesson.category === "listening" && sIdx === 0 ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => speak(section.body, `listening-${lesson.id}`)}
                    disabled={!ttsEnabled}
                    className="mb-3 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    {speakingId === `listening-${lesson.id}` ? "⏸ Berhenti" : "🔊 Dengarkan"}
                  </button>
                  {!ttsEnabled && (
                    <p className="mb-2 text-sm text-slate-500">
                      Perangkat Anda tidak mendukung suara. Baca transkrip di bawah ini.
                    </p>
                  )}
                  <div className={`${poppinsBold.className} whitespace-pre-line rounded-xl bg-surface p-4 text-justify leading-7 text-slate-700`}>
                    {section.body}
                  </div>
                </div>
              ) : (
                <div className={`${poppinsBold.className} mt-3 whitespace-pre-line text-justify leading-7 text-slate-700`}>
                  {lesson.category === "vocabulary" && section.heading.toLowerCase().includes("kosakata") ? (
                    <>
                      <VocabularyList body={section.body} onSpeak={speak} speakingId={speakingId} />
                      {isMember && <SaveToStudySet word={lesson.title} />}
                    </>
                  ) : (
                    section.body
                  )}
                </div>
              )}
            </section>
          ))}
        </>
      )}

      {/* Writing practice */}
      {lesson.category === "writing" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Latihan Menulis
          </h2>
          {isMember ? (
            <>
              <p className="mt-1 text-sm text-slate-500">
                Tulis 2–4 kalimat dalam Bahasa Inggris sesuai topik di atas.
                AI akan memberi nilai dan saran perbaikan.
              </p>
              {writingQuota && (
                <p className="mt-2 inline-block rounded-full bg-surface px-3 py-1 text-xs text-slate-600">
                  Kuota bulan ini: {writingQuota.used}/{writingQuota.limit}
                </p>
              )}
              <textarea
                value={writingText}
                onChange={(e) => setWritingText(e.target.value)}
                rows={5}
                placeholder="Tulis jawaban Anda di sini..."
                className="mt-3 w-full rounded-xl border border-slate-300 p-4 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
              />
              <button
                type="button"
                onClick={submitWriting}
                disabled={writingLoading || writingText.trim().length < 5}
                className="mt-3 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                {writingLoading ? "Menilai tulisan..." : "Kirim & Dapatkan Feedback"}
              </button>
              {writingFeedback && (
                <div className="mt-4 rounded-xl bg-surface p-5">
                  {writingScore !== null && (
                    <p className="mb-2 text-lg font-bold text-brand">
                      Skor: {writingScore}/100
                    </p>
                  )}
                  {writingRubric && writingRubric.length > 0 && (
                    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {writingRubric.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800">
                              {r.criteria}
                            </p>
                            <p className="text-xs text-slate-500">{r.comment}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-0.5 text-sm font-bold text-brand">
                            {r.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-line text-justify leading-7 text-slate-700">
                    {writingFeedback}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Latihan menulis dengan feedback AI tersedia untuk member.{" "}
              <Link href="/masuk" className="font-medium text-brand underline">
                Langganan untuk menggunakannya
              </Link>
              .
            </p>
          )}
        </section>
      )}

      {/* Quiz */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-slate-900">Latihan Soal</h2>
        <p className="mt-1 text-sm text-slate-500">
          Jawab semua {lesson.quiz.length} soal. Pelajaran selesai jika nilaimu
          minimal 60%.
        </p>

        <div className="mt-5 flex flex-col gap-6">
          {lesson.quiz.map((q, qIndex) => {
            const answered = answers[qIndex];
            const isCorrectQ = submitted && answered === q.answerIndex;
            const isWrongQ = submitted && answered !== null && answered !== q.answerIndex;
            // Bilingual text: tampilkan ID di bar abu, EN di bawah spt referensi
            const idText = lesson.level === "B1" || lesson.level === "B2" ? q.questionID : q.question;
            const enText = lesson.level === "B1" || lesson.level === "B2" ? q.question : q.questionEN;
            // Tentukan EN sentence untuk fill-blank highlight (jika ada)
            const enSentence = enText || (q.questionEN ? q.questionEN : undefined);
            // Jika ada blank pattern di enSentence atau question, highlight jawaban
            const renderEnSentence = () => {
              if (!enSentence) return null;
              // Jika submitted, highlight jawaban yang benar di kalimat EN
              if (submitted) {
                const correctOpt = q.options[q.answerIndex];
                // Untuk vocab/reading yang enText adalah terjemahan, cukup tampilkan apa adanya
                // Untuk grammar fill-blank, tampilkan correctOpt dengan underline hijau/merah
                if (isCorrectQ) {
                  return (
                    <p className="text-[15px] leading-7 text-slate-800">
                      <span className="border-b-2 border-emerald-500 font-semibold text-emerald-600">
                        {correctOpt}
                      </span>{" "}
                      <span>{enSentence.replace(/_{2,}|…+|\.?\s*_{2,}\s*/g, "").trim()}</span>
                    </p>
                  );
                }
                if (isWrongQ) {
                  const chosenOpt = answered !== null ? q.options[answered] : "";
                  return (
                    <p className="text-[15px] leading-7 text-slate-800">
                      <span className="border-b-2 border-red-400 font-semibold text-red-600">
                        {chosenOpt}
                      </span>{" "}
                      <span>{enSentence.replace(/_{2,}|…+|\.?\s*_{2,}\s*/g, "").trim()}</span>
                    </p>
                  );
                }
              }
              // Belum submit: tampilkan blank + kalimat
              if (enSentence.includes("___") || enSentence.includes("..........")) {
                const parts = enSentence.split(/_{3,}|…+|_{2,}/);
                return (
                  <p className="text-[15px] leading-7 text-slate-800">
                    <span className="mr-2 inline-block w-20 border-b border-slate-400 text-center text-slate-300">
                      ..........
                    </span>
                    <span>{parts.join(" ").trim() || enSentence}</span>
                  </p>
                );
              }
              return <p className="text-[15px] leading-7 text-slate-800">{enSentence}</p>;
            };

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

                {/* ID bar */}
                {idText && (
                  <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 border-l-[3px] border-slate-300">
                    <span className="mr-1 text-xs font-bold text-slate-400">ID</span>
                    <span className="text-sm italic text-slate-600">{idText}</span>
                  </div>
                )}

                {/* EN sentence */}
                <div className="mt-3">{renderEnSentence() || <p className="text-[15px] font-medium text-slate-800">{q.question}</p>}</div>

                {/* Options 2x2 grid seperti referensi */}
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {q.options.map((_, oIndex) => {
                    const order = optionOrder[qIndex];
                    const realIndex = order ? order[oIndex] : oIndex;
                    const label = String.fromCharCode(65 + oIndex);
                    const primary = q.options[realIndex];
                    const secondary =
                      lesson.level === "A1" || lesson.level === "A2" ? q.optionsEN?.[realIndex] : q.optionsID?.[realIndex];
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
                          {secondary && (
                            <span className={`ml-1 text-xs ${submitted && (isCorrect || isWrong) ? "text-white/80" : "text-slate-400"}`}>
                              — {secondary}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback card seperti referensi SS "jawaban salah dan penjelasan semua pilihan" */}
                {submitted && (
                  <div className={`mt-4 rounded-xl border p-3 sm:p-4 ${isCorrectQ ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"}`}>
                    <p className={`flex items-center gap-1.5 text-sm font-bold ${isCorrectQ ? "text-emerald-600" : "text-red-600"}`}>
                      {isCorrectQ ? "✅ Benar!" : `❌ Jawaban yang benar: "${q.options[q.answerIndex]}"`}
                    </p>

                    {/* Explanation */}
                    <div className="mt-2.5 rounded-xl border border-slate-100 bg-white p-3 sm:p-3.5">
                      <p className="text-sm font-bold text-slate-800">Explanation:</p>
                      <div className="mt-1.5 text-sm leading-6 text-slate-700 whitespace-pre-line">
                        {q.explanation}
                        {q.explanationID && <span className="text-slate-500"> — {q.explanationID}</span>}
                      </div>
                      {(() => {
                        const tip = q.explanations?.[q.answerIndex];
                        const tipId = q.explanationsID?.[q.answerIndex];
                        // Jangan duplikasi jika isinya sama persis dengan q.explanation
                        const cleanTip = tip?.replace(/^✓\s*Benar!\s*/i, "").replace(/^✓\s*/i, "").trim();
                        const isDuplicate = cleanTip && cleanTip === q.explanation.trim();
                        if ((!cleanTip || isDuplicate) && !tipId) return null;
                        if (!cleanTip && !tipId) return null;
                        return (
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            <span className="mr-1">📌</span>
                            <span className="font-semibold">Tips:</span>{" "}
                            {cleanTip && !isDuplicate ? cleanTip : q.explanations?.[q.answerIndex]?.replace(/^✓\s*/i, "") ?? ""}
                            {tipId && <span className="text-slate-500"> — {tipId}</span>}
                          </p>
                        );
                      })()}
                    </div>

                    {/* Wrong Answer Explanations */}
                    {isWrongQ && (
                      <div className="mt-3">
                        <p className="text-sm font-bold text-slate-800">Wrong Answer Explanations:</p>
                        <div className="mt-2 flex flex-col gap-2">
                          {(q.explanations
                            ? q.explanations.map((exp, eIdx) => {
                                if (eIdx === q.answerIndex) return null;
                                const optLabel = q.options[eIdx];
                                const secondary = q.optionsEN?.[eIdx] || q.optionsID?.[eIdx];
                                const expId = q.explanationsID?.[eIdx];
                                const cleanExp = exp.replace(/^✓\s*/i, "").trim();
                                // Bangun contoh kalimat untuk opsi ini (seperti referensi: "✓ When did Budi read the book last night?")
                                const correctOpt = q.options[q.answerIndex];
                                const rawEn = (enSentence || q.questionEN || q.question || "") as string;
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
                                    {expId && <p className="mt-1 text-xs leading-4 text-slate-400">{expId.replace(/^✓\s*/i, "")}</p>}
                                    {example && !hasExample && <p className="mt-1 text-sm leading-6 text-slate-700">"{example}"</p>}
                                  </div>
                                );
                              })
                            : q.options.map((opt, eIdx) => {
                                if (eIdx === q.answerIndex) return null;
                                const secondary = q.optionsEN?.[eIdx] || q.optionsID?.[eIdx];
                                const correctOpt = q.options[q.answerIndex];
                                const rawEn = (enSentence || q.questionEN || q.question || "") as string;
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
                                  if (v === "is") return "untuk subjek he/she/it.";
                                  if (v === "are") return "untuk subjek you/we/they.";
                                  if (v === "am") return "untuk subjek I.";
                                  return "untuk konteks berbeda.";
                                };
                                const shortDesc = getShortDesc(opt);
                                const label = String.fromCharCode(65 + eIdx);
                                // Jika shortDesc sudah mengandung titik, jangan tambah titik lagi
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
            disabled={!canSubmit || saving}
            className="mt-6 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {saving
              ? "Menilai..."
              : canSubmit
                ? "Selesai & Lihat Nilai"
                : `Jawab dulu ${answeredCount}/${lesson.quiz.length}`}
          </button>
        )}

        {submitted && score !== null && (
          <div className="mt-6 rounded-xl bg-surface p-4 text-center">
            <p className="text-3xl font-bold text-brand">{score}%</p>
            <p className="mt-1 text-sm text-slate-600">
              {score >= 60
                ? "Bagus! Pelajaran selesai. 🎉"
                : "Skor minimal 60% untuk menyelesaikan. Baca lagi materi dan coba sekali lagi."}
            </p>
            {score >= 60 && isMember && (
              <p className="mt-2 text-sm text-success">
                Progress tersimpan. Lanjut ke pelajaran berikutnya!
              </p>
            )}
            {score >= 60 && !isMember && (
              <p className="mt-2 text-sm text-slate-600">
                Progress tersimpan di perangkat ini.{" "}
                <Link href="/daftar" className="font-medium text-brand underline">
                  Daftar untuk menyimpannya secara permanen
                </Link>
                .
              </p>
            )}
          </div>
        )}
      </section>

      {/* Games (latihan tambahan per level CEFR) */}
      <LessonGames games={lesson.games ?? []} speak={speak} ttsEnabled={ttsEnabled} />

      {/* Report issue */}
      <ReportProblem module="lesson" refId={lesson.id} questionCount={lesson.quiz.length} />
    </div>
  );
}

/** Render daftar kosakata dengan tombol pelafalan per kata. */
function VocabularyList({
  body,
  onSpeak,
  speakingId,
}: {
  body: string;
  onSpeak: (text: string, id: string) => void;
  speakingId: string | null;
}) {
  // Ambil kata-kata dari baris "word — arti" 
  const lines = body.split("\n");
  return (
    <div className="flex flex-col gap-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        // Deteksi pola "• word — arti" atau "word : arti"
        const match = trimmed.match(/^[•\-*]?\s*([A-Za-z][A-Za-z'\s]+?)\s*(?:—|:|\s-\s|\s)\s*(.+)$/);
        const word = match?.[1]?.trim() ?? null;
        return (
          <div key={i} className="flex items-start gap-2">
            {word && (
              <button
                type="button"
                onClick={() => onSpeak(word, `vocab-${i}`)}
                className="mt-0.5 shrink-0 text-brand hover:underline"
                title="Dengar cara baca"
              >
                {speakingId === `vocab-${i}` ? "🔊" : "🔉"}
              </button>
            )}
            <span className="leading-7 text-slate-700">{trimmed}</span>
          </div>
        );
      })}
    </div>
  );
}
