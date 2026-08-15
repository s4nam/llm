import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const LEVEL_BY_SCORE = [
  "A1", "A1", "A1", // 0-2
  "A2", "A2", // 3-4
  "B1", "B1", // 5-6
  "B2", "B2", // 7-8
  "C1", // 9
  "C2", "C2", // 10-12
];

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

  // Ambil soal yang sudah di-cache (tanpa answerIndex — tidak boleh bocor)
  const { data, error } = await supabase.from("placement_tests").select("questions").eq("id", 1).single();
  if (error || !data) {
    return NextResponse.json(
      { error: "Soal placement belum tersedia. Hubungi admin." },
      { status: 404 },
    );
  }

  const questions = (data.questions as { question: string; options: string[]; answerIndex: number; explanation: string }[]).map(
    ({ question, options }) => ({ question, options }),
  );

  return NextResponse.json({ questions });
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
  const answers = body.answers as number[]; // index pilihan per soal

  const { data, error } = await supabase.from("placement_tests").select("questions").eq("id", 1).single();
  if (error || !data) {
    return NextResponse.json({ error: "Soal belum tersedia." }, { status: 404 });
  }

  const questions = data.questions as { answerIndex: number }[];
  if (!Array.isArray(answers) || answers.length !== questions.length) {
    return NextResponse.json({ error: "Jumlah jawaban tidak sesuai." }, { status: 400 });
  }

  let score = 0;
  const results = questions.map((q, i) => {
    const isCorrect = answers[i] === q.answerIndex;
    if (isCorrect) score++;
    return { questionIndex: i, correct: isCorrect };
  });

  const recommendedLevel =
    LEVEL_BY_SCORE[Math.min(score, LEVEL_BY_SCORE.length - 1)] ?? "A1";

  const { error: insertError } = await supabase.from("placement_results").insert({
    user_id: user.id,
    score,
    total: questions.length,
    recommended_level: recommendedLevel,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    score,
    total: questions.length,
    recommendedLevel,
    results,
  });
}
