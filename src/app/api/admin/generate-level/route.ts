import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { buildLessonPrompt } from "@/lib/ai/prompts";
import { parseJson } from "@/lib/ai/parse";
import { getCurriculumForLevel } from "@/lib/curriculum";
import type { CefrLevel } from "@/lib/types";

interface LessonDraft {
  topic: string;
  intro: string;
  sections: { heading: string; body: string }[];
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }[];
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
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await request.json();
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
        { maxTokens: 2500 },
      );

      const draft = parseJson<LessonDraft>(result.content);
      if (!Array.isArray(draft.sections) || draft.sections.length < 3) {
        throw new Error("Struktur sections tidak valid.");
      }
      if (!Array.isArray(draft.quiz) || draft.quiz.length < 5) {
        throw new Error("Struktur quiz tidak valid.");
      }

      const slugBase = `${item.level}-${item.category}-${item.topic
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40)}`;
      const slug = `${slugBase}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

      const { data: lesson, error: insertError } = await supabase
        .from("lessons")
        .insert({
          level_code: item.level,
          category: item.category,
          title: draft.topic,
          slug,
          intro: draft.intro,
          sections: draft.sections,
          quiz: draft.quiz,
          is_free: Boolean(item.isFree),
          status: "draft",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      await logAiUsage({ result, purpose: "lesson", lessonId: lesson.id });
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
