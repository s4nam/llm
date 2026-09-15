import type { Category, CefrLevel } from "@/lib/types";

/**
 * Template prompt baku (Bahasa Inggris untuk AI, output selalu JSON).
 * Menjaga format materi seragam di seluruh pelajaran.
 */

const LEVEL_DESC: Record<CefrLevel, string> = {
  A1: "beginner — understands & uses familiar everyday expressions and basic phrases; can introduce self; needs very simple sentences and Indonesian translations. Vocabulary strictly basic (greetings, numbers, family, food).",
  A2: "elementary — can communicate simple routine tasks; short simple sentences about everyday life; Indonesian translations allowed. Vocabulary: simple everyday words only.",
  B1: "intermediate — can handle common situations while travelling; can describe experiences and opinions simply; English-only, moderate sentences. Vocabulary: everyday + some abstract words.",
  B2: "upper-intermediate — can discuss opinions and abstract topics fluently; can explain viewpoints; English-only, natural English. Vocabulary: wide range incl. abstract.",
  C1: "advanced — can express ideas fluently and spontaneously; academic/formal language; English-only, nuanced. Vocabulary: academic, idiomatic, precise.",
  C2: "proficient — near-native fluency; can understand everything heard/read; sophisticated, nuanced, register-flexible language. Vocabulary: specialist jargon, figurative, literary.",
};

