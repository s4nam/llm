/**
 * Validasi struktur hasil generate AI agar materi yang disimpan selalu
 * layak tampil ke siswa (tidak ada kuis rusak / answerIndex di luar range).
 * Validasi ini menjamin struktur & kepatuhan instruksi level CEFR;
 * kebenaran semantik tetap diverifikasi admin saat persetujuan.
 */

export interface QuizItem {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface LessonGameLike {
  type?: string;
  items?: unknown[];
  scenario?: string;
  lines?: unknown[];
  keyPhrases?: unknown[];
  word?: string;
  syllables?: unknown[];
  stressedIndex?: number;
  sentence?: string;
  text?: string;
  options?: unknown[];
  answerIndex?: number;
  explanation?: string;
}

export interface LessonDraft {
  topic: string;
  intro: string;
  sections: { heading: string; body: string }[];
  quiz: QuizItem[];
  games?: LessonGameLike[];
}

export interface PlacementDraft {
  questions: QuizItem[];
}

const isNonEmpty = (s: unknown): s is string =>
  typeof s === "string" && s.trim().length > 0;

function findDuplicateQuestions(
  questions: unknown[],
  problems: string[],
  scope: string,
): void {
  const seen = new Set<string>();
  for (const q of questions) {
    if (typeof q === "object" && q !== null && isNonEmpty((q as QuizItem).question)) {
      const key = (q as QuizItem).question.trim().toLowerCase();
      if (seen.has(key)) {
        problems.push(`${scope} ada soal duplikat: "${(q as QuizItem).question}"`);
      }
      seen.add(key);
    }
  }
}

function validateQuizItem(
  q: unknown,
  problems: string[],
  index: number,
  scope: string,
): void {
  if (typeof q !== "object" || q === null) {
    problems.push(`${scope} soal #${index + 1} bukan objek valid.`);
    return;
  }
  const item = q as Partial<QuizItem>;
  if (!isNonEmpty(item.question)) {
    problems.push(`${scope} soal #${index + 1} tidak punya pertanyaan.`);
  }
  if (
    !Array.isArray(item.options) ||
    item.options.length !== 4 ||
    item.options.some((o) => !isNonEmpty(o))
  ) {
    problems.push(
      `${scope} soal #${index + 1} harus punya tepat 4 pilihan yang tidak kosong.`,
    );
  }
  if (
    typeof item.answerIndex !== "number" ||
    !Number.isInteger(item.answerIndex) ||
    item.answerIndex < 0 ||
    item.answerIndex > 3
  ) {
    problems.push(
      `${scope} soal #${index + 1} answerIndex harus bilangan bulat 0–3.`,
    );
  }
  if (!isNonEmpty(item.explanation)) {
    problems.push(`${scope} soal #${index + 1} tidak punya penjelasan.`);
  }
}

/**
 * Validasi draft pelajaran (generate-lesson / generate-level).
 * Mengembalikan daftar masalah (kosong = valid).
 */
export function validateLessonDraft(
  draft: LessonDraft | null | undefined,
): string[] {
  const problems: string[] = [];
  if (!draft || typeof draft !== "object") {
    return ["Hasil AI bukan objek pelajaran yang valid."];
  }
  if (!isNonEmpty(draft.topic)) {
    problems.push("Pelajaran tidak punya judul (topic).");
  }
  if (!isNonEmpty(draft.intro)) {
    problems.push("Pelajaran tidak punya intro.");
  }
  if (!Array.isArray(draft.sections) || draft.sections.length !== 3) {
    problems.push("Harus ada tepat 3 sections.");
  } else {
    draft.sections.forEach((s, i) => {
      if (!isNonEmpty(s?.heading) || !isNonEmpty(s?.body)) {
        problems.push(`Section #${i + 1} harus punya heading dan body.`);
      }
    });
  }
  if (!Array.isArray(draft.quiz) || draft.quiz.length !== 5) {
    problems.push("Harus ada tepat 5 soal kuis.");
  } else {
    draft.quiz.forEach((q, i) => validateQuizItem(q, problems, i, "Kuis"));
    findDuplicateQuestions(draft.quiz, problems, "Kuis");
  }
  return problems;
}

/**
 * Validasi games — OPSIONAL. Mengembalikan daftar masalah jika struktur rusak,
 * TETAPI caller bebas memutuskan apakah masalah ini memblokir penyimpanan.
 * Untuk generate pelajaran: masalah games TIDAK menggagalkan (fallback []),
 * agar satu kegagalan AI di games tidak merusak seluruh pelajaran.
 */
export function validateLessonGames(
  games: unknown,
): string[] {
  const problems: string[] = [];
  if (games == null) return problems;
  if (!Array.isArray(games)) {
    problems.push("games harus berupa array (atau kosong).");
    return problems;
  }

  const TYPES = new Set(["listen_choose", "unscramble", "word_stress", "roleplay"]);
  for (let i = 0; i < games.length; i++) {
    const g = games[i] as LessonGameLike | null;
    if (typeof g !== "object" || g === null || typeof g.type !== "string") {
      problems.push(`game #${i + 1} harus punya 'type' string.`);
      continue;
    }
    if (!TYPES.has(g.type)) {
      problems.push(`game #${i + 1} type '${g.type}' tidak dikenal.`);
      continue;
    }

    if (g.type === "listen_choose") {
      const items = g.items;
      if (!Array.isArray(items) || items.length < 1) {
        problems.push(`game #${i + 1} (listen_choose) butuh minimal 1 item.`);
      } else {
        items.forEach((it, j) => {
          const item = it as { text?: unknown; options?: unknown; answerIndex?: unknown; explanation?: unknown };
          if (!isNonEmpty(item?.text)) problems.push(`listen_choose item #${j + 1} butuh 'text'.`);
          if (!Array.isArray(item?.options) || item.options.length !== 4 || item.options.some((o) => !isNonEmpty(o))) {
            problems.push(`listen_choose item #${j + 1} butuh tepat 4 pilihan.`);
          }
          if (typeof item?.answerIndex !== "number" || item.answerIndex < 0 || item.answerIndex > 3) {
            problems.push(`listen_choose item #${j + 1} answerIndex harus 0-3.`);
          }
        });
      }
    } else if (g.type === "unscramble") {
      const items = g.items;
      if (!Array.isArray(items) || items.length < 1) {
        problems.push(`game #${i + 1} (unscramble) butuh minimal 1 item.`);
      } else {
        items.forEach((it, j) => {
          const item = it as { sentence?: unknown };
          if (!isNonEmpty(item?.sentence)) problems.push(`unscramble item #${j + 1} butuh 'sentence'.`);
        });
      }
    } else if (g.type === "word_stress") {
      const items = g.items;
      if (!Array.isArray(items) || items.length < 1) {
        problems.push(`game #${i + 1} (word_stress) butuh minimal 1 item.`);
      } else {
        items.forEach((it, j) => {
          const item = it as { word?: unknown; syllables?: unknown; stressedIndex?: unknown };
          if (!isNonEmpty(item?.word)) problems.push(`word_stress item #${j + 1} butuh 'word'.`);
          if (!Array.isArray(item?.syllables) || item.syllables.length < 2) {
            problems.push(`word_stress item #${j + 1} butuh minimal 2 syllables.`);
          }
          if (typeof item?.stressedIndex !== "number") {
            problems.push(`word_stress item #${j + 1} butuh 'stressedIndex'.`);
          }
        });
      }
    } else if (g.type === "roleplay") {
      if (!isNonEmpty(g.scenario)) problems.push(`game #${i + 1} (roleplay) butuh 'scenario'.`);
      if (!Array.isArray(g.lines) || g.lines.length < 2) {
        problems.push(`game #${i + 1} (roleplay) butuh minimal 2 lines.`);
      } else {
        g.lines.forEach((ln, j) => {
          const line = ln as { speaker?: unknown; text?: unknown };
          if (line?.speaker !== "ai" && line?.speaker !== "user") {
            problems.push(`roleplay line #${j + 1} speaker harus 'ai' atau 'user'.`);
          }
          if (!isNonEmpty(line?.text)) problems.push(`roleplay line #${j + 1} butuh 'text'.`);
        });
      }
      if (!Array.isArray(g.keyPhrases) || g.keyPhrases.some((k) => !isNonEmpty(k))) {
        problems.push(`game #${i + 1} (roleplay) butuh 'keyPhrases' (array string).`);
      }
    }
  }
  return problems;
}

/**
 * Validasi soal placement (generate-placement).
 * Mengembalikan daftar masalah (kosong = valid).
 */
export function validatePlacementQuestions(
  draft: PlacementDraft | null | undefined,
): string[] {
  const problems: string[] = [];
  if (!draft || typeof draft !== "object" || !Array.isArray(draft.questions)) {
    return ["Hasil AI bukan objek placement test yang valid."];
  }
  if (draft.questions.length !== 12) {
    problems.push(`Harus tepat 12 soal (ditemukan ${draft.questions.length}).`);
  }
  draft.questions.forEach((q, i) => validateQuizItem(q, problems, i, "Placement"));
  findDuplicateQuestions(draft.questions, problems, "Placement");
  return problems;
}
