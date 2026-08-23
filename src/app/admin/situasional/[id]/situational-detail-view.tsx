"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SituationalSetView {
  id: string;
  topic: string;
  title: string;
  content: {
    aiName?: string;
    dialogues?: { speaker: string; text: string }[];
    vocab?: { word: string; meaning: string }[];
    quiz?: { question: string; options: string[]; answerIndex: number; explanation: string }[];
    roleplay?: {
      scenario: string;
      lines?: { speaker: string; text: string }[];
      keyPhrases?: string[];
    };
  };
  is_free: boolean;
  status: string;
}

const TOPIC_LABEL: Record<string, string> = {
  hotel: "Hotel",
  restaurant: "Restoran",
  travel: "Bandara & Perjalanan",
  shopping: "Belanja",
  health: "Kesehatan",
  interview: "Wawancara Kerja",
  phone: "Telepon",
  bank: "Perbankan & Keuangan",
  office: "Kantor & Rapat",
  school: "Sekolah & Kelas",
  social: "Pesta & Perkenalan Sosial",
  customer_service: "Layanan Pelanggan",
};

export default function SituationalDetailView({ set }: { set: SituationalSetView }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: string) {
    setBusy(action);
    setMessage(null);
    const res = await fetch("/api/admin/situational-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: set.id, action }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage(data.error ?? "Gagal.");
      return;
    }
    if (action === "approve") {
      setMessage("Set disetujui dan kini tampil untuk siswa. ✓");
      router.refresh();
    } else if (action === "reject") {
      router.push("/admin/situasional/list");
    } else {
      setMessage("Set digenerate ulang (draft baru). Periksa kembali di bawah.");
      router.refresh();
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {message && (
        <p className="rounded-xl bg-success/10 p-4 text-sm text-success">{message}</p>
      )}

      {/* Status & aksi */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {TOPIC_LABEL[set.topic] ?? set.topic} {set.is_free ? "• Gratis" : ""}
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{set.title}</h2>
          <p className="text-sm text-slate-500">
            Status: {set.status === "published" ? "✓ Tampil untuk siswa" : "Draft (belum tampil)"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {set.status === "draft" && (
            <button
              onClick={() => act("approve")}
              disabled={busy !== null}
              className="rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy === "approve" ? "Menyetujui..." : "Setujui & Tampilkan"}
            </button>
          )}
          <button
            onClick={() => act("regenerate")}
            disabled={busy !== null}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy === "regenerate" ? "Mengganti..." : "Regenerate"}
          </button>
          {set.status === "draft" && (
            <button
              onClick={() => act("reject")}
              disabled={busy !== null}
              className="rounded-xl border border-danger px-5 py-2.5 text-sm font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
            >
              {busy === "reject" ? "Menghapus..." : "Tolak"}
            </button>
          )}
        </div>
      </div>

      {/* Dialog */}
      {set.content.dialogues && set.content.dialogues.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">Dialog ({set.content.dialogues.length} baris)</h3>
          <div className="mt-3 flex flex-col gap-2">
            {set.content.dialogues.map((d, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${
                  d.speaker === "ai" ? "bg-surface text-slate-600" : "bg-brand-light/30 text-slate-800"
                }`}
              >
                <b>{d.speaker === "ai" ? (set.content.aiName ?? "AI") : "Kamu"}:</b> {d.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kosakata */}
      {set.content.vocab && set.content.vocab.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">Kosakata ({set.content.vocab.length})</h3>
          <ul className="mt-3 flex flex-col gap-1.5">
            {set.content.vocab.map((v, i) => (
              <li key={i} className="flex justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{v.word}</span>
                <span className="text-slate-600">{v.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Kuis */}
      {set.content.quiz && set.content.quiz.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">Kuis ({set.content.quiz.length})</h3>
          <div className="mt-3 flex flex-col gap-4">
            {set.content.quiz.map((q, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-slate-800">{i + 1}. {q.question}</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {q.options.map((opt, oi) => (
                    <li
                      key={oi}
                      className={`rounded-lg px-3 py-1.5 text-sm ${
                        oi === q.answerIndex
                          ? "bg-success/10 font-medium text-success"
                          : "bg-surface text-slate-600"
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}. {opt}
                      {oi === q.answerIndex && " ✓ (jawaban)"}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-slate-500">💡 {q.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roleplay */}
      {set.content.roleplay && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="font-semibold text-slate-900">Role-play</h3>
          <p className="mt-1 text-sm text-slate-600">{set.content.roleplay.scenario}</p>
          <div className="mt-3 flex flex-col gap-2">
            {(set.content.roleplay.lines ?? []).map((l, i) => (
              <div key={i} className="rounded-lg bg-surface px-3 py-2 text-sm">
                <b>{l.speaker === "ai" ? (set.content.aiName ?? "AI") : "Kamu"}:</b> {l.text}
              </div>
            ))}
          </div>
          {set.content.roleplay.keyPhrases && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(set.content.roleplay.keyPhrases ?? []).map((p, i) => (
                <span key={i} className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}