export function buildLessonPrompt(params: {
  level: CefrLevel;
  category: Category;
  topic: string;
}): string {
  const categoryGuidelines: Record<Category, string> = {
    vocabulary: `Category: VOCABULARY (kosakata).
Lesson structure:
- "topic": the topic title (English).
- "intro": a short friendly intro in Bahasa Indonesia inviting the student to learn.
- "sections": 3 items, each {heading, body}. Section 1: list 8-10 key words with Indonesian translations and short example sentences. Section 2: usage tips. Section 3: a short practice note.
- "quiz": exactly 5 multiple-choice questions with 4 options each, testing the vocabulary. Each has {question, questionEN?, options[], optionsEN?, optionsID?, answerIndex, explanation, explanationID?, explanations?: string[], explanationsID?: string[]}. For A1/A2: question & options in Bahasa Indonesia, questionEN = English source word, optionsEN = English translation of each option. For B1/B2: question & options in English, optionsID = Indonesian translation of each option. "explanation" is the correct answer explanation in the primary language; "explanationID" is the Indonesian version for B1/B2. "explanations" is an array of 4 strings — one explanation per option explaining why that option is correct or incorrect (distractor feedback). "explanationsID" is the Indonesian version of each option explanation for B1/B2.`,
    grammar: `Category: GRAMMAR (tata bahasa).
Lesson structure:
- "topic": the grammar point (English).
- "intro": friendly intro in Bahasa Indonesia.
- "sections": 3 items {heading, body}. Section 1: clear explanation of the rule. Section 2: "Aturan dasarnya" — the rule in simple points with examples. Section 3: more example sentences.
- "quiz": exactly 5 multiple-choice / fill-blank questions (4 options each) testing the grammar. Each {question, questionEN?, options[], optionsEN?, optionsID?, answerIndex, explanation, explanationID?, explanations?: string[], explanationsID?: string[]}. For A1/A2: question & options in Bahasa Indonesia, questionEN = English source phrase, optionsEN = English source. For B1/B2: question & options in English, optionsID = Indonesian meaning. "explanations": array of 4 strings, one per option, explaining why each option is right or wrong (distractor feedback).`,
    reading: `Category: READING (membaca).
Lesson structure:
- "topic": reading topic (English).
- "intro": friendly intro in Bahasa Indonesia.
- "sections": 3 items {heading, body}. Section 1: "Baca teks berikut" containing a short passage (5-8 sentences) appropriate for the level. Section 2: key vocabulary with Indonesian translations. Section 3: comprehension note in Bahasa Indonesia.
- "quiz": exactly 5 multiple-choice comprehension questions about the passage, 4 options each. Each {question, questionEN?, options[], optionsEN?, optionsID?, answerIndex, explanation, explanationID?, explanations?: string[], explanationsID?: string[]}. For A1/A2: question & options in Bahasa Indonesia, questionEN = English question, optionsEN = English options. For B1/B2: question & options in English, optionsID = Indonesian translations. "explanations": array of 4 strings — one per option explaining why that option is correct or incorrect.`,
    listening: `Category: LISTENING (mendengar).
Lesson structure:
- "topic": listening topic (English).
- "intro": friendly intro in Bahasa Indonesia.
- "sections": 3 items {heading, body}. Section 1: "Baca dan dengarkan" a short dialogue (5-8 lines). Section 2: key phrases with translations. Section 3: comprehension note.
- "quiz": exactly 5 multiple-choice questions about the dialogue, 4 options each, {question, questionEN?, options[], optionsEN?, optionsID?, answerIndex, explanation, explanationID?, explanations?: string[], explanationsID?: string[]}. For A1/A2: question & options in Bahasa Indonesia, questionEN = English question, optionsEN = English options. For B1/B2: question & options in English, optionsID = Indonesian translations. "explanations": array of 4 strings — one per option explaining why that option is correct or incorrect.
NOTE: the transcript doubles as the audio script (TTS will read it aloud).`,
    writing: `Category: WRITING (menulis).
Lesson structure:
- "topic": writing topic (English).
- "intro": friendly intro in Bahasa Indonesia.
- "sections": 3 items {heading, body}. Section 1: model sentences/examples. Section 2: useful sentence patterns. Section 3: writing task instructions.
- "quiz": exactly 5 multiple-choice questions that prepare the student for the writing task (choose the correct/best sentence), 4 options each, {question, questionEN?, options[], optionsEN?, optionsID?, answerIndex, explanation, explanationID?, explanations?: string[], explanationsID?: string[]}. For A1/A2: question & options in Bahasa Indonesia, questionEN = English source sentence, optionsEN = English options. For B1/B2: question & options in English, optionsID = Indonesian translations. "explanations": array of 4 strings — one per option explaining why that option is correct or incorrect.`
  };

  const bilingual =
    params.level === "A1" || params.level === "A2"
      ? "Bilingual: question & options in Bahasa Indonesia. Add 'questionEN' = English source word/phrase, 'optionsEN' = English source text for each option. Add 'explanations' array (one explanation per option, Bahasa Indonesia, explaining why each option is right or wrong)."
      : "Bilingual: question & options in English. Add 'optionsID' = Indonesian translation for each option, 'questionID' = Indonesian question, 'explanationID' = Indonesian explanation, 'explanationsID' = array of Indonesian explanations (one per option, explaining why each option is right or wrong).";

  // Tipe game sesuai level CEFR (opsional — boleh kosong).
  const gamesInstruction = buildGamesInstruction(params.level);

  return `You are an expert English course content creator for an online learning app in Indonesia.

Level: ${params.level} (${LEVEL_DESC[params.level]})
${categoryGuidelines[params.category]}

Topic to teach: "${params.topic}"

CRITICAL — CEFR LEVEL FIDELITY: All content MUST strictly match CEFR level ${params.level}. Do NOT use vocabulary, grammar, or reading complexity above or below this level. A ${params.level} student must be able to understand it comfortably, and an advanced student must not find it too easy.

Language style: ${bilingual}
Write in a warm, simple, encouraging tone for beginners.

${gamesInstruction}

OUTPUT FORMAT: Return ONLY valid JSON with this exact shape (no markdown, no code fences):
{
  "topic": string,
  "intro": string,
  "sections": [{ "heading": string, "body": string }],
  "quiz": [{ "question": string, "questionEN?": string, "options": [string,string,string,string], "optionsEN?": [string,string,string,string], "optionsID?": [string,string,string,string], "answerIndex": number, "explanation": string, "explanationID?": string, "explanations": [string,string,string,string], "explanationsID?": [string,string,string,string] }],
  "games": [ ... ]
}
The "sections" array must have exactly 3 items. The "quiz" array must have exactly 5 items. Every "answerIndex" must be an integer from 0 to 3. "explanations" must have exactly 4 strings — one per option — explaining why each option is correct or incorrect. For A1/A2: question & options in Indonesian with questionEN/optionsEN. For B1/B2: question & options in English with optionsID/explanationsID. Do NOT create duplicate questions — every question must be unique and different from the others in the quiz.
The "games" array is OPTIONAL — if the level does not require games for this category, return an EMPTY array []. If you include games, follow the exact structures described above.`;
}

