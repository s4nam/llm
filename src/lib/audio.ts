"use client";

/**
 * Abstraksi audio untuk modul latihan akademik.
 * - Default: Text-to-Speech browser (gratis) untuk text/script.
 * - Mendukung file audio dari Supabase Storage (URL) — kualitas konsisten.
 *
 * Mode "audio dulu → soal setelah":
 * - Pemanggil menyembunyikan soal sampai audio selesai (`onEnd`).
 * - Transkrip tidak ditampilkan saat mengerjakan (sesuai gaya TOEFL).
 */

let ttsSupportedCache: boolean | null = null;

export function isTtsSupported(): boolean {
  if (ttsSupportedCache !== null) return ttsSupportedCache;
  ttsSupportedCache =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";
  return ttsSupportedCache;
}

export interface PlayOptions {
  text?: string;
  audioUrl?: string;
  rate?: number;
  onEnd?: () => void;
  onError?: () => void;
}

export interface AudioController {
  play: (opts: PlayOptions) => void;
  stop: () => void;
  playing: boolean;
}

/**
 * Controller audio tunggal. `play()` berhentikan yang sedang berjalan dulu.
 * - Jika `audioUrl` diberikan → pakai <audio> element.
 * - Jika tidak, dan `text` ada → pakai speechSynthesis.
 */
export function createAudioController(onStateChange?: (playing: boolean) => void) {
  let speechUtterance: SpeechSynthesisUtterance | null = null;
  let audioElement: HTMLAudioElement | null = null;
  let _playing = false;

  function setPlaying(value: boolean) {
    _playing = value;
    onStateChange?.(value);
  }

  function stop() {
    if (speechUtterance) {
      window.speechSynthesis?.cancel();
      speechUtterance = null;
    }
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement = null;
    }
    setPlaying(false);
  }

  return {
    get playing() {
      return _playing;
    },
    play(opts: PlayOptions) {
      stop();
      if (!isTtsSupported() && !opts.audioUrl) {
        opts.onError?.();
        return;
      }

      if (opts.audioUrl) {
        const el = new Audio(opts.audioUrl);
        el.onended = () => {
          audioElement = null;
          setPlaying(false);
          opts.onEnd?.();
        };
        el.onerror = () => {
          audioElement = null;
          setPlaying(false);
          opts.onError?.();
        };
        audioElement = el;
        el.play().catch(() => opts.onError?.());
        setPlaying(true);
        return;
      }

      if (opts.text) {
        const utter = new SpeechSynthesisUtterance(opts.text);
        utter.lang = "en-US";
        utter.rate = opts.rate ?? 0.9;
        utter.onend = () => {
          speechUtterance = null;
          setPlaying(false);
          opts.onEnd?.();
        };
        utter.onerror = () => {
          speechUtterance = null;
          setPlaying(false);
          opts.onError?.();
        };
        speechUtterance = utter;
        window.speechSynthesis.speak(utter);
        setPlaying(true);
      }
    },
    stop,
  };
}