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
  const code = String(body.code ?? "").trim();

  // Bandingkan dengan kode di environment (side-channel, tidak bocor ke client)
  const expected = process.env.ADMIN_SETUP_CODE;
  if (!expected || code !== expected) {
    return NextResponse.json({ error: "Kode salah." }, { status: 403 });
  }

  const { data: promoted } = await supabase.rpc("promote_first_admin");
  if (!promoted) {
    return NextResponse.json(
      { error: "Sudah ada admin lain, atau akun ini tidak bisa dijadikan admin." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
