import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { parseYoutubeId } from "@/lib/youtube";

const BUCKET = "lesson-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];

function jsonError(msg: string, status: number) {
  return NextResponse.json({ error: msg }, { status });
}

/**
 * POST /api/admin/lesson-media
 * Body JSON untuk youtube/classic: { id, media: { type, youtube_url? } }
 * Body FormData untuk image: field `id` + `image` (File)
 * Mengupdate lessons.explanation_media via RPC admin_set_lesson_media.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return jsonError("Supabase belum dikonfigurasi.", 500);

  const limited = await rateLimit(`lesson-media:${clientIp(request)}`, { limit: 30, window: "60 s" });
  if (limited) return limited;

  const supabase = await createClient();
  if (!supabase) return jsonError("Layanan belum siap.", 500);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("Belum masuk.", 401);

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return jsonError("Tidak punya izin.", 403);

  const contentType = request.headers.get("content-type") ?? "";

  // --- FormData: upload gambar ---
  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await request.formData();
      const id = String(form.get("id") ?? "").trim();
      const file = form.get("image");

      if (!id) return jsonError("ID materi wajib.", 400);
      if (!(file instanceof File)) return jsonError("File gambar tidak ditemukan.", 400);
      if (file.size > MAX_BYTES) return jsonError("Gambar terlalu besar (maks 5MB).", 400);
      if (!ALLOWED_TYPES.includes(file.type)) return jsonError("Format gambar tidak didukung. Gunakan JPG/PNG/WEBP/GIF.", 400);
      if (file.size === 0) return jsonError("File kosong.", 400);

      // Verify lesson exists (via get_lesson_admin)
      const { data: raw, error: fetchErr } = await supabase.rpc("get_lesson_admin", { p_lesson_id: id });
      if (fetchErr) return jsonError(fetchErr.message, 500);
      const lesson = Array.isArray(raw) ? raw[0] : raw;
      if (!lesson) return jsonError("Materi tidak ditemukan.", 404);

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
      const path = `${id}/${Date.now()}.${safeExt}`;
      const bytes = new Uint8Array(await file.arrayBuffer());

      // Coba upload; jika bucket belum ada (migration belum jalan), fallback ke direct update tanpa storage
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: file.type,
        upsert: true,
        cacheControl: "3600",
      });
      if (uploadErr) {
        // Jika bucket missing, beri pesan jelas
        if (uploadErr.message?.toLowerCase().includes("bucket not found")) {
          return jsonError("Bucket lesson-images belum ada. Jalankan migration 030 di Supabase Dashboard.", 500);
        }
        return jsonError(uploadErr.message ?? "Gagal upload.", 500);
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const imageUrl = pub?.publicUrl ?? "";

      const media = {
        type: "image",
        youtube_url: null,
        image_url: imageUrl,
        image_path: path,
      };

      // Simpan via RPC; fallback direct update jika RPC belum ada
      let rpcError: unknown = null;
      const { error: rpcErr } = await supabase.rpc("admin_set_lesson_media", {
        p_lesson_id: id,
        p_media: media,
      });
      rpcError = rpcErr;
      if (rpcErr) {
        // Fallback direct (jika kolom sudah ada tapi RPC belum di-deploy)
        const { error: directErr } = await supabase
          .from("lessons")
          .update({ explanation_media: media } as never)
          .eq("id", id);
        if (directErr) return jsonError(directErr.message ?? rpcErr.message, 500);
      }

      return NextResponse.json({ media, image_url: imageUrl });
    } catch (err) {
      return jsonError((err as Error).message, 500);
    }
  }

  // --- JSON: youtube / classic / remove image ---
  try {
    const body = await request.json();
    const id = String(body.id ?? body.lessonId ?? "").trim();
    const mediaIn = body.media as { type?: string; youtube_url?: string } | undefined;

    if (!id) return jsonError("ID materi wajib.", 400);
    if (!mediaIn || !mediaIn.type) return jsonError("media.type wajib (classic|youtube|image).", 400);

    const type = String(mediaIn.type).trim();
    if (!["classic", "youtube", "image"].includes(type)) {
      return jsonError("Tipe media tidak valid.", 400);
    }

    let media: Record<string, unknown> = { type };

    if (type === "youtube") {
      const url = String(mediaIn.youtube_url ?? "").trim();
      if (!url) return jsonError("Link YouTube wajib diisi.", 400);
      const vid = parseYoutubeId(url);
      if (!vid) return jsonError("Link YouTube tidak valid. Contoh: https://www.youtube.com/watch?v=xxxxx atau https://youtu.be/xxxxx", 400);
      media = { type: "youtube", youtube_url: url, image_url: null, image_path: null };
    } else if (type === "classic") {
      media = { type: "classic", youtube_url: null, image_url: null, image_path: null };
    } else if (type === "image") {
      // Jika JSON image tanpa file → butuh image_url (misal hapus/ganti manual)
      // Khusus POST JSON image biasanya tidak dipakai; upload via FormData.
      // Tapi dukung untuk reset: jika image_url kosong → error
      return jsonError("Upload gambar harus via form-data (field image).", 400);
    }

    const { error: rpcErr } = await supabase.rpc("admin_set_lesson_media", {
      p_lesson_id: id,
      p_media: media,
    });
    if (rpcErr) {
      // Fallback direct update
      const { error: directErr } = await supabase
        .from("lessons")
        .update({ explanation_media: media } as never)
        .eq("id", id);
      if (directErr) return jsonError(directErr.message ?? rpcErr.message, 500);
    }

    return NextResponse.json({ media });
  } catch (err) {
    return jsonError((err as Error).message ?? "Gagal.", 500);
  }
}
