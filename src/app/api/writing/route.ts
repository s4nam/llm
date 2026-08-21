import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { computeAccess } from "@/lib/access";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";

const WRITING_QUOTA = 10;

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }
  const limited = await rateLimit(`writing-get:${clientIp(request)}`, { limit: 60, window: "60 s" });
  if (limited) return limited;
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Layanan belum siap." }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  const { data: used } = await supabase.rpc("get_writing_quota_used", {
    p_user_id: user.id,
  });

  return NextResponse.json({
    used: used ?? 0,
    limit: WRITING_QUOTA,
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  // Rate limit: mencegah spam yang membakar biaya AI
  const limited = await rateLimit(`writing:${clientIp(request)}`, { limit: 20, window: "60 s" });
  if (limited) return limited;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Layanan belum siap." }, { status: 500 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const lessonId = String(body.lessonId ?? "");
  const prompt = String(body.prompt ?? "").slice(0, 500);
  const userText = String(body.userText ?? "").trim();

  if (!lessonId) {
    return NextResponse.json({ error: "ID pelajaran diperlukan." }, { status: 400 });
  }
  if (userText.length < 5) {
    return NextResponse.json(
      { error: "Tulisan minimal 5 karakter." },
      { status: 400 },
    );
  }

  // Paywall: feedback AI hanya untuk member/trial (mencegah pembakaran biaya)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_member, member_expires_at, trial_expires_at")
    .eq("id", user.id)
    .single();
  if (!computeAccess(profile).hasAccess) {
    return NextResponse.json(
      { error: "Fitur menulis tersedia untuk member. Silakan langganan." },
      { status: 403 },
    );
  }

  // Cek kuota
  const { data: used } = await supabase.rpc("get_writing_quota_used", {
    p_user_id: user.id,
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
            "You are a patient English writing tutor for Indonesian learners. Evaluate the learner's text using a FIXED rubric. Respond ONLY in this exact JSON (no markdown, no code fences): {\"score\": number 0-100, \"rubric\": [{\"criteria\": string, \"score\": number, \"comment\": string}], \"feedback\": string}. Always include exactly 4 rubric criteria: Grammar & Accuracy, Vocabulary, Coherence & Organization, Task Response. Give specific, honest scores based on the text quality. Write 'feedback' in Bahasa Indonesia, friendly, with 2 strengths and concrete corrections.",
        },
        {
          role: "user",
          content: `Tugas menulis: "${prompt}"\n\nTulisan siswa:\n${userText}`,
        },
      ],
      { maxTokens: 800 },
    );

    // Parse rubrik JSON deterministik (fallback ke skor kasar bila parse gagal)
    let rubric: { criteria: string; score: number; comment: string }[] = [];
    let parsedScore: number | null = null;
    let parsedFeedback = result.content;
    try {
      const parsed = JSON.parse(result.content);
      if (typeof parsed.score === "number") parsedScore = parsed.score;
      if (Array.isArray(parsed.rubric)) rubric = parsed.rubric;
      if (typeof parsed.feedback === "string") parsedFeedback = parsed.feedback;
    } catch {
      // bukan JSON — ekstrak skor kasar dari teks
      const scoreMatch = result.content.match(/(\d{1,3})\s*(?:[\/]|dari\s*)?100/i);
      parsedScore = scoreMatch ? Math.min(100, Math.max(0, Number(scoreMatch[1]))) : null;
    }
    const score = parsedScore;

    const { error } = await supabase.from("writing_submissions").insert({
      user_id: user.id,
      lesson_id: lessonId,
      prompt,
      user_text: userText,
      feedback: parsedFeedback,
      score,
    });
    if (error) throw error;

    await logAiUsage({ result, purpose: "writing", lessonId });

    return NextResponse.json({ feedback: parsedFeedback, score, rubric });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
