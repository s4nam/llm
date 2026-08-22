"use client";

import { useState } from "react";
import Link from "next/link";

interface SetOption {
  id: string;
  title: string;
}

/**
 * Tombol "Simpan ke Study Set" — hanya untuk user login.
 * Kata disimpan sebagai item baru ke set yang dipilih (atau set baru).
 */
export default function SaveToStudySet({ word }: { word: string }) {
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState<SetOption[]>([]);
  const [selectedSet, setSelectedSet] = useState("");
  const [newSetTitle, setNewSetTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function openPanel() {
    setOpen((o) => !o);
    setMsg(null);
    if (!open) {
      try {
        const res = await fetch("/api/study-sets");
        const data = await res.json();
        if (res.ok && Array.isArray(data.sets)) {
          // Hanya set milik sendiri yang bisa ditambah item (RLS)
          const mine = data.sets.filter(
            (s: { is_owner?: boolean; id?: string }) => s.is_owner && s.id,
          );
          setSets(mine as SetOption[]);
          if (mine.length > 0) setSelectedSet((prev) => prev || mine[0].id);
        }
      } catch {
        // abaikan
      }
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    let targetSet = selectedSet;
    // Buat set baru bila user memilih "set baru"
    if (!targetSet && newSetTitle.trim()) {
      const createRes = await fetch("/api/study-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: newSetTitle.trim(),
          isPublic: false,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setMsg(createData.error ?? "Gagal membuat set.");
        setBusy(false);
        return;
      }
      targetSet = createData.set.id;
    }
    if (!targetSet) {
      setMsg("Pilih set atau buat set baru terlebih dahulu.");
      setBusy(false);
      return;
    }
    const res = await fetch("/api/study-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-item",
        setId: targetSet,
        word,
        translation: "",
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      // 409 = kata sudah ada di set itu
      if (res.status === 409 && data.existingTranslation) {
        setMsg(`Kata "${word}" sudah ada di set (arti: ${data.existingTranslation}).`);
      } else {
        setMsg(data.error ?? "Gagal menyimpan. Coba isi arti di set.");
      }
      return;
    }
    setMsg(`Tersimpan! " ${word}" ditambahkan${data.item?.translation ? ` (${data.item.translation})` : ""}.`);
    setOpen(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPanel}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand-light/20 px-3 py-1.5 text-sm font-medium text-brand transition hover:bg-brand-light/40"
      >
        ⭐ Simpan ke Study Set
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-surface p-4">
          <p className="text-sm font-semibold text-slate-800">Simpan &quot;{word}&quot;</p>
          {sets.length > 0 ? (
            <>
              <label className="mt-2 block text-xs text-slate-500">Pilih set:</label>
              <select
                value={selectedSet}
                onChange={(e) => setSelectedSet(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand"
              >
                <option value="">— (buat set baru) —</option>
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Belum ada set. Buat satu di bawah.
            </p>
          )}
          <label className="mt-2 block text-xs text-slate-500">
            Atau nama set baru:
          </label>
          <input
            type="text"
            value={newSetTitle}
            onChange={(e) => setNewSetTitle(e.target.value)}
            placeholder="Contoh: Kosakata dari pelajaran ini"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? "Menyimpan..." : "Simpan"}
          </button>
          {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
          <Link href="/study-sets" className="mt-2 block text-xs text-brand underline">
            Kelola Study Sets →
          </Link>
        </div>
      )}
    </div>
  );
}