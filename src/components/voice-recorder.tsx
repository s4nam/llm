"use client";

import { useRef, useState } from "react";

/**
 * Komponen rekam suara untuk latihan Speaking (gaya TOEFL).
 * - MediaRecorder → blob webm → upload ke Supabase Storage (bucket private).
 * - Batas durasi sesuai speakSeconds (auto-stop).
 * - Setelah terkirim → dapat URL pemutaran ulang.
 */

export default function VoiceRecorder({
  taskIndex,
  maxSeconds = 60,
  onRecorded,
}: {
  taskIndex: number;
  maxSeconds?: number;
  onRecorded?: (url: string) => void;
}) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  async function start() {
    setError(null);
    setAudioUrl(null);
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
        void upload();
      };
      rec.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (next >= maxSeconds) {
            stop();
          }
          return next;
        });
      }, 1000);
    } catch {
      setError("Izin mikrofon ditolak. Aktifkan akses mikrofon lalu coba lagi.");
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      setRecording(false);
      rec.stop();
    }
  }

  async function upload() {
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
    setUploading(true);
    const form = new FormData();
    form.append("audio", blob, `speaking-task-${taskIndex}-${Date.now()}.webm`);
    try {
      const res = await fetch("/api/academic/recording", { method: "POST", body: form });
      const data = await res.json();
      setUploading(false);
      if (!res.ok) {
        setError(data.error ?? "Gagal mengunggah rekaman.");
        return;
      }
      setAudioUrl(data.url);
      onRecorded?.(data.url);
    } catch {
      setUploading(false);
      setError("Gagal mengunggah rekaman.");
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-surface p-4">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          {!recording && !uploading && (
            <button
              type="button"
              onClick={start}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-danger text-white transition hover:opacity-90"
              title="Mulai merekam"
            >
              ●
            </button>
          )}
          {recording && (
            <button
              type="button"
              onClick={stop}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white transition hover:opacity-90"
              title="Berhenti merekam"
            >
              ■
            </button>
          )}
          {uploading && (
            <span className="text-sm text-slate-500">Mengunggah rekaman...</span>
          )}
          <div className="text-sm text-slate-600">
            {recording ? (
              <span className="font-mono font-semibold text-danger">
                {elapsed}s / {maxSeconds}s
              </span>
            ) : (
              <span>Tekan untuk merekam jawaban Anda (maks {maxSeconds} detik)</span>
            )}
          </div>
        </div>
        {audioUrl && (
          <audio controls src={audioUrl} className="h-10 max-w-full" preload="metadata" />
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
