import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";

const WRITING_QUOTA = 10;

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }
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

  const body = await request.json();
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
            "You are a patient English writing tutor for Indonesian learners. Give feedback on the learner's English text. Respond in Bahasa Indonesia, friendly. Structure: 1) Skor (0-100) 2) Apa yang sudah bagus (2 points) 3) Kesalahan yang perlu diperbaiki (list, max 5) 4) Versi yang diperbaiki (corrected version) 5) Satu saran latihan.",
        },
        {
          role: "user",
          content: `Tugas menulis: "${prompt}"\n\nTulisan siswa:\n${userText}`,
        },
      ],
      { maxTokens: 800 },
    );

    // Ekstrak skor kasar dari feedback
    const scoreMatch = result.content.match(/(\d{1,3})\s*(?:[\/]|dari\s*)?100/i);
    const score = scoreMatch ? Math.min(100, Math.max(0, Number(scoreMatch[1]))) : null;

    const { error } = await supabase.from("writing_submissions").insert({
      user_id: user.id,
      lesson_id: lessonId,
      prompt,
      user_text: userText,
      feedback: result.content,
      score,
    });
    if (error) throw error;

    await logAiUsage({ result, purpose: "writing", lessonId });

    return NextResponse.json({ feedback: result.content, score });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
