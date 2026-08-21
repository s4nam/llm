export interface PlacementQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

const LEVEL_BY_SCORE = [
  "A1", "A1", "A1", // 0-2
  "A2", "A2", // 3-4
  "B1", "B1", // 5-6
  "B2", "B2", // 7-8
  "C1", // 9
  "C2", "C2", // 10-12
];

/** Soal cadangan bawaan (fallback) bila tabel placement_tests masih kosong. */
export const SEED_PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    question: "I ___ a student.",
    options: ["am", "is", "are", "be"],
    answerIndex: 0,
    explanation: "Setelah subjek 'I' dipakai 'am'.",
  },
  {
    question: "She ___ to school every day.",
    options: ["go", "goes", "going", "gone"],
    answerIndex: 1,
    explanation: "Subjek tunggal 'She' memakai 'goes'.",
  },
  {
    question: "What is the plural of 'child'?",
    options: ["childs", "children", "childes", "childrens"],
    answerIndex: 1,
    explanation: "'Child' bentuk jamaknya 'children' (tidak beraturan).",
  },
  {
    question: "Choose the correct sentence:",
    options: [
      "He don't like coffee.",
      "He doesn't likes coffee.",
      "He doesn't like coffee.",
      "He not like coffee.",
    ],
    answerIndex: 2,
    explanation: "Negatif untuk 'he' adalah 'doesn't + kata kerja dasar'.",
  },
  {
    question: "I ___ to the cinema yesterday.",
    options: ["go", "went", "gone", "goes"],
    answerIndex: 1,
    explanation: "'Yesterday' menandakan lampau → 'went'.",
  },
  {
    question: "If it rains, I ___ stay at home.",
    options: ["will", "would", "can", "must"],
    answerIndex: 0,
    explanation: "Kalimat pengandaian tipe 1 memakai 'will'.",
  },
  {
    question: "The book ___ on the table since this morning.",
    options: ["is", "was", "has been", "had been"],
    answerIndex: 2,
    explanation: "'Since this morning' menandakan present perfect → 'has been'.",
  },
  {
    question: "Choose the correct passive sentence:",
    options: [
      "The cake was baked by her.",
      "The cake baked by her.",
      "She was baked the cake.",
      "The cake is bake by her.",
    ],
    answerIndex: 0,
    explanation: "Passive past tense: 'was + V3' → 'was baked'.",
  },
  {
    question: "By next year, I ___ my degree.",
    options: ["finish", "will finish", "will have finished", "finished"],
    answerIndex: 2,
    explanation: "'By next year' + future perfect → 'will have finished'.",
  },
  {
    question: "Choose the word closest in meaning to 'abundant':",
    options: ["scarce", "plentiful", "rare", "limited"],
    answerIndex: 1,
    explanation: "'Abundant' berarti berlimpah = 'plentiful'.",
  },
  {
    question: "The committee ___ divided on the issue.",
    options: ["are", "is", "were", "be"],
    answerIndex: 1,
    explanation: "Sebagai kesatuan, 'committee' diperlakukan tunggal → 'is'.",
  },
  {
    question: "Had I known about the meeting, I ___ attended.",
    options: ["will have", "would have", "would", "should"],
    answerIndex: 1,
    explanation: "Third conditional: 'had ... would have + V3'.",
  },
];

export function stripAnswers(
  questions: PlacementQuestion[],
): { question: string; options: string[] }[] {
  return questions.map(({ question, options }) => ({ question, options }));
}

export function scoreAnswers(
  questions: PlacementQuestion[],
  answers: number[],
): { score: number; total: number; recommendedLevel: string } {
  let score = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.answerIndex) score++;
  });
  const recommendedLevel =
    LEVEL_BY_SCORE[Math.min(score, LEVEL_BY_SCORE.length - 1)] ?? "A1";
  return {
    score,
    total: questions.length,
    recommendedLevel,
  };
}
