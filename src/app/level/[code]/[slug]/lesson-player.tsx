"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LessonDetail } from "@/lib/types";

const FREE_STORAGE_KEY = "em_free_progress";

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
  const [result, setResult] = useState<boolean[]>([]);
  const [saving, setSaving] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  // Selalu true di awal (server & client sama), lalu diperiksa ulang setelah mount.
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [writingText, setWritingText] = useState("");
  const [writingFeedback, setWritingFeedback] = useState<string | null>(null);
  const [writingScore, setWritingScore] = useState<number | null>(null);
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
    (text: string, id: string) => {
      if (!ttsEnabled) return;
      if (speakingId === id) {
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
      setSpeakingId(id);
      window.speechSynthesis.speak(utter);
    },
    [ttsEnabled, speakingId],
  );

  const answeredCount = answers.filter((a) => a !== null).length;
  const canSubmit = answeredCount === lesson.quiz.length;

  function choose(oIndex: number, qIndex: number) {
    if (submitted) return;
    const next = [...answers];
    next[qIndex] = oIndex;
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

  async function report() {
    const note = window.prompt(
      "Jelaskan masalah pada materi ini (misal: ada kesalahan tata bahasa atau terjemahan):",
    );
    if (!note) return;
    setReporting(true);
    const res = await fetch("/api/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "report", lessonId: lesson.id, note }),
    });
    setReporting(false);
    setReportMsg(res.ok ? "Terima kasih! Laporan Anda sudah terkirim." : "Gagal mengirim laporan.");
  }

  async function submitWriting() {
    if (writingText.trim().length < 5) return;
    setWritingLoading(true);
    setWritingFeedback(null);
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
    setWritingQuota((q) => (q ? { ...q, used: q.used + 1 } : q));
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Intro */}
      <div className="rounded-2xl border border-slate-200 bg-surface p-6">
        <p className="leading-7 text-slate-700">{lesson.intro}</p>
      </div>

      {/* Sections */}
      {lesson.sections.map((section) => (
        <section key={section.heading} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-900">{section.heading}</h2>
          {lesson.category === "listening" && section.heading.toLowerCase().includes("dengar") ? (
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
              <div className="whitespace-pre-line rounded-xl bg-surface p-4 leading-7 text-slate-700">
                {section.body}
              </div>
            </div>
          ) : (
            <div className="mt-3 whitespace-pre-line leading-7 text-slate-700">
              {lesson.category === "vocabulary" && section.heading.toLowerCase().includes("kosakata") ? (
                <VocabularyList body={section.body} onSpeak={speak} speakingId={speakingId} />
              ) : (
                section.body
              )}
            </div>
          )}
        </section>
      ))}

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
                  <p className="whitespace-pre-line leading-7 text-slate-700">
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
          {lesson.quiz.map((q, qIndex) => (
            <div key={qIndex}>
              <p className="font-medium text-slate-800">
                {qIndex + 1}. {q.question}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {q.options.map((option, oIndex) => {
                  const isSelected = answers[qIndex] === oIndex;
                  const isCorrect = submitted && oIndex === q.answerIndex;
                  const isWrong = submitted && isSelected && oIndex !== q.answerIndex;
                  let cls = "border-slate-200 bg-white hover:border-brand hover:bg-brand-light/40";
                  if (isCorrect) cls = "border-success bg-success/10";
                  else if (isWrong) cls = "border-danger bg-danger/10";
                  else if (isSelected) cls = "border-brand bg-brand-light/40";
                  return (
                    <button
                      key={oIndex}
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
                <p className={`mt-2 text-sm ${result[qIndex] ? "text-success" : "text-slate-600"}`}>
                  <span className="font-semibold">
                    {result[qIndex] ? "✓ Benar." : "✗ Kurang tepat."}
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

      {/* Report issue */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">
          Ada yang salah di materi ini?
        </p>
        <button
          type="button"
          onClick={report}
          disabled={reporting}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {reporting ? "Mengirim..." : "Laporkan masalah"}
        </button>
      </div>
      {reportMsg && <p className="text-center text-sm text-success">{reportMsg}</p>}
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
