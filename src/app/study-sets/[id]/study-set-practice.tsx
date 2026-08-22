"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SpeakPractice from "./speak-practice";

interface Item {
  word: string;
  translation: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StudySetPractice({
  setId,
  title,
  isOwner,
  isPublic,
  hasAccess,
  initialItems,
}: {
  setId: string;
  title: string;
  isOwner: boolean;
  isPublic: boolean;
  hasAccess: boolean;
  initialItems: Item[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [tab, setTab] = useState<"flashcard" | "quiz" | "add" | "speak">("flashcard");
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  // Quiz state
  const [quizOrder, setQuizOrder] = useState<number[]>([]);
  const [selected, setSelected] = useState<(number | null)[]>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setTtsEnabled(typeof window !== "undefined" && "speechSynthesis" in window);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Reset & acak urutan item utk kuis SETELAH mount
    const t = setTimeout(() => {
      setQuizOrder(shuffle(items.map((_, i) => i)));
      setSelected(items.map(() => null));
      setRevealed(false);
    }, 0);
    return () => clearTimeout(t);
  }, [items]);

  function speak(text: string) {
    if (!ttsEnabled) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  }

  // Opsi kuis: untuk item di posisi quizOrder[q], bangun 4 opsi arti.
  // Satu benar + 3 arti acak dari item lain.
  function buildOptions(q: number): string[] {
    const itemIndex = quizOrder[q];
    const correct = items[itemIndex]?.translation ?? "";
    const others = items
      .map((it, i) => (i === itemIndex ? null : it.translation))
      .filter((x): x is string => x !== null);
    const pool = shuffle([correct, ...shuffle(others).slice(0, 3)]);
    return pool;
  }

  function choose(oIndex: number, qIndex: number) {
    if (revealed) return;
    setSelected((prev) => {
      const next = [...prev];
      next[qIndex] = oIndex;
      return next;
    });
  }

  const correctCount = selected.filter((s) => s === 0).length;

  async function addItem() {
    if (!newWord.trim() || !newTranslation.trim()) {
      setMessage("Kata dan arti tidak boleh kosong.");
      return;
    }
    const res = await fetch("/api/study-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-item",
        setId,
        word: newWord.trim(),
        translation: newTranslation.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 409) {
        setMessage(data.error ?? "Kata sudah ada di set ini.");
      } else {
        setMessage(data.error ?? "Gagal menambah kata.");
      }
      return;
    }
    setItems((prev) => [...prev, { word: data.item.word, translation: data.item.translation }]);
    setNewWord("");
    setNewTranslation("");
    setMessage(`Kata berhasil ditambahkan.${data.item.translation ? ` Arti: ${data.item.translation}` : ""}`);
  }

  async function togglePublic() {
    const res = await fetch("/api/study-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle-public", setId, isPublic: !isPublic }),
    });
    if (res.ok) {
      setMessage(isPublic ? "Set dijadikan pribadi." : "Set kini publik.");
      router.refresh();
    } else {
      const data = await res.json();
      setMessage(data.error ?? "Gagal mengubah status.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/study-sets" className="text-sm font-medium text-brand hover:underline">
        ← Study Sets
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {items.length} kata
            {isPublic ? " • Publik" : ""}
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={togglePublic}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {isPublic ? "Jadikan Pribadi" : "Bagikan Publik"}
          </button>
        )}
      </div>

      {message && (
        <p className="rounded-xl bg-success/10 p-3 text-sm text-success">{message}</p>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["flashcard", "quiz", "speak", "add"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-brand text-white" : "bg-surface text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t === "flashcard" ? "Flashcard" : t === "quiz" ? "Kuis" : t === "speak" ? "🎙️ Ucapkan" : "Tambah Kata"}
          </button>
        ))}
      </div>

      {/* Flashcard */}
      {tab === "flashcard" && (
        <div>
          {items.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-surface p-6 text-slate-500">
              Belum ada kata. Tambahkan kata melalui tab &quot;Tambah Kata&quot;.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="flex min-h-[160px] w-full flex-col items-center justify-center rounded-2xl border-2 border-brand bg-white p-6 text-center transition hover:bg-brand-light/10"
              >
                <p className="text-2xl font-bold text-slate-900">
                  {items[cardIndex]?.word}
                </p>
                {flipped && (
                  <p className="mt-3 text-lg text-slate-600">
                    {items[cardIndex]?.translation}
                  </p>
                )}
                <p className="mt-4 text-xs text-slate-400">
                  Klik untuk {flipped ? "sembunyikan" : "lihat"} arti
                </p>
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCardIndex((i) => (i - 1 + items.length) % items.length);
                    setFlipped(false);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  ← Prev
                </button>
                <span className="text-sm text-slate-500">
                  {cardIndex + 1}/{items.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCardIndex((i) => (i + 1) % items.length);
                    setFlipped(false);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Next →
                </button>
                {ttsEnabled && (
                  <button
                    type="button"
                    onClick={() => speak(items[cardIndex]?.word ?? "")}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
                  >
                    🔊
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kuis */}
      {tab === "quiz" && (
        <div>
          {items.length < 2 ? (
            <p className="rounded-2xl border border-slate-200 bg-surface p-6 text-slate-500">
              Minimal 2 kata untuk mengikuti kuis.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {quizOrder.map((itemIndex, q) => {
                const item = items[itemIndex];
                const options = buildOptions(q);
                return (
                  <div key={q}>
                    <p className="font-medium text-slate-800">
                      {q + 1}. {item?.word}
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      {options.map((opt, oi) => {
                        const isSel = selected[q] === oi;
                        const isCorrect = revealed && oi === 0;
                        const isWrong = revealed && isSel && oi !== 0;
                        let cls = "border-slate-200 bg-white hover:border-brand";
                        if (isCorrect) cls = "border-success bg-success/10";
                        else if (isWrong) cls = "border-danger bg-danger/10";
                        else if (isSel) cls = "border-brand bg-brand-light/40";
                        return (
                          <button
                            key={oi}
                            type="button"
                            onClick={() => choose(oi, q)}
                            disabled={revealed}
                            className={`rounded-lg border px-4 py-2.5 text-left text-sm transition ${cls} disabled:cursor-default`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setRevealed(true)}
                disabled={revealed}
                className="mt-2 rounded-xl bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                {revealed ? "Selesai" : "Cek Jawaban"}
              </button>
              {revealed && (
                <p className="rounded-xl bg-surface p-4 text-center text-sm text-slate-700">
                  Benar {correctCount}/{items.length}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ucapkan */}
      {tab === "speak" && (
        <SpeakPractice items={items} hasAccess={hasAccess} />
      )}

      {/* Tambah kata */}
      {tab === "add" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Tambah Kata</h2>
          <div className="mt-4 flex flex-col gap-3">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Kata dalam Bahasa Inggris"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand"
            />
            <input
              type="text"
              value={newTranslation}
              onChange={(e) => setNewTranslation(e.target.value)}
              placeholder="Arti dalam Bahasa Indonesia"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={addItem}
              className="self-start rounded-xl bg-brand px-6 py-2.5 font-semibold text-white hover:bg-brand-dark"
            >
              Tambah
            </button>
          </div>
        </div>
      )}
    </div>
  );
}