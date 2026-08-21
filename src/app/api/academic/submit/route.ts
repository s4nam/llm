import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/require-access";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";
import { ACADEMIC_SEED } from "@/lib/academic-seed";
import type { AcademicSection } from "@/lib/types-academic";

interface SubmittedAnswer {
  passageIndex: number;
  questionIndex: number;
  answer: number;
}

const MAX_SCORE_BY_SECTION: Record<AcademicSection, number> = {
  reading: 30,
  listening: 30,
  writing: 30,
  speaking: 30,
};

/**
 * Submit jawaban latihan Reading/Listening.
 * Body: { section, setId?, answers: SubmittedAnswer[] }
 * Menghitung skor server-side dari konten set (tidak pernah mempercayai client),
 * menyimpan ke toefl_results, dan mengembalikan skor + pembahasan.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  const limited = await rateLimit(`academic-submit:${clientIp(request)}`, { limit: 30, window: "60 s" });
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
  const section = String(body.section ?? "") as AcademicSection;
  const setId = String(body.setId ?? "") || null;
  const answers = body.answers as SubmittedAnswer[];

  if (!["reading", "listening"].includes(section)) {
    return NextResponse.json({ error: "Section tidak valid." }, { status: 400 });
  }
  if (!Array.isArray(answers)) {
    return NextResponse.json({ error: "Jawaban tidak valid." }, { status: 400 });
  }

  // Ambil konten set: dari DB (RLS: free atau member) atau seed fallback
  let content: { passages?: unknown[]; scripts?: unknown[] } | null = null;
  let usedSeed = false;

  if (setId) {
    const { data } = await guard.supabase
      .from("toefl_sets")
      .select("content, is_free")
      .eq("id", setId)
      .eq("status", "published")
      .maybeSingle();
    if (data?.content) content = data.content;
  }

  if (!content) {
    // Fallback ke seed (berdasarkan slug dari seed)
    const seed = ACADEMIC_SEED.find((s) => s.section === section);
    if (seed) {
      content = seed.content as unknown as { passages?: unknown[]; scripts?: unknown[] };
      usedSeed = true;
    }
  }

  if (!content) {
    return NextResponse.json({ error: "Set tidak ditemukan." }, { status: 404 });
  }

  // Kumpulkan semua soal dalam urutan [item][question]
  const items = (section === "reading" ? content.passages : content.scripts) ?? [];
  type Q = { answerIndex?: number; question?: string; options?: string[]; explanation?: string };
  const allQuestions: Q[] = [];
  for (const it of items) {
    const qs = (it as { questions?: unknown[] })?.questions ?? [];
    for (const q of qs) allQuestions.push(q as Q);
  }

  let score = 0;
  const results = answers.map((a) => {
    const q = allQuestions[a.passageIndex] ?? null;
    if (!q || typeof q.answerIndex !== "number") return { correct: false };
    const correct = a.answer === q.answerIndex;
    if (correct) score++;
    return {
      correct,
      answerIndex: q.answerIndex,
      explanation: q.explanation ?? "",
    };
  });

  const total = allQuestions.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  // Skor 0-30 per section
  const scaled = total > 0 ? Math.round((score / total) * MAX_SCORE_BY_SECTION[section]) : 0;

  // Simpan hasil (best-effort)
  await guard.supabase.from("toefl_results").insert({
    user_id: guard.userId,
    section,
    set_id: usedSeed ? null : setId,
    score: scaled,
    max_score: MAX_SCORE_BY_SECTION[section],
    detail: { correct: score, total, percent: pct, results },
  });

  return NextResponse.json({
    score: scaled,
    maxScore: MAX_SCORE_BY_SECTION[section],
    correct: score,
    total,
    percent: pct,
    results,
  });
}
