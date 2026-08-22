"use client";

import { useEffect, useMemo, useState } from "react";
import type { LessonGame } from "@/lib/types";

/**
 * Render latihan tambahan (games) per pelajaran — pola game type per level CEFR.
 * Semua game opsional dan interaktif; tidak mempengaruhi kelulusan pelajaran.
 *
 * Shuffle urutan opsi/kata dilakukan di useEffect post-mount (setelah render
 * server) agar TIDAK memicu hydration mismatch antara HTML server & client.
 */

export interface SpeakFn {
  (text: string, id?: string): void;
}

export default function LessonGames({
  games,
  speak,
  ttsEnabled,
}: {
  games: LessonGame[];
  speak?: SpeakFn;
  ttsEnabled?: boolean;
}) {
  if (!games || games.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {games.map((game, i) => (
        <GameSection key={i} game={game} speak={speak} ttsEnabled={ttsEnabled} />
      ))}
    </div>
  );
}

function GameSection({
  game,
  speak,
  ttsEnabled,
}: {
  game: LessonGame;
  speak?: SpeakFn;
  ttsEnabled?: boolean;
}) {
  switch (game.type) {
    case "listen_choose":
      return <ListenChooseGame game={game} speak={speak} ttsEnabled={ttsEnabled} />;
    case "unscramble":
      return <UnscrambleGame game={game} />;
    case "word_stress":
      return <WordStressGame game={game} speak={speak} ttsEnabled={ttsEnabled} />;
    case "roleplay":
      return <RoleplayGame game={game} speak={speak} ttsEnabled={ttsEnabled} />;
    default:
      return null;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <span>{icon}</span> {title}
      </h3>
      <p className="mt-1 text-sm text-slate-500">Latihan tambahan — tidak wajib.</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ---------- 1. LISTENING GAME (A1–A2) ---------- */
function ListenChooseGame({
  game,
  speak,
  ttsEnabled,
}: {
  game: Extract<LessonGame, { type: "listen_choose" }>;
  speak?: SpeakFn;
  ttsEnabled?: boolean;
}) {
  const [order, setOrder] = useState<number[][]>([]);
  const [selected, setSelected] = useState<(number | null)[]>(
    Array(game.items.length).fill(null),
  );
  const [revealed, setRevealed] = useState(false);

  // Acak urutan opsi SETELAH mount (hindari hydration mismatch)
  useEffect(() => {
    setOrder(game.items.map((item) => shuffle(item.options.map((_, i) => i))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.items]);

  const canSpeak = Boolean(ttsEnabled && speak);

  return (
    <SectionCard title="Dengarkan & Pilih" icon="🔊">
      <div className="flex flex-col gap-5">
        {game.items.map((item, i) => {
          const orderForItem = order[i] ?? item.options.map((_, k) => k);
          return (
            <div key={i}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-800">
                  {i + 1}. Dengarkan lalu pilih arti yang tepat.
                </p>
                {canSpeak && (
                  <button
                    type="button"
                    onClick={() => speak!(item.text, `listen-${i}`)}
                    className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    🔊
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {orderForItem.map((origIdx) => {
                  const isSel = selected[i] === origIdx;
                  const isCorrect = revealed && origIdx === item.answerIndex;
                  const isWrong = revealed && isSel && origIdx !== item.answerIndex;
                  let cls = "border-slate-200 bg-white hover:border-brand";
                  if (isCorrect) cls = "border-success bg-success/10";
                  else if (isWrong) cls = "border-danger bg-danger/10";
                  else if (isSel) cls = "border-brand bg-brand-light/40";
                  return (
                    <button
                      key={origIdx}
                      type="button"
                      onClick={() => {
                        if (revealed) return;
                        setSelected((prev) => {
                          const next = [...prev];
                          next[i] = origIdx;
                          return next;
                        });
                      }}
                      disabled={revealed}
                      className={`rounded-lg border px-4 py-2.5 text-left text-sm transition ${cls} disabled:cursor-default`}
                    >
                      {item.options[origIdx]}
                    </button>
                  );
                })}
              </div>
              {revealed && (
                <p className="mt-2 text-sm text-slate-600">
                  <span className="font-semibold">
                    {selected[i] === item.answerIndex ? "✓ Benar." : "✗ Kurang tepat."}
                  </span>{" "}
                  {item.explanation}
                </p>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setRevealed(true)}
          disabled={revealed}
          className="mt-2 self-start rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {revealed ? "Selesai" : "Cek Jawaban"}
        </button>
      </div>
    </SectionCard>
  );
}

/* ---------- 2. UNSCRAMBLE SENTENCE (A1–B1) ---------- */
function UnscrambleGame({ game }: { game: Extract<LessonGame, { type: "unscramble" }> }) {
  const [wordOrders, setWordOrders] = useState<string[][]>([]);
  const [attempts, setAttempts] = useState<string[][]>(
    game.items.map(() => []),
  );
  const [checks, setChecks] = useState<(boolean | null)[]>(
    game.items.map(() => null),
  );

  useEffect(() => {
    setWordOrders(
      game.items.map((item) => shuffle(item.sentence.split(" ").filter(Boolean))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.items]);

  function toggleWord(i: number, word: string) {
    setAttempts((prev) => {
      const next = [...prev];
      const cur = [...next[i]];
      const existing = cur.indexOf(word);
      if (existing >= 0) {
        cur.splice(existing, 1);
      } else {
        cur.push(word);
      }
      next[i] = cur;
      return next;
    });
    setChecks((prev) => {
      const next = [...prev];
      next[i] = null;
      return next;
    });
  }

  function check(i: number) {
    const correct = game.items[i].sentence.split(" ").filter(Boolean);
    setChecks((prev) => {
      const next = [...prev];
      next[i] =
        attempts[i].length === correct.length &&
        attempts[i].every((w, k) => w === correct[k]);
      return next;
    });
  }

  return (
    <SectionCard title="Susun Kalimat" icon="🧩">
      <div className="flex flex-col gap-5">
        {game.items.map((item, i) => {
          const orderForItem = wordOrders[i] ?? item.sentence.split(" ");
          return (
            <div key={i}>
              <p className="font-medium text-slate-800">
                {i + 1}. Susun kata menjadi kalimat yang benar.
              </p>
              <div className="mt-2 flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-surface p-2">
                {attempts[i].length === 0 && (
                  <span className="px-1 text-sm text-slate-400">
                    Ketuk kata di bawah untuk menyusun...
                  </span>
                )}
                {attempts[i].map((w, k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleWord(i, w)}
                    className="rounded-md bg-white px-2.5 py-1 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200"
                  >
                    {w}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {orderForItem.map((w, k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleWord(i, w)}
                    disabled={attempts[i].includes(w)}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-30"
                  >
                    {w}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => check(i)}
                  disabled={attempts[i].length === 0}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  Cek
                </button>
                {checks[i] !== null && (
                  <span className="text-sm text-slate-700">
                    {checks[i]
                      ? "✓ Benar! Kalimat tersusun tepat."
                      : "✗ Belum tepat. Coba susun ulang."}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ---------- 3. WORD STRESS (A2+) ---------- */
function WordStressGame({
  game,
  speak,
  ttsEnabled,
}: {
  game: Extract<LessonGame, { type: "word_stress" }>;
  speak?: SpeakFn;
  ttsEnabled?: boolean;
}) {
  const [selected, setSelected] = useState<(number | null)[]>(
    Array(game.items.length).fill(null),
  );
  const [revealed, setRevealed] = useState(false);

  const canSpeak = Boolean(ttsEnabled && speak);

  return (
    <SectionCard title="Tekanan Suku Kata" icon="🎯">
      <div className="flex flex-col gap-5">
        {game.items.map((item, i) => (
          <div key={i}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-slate-800">
                {i + 1}. Suku kata mana yang ditekankan pada kata{" "}
                <b>{item.word}</b>?
              </p>
              {canSpeak && (
                <button
                  type="button"
                  onClick={() => speak!(item.word, `stress-${i}`)}
                  className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
                >
                  🔊
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.syllables.map((syl, idx) => {
                const isSel = selected[i] === idx;
                const isCorrect = revealed && idx === item.stressedIndex;
                const isWrong = revealed && isSel && idx !== item.stressedIndex;
                let cls = "border-slate-300 bg-white hover:border-brand";
                if (isCorrect) cls = "border-success bg-success/10";
                else if (isWrong) cls = "border-danger bg-danger/10";
                else if (isSel) cls = "border-brand bg-brand-light/40";
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (revealed) return;
                      setSelected((prev) => {
                        const next = [...prev];
                        next[i] = idx;
                        return next;
                      });
                    }}
                    disabled={revealed}
                    className={`rounded-lg border px-4 py-2 text-sm transition ${cls} disabled:cursor-default`}
                  >
                    {syl}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <p className="mt-2 text-sm text-slate-600">
                {selected[i] === item.stressedIndex ? "✓ Benar." : "✗ Kurang tepat."}{" "}
                Tekanan ada di suku kata &quot;{item.syllables[item.stressedIndex]}&quot;.
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRevealed(true)}
          disabled={revealed}
          className="mt-2 self-start rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {revealed ? "Selesai" : "Cek Jawaban"}
        </button>
      </div>
    </SectionCard>
  );
}

/* ---------- 4. ROLE-PLAY DIALOGUE (A2+) ---------- */
function RoleplayGame({
  game,
  speak,
  ttsEnabled,
}: {
  game: Extract<LessonGame, { type: "roleplay" }>;
  speak?: SpeakFn;
  ttsEnabled?: boolean;
}) {
  const canSpeak = Boolean(ttsEnabled && speak);

  return (
    <SectionCard title="Percakapan Situasi" icon="🎭">
      <p className="text-sm text-slate-600">{game.scenario}</p>
      <div className="mt-4 flex flex-col gap-3">
        {game.lines.map((line, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 rounded-xl border p-3 ${
              line.speaker === "ai"
                ? "border-slate-200 bg-surface"
                : "border-brand/40 bg-brand-light/20"
            }`}
          >
            <span className="mt-0.5 shrink-0 rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {line.speaker === "ai" ? "AI" : "Kamu"}
            </span>
            <p className="flex-1 text-sm leading-6 text-slate-800">{line.text}</p>
            {line.speaker === "ai" && canSpeak && (
              <button
                type="button"
                onClick={() => speak!(line.text, `roleplay-${i}`)}
                className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
              >
                🔊
              </button>
            )}
          </div>
        ))}
      </div>
      {game.keyPhrases && game.keyPhrases.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-slate-700">Frasa penting:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {game.keyPhrases.map((p, i) => (
              <span
                key={i}
                className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}