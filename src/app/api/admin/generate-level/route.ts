import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { buildLessonPrompt } from "@/lib/ai/prompts";
import { parseJson } from "@/lib/ai/parse";
import { validateLessonDraft, validateLessonGames, type LessonDraft } from "@/lib/ai/validate";
import { getCurriculumForLevel } from "@/lib/curriculum";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";
import type { CefrLevel } from "@/lib/types";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  // Rate limit ketat: generate level memicu banyak panggilan AI
  const limited = await rateLimit(`gen-level:${clientIp(request)}`, { limit: 5, window: "60 s" });
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
  const level = String(body.level ?? "").toUpperCase() as CefrLevel;

  if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(level)) {
    return NextResponse.json({ error: "Level tidak valid." }, { status: 400 });
  }

  const topics = getCurriculumForLevel(level);
  const results: { topic: string; ok: boolean; error?: string }[] = [];

  for (const item of topics) {
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
              level: item.level,
              category: item.category,
              topic: item.topic,
            }),
          },
        ],
        { maxTokens: 6000 },
      );

      const draft = parseJson<LessonDraft>(result.content);
      const problems = validateLessonDraft(draft);
      if (problems.length > 0) {
        throw new Error(problems.slice(0, 5).join(" "));
      }

      const games = Array.isArray(draft.games) && draft.games.length > 0 ? draft.games : [];
      const gamesProblems = validateLessonGames(games);
      if (gamesProblems.length > 0) {
        throw new Error(`Games tidak valid: ${gamesProblems.slice(0, 3).join(" | ")}`);
      }

      const slugBase = `${item.level}-${item.category}-${item.topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40)}`;
      const slug = `${slugBase}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

      // Pakai RPC security definer agar tidak terhalang RLS (admin_create_lesson)
      const { data: lessonId, error: insertError } = await supabase.rpc(
        "admin_create_lesson",
        {
          p_level_code: item.level,
          p_category: item.category,
          p_title: draft.topic,
          p_slug: slug,
          p_intro: draft.intro,
          p_sections: draft.sections,
          p_quiz: draft.quiz,
          p_games: games,
          p_is_free: Boolean(item.isFree),
        },
      );

      if (insertError) throw insertError;

      await logAiUsage({ result, purpose: "lesson", lessonId });
      results.push({ topic: item.topic, ok: true });
    } catch (err) {
      results.push({ topic: item.topic, ok: false, error: (err as Error).message });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return NextResponse.json({
    total: topics.length,
    succeeded,
    failed: failed.length,
    details: results,
  });
}
