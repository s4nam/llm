import type { Category, CefrLevel } from "./types";

export interface CurriculumTopic {
  level: CefrLevel;
  category: Category;
  topic: string;
  isFree?: boolean;
}

/**
 * Kurikulum A1 (20 pelajaran = 4 tiap kategori) — sesuai keputusan requirements.
 * Topik pertama tiap kategori (Greetings, Be Verbs, My Family) adalah
 * 3 pelajaran gratis yang sudah ditulis manual di free-lessons.ts.
 */
export const A1_CURRICULUM: CurriculumTopic[] = [
  // Vocabulary (4)
  { level: "A1", category: "vocabulary", topic: "Greetings & Introductions", isFree: true },
  { level: "A1", category: "vocabulary", topic: "Numbers & Time" },
  { level: "A1", category: "vocabulary", topic: "Family & People" },
  { level: "A1", category: "vocabulary", topic: "Food & Daily Items" },
  // Grammar (4)
  { level: "A1", category: "grammar", topic: "Be Verbs: Am, Is, Are", isFree: true },
  { level: "A1", category: "grammar", topic: "Simple Present Tense" },
  { level: "A1", category: "grammar", topic: "Pronouns & Possessives" },
  { level: "A1", category: "grammar", topic: "Articles (a/an/the) & Plurals" },
  // Reading (4)
  { level: "A1", category: "reading", topic: "My Family", isFree: true },
  { level: "A1", category: "reading", topic: "At School" },
  { level: "A1", category: "reading", topic: "Daily Routines" },
  { level: "A1", category: "reading", topic: "At the Market" },
  // Listening (4)
  { level: "A1", category: "listening", topic: "Greetings Dialogue" },
  { level: "A1", category: "listening", topic: "Introducing Yourself" },
  { level: "A1", category: "listening", topic: "Ordering Food" },
  { level: "A1", category: "listening", topic: "Asking for Directions" },
  // Writing (4)
  { level: "A1", category: "writing", topic: "About Myself" },
  { level: "A1", category: "writing", topic: "My Daily Routine" },
  { level: "A1", category: "writing", topic: "My Favourite Food" },
  { level: "A1", category: "writing", topic: "Describing My Home" },
];

/**
 * Peta topik untuk level lain (A2–C2) — pola seragam 20 pelajaran per level.
 * Digenerate on-demand lewat admin. Disediakan daftar referensi awal.
 */
