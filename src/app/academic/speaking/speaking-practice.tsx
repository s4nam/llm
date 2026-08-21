"use client";

import { useState } from "react";
import VoiceRecorder from "@/components/voice-recorder";
import { useCountdown, formatSeconds } from "@/lib/use-countdown";
import type { AcademicSpeakingTask } from "@/lib/types-academic";

export default function SpeakingPractice({
  title,
  tasks,
}: {
  title: string;
  tasks: AcademicSpeakingTask[];
}) {
  // Semua tasks digabung dalam satu sesi: total waktu bicara
  const totalSpeak = tasks.reduce((n, t) => n + (t.speakSeconds ?? 60), 0);
  const timerSeconds = Math.max(totalSpeak + tasks.length * 30, 5 * 60);

  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const { secondsLeft, reset } = useCountdown(timerSeconds, () => {
    setSubmitted(true);
  });

  const recordedCount = Object.keys(recordings).length;

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
        {tasks.length} tasks • rekam jawaban untuk tiap task
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {tasks.map((t, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-5">
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

            <div className="mt-4">
              <VoiceRecorder
                taskIndex={i}
                maxSeconds={t.speakSeconds}
                onRecorded={(url) =>
                  setRecordings((prev) => ({ ...prev, [i]: url }))
                }
              />
            </div>
          </div>
        ))}
      </div>

      {submitted ? (
        <div className="mt-6 rounded-2xl bg-surface p-5 text-center">
          <p className="text-lg font-semibold text-slate-900">Sesi selesai 🎉</p>
          <p className="mt-1 text-sm text-slate-600">
            {recordedCount}/{tasks.length} task direkam. Rekaman tersimpan di akun Anda.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setRecordings({});
              reset();
            }}
            className="mt-4 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ulangi Sesi
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          disabled={recordedCount === 0}
          className="mt-6 w-full rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {recordedCount === 0
            ? `Rekam dulu jawaban Anda (${recordedCount}/${tasks.length})`
            : `Selesai (${recordedCount}/${tasks.length} direkam)`}
        </button>
      )}
    </section>
  );
}
