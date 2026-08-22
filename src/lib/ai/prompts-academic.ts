import type { AcademicSection } from "@/lib/types-academic";
import type { AiMessage } from "./providers";

/**
 * Template prompt untuk modul "Latihan Akademik" (gaya TOEFL iBT).
 * Konten SELALU orisinal — dilarang menyalin materi ETS/berhak cipta.
 * Output JSON, struktur divalidasi oleh validate.ts (academic).
 */

const ORIGINALITY_RULE = `CRITICAL — COPYRIGHT: Create ALL passages, scripts, and questions in your own words and structure.
NEVER reproduce, quote, paraphrase closely, or imitate text from ETS TOEFL materials, published textbooks,
paywalled articles, song lyrics, or any other copyrighted work. Write original academic content only.
Do not use real people's voices. If in doubt, invent original facts and examples.`;

function baseInstruction(): string {
  return `You are an expert creator of English academic practice tests for an online learning app in Indonesia.
Your tests imitate the FORMAT and QUESTION TYPES of standardized academic English exams (like TOEFL iBT),
but every passage and question must be 100% ORIGINAL (see copyright rule below).

${ORIGINALITY_RULE}

All content must be appropriate for advanced/academic English learners (CEFR B2–C1+).
Explanations must be in Bahasa Indonesia, brief and helpful.`;
}

export function buildReadingPrompt(params: {
  topic: string;
  passageCount?: number;
  questionsPerPassage?: number;
}): string {
  const passages = params.passageCount ?? 3;
  const perPassage = params.questionsPerPassage ?? 5;
  return `${baseInstruction()}

TASK: READING practice set.
Topic: "${params.topic}"

Create ${passages} academic passages. Each passage:
- 400–700 words, original academic text (science, history, arts, social science, etc.).
- Followed by exactly ${perPassage} multiple-choice questions (4 options each).
- Question types (rotate among these): detail, vocabulary-in-context, inference,
  rhetorical purpose, sentence insertion, prose summary.
- Each question: { question, options[4], answerIndex (0-3), explanation (Bahasa Indonesia), type }.

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no code fences):
{
  "passages": [
    { "title": string, "text": string,
      "questions": [ { "question": string, "options": [4], "answerIndex": number, "explanation": string, "type": string } ] }
  ]
}
Exactly ${passages} passages, each with exactly ${perPassage} questions. No duplicates.`;
}

export function buildListeningPrompt(params: {
  topic: string;
  scriptCount?: number;
  questionsPerScript?: number;
}): string {
  const scripts = params.scriptCount ?? 2;
  const perScript = params.questionsPerScript ?? 5;
  return `${baseInstruction()}

TASK: LISTENING practice set.
Topic: "${params.topic}"

Create ${scripts} original academic listening scripts (2–4 minutes read aloud).
Each script is a lecture excerpt or campus conversation (original, invented content).
- Each script followed by exactly ${perScript} multiple-choice questions (4 options each).
- Question types (rotate): gist-content, gist-purpose, detail, speaker function,
  stance/attitude, organization, connecting content, inference.
- Each question: { question, options[4], answerIndex (0-3), explanation (Bahasa Indonesia), type }.

The "script" field will be read aloud by text-to-speech, so write natural spoken English.

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no code fences):
{
  "scripts": [
    { "title": string, "script": string,
      "questions": [ { "question": string, "options": [4], "answerIndex": number, "explanation": string, "type": string } ] }
  ]
}
Exactly ${scripts} scripts, each with exactly ${perScript} questions. No duplicates.`;
}

export function buildWritingPrompt(params: {
  topic: string;
  taskType?: "integrated" | "independent";
}): string {
  const taskType = params.taskType ?? "independent";
  return `${baseInstruction()}

TASK: WRITING practice prompt.
Topic: "${params.topic}"
Task type: ${taskType === "integrated" ? "INTEGRATED (read a short passage + listen summary, then write)" : "INDEPENDENT (write an opinion/argument essay)"}

Create ONE original writing task:
- "prompt": the writing instruction given to the student.
- "context": for integrated tasks, a short original academic reading passage (150-250 words)
  plus 2-3 bullet points summarizing the lecture. For independent, empty string.
- "rubric": scoring guidance (0-30) with criteria: task response, coherence & cohesion,
  vocabulary, grammar. Each criterion: { name, weight }.
- "timeMinutes": suggested time limit (20 for integrated, 30 for independent).

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no code fences):
{
  "task": {
    "taskType": "${taskType}",
    "prompt": string,
    "context": string,
    "rubric": [ { "name": string, "weight": number } ],
    "timeMinutes": number
  }
}`;
}

