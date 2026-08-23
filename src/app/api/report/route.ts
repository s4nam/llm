import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";

const MODULES = new Set(["lesson", "toefl", "situational", "placement"]);

/**
 * Laporan masalah generik dari user untuk SEMUA modul.
 * module: lesson | toefl | situational | placement
 * refId  : id konten (lesson id / toefl set id / situational set id) atau "placement".
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 500 },
    );
  }

  const limited = await rateLimit(`report:${clientIp(request)}`, {
    limit: 20,
    window: "60 s",
  });
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
  const moduleName = String(body.module ?? "");
  const refId = String(body.refId ?? "").trim();
  const note = String(body.note ?? "").trim().slice(0, 500);

  // Nomor soal yang dilaporkan (1-based), opsional & boleh lebih dari 1.
  const questionIndices = Array.isArray(body.questionIndices)
    ? (body.questionIndices as unknown[])
        .map((q) => Number(q))
        .filter((n) => Number.isInteger(n) && n >= 1)
        .slice(0, 50)
    : [];

  if (!MODULES.has(moduleName)) {
    return NextResponse.json({ error: "Modul tidak dikenal." }, { status: 400 });
  }
  if (!refId) {
    return NextResponse.json({ error: "Konten tidak dikenal." }, { status: 400 });
  }
  if (!note.trim() && questionIndices.length === 0) {
    return NextResponse.json(
      { error: "Pilih soal yang bermasalah atau tuliskan catatan." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("lesson_reports").insert({
    user_id: user.id,
    module: moduleName,
    ref_id: refId,
    note,
    question_indices:
      questionIndices.length > 0 ? questionIndices : null,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}