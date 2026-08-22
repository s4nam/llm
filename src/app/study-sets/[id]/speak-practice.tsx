"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Item {
  word: string;
  translation: string;
}

interface ScoreResult {
  transcript: string;
  score: number;
  highlights: string[];
  tips: string[];
  used: number;
  limit: number;
}

/**
 * Latihan "Ucapkan & Dapatkan Nilai":
 * Dengar kata (TTS) → rekam (langsung dikirim, tidak disimpan) → skor AI 0-100 + tips.
 * Audio tidak diunggah ke storage — dikirim langsung ke /api/speech-score lalu dibuang.
 */
export default function SpeakPractice({
  items,
  hasAccess,
}: {
  items: Item[];
  hasAccess: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const MAX_SECONDS = 20;

  useEffect(() => {
    const t = setTimeout(() => {
      setTtsEnabled(typeof window !== "undefined" && "speechSynthesis" in window);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const current = items[index];
  const itemCount = items.length;

  function goTo(next: number) {
    setIndex((next + itemCount) % itemCount);
    setResult(null);
    setError(null);
  }

  function speak(text: string, rate = 0.8) {
    if (!ttsEnabled) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = rate;
    window.speechSynthesis.speak(utter);
  }

  async function startRecording() {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void submit();
      };
      rec.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= MAX_SECONDS) stopRecording();
          return next;
        });
      }, 1000);
    } catch {
      setError("Izin mikrofon ditolak. Aktifkan akses mikrofon lalu coba lagi.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      setRecording(false);
      rec.stop();
    }
  }

  async function submit() {
    const chunks = chunksRef.current;
    if (chunks.length === 0) {
      setError("Tidak ada audio yang terekam.");
      return;
    }
    const blob = new Blob(chunks, { type: "audio/webm" });
    if (blob.size > 5 * 1024 * 1024) {
      setError("Audio terlalu besar (maks 5 MB). Coba rekam lebih singkat.");
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.append("audio", blob, `speak-${Date.now()}.webm`);
    form.append("target", current.word);
    form.append("durationSeconds", String(Math.max(1, elapsed)));
    try {
      const res = await fetch("/api/speech-score", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menilai ucapan.");
        return;
      }
      setResult(data as ScoreResult);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (!hasAccess) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-surface p-6 text-center">
        <p className="text-2xl">🎙️</p>
        <h3 className="mt-2 font-semibold text-slate-900">
          Latihan Ucapan untuk Member
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
          Dengar kata, rekam suaramu, dan dapatkan skor pengucapan + tips dari AI.
          Fitur ini tersedia untuk member atau masa trial aktif.
        </p>
        <Link
          href="/langganan"
          className="mt-4 inline-block rounded-xl bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark"
        >
          Langganan Sekarang
        </Link>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-surface p-6 text-center">
        <p className="text-sm text-slate-500">
          Tambahkan kata dulu (tab &quot;Tambah Kata&quot;) untuk mulai berlatih ucapan.
        </p>
      </div>
    );
  }

  const scoreColor =
    result == null
      ? ""
      : result.score >= 80
        ? "bg-success/10 text-success"
        : result.score >= 50
          ? "bg-amber-100 text-amber-700"
          : "bg-danger/10 text-danger";

  return (
    <div className="flex flex-col gap-5">
      {/* Kartu kata aktif */}
      <div className="rounded-2xl border-2 border-brand bg-white p-6 text-center">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Kata {index + 1} dari {itemCount}
        </p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{current.word}</p>
        {current.translation && (
          <p className="mt-1 text-sm text-slate-500">{current.translation}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {ttsEnabled && (
            <button
              type="button"
              onClick={() => speak(current.word, 0.8)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              🔊 Dengar (pelan)
            </button>
          )}
          {ttsEnabled && (
            <button
              type="button"
              onClick={() => speak(current.word, 1.0)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              🔉 Dengar (normal)
            </button>
          )}
        </div>
      </div>

      {/* Rekam */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-surface p-5">
        {!recording && !busy && (
          <button
            type="button"
            onClick={startRecording}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-danger text-xl text-white transition hover:opacity-90"
            title="Mulai merekam"
          >
            ●
          </button>
        )}
        {recording && (
          <button
            type="button"
            onClick={stopRecording}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-xl text-white transition hover:opacity-90"
            title="Berhenti merekam"
          >
            ■
          </button>
        )}
        {busy && (
          <span className="text-sm text-slate-500">Menganalisis ucapan...</span>
        )}
        <p className="text-sm text-slate-600">
          {recording ? (
            <span className="font-mono font-semibold text-danger">
              {elapsed}s / {MAX_SECONDS}s — ucapkan &quot;{current.word}&quot;
            </span>
          ) : (
            <span>Tekan untuk merekam (maks {MAX_SECONDS} detik)</span>
          )}
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {/* Hasil */}
      {result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-900">Hasil Ucapan</p>
            <span
              className={`rounded-full px-4 py-1.5 text-xl font-bold ${scoreColor}`}
            >
              {result.score}
            </span>
          </div>

          {result.highlights.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700">
                Perhatikan kata ini:
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {result.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-lg bg-brand-light/60 px-3 py-1 text-sm font-medium text-brand"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.tips.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {result.tips.map((tip, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-surface px-4 py-2.5 text-sm text-slate-700"
                >
                  {tip}
                </li>
              ))}
            </ul>
          )}

          {result.transcript && (
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
              Yang terdeteksi: &quot;{result.transcript}&quot; • Kuota tersisa{" "}
              {Math.max(0, result.limit - result.used)}/{result.limit} bulan ini
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Kata Berikutnya →
            </button>
          </div>
        </div>
      )}

      {/* Navigasi kata */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          ← Prev
        </button>
        <span className="text-sm text-slate-500">
          {index + 1}/{itemCount}
        </span>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}