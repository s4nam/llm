import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { computeAccess } from "@/lib/access";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";

/** Cek apakah user punya akses ke pelajaran (member/free). */
async function hasLessonAccess(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  userId: string,
  lessonId: string,
): Promise<{ allowed: boolean; isFree: boolean; error?: string }> {
  // Ambil meta via direct query. Jika null, kemungkinan RLS memblokir
  // (pelajaran berbayar untuk non-member) atau memang tidak ada.
  const { data: lesson } = await supabase
    .from("lessons")
    .select("is_free, level_code, slug")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) {
    return { allowed: false, isFree: false, error: "Akses ditolak." };
  }

  if (lesson.is_free) return { allowed: true, isFree: true };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_member, member_expires_at, trial_expires_at")
    .eq("id", userId)
    .single();
  const access = computeAccess(profile);
  if (access.hasAccess) return { allowed: true, isFree: false };

  return {
    allowed: false,
    isFree: false,
    error: "Pelajaran ini untuk member.",
  };
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  // Rate limit per IP (submit kuis, buka pelajaran, laporan)
  const limited = await rateLimit(`lesson:${clientIp(request)}`, { limit: 120, window: "60 s" });
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

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const action = String(body.action ?? ""); // 'open' | 'submit-quiz' | 'merge' | 'report'
  const lessonId = String(body.lessonId ?? "");

  if (!lessonId) {
    return NextResponse.json({ error: "ID pelajaran diperlukan." }, { status: 400 });
  }

  try {
    if (action === "open" || action === "submit-quiz") {
      // Cek akses dulu (paywall): pelajaran berbayar hanya untuk member/trial
      const access = await hasLessonAccess(supabase, user.id, lessonId);
      if (!access.allowed) {
        return NextResponse.json(
          { error: access.error ?? "Akses ditolak." },
          { status: 403 },
        );
      }

      if (action === "open") {
        // Catat akses + bump streak (best-effort)
        await supabase.from("lesson_opens").insert({ user_id: user.id, lesson_id: lessonId });
        await supabase.rpc("bump_streak", { p_user_id: user.id });
        await supabase
          .from("user_progress")
          .upsert(
            { user_id: user.id, lesson_id: lessonId, last_opened_at: new Date().toISOString() },
            { onConflict: "user_id,lesson_id" },
          );
        return NextResponse.json({ ok: true });
      }

      const answers = body.answers as number[];

      // Ambil soal dari lesson untuk menghitung skor (member sudah lolos akses)
      const { data: lesson } = await supabase
        .from("lessons")
        .select("quiz")
        .eq("id", lessonId)
        .single();
      if (!lesson) {
        return NextResponse.json({ error: "Pelajaran tidak ditemukan." }, { status: 404 });
      }

      const quiz = lesson.quiz as { answerIndex: number }[];
      if (!Array.isArray(answers) || answers.length !== quiz.length) {
        return NextResponse.json({ error: "Jumlah jawaban tidak sesuai." }, { status: 400 });
      }

      let score = 0;
      const results = quiz.map((q, i) => {
        const correct = answers[i] === q.answerIndex;
        if (correct) score++;
        return correct;
      });
      const pct = Math.round((score / quiz.length) * 100);
      const completed = pct >= 60; // definisi "pelajaran selesai": min skor 60

      await supabase.from("user_progress").upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          completed,
          best_score: pct,
          last_opened_at: new Date().toISOString(),
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,lesson_id" },
      );

      // Bump streak juga saat selesai
      await supabase.rpc("bump_streak", { p_user_id: user.id });

      // Buka achievement baru (best-effort — deterministik dari data, tanpa AI)
      if (completed) {
        await supabase.rpc("unlock_achievements", { p_user_id: user.id });
      }

      return NextResponse.json({
        score: pct,
        completed,
        results,
      });
    }

    if (action === "merge") {
      // Gabung progress browser → akun
      const progress = body.progress as { slug: string; bestScore: number }[];
      if (!Array.isArray(progress) || progress.length === 0) {
        return NextResponse.json({ ok: true, merged: 0 });
      }
      const { error } = await supabase.rpc("merge_progress", {
        p_user_id: user.id,
        p_progress: progress,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, merged: progress.length });
    }

    if (action === "report") {
      const note = String(body.note ?? "").slice(0, 500);
      const { error } = await supabase.from("lesson_reports").insert({
        user_id: user.id,
        lesson_id: lessonId,
        note,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
