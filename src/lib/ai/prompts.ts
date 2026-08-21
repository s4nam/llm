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
- "quiz": exactly 5 multiple-choice questions with 4 options each, testing the vocabulary. Each has {question, options[], answerIndex, explanation} where explanation is in Bahasa Indonesia.`,
    grammar: `Category: GRAMMAR (tata bahasa).
Lesson structure:
- "topic": the grammar point (English).
- "intro": friendly intro in Bahasa Indonesia.
- "sections": 3 items {heading, body}. Section 1: clear explanation of the rule. Section 2: "Aturan dasarnya" — the rule in simple points with examples. Section 3: more example sentences.
- "quiz": exactly 5 multiple-choice / fill-blank questions (4 options each) testing the grammar. Each {question, options[], answerIndex, explanation} with explanation in Bahasa Indonesia.`,
    reading: `Category: READING (membaca).
Lesson structure:
- "topic": reading topic (English).
- "intro": friendly intro in Bahasa Indonesia.
- "sections": 3 items {heading, body}. Section 1: "Baca teks berikut" containing a short passage (5-8 sentences) appropriate for the level. Section 2: key vocabulary with Indonesian translations. Section 3: comprehension note in Bahasa Indonesia.
- "quiz": exactly 5 multiple-choice comprehension questions about the passage, 4 options each, {question, options[], answerIndex, explanation} with explanation in Bahasa Indonesia.`,
    listening: `Category: LISTENING (mendengar).
Lesson structure:
- "topic": listening topic (English).
- "intro": friendly intro in Bahasa Indonesia.
- "sections": 3 items {heading, body}. Section 1: "Baca dan dengarkan" a short dialogue (5-8 lines). Section 2: key phrases with translations. Section 3: comprehension note.
- "quiz": exactly 5 multiple-choice questions about the dialogue, 4 options each, {question, options[], answerIndex, explanation} with explanation in Bahasa Indonesia.
NOTE: the transcript doubles as the audio script (TTS will read it aloud).`,
    writing: `Category: WRITING (menulis).
Lesson structure:
- "topic": writing topic (English).
- "intro": friendly intro in Bahasa Indonesia.
- "sections": 3 items {heading, body}. Section 1: model sentences/examples. Section 2: useful sentence patterns. Section 3: writing task instructions.
- "quiz": exactly 5 multiple-choice questions that prepare the student for the writing task (choose the correct/best sentence), 4 options each, {question, options[], answerIndex, explanation} with explanation in Bahasa Indonesia.`,
  };

  const bilingual =
    params.level === "A1" || params.level === "A2"
      ? "Use Indonesian translations in vocabulary and explanations (bilingual for beginners)."
      : "Use English only (no Indonesian translations).";

  return `You are an expert English course content creator for an online learning app in Indonesia.

Level: ${params.level} (${LEVEL_DESC[params.level]})
${categoryGuidelines[params.category]}

Topic to teach: "${params.topic}"

CRITICAL — CEFR LEVEL FIDELITY: All content MUST strictly match CEFR level ${params.level}. Do NOT use vocabulary, grammar, or reading complexity above or below this level. A ${params.level} student must be able to understand it comfortably, and an advanced student must not find it too easy.

Language style: ${bilingual}
Write in a warm, simple, encouraging tone for beginners.

OUTPUT FORMAT: Return ONLY valid JSON with this exact shape (no markdown, no code fences):
{
  "topic": string,
  "intro": string,
  "sections": [{ "heading": string, "body": string }],
  "quiz": [{ "question": string, "options": [string,string,string,string], "answerIndex": number, "explanation": string }]
}
The "sections" array must have exactly 3 items. The "quiz" array must have exactly 5 items. Every "answerIndex" must be an integer from 0 to 3. All explanations must be in Bahasa Indonesia for A1/A2 and in English for B1 and above.`;
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
