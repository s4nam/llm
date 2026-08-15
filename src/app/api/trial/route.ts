import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST() {
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

  const { data: result } = await supabase.rpc("start_trial", {
    p_user_id: user.id,
  });

  if (!result?.ok) {
    return NextResponse.json(
      { error: result?.error ?? "Trial tidak bisa dimulai." },
      { status: 400 },
    );
  }

  // Jadwalkan pengingat H-1 (via cron hourly check di route /api/cron)
  // Email pengingat dikirim otomatis oleh cron check.

  return NextResponse.json({ ok: true, ...result });
}
