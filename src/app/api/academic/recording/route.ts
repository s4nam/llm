import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/require-access";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const BUCKET = "academic-audio";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg"];

/**
 * Upload rekaman speaking ke Supabase Storage (bucket private).
 * Memerlukan login + akses member (paywall).
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  // Rate limit: mencegah spam upload
  const limited = await rateLimit(`academic-rec:${clientIp(request)}`, { limit: 10, window: "60 s" });
  if (limited) return limited;

  const guard = await requireAccess();
  if (!guard) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }
  if (!guard.hasAccess) {
    return NextResponse.json(
      { error: "Latihan ini untuk member. Silakan langganan." },
      { status: 403 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File audio tidak ditemukan." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Audio terlalu besar (maks 5 MB)." },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format audio tidak didukung." },
        { status: 400 },
      );
    }

    const arrayBuf = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);

    const path = `speaking/${guard.userId}/${file.name}`;
    const { error: uploadError } = await guard.supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        upsert: false,
        cacheControl: "private, no-store",
      });
    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message ?? "Gagal mengunggah." },
        { status: 500 },
      );
    }

    // Signed URL (expires 1 jam) — bukan URL publik agar audio tidak bocor
    const { data: signed } = await guard.supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);
    if (!signed?.signedUrl) {
      return NextResponse.json({ error: "Gagal membuat tautan audio." }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl, path });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}