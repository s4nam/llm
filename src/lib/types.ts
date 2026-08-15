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

export interface LessonDetail {
  id: string;
  level: CefrLevel;
  category: Category;
  title: string;
  slug: string;
  intro: string;
  sections: { heading: string; body: string }[];
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }[];
  is_free: boolean;
}

export interface UserProgressRow {
  lesson_id: string;
  completed: boolean;
  best_score: number;
  completed_at: string | null;
}

export interface CertificateRow {
  id: string;
  level_code: string;
  code: string;
  issued_at: string;
}

export interface UserStreakRow {
  current_streak: number;
  best_streak: number;
  last_active_date: string | null;
}

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: "student" | "admin";
  is_member: boolean;
  member_expires_at: string | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  trial_used: boolean;
  created_at: string;
}
