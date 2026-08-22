import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateAcademicSet } from "@/lib/ai/generate-academic";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";
import { debugLog } from "@/lib/debug-log";
import type { AcademicSection } from "@/lib/types-academic";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 500 },
    );
  }

  const limited = await rateLimit(`academic-actions:${clientIp(request)}`, { limit: 10, window: "60 s" });
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
    return NextResponse.json({ error: "ID set diperlukan." }, { status: 400 });
  }

  // Ambil set via RPC admin (dapat mengakses draft yang diblokir RLS)
  const { data: setData, error: fetchError } = await supabase.rpc(
    "get_toefl_set_admin",
    { p_set_id: id },
  );
  const setRow = Array.isArray(setData) ? setData[0] : setData;
  if (fetchError || !setRow) {
    return NextResponse.json({ error: "Set tidak ditemukan." }, { status: 404 });
  }

  if (action === "approve") {
    const { error } = await supabase.rpc("approve_toefl_set", { p_set_id: id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "reject") {
    const { error } = await supabase.rpc("delete_toefl_set", { p_set_id: id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "regenerate") {
    try {
      const section = setRow.section as AcademicSection;
      debugLog("regenerate-start", section, String(setRow.title));
      // Pakai generator yang sama dengan "generate" (bertahap untuk
      // reading/listening) agar hasil selalu lengkap & valid.
      const content = await generateAcademicSet(section, setRow.title);
      const { error } = await supabase.rpc("admin_update_toefl_set", {
        p_set_id: id,
        p_content: content,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      debugLog("regenerate-ok", section, id);
      return NextResponse.json({ ok: true });
    } catch (err) {
      debugLog("regenerate-error", String(setRow.title), (err as Error).message);
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}