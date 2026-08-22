import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";
import { generateWithFallback, logAiUsage } from "@/lib/ai";

/**
 * API Study Sets (Vocabulary Coach).
 * Semua akses memakai RLS (pemilik / publik login-only). Tanpa AI per akses.
 * Practice dijalankan client-side: client ambil items via GET lalu menilai sendiri.
 *
 * GET  /api/study-sets                 → daftar set (milik saya + publik) + is_owner + item_count
 * GET  /api/study-sets?id=<setId>      → set + items-nya (RLS)
 * POST /api/study-sets
 *   { action: "create", title, isPublic }            → buat set baru
 *   { action: "add-item", setId, word, translation, sourceLessonId? }
 *   { action: "toggle-public", setId, isPublic }
 * PATCH /api/study-sets { action: "rename", setId, title }
 * DELETE /api/study-sets?id=<setId>
 */

const ORIGINALITY_RULE = `Translate to natural Bahasa Indonesia. Do not add quotes, explanations, or notes.`;

async function translateWord(word: string): Promise<string | null> {
  try {
    const result = await generateWithFallback(
      [
        {
          role: "system",
          content: `You translate a single English word or short phrase into natural Bahasa Indonesia.
${ORIGINALITY_RULE}
Respond ONLY with the translation (max 30 words).`,
        },
        { role: "user", content: word },
      ],
      { maxTokens: 60 },
    );
    await logAiUsage({ result, purpose: "study-set-translate", lessonId: null });
    const text = result.content.trim();
    return text.length > 0 && text.length <= 60 ? text : null;
  } catch {
    return null;
  }
}
export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const setId = url.searchParams.get("id");

  try {
    if (setId) {
      const { data: set, error: setError } = await supabase
        .from("study_sets")
        .select("id, title, is_public, user_id")
        .eq("id", setId)
        .maybeSingle();
      if (setError || !set) {
        return NextResponse.json({ error: "Set tidak ditemukan." }, { status: 404 });
      }
      const { data: items } = await supabase
        .from("study_set_items")
        .select("id, word, translation")
        .eq("set_id", setId);
      return NextResponse.json({ set, items: items ?? [], isOwner: set.user_id === user.id });
    }

    const { data: sets, error } = await supabase
      .from("study_sets")
      .select("id, title, is_public, user_id, updated_at")
      .order("updated_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Hitung jumlah kata per set (dipakai daftar)
    const { data: allItems } = await supabase
      .from("study_set_items")
      .select("set_id, id");
    const countBySet: Record<string, number> = {};
    for (const it of allItems ?? []) {
      countBySet[it.set_id] = (countBySet[it.set_id] ?? 0) + 1;
    }

    const enriched = (sets ?? []).map((s) => ({
      ...s,
      is_owner: s.user_id === user.id,
      item_count: countBySet[s.id] ?? 0,
    }));
    return NextResponse.json({ sets: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  const limited = await rateLimit(`study-sets:${clientIp(request)}`, { limit: 60, window: "60 s" });
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
  const action = String(body.action ?? "");

  try {
    if (action === "create") {
      const title = String(body.title ?? "").trim();
      const isPublic = Boolean(body.isPublic);
      if (title.length < 1 || title.length > 60) {
        return NextResponse.json({ error: "Judul 1–60 karakter." }, { status: 400 });
      }
      const { data, error } = await supabase
        .from("study_sets")
        .insert({ user_id: user.id, title, is_public: isPublic })
        .select("id, title, is_public")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ set: data });
    }

    if (action === "add-item") {
      const setId = String(body.setId ?? "");
      const word = String(body.word ?? "").trim();
      const translation = String(body.translation ?? "").trim();
      const sourceLessonId = String(body.sourceLessonId ?? "") || null;
      if (!setId) return NextResponse.json({ error: "ID set diperlukan." }, { status: 400 });
      if (word.length < 1) {
        return NextResponse.json(
          { error: "Kata tidak boleh kosong." },
          { status: 400 },
        );
      }

      // Cek duplikat kata (case-insensitive) dalam set yang sama
      const { data: dupItem } = await supabase
        .from("study_set_items")
        .select("id, translation")
        .eq("set_id", setId)
        .ilike("word", word)
        .maybeSingle();
      if (dupItem) {
        const existingTranslation = dupItem.translation?.trim() || "";
        return NextResponse.json(
          {
            error: `Kata "${word}" sudah ada di set ini.`,
            item: dupItem,
            existingTranslation,
          },
          { status: 409 },
        );
      }

      // Auto-translate bila arti kosong (best-effort; gagal → simpan kosong)
      let finalTranslation = translation;
      if (!finalTranslation) {
        finalTranslation = (await translateWord(word)) ?? "";
      }

      const { data, error } = await supabase
        .from("study_set_items")
        .insert({
          set_id: setId,
          word,
          translation: finalTranslation,
          source_lesson_id: sourceLessonId,
        })
        .select("id, word, translation")
        .single();
      // RLS menolak jika set bukan milik user
      if (error) return NextResponse.json({ error: error.message }, { status: 403 });
      return NextResponse.json({ item: data });
    }

    if (action === "toggle-public") {
      const setId = String(body.setId ?? "");
      const isPublic = Boolean(body.isPublic);
      if (!setId) return NextResponse.json({ error: "ID set diperlukan." }, { status: 400 });
      const { error } = await supabase
        .from("study_sets")
        .update({ is_public: isPublic, updated_at: new Date().toISOString() })
        .eq("id", setId);
      if (error) return NextResponse.json({ error: error.message }, { status: 403 });
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

export async function PATCH(request: Request) {
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

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const action = String(body.action ?? "");
  if (action === "rename") {
    const setId = String(body.setId ?? "");
    const title = String(body.title ?? "").trim();
    if (!setId || title.length < 1 || title.length > 60) {
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
    }
    const { error } = await supabase
      .from("study_sets")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", setId);
    if (error) return NextResponse.json({ error: error.message }, { status: 403 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}

export async function DELETE(request: Request) {
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

  const url = new URL(request.url);
  const setId = url.searchParams.get("id") ?? "";
  if (!setId) {
    return NextResponse.json({ error: "ID set diperlukan." }, { status: 400 });
  }
  const { error } = await supabase.from("study_sets").delete().eq("id", setId);
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}