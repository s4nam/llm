"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Timer countdown reusable untuk latihan akademik & simulasi.
 *
 * - Durasi dalam detik. Ketika habis → memanggil `onExpire` (sekali).
 * - Untuk memulai ulang dengan durasi baru, konsumen memakai `reset()`
 *   atau me-remount via prop `key={totalSeconds}` pada komponen pemakai.
 * - `pause` menghentikan hitungan (mis. saat audio listening diputar).
 *
 * Return: { secondsLeft, totalSeconds, running, paused, pause, resume, reset }.
 */
export function useCountdown(
  totalSeconds: number,
  onExpire?: () => void,
) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(true);
  const [paused, setPaused] = useState(false);
  const onExpireRef = useRef(onExpire);
  const expireFiredRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [running, paused]);

  // Deteksi selesai via effect — panggil onExpire sekali.
  useEffect(() => {
    if (running && secondsLeft === 0 && !expireFiredRef.current) {
      expireFiredRef.current = true;
      setRunning(false);
      onExpireRef.current?.();
    }
  }, [secondsLeft, running]);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);
  const reset = useCallback(() => {
    expireFiredRef.current = false;
    setSecondsLeft(totalSeconds);
    setRunning(true);
    setPaused(false);
  }, [totalSeconds]);

  return {
    secondsLeft,
    totalSeconds,
    running,
    paused,
    pause,
    resume,
    reset,
  };
}

/** Format detik → "MM:SS". */
export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}