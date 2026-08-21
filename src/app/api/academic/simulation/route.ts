import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { requireAccess } from "@/lib/require-access";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";
import { ACADEMIC_SEED } from "@/lib/academic-seed";
import { mapSectionsToCefr } from "@/lib/cefr-mapping";
import type { AcademicPassage, AcademicScript } from "@/lib/types-academic";

interface Answer {
  itemIndex: number;
  questionIndex: number;
  answer: number;
}

const SIM_WRITING_QUOTA = 5; // simulasi writing memakai AI: 5/bulan

/**
 * Submit simulasi penuh (4 section → skor 0-120).
 * Body: {
 *   reading: { setId?, answers: Answer[] },
 *   listening: { setId?, answers: Answer[] },
 *   writing: { taskPrompt, context, userText },
 *   speaking: { recordedCount, totalTasks },
 * }
 * - Reading & Listening: auto-score server-side (0-30).
 * - Writing: AI rubrik (0-30), memakai kuota SIM_WRITING_QUOTA.
 * - Speaking: skor partisipasi = round(recorded/total * 30), diberi catatan.
 * Total 0-120 disimpan ke toefl_results (section 'full') + mapping CEFR.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  const limited = await rateLimit(`academic-sim:${clientIp(request)}`, { limit: 10, window: "60 s" });
  if (limited) return limited;

  const guard = await requireAccess();
  if (!guard) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }
  if (!guard.hasAccess) {
    return NextResponse.json(
      { error: "Simulasi ini untuk member. Silakan langganan." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const reading = body.reading as { setId?: string; answers?: Answer[] } | null;
  const listening = body.listening as { setId?: string; answers?: Answer[] } | null;
  const writing = body.writing as
    | { taskPrompt?: string; context?: string; userText?: string }
    | null;
  const speaking = body.speaking as { recordedCount?: number; totalTasks?: number } | null;

  if (!reading || !Array.isArray(reading.answers)) {
    return NextResponse.json({ error: "Jawaban Reading tidak lengkap." }, { status: 400 });
  }
  if (!listening || !Array.isArray(listening.answers)) {
    return NextResponse.json({ error: "Jawaban Listening tidak lengkap." }, { status: 400 });
  }
  if (!writing || !writing.taskPrompt || !writing.userText || writing.userText.length < 10) {
    return NextResponse.json({ error: "Tulisan Writing tidak lengkap." }, { status: 400 });
  }

  const supabase = guard.supabase;
  const userId = guard.userId;

  async function loadItems(section: "reading" | "listening", setId?: string) {
    let items: (AcademicPassage | AcademicScript)[] = [];
    if (setId) {
      const { data } = await supabase
        .from("toefl_sets")
        .select("content")
        .eq("id", setId)
        .eq("status", "published")
        .maybeSingle();
      const content = data?.content;
      if (section === "reading") items = content?.passages ?? [];
      else items = content?.scripts ?? [];
    }
    if (items.length === 0) {
      const seed = ACADEMIC_SEED.find((s) => s.section === section);
      if (seed) {
        const c = seed.content as unknown as { passages?: AcademicPassage[]; scripts?: AcademicScript[] };
        items = section === "reading" ? (c.passages ?? []) : (c.scripts ?? []);
      }
    }
    return items;
  }

  function scoreItems(
    items: (AcademicPassage | AcademicScript)[],
    answers: Answer[],
  ) {
    type Q = { answerIndex?: number; question?: string; options?: string[]; explanation?: string };
    const allQuestions: Q[] = [];
    for (const it of items) {
      const qs = (it as { questions?: unknown[] })?.questions ?? [];
      for (const q of qs) allQuestions.push(q as Q);
    }
    let score = 0;
    const results = answers.map((a) => {
      const q = allQuestions[a.itemIndex];
      if (!q || typeof q.answerIndex !== "number") return { correct: false };
      const correct = a.answer === q.answerIndex;
      if (correct) score++;
      return { correct, answerIndex: q.answerIndex, explanation: q.explanation ?? "" };
    });
    const total = allQuestions.length;
    const scaled = total > 0 ? Math.round((score / total) * 30) : 0;
    return { score: scaled, correct: score, total, percent: total > 0 ? Math.round((score / total) * 100) : 0, results };
  }

  async function scoreWriting(taskPrompt: string, context: string, userText: string) {
    // Cek kuota writing simulasi
    const { data: used } = await supabase.rpc("get_toefl_quota_used", {
      p_user_id: userId,
      p_section: "writing",
    });
    if ((used ?? 0) >= SIM_WRITING_QUOTA) {
      return {
        score: 0,
        feedback: `Kuota writing bulan ini sudah habis (${SIM_WRITING_QUOTA}) untuk simulasi. Writing dinilai 0 pada simulasi ini.`,
        used: used ?? 0,
        limit: SIM_WRITING_QUOTA,
        quotaError: true,
      };
    }

    const result = await generateWithFallback(
      [
        {
          role: "system",
          content:
            "You are a TOEFL-style writing examiner. Evaluate the essay on a 0-30 scale. Respond ONLY in this exact JSON (no markdown): {\"score\": number 0-30, \"feedback\": string}. 'feedback' in Bahasa Indonesia, 2 strengths + concrete corrections.",
        },
        {
          role: "user",
          content: `Writing task:\n${taskPrompt}\n${context ? "Context:\n" + context : ""}\n\nStudent's essay:\n${userText}`,
        },
      ],
      { maxTokens: 700 },
    );

    let score: number | null = null;
    let feedback = result.content;
    try {
      const parsed = JSON.parse(result.content);
      if (typeof parsed.score === "number") score = Math.min(30, Math.max(0, parsed.score));
      if (typeof parsed.feedback === "string") feedback = parsed.feedback;
    } catch {
      const m = result.content.match(/(\d{1,2})\s*(?:[\/]|dari\s*)?30/i);
      score = m ? Math.min(30, Math.max(0, Number(m[1]))) : 0;
    }

    await supabase.rpc("bump_toefl_quota", { p_user_id: userId, p_section: "writing" });
    await logAiUsage({ result, purpose: "academic-writing", lessonId: null });

    return { score: score ?? 0, feedback, used: (used ?? 0) + 1, limit: SIM_WRITING_QUOTA, quotaError: false };
  }

  try {
    const [readItems, listenItems] = await Promise.all([
      loadItems("reading", reading.setId),
      loadItems("listening", listening.setId),
    ]);

    const readResult = scoreItems(readItems, reading.answers ?? []);
    const listenResult = scoreItems(listenItems, listening.answers ?? []);
    const writeResult = await scoreWriting(
      writing.taskPrompt ?? "",
      writing.context ?? "",
      writing.userText ?? "",
    );
    const recordedCount = Math.max(0, Number(speaking?.recordedCount ?? 0));
    const totalTasks = Math.max(1, Number(speaking?.totalTasks ?? 1));
    const speakScore = Math.round((recordedCount / totalTasks) * 30);

    const total = readResult.score + listenResult.score + (writeResult.score ?? 0) + speakScore; // 0-120
    const maxScore = 120;
    const cefr = mapSectionsToCefr({
      reading: readResult.score,
      listening: listenResult.score,
      writing: writeResult.score ?? 0,
      speaking: speakScore,
    });

    await supabase.from("toefl_results").insert({
      user_id: userId,
      section: "full",
      set_id: null,
      score: total,
      max_score: maxScore,
      detail: {
        reading: readResult,
        listening: listenResult,
        writing: writeResult,
        speaking: { score: speakScore, recordedCount, totalTasks },
        cefr,
      },
    });

    return NextResponse.json({
      total,
      maxScore,
      reading: readResult,
      listening: listenResult,
      writing: { score: writeResult.score ?? 0, feedback: writeResult.feedback, quotaError: writeResult.quotaError },
      speaking: { score: speakScore, recordedCount, totalTasks },
      cefr,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
