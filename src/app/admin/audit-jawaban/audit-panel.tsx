"use client";

import { useState } from "react";

interface WrongItem {
  index: number;
  question: string;
  options: string[];
  storedAnswerIndex: number;
  correctAnswerIndex: number;
}

interface AuditReport {
  module: "lesson" | "toefl" | "situational" | "placement";
  refId: string;
  title: string;
  subTitle?: string;
  status: string;
  wrong: WrongItem[];
  error?: string;
  updated: boolean;
}

interface AuditResult {
  ok: boolean;
  error?: string;
  stats?: {
    units: number;
    questions: number;
    wrong: number;
    fixedUnits: number;
    errors: number;
    skipped: number;
  };
  reports?: AuditReport[];
}

type Scope = "all" | "lesson" | "toefl" | "situational" | "placement";

const SCOPE_LIST: Scope[] = ["lesson", "toefl", "situational", "placement"];

const MODULE_LABELS: Record<AuditReport["module"], string> = {
  lesson: "Materi Pelajaran",
  toefl: "Latihan Akademik (TOEFL)",
  situational: "Percakapan Situasional",
  placement: "Tes Penempatan",
};

function letter(i: number): string {
  return String.fromCharCode(65 + i);
}

export default function AuditPanel() {
  const [scope, setScope] = useState<Scope>("all");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);

  async function run(fix: boolean) {
    setBusy(true);
    setResult(null);

    // Untuk cakupan "all", jalankan per modul berurutan agar setiap request
    // singkat (mencegah timeout / "Failed to fetch" saat banyak panggilan AI).
    const scopesToRun: Scope[] =
      scope === "all" ? SCOPE_LIST : [scope];

    const merged: AuditResult = {
      ok: true,
      stats: { units: 0, questions: 0, wrong: 0, fixedUnits: 0, errors: 0, skipped: 0 },
      reports: [],
    };

    for (const s of scopesToRun) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120_000);

      try {
        const res = await fetch("/api/admin/audit-answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: s, fix }),
          signal: controller.signal,
        });

        let data: AuditResult;
        try {
          data = await res.json();
        } catch {
          const text = await res.text();
          data = {
            ok: false,
            error: `Respons server tidak valid (status ${res.status}): ${text.slice(0, 200)}`,
          };
        }

        if (!res.ok && !data.error) {
          data = { ok: false, error: `Terjadi kesalahan (status ${res.status}).` };
        }

        if (!data.ok) {
          merged.ok = false;
          merged.error = `${MODULE_LABELS[s as AuditReport["module"]]}: ${data.error ?? "Gagal."}`;
          break;
        }

        if (data.stats && merged.stats) {
          merged.stats.units += data.stats.units;
          merged.stats.questions += data.stats.questions;
          merged.stats.wrong += data.stats.wrong;
          merged.stats.fixedUnits += data.stats.fixedUnits;
          merged.stats.errors += data.stats.errors;
          merged.stats.skipped += data.stats.skipped;
        }
        if (data.reports) {
          merged.reports = merged.reports ?? [];
          merged.reports.push(...data.reports);
        }
      } catch (err) {
        const aborted =
          err instanceof DOMException && err.name === "AbortError";
        merged.ok = false;
        merged.error = aborted
          ? `Modul ${MODULE_LABELS[s as AuditReport["module"]]} terlalu lama. Coba jalankan modul tersebut secara terpisah.`
          : `Gagal menghubungi server: ${(err as Error).message}`;
        break;
      } finally {
        clearTimeout(timer);
      }
    }

    setResult(merged);
    setBusy(false);
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* Kontrol */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <label className="block text-sm font-medium text-slate-700">
          Cakupan audit
        </label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
          className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light sm:w-72"
        >
          <option value="all">Semua modul</option>
          <option value="lesson">Materi Pelajaran</option>
          <option value="toefl">Latihan Akademik (TOEFL)</option>
          <option value="situational">Percakapan Situasional</option>
          <option value="placement">Tes Penempatan</option>
        </select>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => run(false)}
            disabled={busy}
            className="rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {busy
              ? "Memeriksa (bisa beberapa menit)…"
              : "Mulai Audit (cek saja)"}
          </button>
          <button
            type="button"
            onClick={() => run(true)}
            disabled={busy}
            className="rounded-xl bg-success px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy
              ? "Memeriksa (bisa beberapa menit)…"
              : "Audit & Perbaiki"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          <b>Mulai Audit</b> = read-only, hanya melaporkan (tidak mengubah apa pun,
          tidak menandai). <b>Audit &amp; Perbaiki</b> = memperbaiki kunci jawaban
          yang salah, menurunkan konten ke draft, dan menandainya sebagai{" "}
          <i>sudah diverifikasi</i> sehingga dilewati pada audit berikutnya.
        </p>
      </div>

      {/* Error global */}
      {result && !result.ok && (
        <div className="rounded-2xl border border-danger bg-danger/10 p-5 text-danger">
          {result.error}
        </div>
      )}

      {/* Ringkasan */}
      {result?.ok && result.stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          <StatCard label="Unit diperiksa" value={result.stats.units} />
          <StatCard label="Soal diperiksa" value={result.stats.questions} />
          <StatCard label="Kunci salah" value={result.stats.wrong} accent="danger" />
          <StatCard label="Unit diperbaiki" value={result.stats.fixedUnits} accent="success" />
          <StatCard label="Unit dilewati (sudah ok)" value={result.stats.skipped} />
          <StatCard label="Unit error" value={result.stats.errors} />
        </div>
      )}

      {/* Tidak ada masalah */}
      {result?.ok && result.stats && result.stats.wrong === 0 && (
        <div className="rounded-2xl border border-success bg-success/10 p-6 text-success">
          Tidak ada kunci jawaban yang salah pada cakupan ini. 🎉
        </div>
      )}

      {/* Laporan per unit */}
      {result?.ok && result.reports && result.reports.length > 0 && (
        <div className="flex flex-col gap-5">
          {result.reports.map((rep, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                  {MODULE_LABELS[rep.module]}
                </span>
                {rep.subTitle && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {rep.subTitle}
                  </span>
                )}
                {rep.status === "published" ? (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                    Tampil
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    Draft
                  </span>
                )}
                {rep.updated && (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                    ✓ Diperbaiki → draft
                  </span>
                )}
              </div>
              <h3 className="mt-2 font-semibold text-slate-900">{rep.title}</h3>
              {rep.error && (
                <p className="mt-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
                  Gagal memverifikasi: {rep.error}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-3">
                {rep.wrong.map((w) => (
                  <div
                    key={w.index}
                    className="rounded-xl border border-danger/30 bg-danger/5 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      Soal #{w.index + 1}: {w.question}
                    </p>
                    <ul className="mt-2 flex flex-col gap-1">
                      {w.options.map((opt, oi) => {
                        const isStored = oi === w.storedAnswerIndex;
                        const isCorrect = oi === w.correctAnswerIndex;
                        let cls = "text-slate-600";
                        if (isCorrect) cls = "font-semibold text-success";
                        if (isStored && !isCorrect) cls = "font-semibold text-danger line-through";
                        return (
                          <li key={oi} className={`text-sm ${cls}`}>
                            {letter(oi)}. {opt}
                            {isCorrect && " ✓ (jawaban benar)"}
                            {isStored && !isCorrect && " ✗ (kunci tersimpan salah)"}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "danger" | "success";
}) {
  const color =
    accent === "danger"
      ? "text-danger"
      : accent === "success"
        ? "text-success"
        : "text-brand";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}