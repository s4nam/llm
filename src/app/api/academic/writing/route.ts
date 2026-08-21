import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { requireAccess } from "@/lib/require-access";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";

const WRITING_QUOTA = 10; // per section per bulan

/**
 * Submit tulisan esai untuk latihan Writing akademik.
 * Body: { setId?, taskPrompt, context, userText }
 * - Cek kuota (toefl_quota) → 429 bila habis.
 * - AI menilai dengan rubrik tetap, skor 0-30.
 * - Simpan hasil ke toefl_results.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  const limited = await rateLimit(`academic-writing:${clientIp(request)}`, { limit: 20, window: "60 s" });
  if (limited) return limited;

  const guard = await requireAccess();
  if (!guard) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }
  if (!guard.hasAccess) {
    return NextResponse.json(
      { error: "Latihan ini untuk member. Silakan langganan." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const setId = String(body.setId ?? "") || null;
  const taskPrompt = String(body.taskPrompt ?? "").trim().slice(0, 2000);
  const context = String(body.context ?? "").trim().slice(0, 2000);
  const userText = String(body.userText ?? "").trim();

  if (!taskPrompt) {
    return NextResponse.json({ error: "Tugas menulis tidak ditemukan." }, { status: 400 });
  }
  if (userText.length < 10) {
    return NextResponse.json(
      { error: "Tulisan minimal 10 karakter." },
      { status: 400 },
    );
  }

  // Cek kuota section bulan ini
  const { data: used } = await guard.supabase.rpc("get_toefl_quota_used", {
    p_user_id: guard.userId,
    p_section: "writing",
  });
  if ((used ?? 0) >= WRITING_QUOTA) {
    return NextResponse.json(
      { error: `Kuota writing bulan ini sudah habis (${WRITING_QUOTA}). Lanjut bulan depan.` },
      { status: 429 },
    );
  }

  try {
    const result = await generateWithFallback(
      [
        {
          role: "system",
          content:
            "You are a TOEFL-style writing examiner. Evaluate the essay using a FIXED rubric (0-30 scale). Respond ONLY in this exact JSON (no markdown, no code fences): {\"score\": number 0-30, \"rubric\": [{\"criteria\": string, \"score\": number 0-30, \"comment\": string}], \"feedback\": string}. Always include exactly 4 criteria: Task Response, Coherence & Organization, Vocabulary, Grammar & Accuracy. Be strict and consistent: score reflects actual quality. Write 'feedback' in Bahasa Indonesia with 2 strengths and concrete corrections.",
        },
        {
          role: "user",
          content: `Writing task:\n${taskPrompt}\n${context ? "Context:\n" + context : ""}\n\nStudent's essay:\n${userText}`,
        },
      ],
      { maxTokens: 900 },
    );

    let score: number | null = null;
    let rubric: { criteria: string; score: number; comment: string }[] = [];
    let feedback = result.content;
    try {
      const parsed = JSON.parse(result.content);
      if (typeof parsed.score === "number") score = Math.min(30, Math.max(0, parsed.score));
      if (Array.isArray(parsed.rubric)) rubric = parsed.rubric;
      if (typeof parsed.feedback === "string") feedback = parsed.feedback;
    } catch {
      const m = result.content.match(/(\d{1,2})\s*(?:[\/]|dari\s*)?30/i);
      score = m ? Math.min(30, Math.max(0, Number(m[1]))) : null;
    }

    // Simpan hasil
    await guard.supabase.from("toefl_results").insert({
      user_id: guard.userId,
      section: "writing",
      set_id: setId,
      score: score ?? 0,
      max_score: 30,
      detail: { rubric, feedback, userText: userText.slice(0, 500) },
    });

    // Bump kuota + log AI
    await guard.supabase.rpc("bump_toefl_quota", {
      p_user_id: guard.userId,
      p_section: "writing",
    });
    await logAiUsage({ result, purpose: "academic-writing", lessonId: null });

    return NextResponse.json({ score, rubric, feedback, used: (used ?? 0) + 1, limit: WRITING_QUOTA });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
