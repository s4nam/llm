"use client";

import { useState } from "react";

export default function PushManager() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/dashboard");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const send = async (broadcast: boolean) => {
    if (!title.trim() || !body.trim()) {
      setMsg({ type: "err", text: "Judul & isi wajib diisi" });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || "/dashboard", tag: broadcast ? undefined : "admin-test" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal kirim");
      setMsg({ type: "ok", text: `Terkirim ke ${data.sent} device${data.removed ? ` (${data.removed} expired dihapus)` : ""}` });
      if (broadcast) {
        setTitle("");
        setBody("");
      }
    } catch (e) {
      setMsg({ type: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-900">Kirim Push Manual</h2>
      <p className="mt-1 text-sm text-slate-500">Broadcast ke semua user yang sudah aktifkan notifikasi (butuh VAPID key).</p>

      {msg && <p className={`mt-4 rounded-xl p-3 text-sm ${msg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{msg.text}</p>}

      <div className="mt-4 flex flex-col gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul — mis: Materi baru A2 tersedia 🎉" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Isi — mis: 3 pelajaran baru sudah menunggu di dashboard kamu" rows={3} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL saat klik — mis: /dashboard atau /level/A2" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20" />
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={() => send(true)} disabled={busy} className="rounded-xl bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50">
          {busy ? "..." : "Broadcast ke Semua"}
        </button>
        <button onClick={() => send(false)} disabled={busy} className="rounded-xl border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          Test (tag admin-test)
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-400">Tips: kirim test dulu ke HP kamu sendiri, baru broadcast.</p>
    </div>
  );
}
