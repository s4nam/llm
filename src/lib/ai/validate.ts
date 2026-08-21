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

export interface LessonDraft {
  topic: string;
  intro: string;
  sections: { heading: string; body: string }[];
  quiz: QuizItem[];
}

export interface PlacementDraft {
  questions: QuizItem[];
}

const isNonEmpty = (s: unknown): s is string =>
  typeof s === "string" && s.trim().length > 0;

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

  // Cek duplikat pertanyaan
  const seen = new Set<string>();
  for (const q of draft.questions) {
    if (typeof q === "object" && q !== null && isNonEmpty((q as QuizItem).question)) {
      const key = (q as QuizItem).question.trim().toLowerCase();
      if (seen.has(key)) {
        problems.push(`Ada soal duplikat: "${(q as QuizItem).question}"`);
      }
      seen.add(key);
    }
  }
  return problems;
}
