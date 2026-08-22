import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { buildLessonPrompt } from "@/lib/ai/prompts";
import { parseJson } from "@/lib/ai/parse";
import { validateLessonDraft, validateLessonGames } from "@/lib/ai/validate";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 500 },
    );
  }

  // Rate limit: regenerate memakai AI
  const limited = await rateLimit(`lesson-actions:${clientIp(request)}`, { limit: 10, window: "60 s" });
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
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const id = String(body.id ?? "");
  const action = String(body.action ?? ""); // 'approve' | 'reject' | 'regenerate'

  if (!id) {
    return NextResponse.json({ error: "ID pelajaran diperlukan." }, { status: 400 });
  }

  // Ambil pelajaran via RPC admin (dapat mengakses draft yang diblokir RLS)
  const { data: lesson, error: fetchError } = await supabase.rpc(
    "get_lesson_admin",
    { p_lesson_id: id },
  );
  const lessonRow = Array.isArray(lesson) ? lesson[0] : lesson;
  if (fetchError || !lessonRow) {
    return NextResponse.json({ error: "Pelajaran tidak ditemukan." }, { status: 404 });
  }
  if (action === "approve") {
    const { error } = await supabase.rpc("approve_lesson", {
      p_lesson_id: id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    revalidateTag("lessons-public", "max");
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const { error } = await supabase.rpc("delete_lesson", { p_lesson_id: id });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    revalidateTag("lessons-public", "max");
    return NextResponse.json({ ok: true });
  }

  if (action === "regenerate") {
    try {
      const result = await generateWithFallback(
        [
          {
            role: "system",
            content: "You produce structured JSON course content. Output JSON only.",
          },
          {
            role: "user",
            content: buildLessonPrompt({
              level: lessonRow.level_code,
              category: lessonRow.category,
              topic: lessonRow.title,
            }),
          },
        ],
        { maxTokens: 6000 },
      );

      const draft = parseJson<{
        intro: string;
        sections: { heading: string; body: string }[];
        quiz: {
          question: string;
          options: string[];
          answerIndex: number;
          explanation: string;
        }[];
        games?: unknown[];
      }>(result.content);

      // Validasi kuis (gagal = seluruh regenerate ditolak)
      const problems = validateLessonDraft(draft as Parameters<typeof validateLessonDraft>[0]);
      if (problems.length > 0) {
        return NextResponse.json(
          { error: problems.slice(0, 5).join(" ") },
          { status: 500 },
        );
      }

      // Games opsional — jika rusak, fallback []
      const games = Array.isArray(draft.games) && draft.games.length > 0 ? draft.games : [];
      const gamesProblems = validateLessonGames(games);
      if (gamesProblems.length > 0) {
        return NextResponse.json(
          { error: `Games tidak valid: ${gamesProblems.slice(0, 3).join(" | ")}` },
          { status: 500 },
        );
      }

      const { error } = await supabase.rpc("regenerate_lesson", {
        p_lesson_id: id,
        p_intro: draft.intro,
        p_sections: draft.sections,
        p_quiz: draft.quiz,
        p_games: games,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await logAiUsage({ result, purpose: "lesson", lessonId: id });

      return NextResponse.json({ ok: true });
    } catch (err) {
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}
