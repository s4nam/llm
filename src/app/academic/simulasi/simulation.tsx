"use client";

import { useState } from "react";
import Link from "next/link";
import VoiceRecorder from "@/components/voice-recorder";
import { useCountdown, formatSeconds } from "@/lib/use-countdown";
import { createAudioController } from "@/lib/audio";
import type {
  AcademicPassage,
  AcademicScript,
  AcademicSpeakingTask,
  AcademicWritingTask,
} from "@/lib/types-academic";

interface Answer {
  itemIndex: number;
  questionIndex: number;
  answer: number;
}

interface SectionResult {
  score: number;
  correct: number;
  total: number;
  percent: number;
  results: { correct: boolean; answerIndex: number; explanation: string }[];
}

interface SimResponse {
  total: number;
  maxScore: number;
  reading: SectionResult;
  listening: SectionResult;
  writing: { score: number; feedback: string; quotaError: boolean };
  speaking: { score: number; recordedCount: number; totalTasks: number };
  cefr: { level: string; label: string } | null;
}

type Phase = "intro" | "reading" | "listening" | "writing" | "speaking" | "result";

export default function Simulation({
  readingSet,
  listeningSet,
  writingSet,
  speakingSet,
}: {
  readingSet: { id: string; title: string; passages: AcademicPassage[] };
  listeningSet: { id: string; title: string; scripts: AcademicScript[] };
  writingSet: { id: string; title: string; task: AcademicWritingTask };
  speakingSet: { id: string; title: string; tasks: AcademicSpeakingTask[] };
}) {
  const readCount = readingSet.passages.reduce((n, p) => n + p.questions.length, 0);
  const listenCount = listeningSet.scripts.reduce((n, s) => n + s.questions.length, 0);
  const writingSeconds = (writingSet.task.timeMinutes ?? 30) * 60;
  const speakSeconds = speakingSet.tasks.reduce((n, t) => n + (t.speakSeconds ?? 60), 0);
  const totalQuestions = readCount + listenCount;
  const timerSeconds = Math.max(60 * 60, totalQuestions * 60 + writingSeconds + speakSeconds);

  const [phase, setPhase] = useState<Phase>("intro");
  const [readingAnswers, setReadingAnswers] = useState<Record<string, number>>({});
  const [listeningAnswers, setListeningAnswers] = useState<Record<string, number>>({});
  const [writingText, setWritingText] = useState("");
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const [result, setResult] = useState<SimResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const audio = createAudioController(setPlaying);

  const { secondsLeft, reset } = useCountdown(timerSeconds, () => {
    if (phase === "listening") {
      void submit(true);
    } else if (phase === "writing") {
      void submit(true);
    }
  });

  function chooseAnswer(
    kind: "reading" | "listening",
    item: number,
    qIdx: number,
    value: number,
  ) {
    const key = item + ":" + qIdx;
    if (kind === "reading") {
      setReadingAnswers((prev) => ({ ...prev, [key]: value }));
    } else {
      setListeningAnswers((prev) => ({ ...prev, [key]: value }));
    }
  }

  const readAnswered = Object.keys(readingAnswers).length;
  const listenAnswered = Object.keys(listeningAnswers).length;
  const recordedCount = Object.keys(recordings).length;

  function submit(auto: boolean) {
    if (phase !== "listening" && phase !== "writing") return;
    if (phase === "listening" && listenAnswered !== listenCount && !auto) return;
    if (phase === "writing" && writingText.trim().length < 10 && !auto) return;
    void (async () => {
      setSaving(true);
      setError(null);

      const toPayload = (answers: Record<string, number>): Answer[] =>
        Object.entries(answers).map(([key, value]) => {
          const [itemIndex, qIdx] = key.split(":").map(Number);
          return { itemIndex, questionIndex: qIdx, answer: value };
        });

      const res = await fetch("/api/academic/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reading: { setId: readingSet.id, answers: toPayload(readingAnswers) },
          listening: { setId: listeningSet.id, answers: toPayload(listeningAnswers) },
          writing: {
            taskPrompt: writingSet.task.prompt,
            context: writingSet.task.context,
            userText: writingText,
          },
          speaking: { recordedCount, totalTasks: speakingSet.tasks.length },
        }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim jawaban.");
        return;
      }
      setResult(data);
      setPhase("result");
    })();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      {/* Header: timer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Sesi Simulasi</h2>
          <p className="text-xs text-slate-500">
            Reading • Listening • Writing • Speaking
          </p>
        </div>
        {phase !== "intro" && phase !== "result" && (
          <span
            className={`rounded-full px-3 py-1 font-mono text-sm font-bold ${
              secondsLeft <= 60 ? "bg-danger/10 text-danger" : "bg-surface text-slate-600"
            }`}
          >
            ⏱ {formatSeconds(secondsLeft)}
          </span>
        )}
      </div>

      {/* PHASE: intro */}
      {phase === "intro" && (
        <div className="mt-6 text-center">
          <p className="text-4xl">🎯</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">
            Siap memulai simulasi?
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            4 section dalam satu sesi: <strong>{readCount} soal Reading</strong>,{" "}
            <strong>{listenCount} soal Listening</strong>, esai Writing, dan
            rekaman Speaking. Skor per section 0–30, total{" "}
            <strong>0–120</strong>.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setPhase("reading")}
              className="rounded-xl bg-brand px-8 py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              Mulai Simulasi
            </button>
            <Link
              href="/academic"
              className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Kembali
            </Link>
          </div>
        </div>
      )}

      {/* PHASE: reading */}
      {phase === "reading" && (
        <div className="mt-6">
          <SectionHeader n={1} title="Reading" note={`Jawab ${readCount} soal.`} />
          {readingSet.passages.map((p, pIdx) => (
            <div key={pIdx} className="mt-5">
              <h4 className="font-semibold text-slate-800">{p.title}</h4>
              <div className="mt-2 whitespace-pre-line rounded-xl bg-surface p-5 leading-7 text-slate-700">
                {p.text}
              </div>
              <div className="mt-4 flex flex-col gap-4">
                {p.questions.map((q, qIdx) => (
                  <div key={qIdx}>
                    <p className="font-medium text-slate-800">{qIdx + 1}. {q.question}</p>
                    <OptionList
                      options={q.options}
                      selected={readingAnswers[`${pIdx}:${qIdx}`]}
                      onSelect={(oIdx) => chooseAnswer("reading", pIdx, qIdx, oIdx)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPhase("listening")}
            disabled={readAnswered !== readCount}
            className="mt-6 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {readAnswered !== readCount
              ? `Jawab dulu ${readAnswered}/${readCount}`
              : "Lanjut ke Listening →"}
          </button>
        </div>
      )}

      {/* PHASE: listening */}
      {phase === "listening" && (
        <div className="mt-6">
          <SectionHeader n={2} title="Listening" note={`Putar audio, jawab ${listenCount} soal.`} />
          {listeningSet.scripts.map((s, sIdx) => (
            <div key={sIdx} className="mt-5">
              <h4 className="font-semibold text-slate-800">{s.title}</h4>
              <div className="mt-2 rounded-xl border border-slate-200 bg-surface p-4">
                <button
                  type="button"
                  onClick={() => audio.play({ text: s.script, onEnd: () => {} })}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
                >
                  {playing ? "🔊 Memutar..." : "▶ Putar Audio"}
                </button>
                <p className="mt-2 text-xs text-slate-500">
                  Transkrip ditampilkan setelah selesai.
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-4">
                {s.questions.map((q, qIdx) => (
                  <div key={qIdx}>
                    <p className="font-medium text-slate-800">{qIdx + 1}. {q.question}</p>
                    <OptionList
                      options={q.options}
                      selected={listeningAnswers[`${sIdx}:${qIdx}`]}
                      onSelect={(oIdx) => chooseAnswer("listening", sIdx, qIdx, oIdx)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPhase("writing")}
            disabled={listenAnswered !== listenCount}
            className="mt-6 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {listenAnswered !== listenCount
              ? `Jawab dulu ${listenAnswered}/${listenCount}`
              : "Lanjut ke Writing →"}
          </button>
        </div>
      )}

      {/* PHASE: writing */}
      {phase === "writing" && (
        <div className="mt-6">
          <SectionHeader n={3} title="Writing" note={`${writingSet.task.timeMinutes} menit.`} />
          {writingSet.task.context && (
            <div className="mt-4 rounded-xl bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Bahan bacaan
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
                {writingSet.task.context}
              </p>
            </div>
          )}
          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">{writingSet.task.prompt}</p>
          </div>
          <textarea
            value={writingText}
            onChange={(e) => setWritingText(e.target.value)}
            rows={8}
            placeholder="Tulis esai Anda di sini..."
            className="mt-4 w-full rounded-xl border border-slate-300 p-4 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
          />
          <button
            type="button"
            onClick={() => setPhase("speaking")}
            disabled={writingText.trim().length < 10}
            className="mt-4 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {writingText.trim().length < 10
              ? "Tulis dulu minimal 10 karakter"
              : "Lanjut ke Speaking →"}
          </button>
        </div>
      )}

      {/* PHASE: speaking */}
      {phase === "speaking" && (
        <div className="mt-6">
          <SectionHeader n={4} title="Speaking" note={`Rekam jawaban ${speakingSet.tasks.length} task.`} />
          <div className="mt-4 flex flex-col gap-5">
            {speakingSet.tasks.map((t, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-bold text-brand">
                    Task {i + 1}
                  </span>
                  <span className="text-xs text-slate-500">
                    Persiapan {t.prepSeconds}s • Bicara {t.speakSeconds}s
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                  {t.prompt}
                </p>
                <div className="mt-3">
                  <VoiceRecorder
                    taskIndex={i}
                    maxSeconds={t.speakSeconds}
                    onRecorded={(url) => setRecordings((prev) => ({ ...prev, [i]: url }))}
                  />
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>
          )}

          <button
            type="button"
            onClick={() => submit(false)}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {saving
              ? "Menilai..."
              : recordedCount === 0
                ? "Selesai & Lihat Hasil (belum ada rekaman)"
                : `Selesai & Lihat Hasil (${recordedCount}/${speakingSet.tasks.length} direkam)`}
          </button>
        </div>
      )}

      {/* PHASE: result */}
      {phase === "result" && result && (
        <div className="mt-6">
          <div className="rounded-2xl bg-surface p-6 text-center">
            <p className="text-5xl font-bold text-brand">
              {result.total}/{result.maxScore}
            </p>
            {result.cefr && (
              <p className="mt-2 text-sm text-slate-600">
                Level perkiraan:{" "}
                <span className="font-bold text-brand">{result.cefr.level}</span>{" "}
                — {result.cefr.label}
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreCard label="Reading" score={result.reading.score} sub={`${result.reading.correct}/${result.reading.total}`} />
              <ScoreCard label="Listening" score={result.listening.score} sub={`${result.listening.correct}/${result.listening.total}`} />
              <ScoreCard label="Writing" score={result.writing.score} sub={result.writing.quotaError ? "kuota habis" : "AI"} />
              <ScoreCard label="Speaking" score={result.speaking.score} sub={`${result.speaking.recordedCount}/${result.speaking.totalTasks} rekam`} />
            </div>

            {result.writing.feedback && !result.writing.quotaError && (
              <div className="mt-4 rounded-xl bg-white p-4 text-left">
                <p className="text-sm font-semibold text-slate-800">Umpan balik Writing</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {result.writing.feedback}
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/academic/hasil"
                className="rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
              >
                Lihat Riwayat Skor
              </Link>
              <button
                type="button"
                onClick={() => {
                  setReadingAnswers({});
                  setListeningAnswers({});
                  setWritingText("");
                  setRecordings({});
                  setResult(null);
                  reset();
                  setPhase("intro");
                }}
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ulangi Simulasi
              </button>
            </div>
          </div>

          {/* Pembahasan Reading & Listening */}
          <div className="mt-6">
            <h3 className="font-semibold text-slate-900">Pembahasan Reading</h3>
            <ReviewList
              items={readingSet.passages}
              section={readingSet.title}
              results={result.reading.results}
              answers={readingAnswers}
            />
            <h3 className="mt-6 font-semibold text-slate-900">Pembahasan Listening</h3>
            <ReviewList
              items={listeningSet.scripts}
              section={listeningSet.title}
              results={result.listening.results}
              answers={listeningAnswers}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ n, title, note }: { n: number; title: string; note: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">
        Section {n} — {title}
      </h3>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function OptionList({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: number | undefined;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {options.map((opt, oIdx) => (
        <button
          key={oIdx}
          type="button"
          onClick={() => onSelect(oIdx)}
          className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
            selected === oIdx
              ? "border-brand bg-brand-light/40"
              : "border-slate-200 bg-white hover:border-brand"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ScoreCard({ label, score, sub }: { label: string; score: number; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900">{score}/30</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function ReviewList({
  items,
  section,
  results,
  answers,
}: {
  items: (AcademicPassage | AcademicScript)[];
  section: string;
  results: { correct: boolean; answerIndex: number; explanation: string }[];
  answers: Record<string, number>;
}) {
  let offset = 0;
  return (
    <div className="mt-3 flex flex-col gap-4">
      {items.map((it, i) => {
        const title = (it as { title?: string }).title ?? `${section} ${i + 1}`;
        const questions = (it as { questions?: { question?: string; options?: string[] }[] }).questions ?? [];
        return (
          <div key={i} className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            {questions.map((q, qIdx) => {
              const r = results[offset++];
              if (!r) return null;
              const chosen = answers[`${i}:${qIdx}`];
              return (
                <div key={qIdx} className="mt-3 rounded-lg bg-surface p-3">
                  <p className="text-sm font-medium text-slate-800">
                    {r.correct ? "✓" : "✗"} {q.question}
                  </p>
                  {!r.correct && (
                    <p className="mt-1 text-sm text-danger">
                      Jawaban Anda:{" "}
                      {typeof chosen === "number" ? q.options?.[chosen] ?? "—" : "—"}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-slate-600">
                    Jawaban benar: {q.options?.[r.answerIndex]}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{r.explanation}</p>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
