"use client";

import { useEffect, useState } from "react";

const FREE_STORAGE_KEY = "em_free_progress";
const MERGE_DONE_KEY = "em_merge_done";

function readHasLocalProgress(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = JSON.parse(localStorage.getItem(FREE_STORAGE_KEY) ?? "{}");
    const entries = Object.values(stored).filter(
      (v) => v && (v as { completed?: boolean }).completed,
    );
    const alreadyMerged = localStorage.getItem(MERGE_DONE_KEY) === "1";
    return entries.length > 0 && !alreadyMerged;
  } catch {
    return false;
  }
}

export default function MergeProgressPrompt() {
  // Selalu mulai false (server & client sama) untuk hindari hydration mismatch,
  // lalu deteksi setelah render di browser.
  const [hasLocal, setHasLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setHasLocal(readHasLocalProgress()), 0);
    return () => clearTimeout(t);
  }, []);

  async function merge() {
    setBusy(true);
    try {
      const stored = JSON.parse(localStorage.getItem(FREE_STORAGE_KEY) ?? "{}");
      const progress = Object.values(stored).map((v) => {
        const item = v as { slug: string; bestScore: number };
        return { slug: item.slug, bestScore: item.bestScore ?? 0 };
      });
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge", progress }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem(MERGE_DONE_KEY, "1");
        setMessage(
          `Berhasil! ${data.merged} pelajaran disimpan ke akun Anda.`,
        );
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setMessage(data.error ?? "Gagal menggabungkan.");
      }
    } catch {
      setMessage("Terjadi kesalahan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (!hasLocal) return null;

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand bg-brand-light/30 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-semibold text-slate-900">
          Anda punya progress belajar di perangkat ini
        </h2>
        <p className="text-sm text-slate-600">
          Gabungkan progress pelajaran gratis ke akun Anda agar tersimpan
          permanen.
        </p>
        {message && <p className="mt-1 text-sm text-success">{message}</p>}
      </div>
      <button
        type="button"
        onClick={merge}
        disabled={busy}
        className="shrink-0 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
      >
        {busy ? "Menggabungkan..." : "Gabungkan ke Akun"}
      </button>
    </div>
  );
}
