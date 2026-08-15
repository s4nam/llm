import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { buildLessonPrompt } from "@/lib/ai/prompts";
import { parseJson } from "@/lib/ai/parse";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 500 },
    );
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
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const { error } = await supabase.rpc("delete_lesson", { p_lesson_id: id });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
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
        { maxTokens: 2500 },
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
      }>(result.content);

      const { error } = await supabase.rpc("regenerate_lesson", {
        p_lesson_id: id,
        p_intro: draft.intro,
        p_sections: draft.sections,
        p_quiz: draft.quiz,
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
