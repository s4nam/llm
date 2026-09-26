"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { parseYoutubeId, youtubeEmbedUrl } from "@/lib/youtube";

type MediaType = "classic" | "youtube" | "image";

interface LessonMedia {
  type: MediaType;
  youtube_url?: string | null;
  image_url?: string | null;
  image_path?: string | null;
}

interface LessonDetail {
  id: string;
  level_code: string;
  category: string;
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
  quiz: { question: string; options: string[]; answerIndex: number; explanation: string }[];
  games: unknown[];
  explanation_media?: LessonMedia | null;
  is_free: boolean;
  status: string;
}

function normalizeMedia(raw: unknown): LessonMedia {
  if (!raw || typeof raw !== "object") return { type: "classic" };
  const m = raw as Record<string, unknown>;
  const t = String(m.type ?? "classic");
  if (t === "youtube" || t === "image" || t === "classic") {
    return {
      type: t as MediaType,
      youtube_url: (m.youtube_url as string) ?? null,
      image_url: (m.image_url as string) ?? null,
      image_path: (m.image_path as string) ?? null,
    };
  }
  return { type: "classic" };
}

export default function LessonDetailView({ lesson }: { lesson: LessonDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);

  // Media state
  const initialMedia = normalizeMedia((lesson as unknown as Record<string, unknown>).explanation_media ?? lesson.explanation_media);
  const [mediaType, setMediaType] = useState<MediaType>(initialMedia.type);
  const [youtubeUrl, setYoutubeUrl] = useState(initialMedia.youtube_url ?? "");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaMessage, setMediaMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialMedia.image_url ?? null);

  useEffect(() => {
    const t = setTimeout(() => {
      setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported) return;
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 0.9;
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utter);
    },
    [ttsSupported, speaking],
  );

  async function act(action: string) {
    setBusy(action);
    setMessage(null);
    const res = await fetch("/api/admin/lesson-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lesson.id, action }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage(data.error ?? "Gagal.");
      return;
    }
    if (action === "approve") {
      setMessage("Materi disetujui dan kini tampil untuk siswa. ✓");
      router.refresh();
    } else if (action === "reject") {
      router.push("/admin/materi/list");
    } else {
      setMessage("Materi digenerate ulang (draft baru). Periksa kembali di bawah.");
      router.refresh();
    }
  }

  async function saveYoutube() {
    const trimmed = youtubeUrl.trim();
    if (!trimmed) {
      setMediaMessage({ type: "err", text: "Link YouTube wajib diisi." });
      return;
    }
    if (!parseYoutubeId(trimmed)) {
      setMediaMessage({ type: "err", text: "Link YouTube tidak valid. Contoh: https://www.youtube.com/watch?v=xxxxx atau https://youtu.be/xxxxx" });
      return;
    }
    setMediaBusy(true);
    setMediaMessage(null);
    const res = await fetch("/api/admin/lesson-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lesson.id, media: { type: "youtube", youtube_url: trimmed } }),
    });
    const data = await res.json();
    setMediaBusy(false);
    if (!res.ok) {
      setMediaMessage({ type: "err", text: data.error ?? "Gagal menyimpan." });
      return;
    }
    setMediaType("youtube");
    setImagePreview(null);
    setMediaMessage({ type: "ok", text: "Video YouTube disimpan. Siswa akan melihat video sebelum soal." });
    router.refresh();
  }

  async function setClassic() {
    setMediaBusy(true);
    setMediaMessage(null);
    const res = await fetch("/api/admin/lesson-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lesson.id, media: { type: "classic" } }),
    });
    const data = await res.json();
    setMediaBusy(false);
    if (!res.ok) {
      setMediaMessage({ type: "err", text: data.error ?? "Gagal." });
      return;
    }
    setMediaType("classic");
    setMediaMessage({ type: "ok", text: "Diubah ke mode Teks. Siswa akan melihat Intro & Sections sebelum soal." });
    router.refresh();
  }

  async function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMediaMessage({ type: "err", text: "Gambar terlalu besar (maks 5MB)." });
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMediaMessage({ type: "err", text: "Hanya file gambar yang didukung." });
      return;
    }
    setMediaBusy(true);
    setMediaMessage(null);
    const fd = new FormData();
    fd.append("id", lesson.id);
    fd.append("image", file);
    const res = await fetch("/api/admin/lesson-media", { method: "POST", body: fd });
    const data = await res.json();
    setMediaBusy(false);
    // reset input
    e.target.value = "";
    if (!res.ok) {
      setMediaMessage({ type: "err", text: data.error ?? "Gagal upload." });
      return;
    }
    setMediaType("image");
    setImagePreview(data.image_url ?? data.media?.image_url ?? null);
    setMediaMessage({ type: "ok", text: "Gambar disimpan. Siswa akan melihat gambar sebelum soal." });
    router.refresh();
  }

  async function removeImageToClassic() {
    await setClassic();
    setImagePreview(null);
  }

  const youtubePreview = youtubeUrl ? youtubeEmbedUrl(youtubeUrl) : null;
  const activeYoutubePreview = initialMedia.type === "youtube" && initialMedia.youtube_url ? youtubeEmbedUrl(initialMedia.youtube_url) : null;

  return (
    <div className="mt-6 flex flex-col gap-6">
      {message && <p className="rounded-xl bg-success/10 p-4 text-sm text-success">{message}</p>}

      {/* Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {lesson.level_code} • {lesson.category} {lesson.is_free ? "• Gratis" : ""}
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">{lesson.title}</h2>
          <p className="text-sm text-slate-500">Status: {lesson.status === "published" ? "✓ Tampil untuk siswa" : "Draft (belum tampil)"}</p>
          <p className="mt-1 text-xs text-slate-400">
            Mode penjelasan:{" "}
            <span className="font-semibold text-slate-700">
              {mediaType === "classic" ? "📝 Teks (Intro+Sections)" : mediaType === "youtube" ? "▶️ YouTube" : "🖼️ Gambar"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {lesson.status === "draft" && (
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
          {lesson.status === "draft" && (
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

      {/* Media Penjelasan Dinamis */}
      <div className="rounded-2xl border-2 border-brand/20 bg-white p-6">
        <h3 className="text-base font-bold text-slate-900">Media Penjelasan (sebelum soal)</h3>
        <p className="mt-1 text-sm text-slate-500">Pilih 1 jenis saja. Siswa akan melihat media ini lalu langsung mengerjakan soal. Intro/sections tetap tersimpan tapi disembunyikan bila pilih YouTube/Gambar.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(
            [
              { id: "classic", label: "📝 Teks", desc: "Intro + 3 Sections" },
              { id: "youtube", label: "▶️ YouTube", desc: "1 link video" },
              { id: "image", label: "🖼️ Gambar", desc: "1 gambar upload" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMediaType(opt.id)}
              className={`rounded-xl border-2 p-4 text-left transition ${mediaType === opt.id ? "border-brand bg-brand-light/20" : "border-slate-200 bg-surface hover:border-slate-300"}`}
            >
              <p className="text-sm font-bold text-slate-900">{opt.label}</p>
              <p className="text-xs text-slate-500">{opt.desc}</p>
              {initialMedia.type === opt.id && <p className="mt-1 text-xs font-semibold text-brand">● Aktif saat ini</p>}
            </button>
          ))}
        </div>

        {mediaMessage && (
          <p className={`mt-4 rounded-xl p-3 text-sm ${mediaMessage.type === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{mediaMessage.text}</p>
        )}

        {/* Panel Classic */}
        {mediaType === "classic" && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-surface p-4">
            <p className="text-sm text-slate-600">Mode Teks — siswa melihat Intro & Sections (hasil AI) sebelum soal.</p>
            {initialMedia.type !== "classic" ? (
              <button
                type="button"
                onClick={setClassic}
                disabled={mediaBusy}
                className="mt-3 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {mediaBusy ? "Menyimpan..." : "Aktifkan Mode Teks"}
              </button>
            ) : (
              <p className="mt-2 text-xs text-success">✓ Sudah aktif. Lihat preview Intro & Sections di bawah.</p>
            )}
          </div>
        )}

        {/* Panel YouTube */}
        {mediaType === "youtube" && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-surface p-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Link YouTube</label>
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... atau https://youtu.be/..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
            />
            <p className="mt-1 text-xs text-slate-400">Mendukung watch, youtu.be, shorts, embed. Siswa bisa pause/play di aplikasi.</p>
            {youtubePreview && (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-black">
                <div className="aspect-video w-full">
                  <iframe
                    src={youtubePreview}
                    title="Preview YouTube"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={saveYoutube}
              disabled={mediaBusy}
              className="mt-3 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {mediaBusy ? "Menyimpan..." : "Simpan Video"}
            </button>
            {initialMedia.type === "youtube" && initialMedia.youtube_url && (
              <p className="mt-2 text-xs text-slate-500">Tersimpan: {initialMedia.youtube_url}</p>
            )}
          </div>
        )}

        {/* Panel Image */}
        {mediaType === "image" && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-surface p-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Upload Gambar (1 gambar, maks 5MB — JPG/PNG/WEBP/GIF)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onImageChange}
              disabled={mediaBusy}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-dark disabled:opacity-50"
            />
            {(imagePreview || (initialMedia.type === "image" && initialMedia.image_url)) && (
              <div className="mt-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview ?? initialMedia.image_url ?? ""}
                  alt="Preview materi"
                  className="max-h-[380px] w-full rounded-xl border border-slate-200 object-contain bg-white"
                />
                <button
                  type="button"
                  onClick={removeImageToClassic}
                  disabled={mediaBusy}
                  className="mt-2 text-xs font-medium text-danger hover:underline disabled:opacity-50"
                >
                  Hapus gambar & kembali ke Teks
                </button>
              </div>
            )}
            {mediaBusy && <p className="mt-2 text-sm text-slate-500">Mengunggah...</p>}
          </div>
        )}
      </div>

      {/* Intro — tetap tampil di admin, beri badge bila hidden */}
      <div className={`rounded-2xl border p-6 ${mediaType === "classic" ? "border-slate-200 bg-surface" : "border-amber-200 bg-amber-50/40"}`}>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900">Intro</h3>
          {mediaType !== "classic" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Disembunyikan dari siswa (mode {mediaType})</span>}
        </div>
        <p className="mt-2 text-justify leading-7 text-slate-700">{lesson.intro}</p>
      </div>

      {/* Sections */}
      {lesson.sections.map((s, i) => (
        <div key={i} className={`rounded-2xl border p-6 ${mediaType === "classic" ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50/30"}`}>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">{s.heading}</h3>
            {mediaType !== "classic" && i === 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Hidden</span>}
          </div>
          {lesson.category === "listening" && i === 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => speak(s.body)}
                disabled={!ttsSupported}
                className="mb-3 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {speaking ? "⏸ Berhenti" : "🔊 Dengarkan"}
              </button>
              {!ttsSupported && <p className="mb-2 text-sm text-slate-500">Browser ini tidak mendukung suara. Anda tetap bisa cek transkrip di bawah.</p>}
            </div>
          )}
          <div className="mt-2 whitespace-pre-line text-justify leading-7 text-slate-700">{s.body}</div>
        </div>
      ))}

      {/* Quiz */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Latihan Soal ({lesson.quiz.length})</h3>
        <div className="mt-4 flex flex-col gap-5">
          {lesson.quiz.map((q, i) => (
            <div key={i}>
              <p className="font-medium text-slate-800">
                {i + 1}. {q.question}
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {q.options.map((opt, oi) => (
                  <li key={oi} className={`rounded-lg px-3 py-2 text-sm ${oi === q.answerIndex ? "bg-success/10 font-medium text-success" : "bg-surface text-slate-600"}`}>
                    {String.fromCharCode(65 + oi)}. {opt}
                    {oi === q.answerIndex && " ✓ (jawaban)"}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-justify text-sm text-slate-500">💡 {q.explanation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Games */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Games Tambahan ({(lesson.games ?? []).length})</h3>
        {(lesson.games ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Tidak ada latihan tambahan untuk pelajaran ini.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {(lesson.games as { type?: string }[]).map((g, gi) => (
              <div key={gi} className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">{g.type ?? "?"}</p>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-3 text-xs text-slate-700">{JSON.stringify(g, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
