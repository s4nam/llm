/**
 * Generator konten "Percakapan Situasional" yang robust.
 * Konten pendek (satu set) — satu panggilan AI dengan retry perbaikan bila
 * validasi gagal. Dipakai oleh route admin generate & regenerate.
 */

import { generateWithFallback } from "@/lib/ai";
import type { AiMessage } from "@/lib/ai/providers";
import { buildSituationalPrompt, buildSituationalRepairMessages } from "./prompts-situational";
import { parseJson } from "./parse";
import { validateSituationalDraft, type SituationalDraft } from "./validate-situational";
import { debugLog } from "@/lib/debug-log";
import type { SituationalTopicId } from "@/lib/types-situational";

const MAX_TOKENS = 3000;
const MAX_ATTEMPTS = 3;

const SYSTEM_PROMPT =
  "You produce structured JSON practical conversation content. Output JSON only.";

export async function generateSituationalSet(
  topic: SituationalTopicId,
  title: string,
): Promise<Record<string, unknown>> {
  let rawOutput = "";
  let lastProblems: string[] = [
    "Gagal membuat set percakapan setelah beberapa percobaan.",
  ];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const messages: AiMessage[] = [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content:
            attempt === 0
              ? buildSituationalPrompt({ topic, title })
              : buildSituationalRepairMessages({
                  topic,
                  rawOutput,
                  problems: lastProblems,
                })[0].content,
        },
      ];

      const result = await generateWithFallback(messages, {
        maxTokens: MAX_TOKENS,
      });
      rawOutput = result.content;

      const draft = parseJson<SituationalDraft>(result.content);
      const problems = validateSituationalDraft(draft);
      if (problems.length === 0) {
        // Normalisasi ke struktur yang diharapkan
        return {
          dialogues: (draft.dialogues ?? []).map((d) => ({
            speaker: d.speaker,
            text: d.text ?? "",
          })),
          vocab: (draft.vocab ?? []).map((v) => ({
            word: v.word ?? "",
            meaning: v.meaning ?? "",
          })),
          quiz: (draft.quiz ?? []).map((q) => ({
            question: q.question ?? "",
            options: (q.options as string[]) ?? [],
            answerIndex: q.answerIndex,
            explanation: q.explanation ?? "",
          })),
          roleplay: draft.roleplay ?? undefined,
        };
      }

      lastProblems = problems;
      debugLog("situational-retry", topic, title, `attempt ${attempt + 1}: ${problems.slice(0, 3).join(" | ")}`);
    } catch (err) {
      lastProblems = [(err as Error).message];
      debugLog("situational-error", topic, title, lastProblems[0]);
    }
  }

  throw new Error(lastProblems.slice(0, 5).join(" "));
}