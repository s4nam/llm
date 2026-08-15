export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type Category =
  | "vocabulary"
  | "grammar"
  | "reading"
  | "listening"
  | "writing";

export const CEFR_LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "vocabulary", label: "Vocabulary (Kosakata)" },
  { id: "grammar", label: "Grammar (Tata Bahasa)" },
  { id: "reading", label: "Reading (Membaca)" },
  { id: "listening", label: "Listening (Mendengar)" },
  { id: "writing", label: "Writing (Menulis)" },
];

export const CATEGORY_LABELS: Record<Category, string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
};

export interface FreeLesson {
  id: string;
  level: CefrLevel;
  category: Category;
  title: string;
  /** Bahasa Indonesia — intro ramah pemula */
  intro: string;
  /** Materi utama pelajaran */
  sections: { heading: string; body: string }[];
  /** 5 soal pilihan ganda */
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }[];
}
