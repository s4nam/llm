import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

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
  const levelCode = String(body.levelCode ?? "").toUpperCase();
  if (!["A1", "A2", "B1", "B2", "C1", "C2"].includes(levelCode)) {
    return NextResponse.json({ error: "Level tidak valid." }, { status: 400 });
  }

  // Ambil semua pelajaran published di level ini
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("level_code", levelCode)
    .eq("status", "published");

  if (!lessons || lessons.length === 0) {
    return NextResponse.json({ error: "Level belum punya pelajaran." }, { status: 400 });
  }

  const lessonIds = lessons.map((l) => l.id);

  // Ambil progress user untuk level ini
  const { data: progress } = await supabase
    .from("user_progress")
    .select("lesson_id, best_score")
    .eq("user_id", user.id)
    .in("lesson_id", lessonIds);

  const byLesson = new Map(
    (progress ?? []).map((p) => [p.lesson_id, p.best_score]),
  );

  // Syarat sertifikat: SEMUA pelajaran tuntas dengan min skor 60
  const allPassed = lessonIds.every(
    (id) => (byLesson.get(id) ?? 0) >= 60,
  );

  if (!allPassed) {
    return NextResponse.json({
      eligible: false,
      total: lessonIds.length,
      completed: lessonIds.filter((id) => (byLesson.get(id) ?? 0) >= 60).length,
    });
  }

  // Buat sertifikat (idempoten — mengembalikan kode lama jika sudah ada)
  const { data: code } = await supabase.rpc("create_certificate", {
    p_user_id: user.id,
    p_level_code: levelCode,
  });

  if (!code) {
    return NextResponse.json({ error: "Gagal membuat sertifikat." }, { status: 500 });
  }

  return NextResponse.json({ eligible: true, code });
}
