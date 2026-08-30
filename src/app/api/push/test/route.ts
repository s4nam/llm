import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPushConfigured, sendPushToUser } from "@/lib/push";

// POST /api/push/test — kirim push ke diri sendiri (user login)
// Untuk test dari halaman Profil tanpa perlu admin
export async function POST() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push belum dikonfigurasi — hubungi admin (VAPID key kosong)" },
      { status: 500 }
    );
  }

  const result = await sendPushToUser(supabase, user.id, {
    title: "Test Notifikasi 🔔",
    body: "Jika kamu lihat ini, push notification sudah aktif!",
    url: "/dashboard",
    tag: "test-push",
  });

  if (result.sent === 0 && result.removed === 0) {
    return NextResponse.json({ error: "Belum ada subscription — aktifkan notifikasi dulu di browser" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...result });
}