export function buildSpeakingPrompt(params: { topic: string }): string {
  return `${baseInstruction()}

TASK: SPEAKING practice set.
Topic: "${params.topic}"

Create exactly 4 original speaking tasks (like TOEFL speaking section):
- Task 1: independent (personal opinion), prepSeconds 15, speakSeconds 45.
- Task 2: campus situation (read notice + conversation), prepSeconds 30, speakSeconds 60.
- Task 3: academic lecture summary, prepSeconds 30, speakSeconds 60.
- Task 4: academic lecture with counterargument, prepSeconds 20, speakSeconds 60.

Each task: { prompt (the instructions + any reading/context shown to student), prepSeconds, speakSeconds }.

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no code fences):
{
  "tasks": [
    { "prompt": string, "prepSeconds": number, "speakSeconds": number }
  ]
}
Exactly 4 tasks. Original content only.`;
}

export function buildFullSimulationPrompt(): string {
  return `${baseInstruction()}

TASK: FULL simulation — but do NOT generate content here.
This prompt is a placeholder: the full simulation combines sets from reading, listening,
writing, and speaking that are generated separately by the admin.
Return only the JSON: { "sections": ["reading", "listening", "writing", "speaking"] }`;
}

export function promptForSection(
  section: AcademicSection,
  topic: string,
): string {
  switch (section) {
    case "reading":
      return buildReadingPrompt({ topic });
    case "listening":
      return buildListeningPrompt({ topic });
    case "writing":
      return buildWritingPrompt({ topic });
    case "speaking":
      return buildSpeakingPrompt({ topic });
    default:
      return buildReadingPrompt({ topic });
  }
}

const SECTION_LABEL: Record<AcademicSection, string> = {
  reading: "READING",
  listening: "LISTENING",
  writing: "WRITING",
  speaking: "SPEAKING",
};

const SECTION_TARGET_DESC: Record<AcademicSection, string> = {
  reading: "minimal 3 passage, masing-masing 400–700 kata dan tepat 5 soal",
  listening: "minimal 2 script, masing-masing dengan tepat 5 soal",
  writing: "objek task lengkap (prompt, context, rubric, timeMinutes)",
  speaking: "tepat 4 tasks",
};

const SECTION_JSON_SHAPE: Record<AcademicSection, string> = {
  reading: `{
  "passages": [
    { "title": string, "text": string,
      "questions": [ { "question": string, "options": [4], "answerIndex": number, "explanation": string, "type": string } ] }
  ]
}`,
  listening: `{
  "scripts": [
    { "title": string, "script": string,
      "questions": [ { "question": string, "options": [4], "answerIndex": number, "explanation": string, "type": string } ] }
  ]
}`,
  writing: `{
  "task": { "taskType": "integrated" | "independent", "prompt": string, "context": string,
    "rubric": [ { "name": string, "weight": number } ], "timeMinutes": number }
}`,
  speaking: `{
  "tasks": [ { "prompt": string, "prepSeconds": number, "speakSeconds": number } ]
}`,
};

const CONTINUATION_UNIT: Partial<Record<AcademicSection, string>> = {
  reading: "passage",
  listening: "script",
};

const CONTINUATION_SHAPE: Partial<Record<AcademicSection, string>> = {
  reading: `[ { "title": string, "text": string,
      "questions": [ { "question": string, "options": [4], "answerIndex": number, "explanation": string, "type": string } ] } ]`,
  listening: `[ { "title": string, "script": string,
      "questions": [ { "question": string, "options": [4], "answerIndex": number, "explanation": string, "type": string } ] } ]`,
};

/**
 * Prompt perbaikan untuk output AI yang gagal validasi (terpotong / tidak lengkap).
 * Jika bagian konten masih kurang (mis. reading cuma 2 passage), minta model
 * menulis hanya sisanya dalam bentuk array JSON agar hemat token dan tidak
 * terpotong lagi. Jika tidak, minta ulang seluruh JSON lengkap.
 */
