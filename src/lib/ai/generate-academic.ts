/**
 * Generator konten "Latihan Akademik" (gaya TOEFL) yang robust.
 *
 * READING & LISTENING (konten panjang): generate bertahap — SATU passage/script
 * per panggilan AI. Output tiap panggilan kecil, sehingga tidak pernah terpotong
 * oleh batas token model, dan jumlah passage/script selalu pas sesuai target.
 *
 * WRITING & SPEAKING (konten pendek): satu panggilan dengan retry perbaikan.
 *
 * Digunakan oleh route admin generate & regenerate agar konsisten.
 */

import { generateWithFallback, logAiUsage } from "@/lib/ai";
import type { AiMessage, AiResult } from "@/lib/ai/providers";
import {
  buildAcademicRepairMessages,
  buildChunkPrompt,
  promptForSection,
} from "./prompts-academic";
import { parseJson } from "./parse";
import {
  validateAcademicChunk,
  validateAcademicContent,
} from "./validate-academic";
import { debugLog } from "@/lib/debug-log";
import type { AcademicSection } from "@/lib/types-academic";

const MAX_TOKENS = 16000;
const CHUNK_MAX_TOKENS = 6000;

export const ACADEMIC_TARGET_COUNT: Record<AcademicSection, number> = {
  reading: 3,
  listening: 2,
  writing: 1,
  speaking: 4,
};

const SYSTEM_PROMPT =
  "You produce structured JSON academic practice content. Output JSON only.";

/** Berapa unit konten yang sudah terbentuk (atau -1 jika tidak tahu). */
function countExisting(content: Record<string, unknown>): number {
  if (Array.isArray(content.passages)) return content.passages.length;
  if (Array.isArray(content.scripts)) return content.scripts.length;
  if (Array.isArray(content.tasks)) return content.tasks.length;
  if (content.task) return 1;
  return -1;
}

/**
 * Generate reading/listening per bagian (satu passage/script per panggilan),
 * dengan validasi per bagian dan retry per bagian maupun retry seluruh set.
 */
async function generateChunkedAcademic(
  section: "reading" | "listening",
  topic: string,
): Promise<Record<string, unknown>> {
  const total = ACADEMIC_TARGET_COUNT[section];
  const key = section === "reading" ? "passages" : "scripts";
  let lastProblems: string[] = ["Gagal membuat set latihan setelah beberapa percobaan."];

  for (let round = 0; round < 2; round++) {
    const items: unknown[] = [];
    const titles: string[] = [];
    let failed = false;

    for (let i = 0; i < total; i++) {
      let success = false;
      for (let attempt = 0; attempt < 2 && !success; attempt++) {
        const messages: AiMessage[] = [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: buildChunkPrompt({
              section,
              topic,
              index: i + 1,
              total,
              existingTitles: titles,
            }),
          },
        ];
        const result = await generateWithFallback(messages, {
          maxTokens: CHUNK_MAX_TOKENS,
        });
        debugLog(
          "chunk",
          section,
          `#${i + 1}/${total}`,
          `round=${round}`,
          `attempt=${attempt}`,
          `${result.provider}:${result.model}`,
          `len=${result.content.length}`,
          `head=${result.content.slice(0, 120).replace(/\s+/g, " ")}`,
        );
        try {
          const parsed = parseJson<unknown>(result.content);
          if (typeof parsed !== "object" || parsed === null) {
            throw new SyntaxError("Hasil AI bukan objek JSON.");
          }
          const item = parsed as Record<string, unknown>;
          const problems = validateAcademicChunk(section, item);
          if (problems.length > 0) {
            throw new Error(problems.slice(0, 3).join(" "));
          }
          items.push(item);
          const t = String(item.title ?? "").trim();
          if (t) titles.push(t);
          success = true;
          await logAiUsage({ result, purpose: "academic", lessonId: null });
        } catch (err) {
          const msg = (err as Error).message;
          debugLog("chunk-fail", section, `#${i + 1}`, `round=${round}`, `attempt=${attempt}`, msg);
          if (attempt === 1) {
            lastProblems = [msg];
            failed = true;
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      if (failed) break;
    }

    if (!failed) {
      const content: Record<string, unknown> = { [key]: items };
      // Cek duplikasi lintas unit (soal sama antar passage/script).
      const problems = validateAcademicContent(section, content as never);
      if (problems.length === 0) {
        debugLog("set-ok", section, `items=${items.length}`);
        return content;
      }
      lastProblems = problems;
      debugLog("set-fail", section, problems.slice(0, 5).join(" "));
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(lastProblems.slice(0, 5).join(" "));
}

/**
 * Generate writing/speaking (outputnya pendek) sekaligus, dengan retry
 * perbaikan jika hasil gagal parse/validasi.
 */
async function generateSingleAcademic(
  section: "writing" | "speaking",
  topic: string,
): Promise<Record<string, unknown>> {
  let messages: AiMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: promptForSection(section, topic) },
  ];
  let result: AiResult = await generateWithFallback(messages, {
    maxTokens: MAX_TOKENS,
  });
  let content: Record<string, unknown> = {};
  let problems: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = parseJson<unknown>(result.content);
      if (typeof parsed !== "object" || parsed === null) {
        throw new SyntaxError("Hasil AI bukan objek JSON.");
      }
      content = parsed as Record<string, unknown>;
      problems = validateAcademicContent(section, content as never);
    } catch (err) {
      problems = [(err as Error).message];
    }
    debugLog(
      "single",
      section,
      `attempt=${attempt}`,
      `${result.provider}:${result.model}`,
      `problems=${problems.slice(0, 3).join(" ")}`,
    );
    if (problems.length === 0) break;
    if (attempt === 0) {
      await new Promise((r) => setTimeout(r, 500));
      messages = buildAcademicRepairMessages({
        section,
        rawOutput: result.content,
        existingCount: countExisting(content),
        targetCount: ACADEMIC_TARGET_COUNT[section],
        problems,
      });
      result = await generateWithFallback(messages, { maxTokens: MAX_TOKENS });
    }
  }

  if (problems.length > 0) {
    throw new Error(problems.slice(0, 5).join(" "));
  }
  await logAiUsage({ result, purpose: "academic", lessonId: null });
  return content;
}

/**
 * Generate set latihan akademik yang lengkap & tervalidasi.
 * Melempar Error dengan pesan masalah bila tetap gagal.
 */
export async function generateAcademicSet(
  section: AcademicSection,
  topic: string,
): Promise<Record<string, unknown>> {
  if (section === "reading" || section === "listening") {
    return generateChunkedAcademic(section, topic);
  }
  return generateSingleAcademic(section, topic);
}