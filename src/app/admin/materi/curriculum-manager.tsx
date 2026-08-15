"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CEFR_LEVELS, CATEGORIES, type Category, type CefrLevel } from "@/lib/types";
import { getCurriculumForLevel } from "@/lib/curriculum";

export interface CurriculumRow {
  level_code: string;
  category: string;
  total: number;
  published: number;
  draft: number;
}

const TARGET_PER_CATEGORY = 4;

export default function CurriculumManager({ rows }: { rows: CurriculumRow[] }) {
  const [level, setLevel] = useState<CefrLevel>("A1");
  const [category, setCategory] = useState<Category>("vocabulary");
  const [topic, setTopic] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingLevel, setGeneratingLevel] = useState(false);
  const [generatingPlacement, setGeneratingPlacement] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [levelResult, setLevelResult] = useState<{ total: number; succeeded: number; failed: number } | null>(null);
  const [levelProgress, setLevelProgress] = useState<{ done: number; total: number; current: string } | null>(null);

  const grid = useMemo(() => {
    const map = new Map<string, CurriculumRow>();
    for (const r of rows) map.set(`${r.level_code}|${r.category}`, r);
    return map;
  }, [rows]);

  async function generateLevel() {
    const topics = getCurriculumForLevel(level);
    const confirmText = window.confirm(
      `Generate seluruh level ${level}?\n\n${topics.length} pelajaran akan dibuat (draft) satu per satu. Semua tetap harus disetujui dulu sebelum tampil.\n\nEstimasi biaya token: sekitar Rp 200 – 10.000 tergantung model & provider yang dipakai.\n\nLanjutkan?`,
    );
    if (!confirmText) return;
    setGeneratingLevel(true);
    setMessage(null);
    setLevelResult(null);
    setLevelProgress({ done: 0, total: topics.length, current: "Memulai..." });

    let succeeded = 0;
    let failed = 0;
    const failures: string[] = [];

    // Generate satu per satu dari browser agar progress terlihat & tidak "hang"
    for (let i = 0; i < topics.length; i++) {
      const item = topics[i];
      setLevelProgress({ done: i, total: topics.length, current: `${item.topic} (${item.category})` });
      try {
        const res = await fetch("/api/admin/generate-lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: item.level,
            category: item.category,
            topic: item.topic,
            isFree: Boolean(item.isFree),
          }),
        });
        if (res.ok) {
          succeeded++;
        } else {
          failed++;
          failures.push(item.topic);
        }
      } catch {
        failed++;
        failures.push(item.topic);
      }
      setLevelProgress({ done: i + 1, total: topics.length, current: "" });
    }

    setLevelResult({ total: topics.length, succeeded, failed });
    setLevelProgress(null);
    setMessage({
      type: failed === 0 ? "ok" : "err",
      text:
        failed === 0
          ? `${succeeded}/${topics.length} pelajaran berhasil dibuat (draft). Periksa di Daftar Materi untuk menyetujui.`
          : `${succeeded}/${topics.length} berhasil, ${failed} gagal: ${failures.slice(0, 5).join(", ")}`,
    });
    setGeneratingLevel(false);
  }

  async function generate() {
    if (topic.trim().length < 3) {
      setMessage({ type: "err", text: "Isi topik pelajaran dulu (min. 3 karakter)." });
      return;
    }
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, category, topic, isFree }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Gagal generate." });
      } else {
        setMessage({
          type: "ok",
          text: "Materi berhasil dibuat (draft). Buka di daftar Materi untuk pratinjau & persetujuan.",
        });
        setTopic("");
      }
    } catch {
      setMessage({ type: "err", text: "Terjadi kesalahan jaringan." });
    } finally {
      setGenerating(false);
    }
  }

  async function generatePlacement() {
    setGeneratingPlacement(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/generate-placement", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Gagal generate placement." });
      } else {
        setMessage({
          type: "ok",
          text: `Soal placement test berhasil dibuat (${data.count} soal). Siswa bisa mengerjakannya di /placement-test.`,
        });
      }
    } catch {
      setMessage({ type: "err", text: "Terjadi kesalahan jaringan." });
    } finally {
      setGeneratingPlacement(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Generate level lengkap */}
      <section className="rounded-2xl border-2 border-brand bg-brand-light/20 p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          🚀 Generate Level Lengkap
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Buat seluruh 20 pelajaran untuk satu level sekaligus (draft). Semua
          tetap harus disetujui satu per satu sebelum tampil.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as CefrLevel)}
            disabled={generatingLevel}
            className="w-full max-w-xs rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand disabled:opacity-50"
          >
            {CEFR_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={generateLevel}
            disabled={generatingLevel}
            className="shrink-0 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {generatingLevel ? "Membuat pelajaran..." : `Generate Level ${level}`}
          </button>
        </div>

        {/* Progress bar */}
        {levelProgress && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                {levelProgress.done}/{levelProgress.total} dibuat
              </span>
              <span className="text-xs text-slate-400">
                {Math.round((levelProgress.done / levelProgress.total) * 100)}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-2 rounded-full bg-brand transition-all"
                style={{ width: `${(levelProgress.done / levelProgress.total) * 100}%` }}
              />
            </div>
            {levelProgress.current && (
              <p className="mt-2 text-sm text-slate-600">
                Sedang membuat: {levelProgress.current}...
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              Setiap pelajaran ±10–30 detik. Total {levelProgress.total} pelajaran bisa memakan beberapa menit.
              Halaman ini akan berjalan terus — jangan ditutup.
            </p>
          </div>
        )}

        {levelResult && !levelProgress && (
          <p className="mt-3 text-sm text-slate-600">
            {levelResult.succeeded}/{levelResult.total} dibuat. {levelResult.failed} gagal.
          </p>
        )}
      </section>

      {/* Form generate */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Generate Pelajaran Baru
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Pilih level, kategori, dan tulis topik. AI membuat draft yang harus
          Anda setujui sebelum tampil ke siswa.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as CefrLevel)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand"
            >
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Topik</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: Daily Routines"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
            />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          Jadikan pelajaran gratis (masuk 3 pelajaran gratis / akses tanpa member)
        </label>
        {message && (
          <p className={`mt-4 rounded-xl p-4 text-sm ${message.type === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
            {message.text}
          </p>
        )}
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="mt-4 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {generating ? "Menghasilkan materi..." : "Generate Materi (AI)"}
        </button>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-800">
            Soal Tes Penempatan
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Generate 12 soal placement test (di-cache, dipakai semua siswa).
          </p>
          <button
            type="button"
            onClick={generatePlacement}
            disabled={generatingPlacement}
            className="mt-3 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {generatingPlacement ? "Menghasilkan..." : "Generate Soal Placement"}
          </button>
        </div>
      </section>

      {/* Status kurikulum */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Status Kurikulum</h2>
        <p className="mt-1 text-sm text-slate-500">
          Target: {TARGET_PER_CATEGORY} pelajaran per kategori per level (total 20 per level).
        </p>
        <div className="mt-4 flex flex-col gap-6">
          {CEFR_LEVELS.map((lv) => (
            <div key={lv}>
              <h3 className="text-sm font-bold text-slate-800">{lv}</h3>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-5">
                {CATEGORIES.map((c) => {
                  const row = grid.get(`${lv}|${c.id}`);
                  const published = row?.published ?? 0;
                  const draft = row?.draft ?? 0;
                  const done = published >= TARGET_PER_CATEGORY;
                  return (
                    <div
                      key={c.id}
                      className={`rounded-lg border p-3 ${done ? "border-success bg-success/5" : "border-slate-200 bg-surface"}`}
                    >
                      <p className="text-xs font-medium text-slate-600">{c.label.split(" (")[0]}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {published}
                        <span className="text-sm font-normal text-slate-400">/{TARGET_PER_CATEGORY}</span>
                      </p>
                      {draft > 0 && (
                        <p className="text-xs text-amber-600">{draft} draft</p>
                      )}
                      {done && <p className="text-xs text-success">✓ Selesai</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-sm text-slate-500">
        Untuk melihat detail draft & menyetujui materi, buka{" "}
        <Link href="/admin/materi" className="font-medium text-brand underline">
          daftar Materi
        </Link>
        .
      </p>
    </div>
  );
}
