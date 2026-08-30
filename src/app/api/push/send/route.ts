import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPushConfigured, sendPushToUser, sendPushBroadcast, type PushPayload } from "@/lib/push";

// POST /api/push/send — kirim push notification (admin only)
// Body: { title, body, url?, tag?, userId? } — jika userId kosong = broadcast ke semua subscriber
export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  // Cek admin via RPC is_admin (sudah ada sejak migration 002)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push not configured — isi NEXT_PUBLIC_VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY di .env.local" },
      { status: 500 }
    );
  }

  let body: { title?: string; body?: string; url?: string; tag?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = body?.title?.trim();
  const payloadBody = body?.body?.trim();
  if (!title || !payloadBody) return NextResponse.json({ error: "title & body wajib diisi" }, { status: 400 });

  const payload: PushPayload = {
    title,
    body: payloadBody,
    url: body.url || "/dashboard",
    tag: body.tag,
  };

  let result: { sent: number; removed: number };
  if (body.userId) {
    result = await sendPushToUser(supabase, body.userId, payload);
  } else {
    result = await sendPushBroadcast(supabase, payload);
  }

  return NextResponse.json({ ok: true, ...result });
}
