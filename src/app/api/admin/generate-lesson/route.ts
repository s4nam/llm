import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { buildLessonPrompt } from "@/lib/ai/prompts";
import { parseJson } from "@/lib/ai/parse";
import type { Category, CefrLevel } from "@/lib/types";

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
  // Validasi admin
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

  // Cek role admin via RPC
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await request.json();
  const level = body.level as CefrLevel;
  const category = body.category as Category;
  const topic = String(body.topic ?? "").trim();
  const isFree = Boolean(body.isFree);

  if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(level)) {
    return NextResponse.json({ error: "Level tidak valid." }, { status: 400 });
  }
  if (!["vocabulary", "grammar", "reading", "listening", "writing"].includes(category)) {
    return NextResponse.json({ error: "Kategori tidak valid." }, { status: 400 });
  }
  if (topic.length < 3) {
    return NextResponse.json(
      { error: "Topik minimal 3 karakter." },
      { status: 400 },
    );
  }

  try {
    const result = await generateWithFallback(
      [
        {
          role: "system",
          content: "You produce structured JSON course content. Output JSON only.",
        },
        { role: "user", content: buildLessonPrompt({ level, category, topic }) },
      ],
      { maxTokens: 2500 },
    );

    const draft = parseJson<LessonDraft>(result.content);

    // Validasi struktur dasar
    if (!Array.isArray(draft.sections) || draft.sections.length < 3) {
      throw new Error("Struktur sections tidak valid dari AI.");
    }
    if (!Array.isArray(draft.quiz) || draft.quiz.length < 5) {
      throw new Error("Struktur quiz tidak valid dari AI.");
    }

    // Simpan sebagai draft (belum publish — menunggu approval admin)
    // Pakai RPC security definer agar tidak terhalang RLS (admin_create_lesson).
    const slugBase = `${level}-${category}-${topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)}`;
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    const { data: lessonId, error: insertError } = await supabase.rpc(
      "admin_create_lesson",
      {
        p_level_code: level,
        p_category: category,
        p_title: draft.topic,
        p_slug: slug,
        p_intro: draft.intro,
        p_sections: draft.sections,
        p_quiz: draft.quiz,
        p_is_free: isFree,
      },
    );

    if (insertError || !lessonId) {
      throw new Error(insertError?.message ?? "Gagal menyimpan pelajaran.");
    }

    // Catat pemakaian token (best-effort)
    await logAiUsage({
      result,
      purpose: "lesson",
      lessonId,
    });

    return NextResponse.json({ lessonId });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