/**
 * Instruksi generate games sesuai level CEFR (opsional).
 * Mengadopsi pola game type per level (mekanisme umum, konten orisinal).
 */
function buildGamesInstruction(
  level: CefrLevel,
): string {
  const parts: string[] = [];

  // Listening game — hanya A1–A2
  if (level === "A1" || level === "A2") {
    parts.push(`LISTENING GAME (opsional, sarankan untuk level ${level}):
Add a "listen_choose" game with exactly 3 items. Each item: { "text": a short English word or phrase, "options": [4 strings], "answerIndex": int 0-3, "explanation": string }. The "text" will be read aloud by text-to-speech; options are the possible answers (one correct). Use words/phrases from this lesson's topic.`);
  }

  // Unscramble sentence — A1–B1
  if (level === "A1" || level === "A2" || level === "B1") {
    parts.push(`UNSCRAMBLE SENTENCE GAME (opsional, sarankan untuk level ${level}):
Add an "unscramble" game with exactly 3 items. Each item: { "sentence": a correct English sentence (5-9 words) from this lesson's grammar/vocabulary }. The app will scramble the words for the student to reorder.`);
  }

  // Word stress — A2 ke atas
  if (level === "A2" || level === "B1" || level === "B2" || level === "C1" || level === "C2") {
    parts.push(`WORD STRESS GAME (opsional, sarankan untuk level ${level}):
Add a "word_stress" game with exactly 3 items. Each item: { "word": an English word with 2+ syllables relevant to this lesson, "syllables": [array of syllable strings e.g. ["ba","NA","na"]], "stressedIndex": int index of the stressed syllable }. The student taps which syllable is stressed.`);
  }

  // Role-play dialogue — A2 ke atas
  if (level === "A2" || level === "B1" || level === "B2" || level === "C1" || level === "C2") {
    parts.push(`ROLE-PLAY DIALOGUE GAME (opsional, sarankan untuk level ${level}):
Add a "roleplay" game: { "scenario": short description in Bahasa Indonesia, "lines": [array of { "speaker": "ai" | "user", "text": string }] — a natural 4-6 line dialogue where "ai" lines are read aloud and "user" lines are read by the student, "keyPhrases": [array of 3-4 useful English phrases from the dialogue] }.`);
  }

  if (parts.length === 0) {
    return "GAMES: Not required for this level/category. Return games as an empty array [].";
  }

  return `GAMES (optional — include only if the level benefits; otherwise empty array):
${parts.join("\n\n")}`;
}

export function buildPlacementPrompt(): string {
  return `You are an English placement test creator.

Create a placement test to determine a learner's CEFR level (A1 to C2).

Requirements:
- EXACTLY 12 multiple-choice questions, 4 options each. Do not add or remove any.
- Questions must progress strictly from easy (A1) to advanced (C2). Target CEFR level per question:
  Q1-Q3 ≈ A1, Q4-Q5 ≈ A2, Q6-Q7 ≈ B1, Q8-Q9 ≈ B2, Q10 ≈ C1, Q11-Q12 ≈ C2.
- Do NOT make early questions hard or late questions easy — the difficulty must climb.
- Cover basic vocabulary, grammar, and reading comprehension.
- Each question: {question, options[], answerIndex, explanation}.
- answerIndex must be an integer 0-3. Explanations in Bahasa Indonesia, brief.
- No duplicate questions.

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no code fences):
{
  "questions": [
    { "question": string, "options": [string,string,string,string], "answerIndex": number, "explanation": string }
  ]
}
The "questions" array must have EXACTLY 12 items.`;
}
