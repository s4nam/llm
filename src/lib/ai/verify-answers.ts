/**
 * Verifier kunci jawaban (answerIndex) berbasis AI.
 *
 * Tujuan: mendeteksi soal pilihan ganda yang kunci jawabannya SALAH (ngawur).
 * Untuk setiap unit konten (lesson, passage, script, set situasional, placement),
 * AI membaca teks sumber + semua soal + opsi, lalu menilai opsi mana yang benar.
 * Hasil dibandingkan dengan answerIndex yang tersimpan; yang tidak cocok ditandai.
 *
 * Dipakai oleh route admin /api/admin/audit-answers. Biaya: 1 panggilan AI
 * per unit konten (semua soal dalam unit diproses sekaligus).
 */

import { generateWithFallback } from "@/lib/ai";
import type { AiMessage } from "@/lib/ai/providers";
import { parseJson } from "./parse";

export interface AuditQuestion {
  question: string;
  options: string[];
  /** Kunci jawaban yang tersimpan (belum tentu benar). */
  storedAnswerIndex: number;
}

export interface AuditUnit {
  /** Modul asal konten. */
  module: "lesson" | "toefl" | "situational" | "placement";
  /** ID baris (lesson id / set id / dll). */
  refId: string;
  /** Judul unit untuk laporan. */
  title: string;
  /** Bagian dalam set (mis. "passage 2", "script 1") — opsional. */
  subTitle?: string;
  status: string;
  /** Teks sumber untuk menjawab (dialog/passage/script/intro+sections). */
  context: string;
  questions: AuditQuestion[];
}

export interface AuditQuestionResult extends AuditQuestion {
  /** Jawaban yang dinilai AI (0-3). null jika AI tidak menjawab soal ini. */
  correctAnswerIndex: number | null;
  /** true jika jawaban tersimpan salah (beda dengan hasil AI). */
  isWrong: boolean;
}

export interface AuditUnitResult {
  unit: AuditUnit;
  /** Hasil per soal, urut sesuai questions. */
  results: AuditQuestionResult[];
  wrongCount: number;
  /** Pesan error bila verifikasi unit ini gagal total. */
  error?: string;
}

const MAX_CONTEXT_CHARS = 9000;

function buildPrompt(context: string, questions: AuditQuestion[]): string {
  const lines: string[] = [
    `You are a careful English exam verifier. Determine the CORRECT answer for each multiple-choice question below.`,
    ``,
  ];

  if (context.trim()) {
    lines.push(
      `SOURCE TEXT (answer based ONLY on this text):`,
      context.trim().slice(0, MAX_CONTEXT_CHARS),
      ``,
    );
  } else {
    lines.push(
      `No source text is provided — answer based on general English knowledge.`,
      ``,
    );
  }

  lines.push(`QUESTIONS:`);
  questions.forEach((q, i) => {
    lines.push(`Question ${i}: ${q.question}`);
    q.options.forEach((opt, oi) => {
      lines.push(`  ${String.fromCharCode(65 + oi)}. ${opt}`);
    });
    lines.push(``);
  });

  lines.push(
    `TASK: For each question, choose the correct option.`,
    `Return ONLY valid JSON (no markdown, no text):`,
    `[ { "index": 0, "answer": <0-3> }, { "index": 1, "answer": <0-3> }, ... ]`,
    `Where "index" is the question number and "answer" is 0=A, 1=B, 2=C, 3=D.`,
    `Answer every question.`,
  );

  return lines.join("\n");
}

function repairPrompt(
  context: string,
  questions: AuditQuestion[],
  rawOutput: string,
  problem: string,
): string {
  return `${buildPrompt(context, questions)}

Your previous output was invalid:
${problem}

Previous output:
${rawOutput.slice(0, 4000)}

Return ONLY valid JSON array as described.`;
}

interface VerificationRow {
  index?: unknown;
  answer?: unknown;
}

const MAX_ATTEMPTS = 3;

/**
 * Verifikasi semua soal dalam satu unit konten (satu panggilan AI).
 * Setiap jawaban yang dianggap salah (hasil AI berbeda dari stored) akan
 * dicatat di `results` dengan `isWrong: true`.
 */
export async function verifyAuditUnit(
  unit: AuditUnit,
): Promise<AuditUnitResult> {
  const results: AuditQuestionResult[] = unit.questions.map((q) => ({
    ...q,
    correctAnswerIndex: null,
    isWrong: false,
  }));

  if (unit.questions.length === 0) {
    return { unit, results, wrongCount: 0 };
  }

  let rawOutput = "";
  let lastProblem = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const messages: AiMessage[] = [
        {
          role: "system",
          content:
            "You verify English multiple-choice answer keys. Output JSON only.",
        },
        {
          role: "user",
          content:
            attempt === 0
              ? buildPrompt(unit.context, unit.questions)
              : repairPrompt(unit.context, unit.questions, rawOutput, lastProblem),
        },
      ];

      const result = await generateWithFallback(messages, {
        maxTokens: 2000,
      });
      rawOutput = result.content;

      // Jika output berisi pesan error AI tidak dikonfigurasi, jangan retry berulang.
      if (/belum ada api key/i.test(result.content) && attempt === 0) {
        throw new Error(result.content);
      }

      const parsed = parseJson<VerificationRow[]>(result.content);
      if (!Array.isArray(parsed)) {
        throw new Error("Respons bukan array.");
      }

      // Petakan index → answer
      const byIndex = new Map<number, number>();
      for (const row of parsed) {
        const idx = Number(row.index);
        const ans = Number(row.answer);
        if (Number.isInteger(idx) && Number.isInteger(ans) && ans >= 0 && ans <= 3) {
          byIndex.set(idx, ans);
        }
      }

      // Jika ada soal yang tidak dijawab AI → anggap gagal, minta ulang
      const unanswered = unit.questions
        .map((_, i) => i)
        .filter((i) => !byIndex.has(i));
      if (unanswered.length > 0) {
        lastProblem = `Belum menjawab soal indeks: ${unanswered.join(", ")}. Jawab SEMUA soal.`;
        continue;
      }

      results.forEach((r, i) => {
        const correct = byIndex.get(i);
        r.correctAnswerIndex = typeof correct === "number" ? correct : null;
        r.isWrong = r.correctAnswerIndex !== null && r.correctAnswerIndex !== r.storedAnswerIndex;
      });

      return { unit, results, wrongCount: results.filter((r) => r.isWrong).length };
    } catch (err) {
      lastProblem = (err as Error).message;
    }
  }

  return {
    unit,
    results,
    wrongCount: results.filter((r) => r.isWrong).length,
    error: lastProblem || "Gagal memverifikasi unit ini.",
  };
}