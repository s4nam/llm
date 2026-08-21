export type AcademicSection =
  | "reading"
  | "listening"
  | "writing"
  | "speaking";

export interface AcademicQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  type?: string;
}

export interface AcademicPassage {
  title: string;
  text: string;
  questions: AcademicQuestion[];
}

export interface AcademicScript {
  title: string;
  script: string;
  questions: AcademicQuestion[];
}

export interface AcademicWritingTask {
  taskType: "integrated" | "independent";
  prompt: string;
  context: string;
  rubric: { name: string; weight: number }[];
  timeMinutes: number;
}

export interface AcademicSpeakingTask {
  prompt: string;
  prepSeconds: number;
  speakSeconds: number;
}

export type AcademicSetContent =
  | { passages: AcademicPassage[] }
  | { scripts: AcademicScript[] }
  | { task: AcademicWritingTask }
  | { tasks: AcademicSpeakingTask[] };

export const ACADEMIC_SECTIONS: AcademicSection[] = [
  "reading",
  "listening",
  "writing",
  "speaking",
];

export const ACADEMIC_SECTION_LABELS: Record<AcademicSection, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};