export const OTHER_LEVEL_TOPICS: Record<Exclude<CefrLevel, "A1">, CurriculumTopic[]> = {
  A2: [
    { level: "A2", category: "vocabulary", topic: "Jobs & Work" },
    { level: "A2", category: "vocabulary", topic: "Travel & Transport" },
    { level: "A2", category: "vocabulary", topic: "Shopping & Prices" },
    { level: "A2", category: "vocabulary", topic: "Health & Body" },
    { level: "A2", category: "grammar", topic: "Past Simple Tense" },
    { level: "A2", category: "grammar", topic: "Comparatives & Superlatives" },
    { level: "A2", category: "grammar", topic: "Future with Going to" },
    { level: "A2", category: "grammar", topic: "Prepositions of Place" },
    { level: "A2", category: "reading", topic: "My Town" },
    { level: "A2", category: "reading", topic: "Weekend Plans" },
    { level: "A2", category: "reading", topic: "At the Doctor" },
    { level: "A2", category: "reading", topic: "A Day in Jakarta" },
    { level: "A2", category: "listening", topic: "Shopping Dialogue" },
    { level: "A2", category: "listening", topic: "Travelling by Train" },
    { level: "A2", category: "listening", topic: "At the Pharmacy" },
    { level: "A2", category: "listening", topic: "Planning a Trip" },
    { level: "A2", category: "writing", topic: "A Postcard" },
    { level: "A2", category: "writing", topic: "My Weekend" },
    { level: "A2", category: "writing", topic: "A Short Email" },
    { level: "A2", category: "writing", topic: "Describing a Place" },
  ],
  B1: [
    { level: "B1", category: "vocabulary", topic: "Work & Business" },
    { level: "B1", category: "vocabulary", topic: "Education & Study" },
    { level: "B1", category: "vocabulary", topic: "Feelings & Opinions" },
    { level: "B1", category: "vocabulary", topic: "Technology & Internet" },
    { level: "B1", category: "grammar", topic: "Present Perfect Tense" },
    { level: "B1", category: "grammar", topic: "Conditionals (Zero & First)" },
    { level: "B1", category: "grammar", topic: "Passive Voice (Simple)" },
    { level: "B1", category: "grammar", topic: "Relative Clauses" },
    { level: "B1", category: "reading", topic: "Working from Home" },
    { level: "B1", category: "reading", topic: "Social Media Habits" },
    { level: "B1", category: "reading", topic: "Environmental Issues" },
    { level: "B1", category: "reading", topic: "Studying Abroad" },
    { level: "B1", category: "listening", topic: "Job Interview" },
    { level: "B1", category: "listening", topic: "A Phone Call at Work" },
    { level: "B1", category: "listening", topic: "A University Lecture" },
    { level: "B1", category: "listening", topic: "A Podcast about Hobbies" },
    { level: "B1", category: "writing", topic: "A Cover Letter" },
    { level: "B1", category: "writing", topic: "A Review of a Film" },
    { level: "B1", category: "writing", topic: "A Formal Email" },
    { level: "B1", category: "writing", topic: "An Opinion Essay" },
  ],
  B2: [
    { level: "B2", category: "vocabulary", topic: "Global Issues" },
    { level: "B2", category: "vocabulary", topic: "Arts & Culture" },
    { level: "B2", category: "vocabulary", topic: "Psychology & Behaviour" },
    { level: "B2", category: "vocabulary", topic: "Law & Society" },
    { level: "B2", category: "grammar", topic: "Past Perfect & Narrative Tenses" },
    { level: "B2", category: "grammar", topic: "Modals of Deduction" },
    { level: "B2", category: "grammar", topic: "Mixed Conditionals" },
    { level: "B2", category: "grammar", topic: "Reported Speech" },
    { level: "B2", category: "reading", topic: "Artificial Intelligence" },
    { level: "B2", category: "reading", topic: "Climate Change Debates" },
    { level: "B2", category: "reading", topic: "The Gig Economy" },
    { level: "B2", category: "reading", topic: "Cultural Differences" },
    { level: "B2", category: "listening", topic: "A Conference Talk" },
    { level: "B2", category: "listening", topic: "A News Report" },
    { level: "B2", category: "listening", topic: "A Debate" },
    { level: "B2", category: "listening", topic: "A Documentary" },
    { level: "B2", category: "writing", topic: "A Discussion Essay" },
    { level: "B2", category: "writing", topic: "A Report" },
    { level: "B2", category: "writing", topic: "A Persuasive Letter" },
    { level: "B2", category: "writing", topic: "A Proposal" },
  ],
  C1: [
    { level: "C1", category: "vocabulary", topic: "Academic Language" },
    { level: "C1", category: "vocabulary", topic: "Politics & Economics" },
    { level: "C1", category: "vocabulary", topic: "Science & Research" },
    { level: "C1", category: "vocabulary", topic: "Idioms & Phrasal Verbs" },
    { level: "C1", category: "grammar", topic: "Advanced Inversion" },
    { level: "C1", category: "grammar", topic: "Subjunctive & Formality" },
    { level: "C1", category: "grammar", topic: "Complex Noun Phrases" },
    { level: "C1", category: "grammar", topic: "Ellipsis & Substitution" },
    { level: "C1", category: "reading", topic: "Academic Papers" },
    { level: "C1", category: "reading", topic: "Economic Analysis" },
    { level: "C1", category: "reading", topic: "Philosophical Texts" },
    { level: "C1", category: "reading", topic: "News Editorials" },
    { level: "C1", category: "listening", topic: "A Keynote Speech" },
    { level: "C1", category: "listening", topic: "An Academic Lecture" },
    { level: "C1", category: "listening", topic: "A Panel Discussion" },
    { level: "C1", category: "listening", topic: "A Radio Interview" },
    { level: "C1", category: "writing", topic: "An Academic Essay" },
    { level: "C1", category: "writing", topic: "A Critical Review" },
    { level: "C1", category: "writing", topic: "A Policy Brief" },
    { level: "C1", category: "writing", topic: "A Research Summary" },
  ],
  C2: [
    { level: "C2", category: "vocabulary", topic: "Nuanced Lexis & Register" },
    { level: "C2", category: "vocabulary", topic: "Literary Language" },
    { level: "C2", category: "vocabulary", topic: "Specialist Jargon" },
    { level: "C2", category: "vocabulary", topic: "Figurative Language" },
    { level: "C2", category: "grammar", topic: "Advanced Ellipsis" },
    { level: "C2", category: "grammar", topic: "Cohesion & Discourse Markers" },
    { level: "C2", category: "grammar", topic: "Register & Tone Shift" },
    { level: "C2", category: "grammar", topic: "Fronting & Cleft Sentences" },
    { level: "C2", category: "reading", topic: "Classic Literature" },
    { level: "C2", category: "reading", topic: "Philosophical Essays" },
    { level: "C2", category: "reading", topic: "Legal Documents" },
    { level: "C2", category: "reading", topic: "Satirical Writing" },
    { level: "C2", category: "listening", topic: "Academic Keynotes" },
    { level: "C2", category: "listening", topic: "Rapid Dialogue" },
    { level: "C2", category: "listening", topic: "Comedy & Wordplay" },
    { level: "C2", category: "listening", topic: "Court Proceedings" },
    { level: "C2", category: "writing", topic: "A Scholarly Paper" },
    { level: "C2", category: "writing", topic: "A Formal Speech" },
    { level: "C2", category: "writing", topic: "A Legal Argument" },
    { level: "C2", category: "writing", topic: "A Literary Analysis" },
  ],
};

export function getCurriculumForLevel(level: CefrLevel): CurriculumTopic[] {
  if (level === "A1") return A1_CURRICULUM;
  return OTHER_LEVEL_TOPICS[level];
}
