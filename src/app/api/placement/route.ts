import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";
import {
  SEED_PLACEMENT_QUESTIONS,
  stripAnswers,
  scoreAnswers,
} from "@/lib/placement-seed";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }
  const limited = await rateLimit(`placement-get:${clientIp(request)}`, { limit: 60, window: "60 s" });
  if (limited) return limited;
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Layanan belum siap." }, { status: 500 });
  }

  // Soal dari DB (tanpa jawaban) via RPC security definer
  const { data } = await supabase.rpc("get_placement_questions");
  const fromDb = Array.isArray(data) && data.length > 0 ? data : null;

  if (fromDb) {
    return NextResponse.json({ questions: fromDb, source: "ai" });
  }

  // Fallback: soal bawaan agar halaman tetap berfungsi tanpa AI
  return NextResponse.json({
    questions: stripAnswers(SEED_PLACEMENT_QUESTIONS),
    source: "seed",
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  // Rate limit submit placement (mencegah spam skor)
  const limited = await rateLimit(`placement:${clientIp(request)}`, { limit: 20, window: "60 s" });
  if (limited) return limited;

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Layanan belum siap." }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const answers = body.answers as number[];
  if (!Array.isArray(answers)) {
    return NextResponse.json({ error: "Jawaban tidak valid." }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) Coba nilai di DB via RPC (hanya jika soal tersedia di DB)
  try {
    const { data: result } = await supabase.rpc("submit_placement", {
      p_user_id: user?.id ?? null,
      p_answers: answers,
    });
    if (result) {
      return NextResponse.json({
        score: result.score,
        total: result.total,
        recommendedLevel: result.recommended_level,
        saved: result.saved,
      });
    }
  } catch {
    // tabel kosong → lanjut ke fallback seed
  }

  // 2) Fallback: nilai via soal bawaan
  if (answers.length !== SEED_PLACEMENT_QUESTIONS.length) {
    return NextResponse.json(
      { error: "Jumlah jawaban tidak sesuai." },
      { status: 400 },
    );
  }
  const scored = scoreAnswers(SEED_PLACEMENT_QUESTIONS, answers);

  let saved = false;
  if (user) {
    const { error } = await supabase.from("placement_results").insert({
      user_id: user.id,
      score: scored.score,
      total: scored.total,
      recommended_level: scored.recommendedLevel,
    });
    saved = !error;
  }

  return NextResponse.json({
    score: scored.score,
    total: scored.total,
    recommendedLevel: scored.recommendedLevel,
    saved,
  });
}
