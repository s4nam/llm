"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AcademicSection } from "@/lib/types-academic";

export default function AcademicDetailView({
  setId,
  section,
  title,
  content,
  status,
}: {
  setId: string;
  section: AcademicSection;
  title: string;
  content: Record<string, unknown>;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function act(action: string) {
    setBusy(action);
    setMessage(null);
    const res = await fetch("/api/admin/academic-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: setId, action }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage({ type: "err", text: data.error ?? "Terjadi kesalahan." });
      return;
    }
    setMessage({ type: "ok", text: "Berhasil." });
    router.refresh();
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {message && (
        <p
          className={`rounded-xl p-4 text-sm ${
            message.type === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {status === "draft" && (
          <button
            type="button"
            onClick={() => act("approve")}
            disabled={busy !== null}
            className="rounded-xl bg-success px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy === "approve" ? "Menyetujui..." : "Setujui & Tampilkan"}
          </button>
        )}
        <button
          type="button"
          onClick={() => act("regenerate")}
          disabled={busy !== null}
          className="rounded-xl bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy === "regenerate" ? "Membuat ulang..." : "Regenerate"}
        </button>
        {status === "draft" && (
          <button
            type="button"
            onClick={() => act("reject")}
            disabled={busy !== null}
            className="rounded-xl border border-danger px-5 py-2.5 font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
          >
            {busy === "reject" ? "Menghapus..." : "Tolak"}
          </button>
        )}
      </div>

      {/* Ringkasan konten per section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Pratinjau Konten</h2>
        <p className="mt-1 text-sm text-slate-500">{title}</p>

        {section === "reading" && (
          <ReadingPreview content={content} />
        )}
        {section === "listening" && <ListeningPreview content={content} />}
        {section === "writing" && <WritingPreview content={content} />}
        {section === "speaking" && <SpeakingPreview content={content} />}
      </div>
    </div>
  );
}

function ReadingPreview({ content }: { content: Record<string, unknown> }) {
  const passages = (content.passages ?? []) as { title?: string; text?: string; questions?: unknown[] }[];
  return (
    <div className="mt-4 flex flex-col gap-4">
      {passages.map((p, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-surface p-4">
          <p className="font-semibold text-slate-800">{p.title ?? `Passage ${i + 1}`}</p>
          <p className="mt-1 line-clamp-3 text-sm text-slate-600">{p.text}</p>
          <p className="mt-2 text-xs text-slate-500">
            {p.questions?.length ?? 0} soal
          </p>
        </div>
      ))}
    </div>
  );
}

function ListeningPreview({ content }: { content: Record<string, unknown> }) {
  const scripts = (content.scripts ?? []) as { title?: string; script?: string; questions?: unknown[] }[];
  return (
    <div className="mt-4 flex flex-col gap-4">
      {scripts.map((s, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-surface p-4">
          <p className="font-semibold text-slate-800">{s.title ?? `Script ${i + 1}`}</p>
          <p className="mt-1 line-clamp-3 text-sm text-slate-600">{s.script}</p>
          <p className="mt-2 text-xs text-slate-500">{s.questions?.length ?? 0} soal</p>
        </div>
      ))}
    </div>
  );
}

function WritingPreview({ content }: { content: Record<string, unknown> }) {
  const task = content.task as { prompt?: string; timeMinutes?: number } | undefined;
  if (!task) return <p className="mt-4 text-sm text-slate-500">Belum ada data tugas.</p>;
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-surface p-4">
      <p className="text-sm font-semibold text-slate-800">Tugas menulis</p>
      <p className="mt-1 text-sm text-slate-600">{task.prompt}</p>
      <p className="mt-2 text-xs text-slate-500">Waktu: {task.timeMinutes ?? 30} menit</p>
    </div>
  );
}

function SpeakingPreview({ content }: { content: Record<string, unknown> }) {
  const tasks = (content.tasks ?? []) as { prompt?: string; prepSeconds?: number; speakSeconds?: number }[];
  return (
    <div className="mt-4 flex flex-col gap-4">
      {tasks.map((t, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-surface p-4">
          <p className="text-sm font-semibold text-slate-800">Task {i + 1}</p>
          <p className="mt-1 line-clamp-3 text-sm text-slate-600">{t.prompt}</p>
          <p className="mt-2 text-xs text-slate-500">
            Persiapan {t.prepSeconds ?? 0}s • Bicara {t.speakSeconds ?? 0}s
          </p>
        </div>
      ))}
    </div>
  );
}
