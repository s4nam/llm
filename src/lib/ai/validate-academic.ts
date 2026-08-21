/**
 * Validasi struktur hasil generate AI untuk modul "Latihan Akademik" (gaya TOEFL).
 * Menjamin: struktur valid, tipe soal sesuai, tidak ada jawaban di luar range,
 * tidak ada duplikat, dan (untuk kualitas) tidak ada field kosong.
 * Kebenaran semantik tetap diverifikasi admin saat persetujuan.
 */

import type {
  AcademicQuestion,
  AcademicScript,
  AcademicSetContent,
  AcademicSection,
  AcademicSpeakingTask,
  AcademicWritingTask,
} from "@/lib/types-academic";

const isNonEmpty = (s: unknown): s is string =>
  typeof s === "string" && s.trim().length > 0;

const READING_TYPES = [
  "detail",
  "vocabulary-in-context",
  "inference",
  "rhetorical purpose",
  "sentence insertion",
  "prose summary",
];

const LISTENING_TYPES = [
  "gist-content",
  "gist-purpose",
  "detail",
  "speaker function",
  "stance",
  "organization",
  "connecting content",
  "inference",
];

function validateQuestion(
  q: unknown,
  problems: string[],
  index: number,
  scope: string,
  allowedTypes: string[] | null,
): void {
  if (typeof q !== "object" || q === null) {
    problems.push(`${scope} soal #${index + 1} bukan objek valid.`);
    return;
  }
  const item = q as Partial<AcademicQuestion>;
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
  if (allowedTypes && item.type && !allowedTypes.includes(item.type)) {
    problems.push(
      `${scope} soal #${index + 1} tipe "${item.type}" tidak dikenal.`,
    );
  }
}

function findDuplicateQuestions(
  questions: unknown[],
  problems: string[],
  scope: string,
): void {
  const seen = new Set<string>();
  for (const q of questions) {
    if (typeof q === "object" && q !== null && isNonEmpty((q as AcademicQuestion).question)) {
      const key = (q as AcademicQuestion).question.trim().toLowerCase();
      if (seen.has(key)) {
        problems.push(`${scope} ada soal duplikat: "${(q as AcademicQuestion).question}"`);
      }
      seen.add(key);
    }
  }
}

function validateReading(content: { passages?: unknown }, problems: string[]): void {
  const passages = content.passages;
  if (!Array.isArray(passages) || passages.length < 3) {
    problems.push("Reading harus punya minimal 3 passage.");
    return;
  }
  passages.forEach((p, i) => {
    if (typeof p !== "object" || p === null) {
      problems.push(`Passage #${i + 1} bukan objek valid.`);
      return;
    }
    const pass = p as Partial<AcademicScript & { text: string }>;
    if (!isNonEmpty(pass.title)) problems.push(`Passage #${i + 1} tidak punya judul.`);
    if (!isNonEmpty(pass.text) || (pass.text as string).trim().length < 200) {
      problems.push(`Passage #${i + 1} teks terlalu pendek (min. 200 karakter).`);
    }
    if (!Array.isArray(pass.questions) || pass.questions.length < 5) {
      problems.push(`Passage #${i + 1} harus punya minimal 5 soal.`);
      return;
    }
    pass.questions.forEach((q, qi) =>
      validateQuestion(q, problems, qi, `Passage #${i + 1}`, READING_TYPES),
    );
    findDuplicateQuestions(pass.questions, problems, `Passage #${i + 1}`);
  });
}

function validateListening(content: { scripts?: unknown }, problems: string[]): void {
  const scripts = content.scripts;
  if (!Array.isArray(scripts) || scripts.length < 1) {
    problems.push("Listening harus punya minimal 1 script.");
    return;
  }
  scripts.forEach((s, i) => {
    if (typeof s !== "object" || s === null) {
      problems.push(`Script #${i + 1} bukan objek valid.`);
      return;
    }
    const script = s as Partial<AcademicScript>;
    if (!isNonEmpty(script.title)) problems.push(`Script #${i + 1} tidak punya judul.`);
    if (!isNonEmpty(script.script) || (script.script as string).trim().length < 150) {
      problems.push(`Script #${i + 1} terlalu pendek (min. 150 karakter).`);
    }
    if (!Array.isArray(script.questions) || script.questions.length < 5) {
      problems.push(`Script #${i + 1} harus punya minimal 5 soal.`);
      return;
    }
    script.questions.forEach((q, qi) =>
      validateQuestion(q, problems, qi, `Script #${i + 1}`, LISTENING_TYPES),
    );
    findDuplicateQuestions(script.questions, problems, `Script #${i + 1}`);
  });
}

function validateWriting(content: { task?: unknown }, problems: string[]): void {
  const task = content.task as Partial<AcademicWritingTask> | null | undefined;
  if (!task || typeof task !== "object") {
    problems.push("Writing harus punya objek task.");
    return;
  }
  if (task.taskType !== "integrated" && task.taskType !== "independent") {
    problems.push("Writing taskType harus 'integrated' atau 'independent'.");
  }
  if (!isNonEmpty(task.prompt)) problems.push("Writing task tidak punya prompt.");
  if (task.taskType === "integrated" && !isNonEmpty(task.context)) {
    problems.push("Writing integrated harus punya context (passage + catatan kuliah).");
  }
  if (!Array.isArray(task.rubric) || task.rubric.length < 3) {
    problems.push("Writing rubric harus punya minimal 3 kriteria.");
  }
  if (typeof task.timeMinutes !== "number" || task.timeMinutes < 10) {
    problems.push("Writing timeMinutes harus angka (>= 10).");
  }
}

function validateSpeaking(content: { tasks?: unknown }, problems: string[]): void {
  const tasks = content.tasks;
  if (!Array.isArray(tasks) || tasks.length !== 4) {
    problems.push("Speaking harus punya tepat 4 tasks.");
    return;
  }
  tasks.forEach((t, i) => {
    const task = t as Partial<AcademicSpeakingTask>;
    if (!isNonEmpty(task.prompt)) problems.push(`Speaking task #${i + 1} tidak punya prompt.`);
    if (typeof task.prepSeconds !== "number" || task.prepSeconds < 10) {
      problems.push(`Speaking task #${i + 1} prepSeconds tidak valid.`);
    }
    if (typeof task.speakSeconds !== "number" || task.speakSeconds < 30) {
      problems.push(`Speaking task #${i + 1} speakSeconds tidak valid.`);
    }
  });
}

/**
 * Validasi konten set akademik berdasarkan section.
 * Mengembalikan daftar masalah (kosong = valid).
 */
export function validateAcademicContent(
  section: AcademicSection,
  content: AcademicSetContent | null | undefined,
): string[] {
  const problems: string[] = [];
  if (!content || typeof content !== "object") {
    return ["Hasil AI bukan objek konten akademik yang valid."];
  }
  switch (section) {
    case "reading":
      validateReading(content as { passages?: unknown }, problems);
      break;
    case "listening":
      validateListening(content as { scripts?: unknown }, problems);
      break;
    case "writing":
      validateWriting(content as { task?: unknown }, problems);
      break;
    case "speaking":
      validateSpeaking(content as { tasks?: unknown }, problems);
      break;
    default:
      problems.push("Section tidak dikenal.");
  }
  return problems;
}