export function buildAcademicRepairMessages(params: {
  section: AcademicSection;
  rawOutput: string;
  existingCount: number;
  targetCount: number;
  problems: string[];
}): AiMessage[] {
  const { section, rawOutput, existingCount, targetCount, problems } = params;
  const unit = CONTINUATION_UNIT[section];
  const shape = CONTINUATION_SHAPE[section];

  if (unit && existingCount >= 0 && existingCount < targetCount) {
    const needed = targetCount - existingCount;
    return [
      {
        role: "user",
        content: `${ORIGINALITY_RULE}

Output AI ${SECTION_LABEL[section]} di bawah terpotong dan baru memuat ${existingCount} dari ${targetCount} ${unit}.
Tulis ${needed} ${unit} BARU yang masih kurang sehingga total menjadi ${targetCount}. JANGAN ulangi ${unit} yang sudah ada.

${
  section === "reading"
    ? "Setiap passage baru: 400–700 kata, teks akademik orisinal, dan tepat 5 soal pilihan ganda (4 opsi)."
    : "Setiap script baru: 2–4 menit saat dibacakan (teks akademik/percakapan orisinal) dan tepat 5 soal pilihan ganda (4 opsi)."
}
Tipe soal rotasi sesuai format ${SECTION_LABEL[section]} standar.
Tiap soal: { question, options[4], answerIndex (0-3), explanation (Bahasa Indonesia), type }.

OUTPUT FORMAT: Kembalikan HANYA array JSON (tanpa markdown, tanpa teks lain):
${shape}

OUTPUT AI SEBELUMNYA (referensi gaya & topik):
${rawOutput.slice(0, 30000)}`,
      },
    ];
  }

  return [
    {
      role: "user",
      content: `${ORIGINALITY_RULE}

Output AI ${SECTION_LABEL[section]} sebelumnya TIDAK VALID. Perbaiki menjadi JSON LENGKAP yang valid.
Target: ${SECTION_TARGET_DESC[section]}.

Masalah yang ditemukan pada output sebelumnya:
- ${problems.slice(0, 5).join("\n- ")}

OUTPUT FORMAT: Kembalikan HANYA JSON valid (tanpa markdown, tanpa teks lain):
${SECTION_JSON_SHAPE[section]}

OUTPUT AI SEBELUMNYA (untuk referensi):
${rawOutput.slice(0, 30000)}`,
    },
  ];
}

const READING_TYPES_TEXT =
  "detail, vocabulary-in-context, inference, rhetorical purpose, sentence insertion, prose summary";
const LISTENING_TYPES_TEXT =
  "gist-content, gist-purpose, detail, speaker function, stance/attitude, organization, connecting content, inference";

/**
 * Prompt untuk generate SATU passage/script saja (dipakai untuk generate
 * reading & listening secara bertahap). Dengan satu unit per panggilan,
 * outputnya kecil sehingga tidak pernah terpotong oleh batas token model,
 * dan jumlah unit selalu bisa dijamin.
 */
export function buildChunkPrompt(params: {
  section: "reading" | "listening";
  topic: string;
  index: number;
  total: number;
  existingTitles: string[];
}): string {
  const isReading = params.section === "reading";
  const distinct = params.existingTitles.length
    ? `Pilih sub-topik yang BERBEDA dari yang sudah ada: ${params.existingTitles.join(", ")}.`
    : "Pilih satu sub-topik yang spesifik.";
  return `${baseInstruction()}

TASK: ${isReading ? "READING" : "LISTENING"} practice set — bagian ${params.index} dari ${params.total}.
Topik: "${params.topic}"

${distinct}

Tulis SATU ${isReading ? "passage akademik" : "script akademik"} yang orisinal:
- ${
    isReading
      ? "400–700 kata, teks akademik (sains, sejarah, seni, ilmu sosial, dll.)."
      : "2–4 menit saat dibacakan (kuliah singkat atau percakapan kampus)."
  }
- Ikuti dengan TEPAT 5 soal pilihan ganda (4 opsi).
- Tipe soal (rotasi): ${isReading ? READING_TYPES_TEXT : LISTENING_TYPES_TEXT}.
- Tiap soal: { question, options[4], answerIndex (0-3), explanation (Bahasa Indonesia), type }.

OUTPUT FORMAT: Kembalikan HANYA objek JSON (tanpa markdown, tanpa teks lain):
${
  isReading
    ? `{ "title": string, "text": string,
    "questions": [ { "question": string, "options": [4], "answerIndex": number, "explanation": string, "type": string } ] }`
    : `{ "title": string, "script": string,
    "questions": [ { "question": string, "options": [4], "answerIndex": number, "explanation": string, "type": string } ] }`
}`;
}