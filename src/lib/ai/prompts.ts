import type { Category, CefrLevel } from "@/lib/types";

/**
 * Template prompt baku (Bahasa Inggris untuk AI, output selalu JSON).
 * Menjaga format materi seragam di seluruh pelajaran.
 */

const LEVEL_DESC: Record<CefrLevel, string> = {
  A1: "beginner — knows almost nothing. Use very simple sentences, basic vocabulary, Indonesian translations.",
  A2: "elementary — can use simple phrases for everyday life. Simple sentences, Indonesian translations.",
  B1: "intermediate — can handle common situations. English-only, moderate sentences.",
  B2: "upper-intermediate — can discuss opinions and abstract topics. English-only, natural English.",
  C1: "advanced — formal and academic English. English-only, nuanced language.",
  C2: "proficient — near-native. English-only, sophisticated language.",
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

Language style: ${bilingual}
Write in a warm, simple, encouraging tone for beginners.

OUTPUT FORMAT: Return ONLY valid JSON with this exact shape (no markdown, no code fences):
{
  "topic": string,
  "intro": string,
  "sections": [{ "heading": string, "body": string }],
  "quiz": [{ "question": string, "options": [string,string,string,string], "answerIndex": number, "explanation": string }]
}
The "sections" array must have exactly 3 items. The "quiz" array must have exactly 5 items.`;
}

export function buildPlacementPrompt(): string {
  return `You are an English placement test creator.

Create a placement test to determine a learner's CEFR level (A1 to C2).

Requirements:
- Exactly 12 multiple-choice questions, 4 options each.
- Questions progress from very easy (A1) to advanced (C2).
- Cover basic vocabulary, grammar, and reading comprehension.
- Each question: {question, options[], answerIndex, explanation}.
- Explanation in Bahasa Indonesia, brief.

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no code fences):
{
  "questions": [
    { "question": string, "options": [string,string,string,string], "answerIndex": number, "explanation": string }
  ]
}
The "questions" array must have exactly 12 items.`;
}
