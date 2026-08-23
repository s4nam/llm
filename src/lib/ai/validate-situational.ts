/**
 * Validasi struktur hasil generate AI untuk "Percakapan Situasional".
 * Mengembalikan daftar masalah (kosong = valid). Caller (route admin)
 * memutuskan apakah masalah ini memblokir penyimpanan.
 */

export interface SituationalDraft {
  aiName?: string;
  dialogues?: { speaker?: string; text?: string }[];
  vocab?: { word?: string; meaning?: string }[];
  quiz?: {
    question?: string;
    options?: unknown;
    answerIndex?: unknown;
    explanation?: string;
  }[];
  roleplay?: {
    scenario?: string;
    lines?: { speaker?: string; text?: string }[];
    keyPhrases?: unknown;
  };
}

const isNonEmpty = (s: unknown): s is string =>
  typeof s === "string" && s.trim().length > 0;

function validateSpeaker(speaker: unknown, problems: string[], scope: string): void {
  if (speaker !== "ai" && speaker !== "user") {
    problems.push(`${scope}: speaker harus 'ai' atau 'user'.`);
  }
}

export function validateSituationalDraft(
  draft: SituationalDraft | null | undefined,
): string[] {
  const problems: string[] = [];

  if (!draft || typeof draft !== "object") {
    return ["Hasil AI bukan objek set yang valid."];
  }

  // Nama lawan bicara ("ai") wajib untuk hasil generate baru
  if (!isNonEmpty(draft.aiName)) {
    problems.push(
      "Butuh 'aiName' — nama orang natural untuk lawan bicara (mis. 'Sarah', 'David').",
    );
  }

  // Dialog: tepat 4 baris, speaker ai/user bergantian
  if (!Array.isArray(draft.dialogues) || draft.dialogues.length < 4) {
    problems.push("Dialog harus minimal 4 baris.");
  } else {
    draft.dialogues.forEach((d, i) => {
      validateSpeaker(d?.speaker, problems, `Dialog #${i + 1}`);
      if (!isNonEmpty(d?.text)) problems.push(`Dialog #${i + 1} butuh 'text'.`);
    });
  }

  // Kosakata: 5 item
  if (!Array.isArray(draft.vocab) || draft.vocab.length < 5) {
    problems.push("Kosakata harus minimal 5 item.");
  } else {
    draft.vocab.forEach((v, i) => {
      if (!isNonEmpty(v?.word)) problems.push(`Vocab #${i + 1} butuh 'word'.`);
      if (!isNonEmpty(v?.meaning)) problems.push(`Vocab #${i + 1} butuh 'meaning'.`);
    });
  }

  // Kuis: 4 soal
  if (!Array.isArray(draft.quiz) || draft.quiz.length < 4) {
    problems.push("Kuis harus minimal 4 soal.");
  } else {
    draft.quiz.forEach((q, i) => {
      if (!isNonEmpty(q?.question)) problems.push(`Kuis #${i + 1} butuh 'question'.`);
      if (
        !Array.isArray(q?.options) ||
        q.options.length !== 4 ||
        q.options.some((o) => !isNonEmpty(o))
      ) {
        problems.push(`Kuis #${i + 1} butuh tepat 4 pilihan.`);
      }
      if (
        typeof q?.answerIndex !== "number" ||
        !Number.isInteger(q.answerIndex) ||
        q.answerIndex < 0 ||
        q.answerIndex > 3
      ) {
        problems.push(`Kuis #${i + 1} answerIndex harus 0–3.`);
      }
      if (!isNonEmpty(q?.explanation)) problems.push(`Kuis #${i + 1} butuh 'explanation'.`);
    });
  }

  // Roleplay (opsional)
  if (draft.roleplay != null) {
    if (!isNonEmpty(draft.roleplay.scenario)) {
      problems.push("Roleplay butuh 'scenario'.");
    }
    if (!Array.isArray(draft.roleplay.lines) || draft.roleplay.lines.length < 3) {
      problems.push("Roleplay butuh minimal 3 lines.");
    } else {
      draft.roleplay.lines.forEach((l, i) => {
        validateSpeaker(l?.speaker, problems, `Roleplay line #${i + 1}`);
        if (!isNonEmpty(l?.text)) problems.push(`Roleplay line #${i + 1} butuh 'text'.`);
      });
    }
    if (
      !Array.isArray(draft.roleplay.keyPhrases) ||
      draft.roleplay.keyPhrases.length === 0 ||
      draft.roleplay.keyPhrases.some((k) => !isNonEmpty(k))
    ) {
      problems.push("Roleplay butuh 'keyPhrases' (array string).");
    }
  }

  return problems;
}