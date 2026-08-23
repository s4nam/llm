import type { SituationalTopicId } from "@/lib/types-situational";

/**
 * Template prompt untuk modul "Percakapan Situasional".
 * Konten SELALU orisinal — dilarang menyalin materi berhak cipta.
 * Output JSON, struktur divalidasi oleh validate-situational.ts.
 */

const ORIGINALITY_RULE = `CRITICAL — COPYRIGHT: Create ALL dialogues, vocabulary, and questions in your own words and structure.
NEVER reproduce, quote, paraphrase closely, or imitate text from ELSA, published textbooks, paywalled
materials, song lyrics, or any other copyrighted work. Write original content only.
If in doubt, invent original facts and examples.`;

const TOPIC_CONTEXT: Record<SituationalTopicId, string> = {
  hotel: "At a hotel: check-in, room complaints, check-out, and payment.",
  restaurant: "At a restaurant/café: ordering food, allergies & dietary needs, asking for the bill.",
  travel: "At the airport and traveling: check-in, public transport, asking for directions.",
  shopping: "Shopping: asking prices and sizes, exchanging or returning items.",
  health: "Health: visiting a doctor, at the pharmacy, explaining symptoms.",
  interview: "At a job interview: introducing yourself, work experience, salary questions, and closing.",
  phone: "On the phone: making reservations, customer service, waiting on hold, leaving a message.",
  bank: "At a bank: opening an account, transactions, talking to a teller, using an ATM.",
  office: "At the office: meetings, presentations, teamwork, and office emails.",
  school: "At school: asking the teacher, class presentations, group assignments.",
  social: "At a party or social event: small talk, invitations, meeting new people.",
  customer_service: "Customer service: handling complaints, helping customers, apologizing and resolving issues.",
};

const TOPIC_LABEL: Record<SituationalTopicId, string> = {
  hotel: "HOTEL",
  restaurant: "RESTAURANT",
  travel: "TRAVEL",
  shopping: "SHOPPING",
  health: "HEALTH",
  interview: "JOB INTERVIEW",
  phone: "PHONE CALL",
  bank: "BANKING",
  office: "OFFICE & MEETING",
  school: "SCHOOL & CLASS",
  social: "SOCIAL EVENT",
  customer_service: "CUSTOMER SERVICE",
};

function baseInstruction(): string {
  return `You are an expert creator of practical English conversation lessons for an online learning app in Indonesia.
Your lessons focus on REAL-LIFE situations (hotel, restaurant, travel, shopping, health,
job interview, phone calls, banking, office, school, social events, customer service).
Every dialogue and question must be 100% ORIGINAL (see copyright rule below).

${ORIGINALITY_RULE}

Content should suit everyday English learners (CEFR A1–B2). For A1/A2 include Indonesian
translations in the vocabulary. For B1/B2 use English only with natural, slightly longer sentences.
Explanations for quiz questions must be in Bahasa Indonesia, brief and helpful.`;
}

export function buildSituationalPrompt(params: {
  topic: SituationalTopicId;
  title: string;
}): string {
  return `${baseInstruction()}

TASK: Practical conversation set.
Topic: ${TOPIC_LABEL[params.topic]} — ${TOPIC_CONTEXT[params.topic]}
Title / situation: "${params.title}"

Create one complete set with this structure:
1. "aiName": the name of the "ai" speaker — a natural human name that fits the
   role in this situation (e.g. receptionist "Sarah", waiter "David", doctor "Dr. Maya",
   bank teller "Dian"). Do NOT use "AI", "Assistant", or "Bot". Use the SAME name for
   every "ai" line in both "dialogues" and "roleplay" so the conversation feels real.
2. "dialogues": exactly 4 lines of a natural 2-party dialogue (the situation above).
   Each line: { "speaker": "ai" | "user", "text": string }. Alternate speakers so the
   user ("user") gets to speak. "ai" lines will be read aloud by text-to-speech — write natural spoken English.
3. "vocab": exactly 5 items: { "word": string, "meaning": string } — key words/phrases
   from the dialogue with their Indonesian meaning (all levels).
4. "quiz": exactly 4 multiple-choice comprehension questions about the dialogue.
   Each: { "question": string, "options": [4], "answerIndex": int 0-3, "explanation": string (Bahasa Indonesia) }.
5. "roleplay": { "scenario": string (Bahasa Indonesia, short), "lines": [array of 3 lines
   { "speaker": "ai"|"user", "text": string } that re-use the same situation with slightly different
   wording, "keyPhrases": [array of 3-4 useful English phrases from the dialogue] }.

OUTPUT FORMAT: Return ONLY valid JSON (no markdown, no code fences):
{
  "aiName": string,
  "dialogues": [ { "speaker": "ai"|"user", "text": string } ],
  "vocab": [ { "word": string, "meaning": string } ],
  "quiz": [ { "question": string, "options": [4], "answerIndex": number, "explanation": string } ],
  "roleplay": { "scenario": string, "lines": [ { "speaker": "ai"|"user", "text": string } ], "keyPhrases": [string] }
}
Exactly 4 dialogue lines, 5 vocab items, 4 quiz questions. No duplicate questions.`;
}

export function buildSituationalRepairMessages(params: {
  topic: SituationalTopicId;
  rawOutput: string;
  problems: string[];
}): { role: "user"; content: string }[] {
  return [
    {
      role: "user",
      content: `${ORIGINALITY_RULE}

Output AI "${TOPIC_LABEL[params.topic]}" di bawah TIDAK VALID. Perbaiki menjadi JSON LENGKAP yang valid.
Target: 4 baris dialog (ai/user bergantian), 5 kosakata, 4 soal kuis, 1 roleplay.

"aiName" WAJIB: nama orang natural untuk lawan bicara "ai" (mis. receptionist "Sarah",
waiter "David"), konsisten di dialog & roleplay. JANGAN pakai "AI"/"Assistant"/"Bot".

Masalah yang ditemukan:
- ${params.problems.slice(0, 5).join("\n- ")}

OUTPUT FORMAT: Kembalikan HANYA JSON valid (tanpa markdown, tanpa teks lain):
{
  "aiName": string,
  "dialogues": [ { "speaker": "ai"|"user", "text": string } ],
  "vocab": [ { "word": string, "meaning": string } ],
  "quiz": [ { "question": string, "options": [4], "answerIndex": number, "explanation": string } ],
  "roleplay": { "scenario": string, "lines": [ { "speaker": "ai"|"user", "text": string } ], "keyPhrases": [string] }
}

OUTPUT AI SEBELUMNYA (untuk referensi gaya & topik):
${params.rawOutput.slice(0, 30000)}`,
    },
  ];
}