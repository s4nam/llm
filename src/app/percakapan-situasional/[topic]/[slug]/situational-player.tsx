"use client";

import { useCallback, useEffect, useState } from "react";
import type { SituationalSetContent } from "@/lib/types-situational";

/** Acak array (Fisher–Yates). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SituationalPlayer({
  title,
  content,
}: {
  title: string;
  content: SituationalSetContent;
}) {
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(content.quiz.length).fill(null),
  );
  const [submitted, setSubmitted] = useState(false);
  // Urutan opsi per soal (index tampilan → index asli). Diacak setelah mount.
  const [optionOrder, setOptionOrder] = useState<number[][]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setTtsEnabled(
        typeof window !== "undefined" && "speechSynthesis" in window,
      );
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setOptionOrder(
        content.quiz.map((q) => shuffle(q.options.map((_, i) => i))),
      );
    }, 0);
    return () => clearTimeout(t);
  }, [content.quiz]);

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
      setSpeakingId(id);
      window.speechSynthesis.speak(utter);
    },
    [ttsEnabled, speakingId],
  );

  const answeredCount = answers.filter((a) => a !== null).length;
  const allAnswered = answeredCount === content.quiz.length;
  const score = submitted
    ? content.quiz.reduce(
        (acc, q, i) => (answers[i] === q.answerIndex ? acc + 1 : acc),
        0,
      )
    : 0;

  function choose(oIndex: number, qIndex: number) {
    if (submitted) return;
    const order = optionOrder[qIndex];
    const realIndex = order ? order[oIndex] : oIndex;
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = realIndex;
      return next;
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Dialog */}
      {content.dialogues && content.dialogues.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Dengarkan Dialog</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tekan 🔊 untuk mendengar lawan bicara, lalu baca giliranmu.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {content.dialogues.map((line, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-xl border p-3 ${
                  line.speaker === "ai"
                    ? "border-slate-200 bg-surface"
                    : "border-brand/40 bg-brand-light/20"
                }`}
              >
                <span className="mt-0.5 shrink-0 rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {line.speaker === "ai" ? "AI" : "Kamu"}
                </span>
                <p className="flex-1 text-sm leading-6 text-slate-800">{line.text}</p>
                {line.speaker === "ai" && ttsEnabled && (
                  <button
                    type="button"
                    onClick={() => speak(line.text, `dlg-${i}`)}
                    className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
                  >
                    🔊
                  </button>
                )}
              </div>
            ))}
          </div>
          {!ttsEnabled && (
            <p className="mt-3 text-sm text-slate-500">
              Perangkat Anda tidak mendukung suara. Baca transkrip di atas.
            </p>
          )}
        </section>
      )}

      {/* Kosakata */}
      {content.vocab && content.vocab.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Kosakata Penting</h2>
          <div className="mt-3 flex flex-col gap-2">
            {content.vocab.map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-2.5"
              >
                <span className="font-medium text-slate-800">{v.word}</span>
                <span className="text-sm text-slate-600">{v.meaning}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Kuis */}
      {content.quiz && content.quiz.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Kuis Pemahaman</h2>
          <div className="mt-4 flex flex-col gap-5">
            {content.quiz.map((q, qIndex) => (
              <div key={qIndex}>
                <p className="font-medium text-slate-800">
                  {qIndex + 1}. {q.question}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {q.options.map((option, oIndex) => {
                    const order = optionOrder[qIndex];
                    const realIndex = order ? order[oIndex] : oIndex;
                    const isSelected = answers[qIndex] === realIndex;
                    const isCorrect = submitted && realIndex === q.answerIndex;
                    const isWrong = submitted && isSelected && realIndex !== q.answerIndex;
                    let cls = "border-slate-200 bg-white hover:border-brand hover:bg-brand-light/40";
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
                  <p className="mt-2 text-sm text-slate-600">
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
              onClick={() => setSubmitted(true)}
              disabled={!allAnswered}
              className="mt-6 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {allAnswered
                ? "Selesai & Lihat Nilai"
                : `Jawab dulu ${answeredCount}/${content.quiz.length}`}
            </button>
          )}
          {submitted && (
            <div className="mt-6 rounded-xl bg-surface p-4 text-center">
              <p className="text-2xl font-bold text-brand">
                {Math.round((score / content.quiz.length) * 100)}%
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Benar {score}/{content.quiz.length}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Roleplay */}
      {content.roleplay && (
        <section className="rounded-2xl border-2 border-brand bg-brand-light/20 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Latihan Percakapan</h2>
          <p className="mt-1 text-sm text-slate-600">{content.roleplay.scenario}</p>
          <div className="mt-4 flex flex-col gap-3">
            {content.roleplay.lines.map((line, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-xl border p-3 ${
                  line.speaker === "ai"
                    ? "border-slate-200 bg-white"
                    : "border-brand/40 bg-white"
                }`}
              >
                <span className="mt-0.5 shrink-0 rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {line.speaker === "ai" ? "AI" : "Kamu"}
                </span>
                <p className="flex-1 text-sm leading-6 text-slate-800">{line.text}</p>
                {line.speaker === "ai" && ttsEnabled && (
                  <button
                    type="button"
                    onClick={() => speak(line.text, `rp-${i}`)}
                    className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
                  >
                    🔊
                  </button>
                )}
              </div>
            ))}
          </div>
          {content.roleplay.keyPhrases && content.roleplay.keyPhrases.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-700">Frasa penting:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {content.roleplay.keyPhrases.map((p, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}