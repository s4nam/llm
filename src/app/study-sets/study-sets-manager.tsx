"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SetRow {
  id: string;
  title: string;
  is_public: boolean;
  user_id: string;
  updated_at: string;
  item_count?: number;
}

export default function StudySetsManager({
  mySets,
  publicSets,
  currentUserId,
}: {
  mySets: SetRow[];
  publicSets: SetRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filterSets = (arr: SetRow[]) =>
    q ? arr.filter((s) => s.title.toLowerCase().includes(q)) : arr;
  const filteredMine = filterSets(mySets);
  const filteredPublic = filterSets(publicSets);

  async function create() {
    if (!title.trim()) {
      setMessage({ type: "err", text: "Isi judul set terlebih dahulu." });
      return;
    }
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/study-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title: title.trim(), isPublic }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage({ type: "err", text: data.error ?? "Gagal membuat set." });
      return;
    }
    setTitle("");
    setIsPublic(false);
    setMessage({ type: "ok", text: "Set berhasil dibuat. Klik untuk menambahkan kata." });
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Hapus set ini beserta semua katanya?")) return;
    const res = await fetch(`/api/study-sets?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setMessage({ type: "err", text: data.error ?? "Gagal menghapus." });
    }
  }

  const Card = ({ s, canEdit }: { s: SetRow; canEdit: boolean }) => (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{s.title}</h2>
          <div className="mt-1 flex items-center gap-2">
            {s.is_public && (
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand">
                Publik
              </span>
            )}
            <span className="text-xs text-slate-400">
              {s.item_count ?? 0} kata • Diperbarui {new Date(s.updated_at).toLocaleDateString("id-ID")}
            </span>
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => remove(s.id)}
            className="shrink-0 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/5"
          >
            Hapus
          </button>
        )}
      </div>
      <Link
        href={`/study-sets/${s.id}`}
        className="mt-auto inline-block rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Buka &amp; Berlatih →
      </Link>
    </div>
  );

  return (
    <div className="mt-8 flex flex-col gap-8">
      {message && (
        <p
          className={`rounded-xl p-4 text-sm ${
            message.type === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Buat baru */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Buat Set Baru</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Kosakata Hotel, Kata untuk Interview"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand sm:max-w-sm"
          />
          <button
            type="button"
            onClick={create}
            disabled={busy}
            className="rounded-xl bg-brand px-6 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? "Membuat..." : "Buat Set"}
          </button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-brand"
          />
          Bagikan ke publik (bisa dipakai user lain)
        </label>
      </section>

      {/* Pencarian */}
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Cari set..."
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand"
        />
      </div>

      {/* Set saya */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Set Saya</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredMine.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-surface p-6 text-slate-500">
              {q ? "Tidak ada set yang cocok." : "Belum ada set. Buat set pertama di atas."}
            </p>
          )}
          {filteredMine.map((s) => (
            <Card key={s.id} s={s} canEdit={s.user_id === currentUserId} />
          ))}
        </div>
      </section>

      {/* Set publik */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Set Publik</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredPublic.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-surface p-6 text-slate-500">
              {q ? "Tidak ada set publik yang cocok." : "Belum ada set publik dari komunitas."}
            </p>
          )}
          {filteredPublic.map((s) => (
            <Card key={s.id} s={s} canEdit={false} />
          ))}
        </div>
      </section>
    </div>
  );
}