import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { buildLessonPrompt } from "@/lib/ai/prompts";
import { parseJson } from "@/lib/ai/parse";
import { validateLessonDraft, validateLessonGames, type LessonDraft } from "@/lib/ai/validate";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";
import type { Category, CefrLevel } from "@/lib/types";

export async function POST(request: Request) {
  // Validasi admin
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 500 },
    );
  }

  // Rate limit ketat: mencegah biaya AI terbakar (10 generate/menit)
  const limited = await rateLimit(`gen-lesson:${clientIp(request)}`, { limit: 10, window: "60 s" });
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

  // Cek role admin via RPC
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

  // Cegah duplikat (lapis server): tolak bila topik yang sama sudah ada di
  // level + kategori yang sama, baik draft maupun published.
  try {
    const { data: existing } = await supabase.rpc("list_lessons_admin");
    const dup = (Array.isArray(existing) ? existing : []).find(
      (l) =>
        l.level_code === level &&
        l.category === category &&
        l.title.toLowerCase() === topic.toLowerCase(),
    );
    if (dup) {
      return NextResponse.json(
        {
          error: `Topik ini sudah ada di level ${level} (${category}): "${dup.title}" (${dup.status}). Generate batal untuk mencegah duplikat. Buka Daftar Materi untuk melihat/mengeditnya.`,
        },
        { status: 409 },
      );
    }
  } catch {
    // Jika cek duplikat gagal, lanjutkan — jangan blokir generate karena ini
    // hanya pengaman tambahan. Duplikasi masih dicegah di level DB (slug unik).
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
      { maxTokens: 6000 },
    );

    const draft = parseJson<LessonDraft>(result.content);

    // Validasi struktur lengkap (3 sections, 5 kuis dgn answerIndex 0-3, dsb)
    const problems = validateLessonDraft(draft);
    if (problems.length > 0) {
      throw new Error(problems.slice(0, 5).join(" "));
    }

    // Games OPSIONAL — validasi lunak: jika rusak, fallback [] (tidak menggagalkan)
    const games = Array.isArray(draft.games) && draft.games.length > 0 ? draft.games : [];
    const gamesProblems = validateLessonGames(games);
    if (gamesProblems.length > 0) {
      throw new Error(`Games tidak valid: ${gamesProblems.slice(0, 3).join(" | ")}`);
    }

    // Cek duplikat LAPIS KEDUA: judul hasil AI (draft.topic) bisa berbeda dari
    // input admin. Tolak bila judul hasil AI sudah ada di level+kategori sama.
    const aiTitle = (draft.topic ?? "").trim();
    if (aiTitle.length >= 3) {
      const { data: existingAfter } = await supabase.rpc("list_lessons_admin");
      const dupAfter = (Array.isArray(existingAfter) ? existingAfter : []).find(
        (l) =>
          l.level_code === level &&
          l.category === category &&
          l.title.toLowerCase() === aiTitle.toLowerCase(),
      );
      if (dupAfter) {
        throw new Error(
          `AI menghasilkan judul "${aiTitle}" yang sudah ada di level ${level} (${category}, ${dupAfter.status}). Generate dibatalkan untuk mencegah duplikat.`,
        );
      }
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
        p_games: games,
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
