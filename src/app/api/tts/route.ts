import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { callOpenAITTS } from "@/lib/ai/providers";
import { getDecryptedKeys, getAiSettings } from "@/lib/ai";
import { estimateTtsCostIdr } from "@/lib/ai/cost";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";
import crypto from "crypto";

const BUCKET = "lesson-audio";

/**
 * Pre-generate audio TTS jernih (sekali, disimpan permanen).
 * HANYA untuk admin/sistem pre-generate — TIDAK pernah dipanggil dari client pelajar.
 *
 * Alur (hard rule — generate once, 0 biaya per akses pelanggan):
 * 1. Cek cache lesson_audio (hash teks) — jika ada, langsung kembalikan signed URL.
 * 2. Jika belum ada: panggil OpenAI TTS → simpan MP3 ke bucket → catat cache → log biaya.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  const limited = await rateLimit(`tts:${clientIp(request)}`, { limit: 30, window: "60 s" });
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
  const text = String(body.text ?? "").trim();
  const voice = String(body.voice ?? "alloy").trim();
  const model = String(body.model ?? "gpt-4o-mini-tts").trim();

  if (text.length < 1 || text.length > 2000) {
    return NextResponse.json(
      { error: "Teks harus 1–2000 karakter." },
      { status: 400 },
    );
  }

  try {
    const textHash = crypto.createHash("sha256").update(text).digest("hex");

    // 1) Cache check — jangan pernah generate ulang teks yang sama
    const { data: cached } = await supabase.rpc("get_lesson_audio_by_hash", {
      p_text_hash: textHash,
    });
    const cachedRow = Array.isArray(cached) ? cached[0] : cached;
    if (cachedRow?.path) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(cachedRow.path, 3600);
      return NextResponse.json({
        cached: true,
        url: signed?.signedUrl ?? null,
        path: cachedRow.path,
      });
    }

    // 2) Generate via OpenAI TTS
    const settings = await getAiSettings();
    const keys = getDecryptedKeys(settings);
    const openaiKey = keys.openai;
    if (!openaiKey) {
      return NextResponse.json(
        { error: "API key OpenAI belum dikonfigurasi di Pengaturan AI." },
        { status: 500 },
      );
    }
    const tts = await callOpenAITTS(openaiKey, text, { voice, model });

    // 3) Simpan MP3 ke bucket (path = {hash}.mp3)
    const path = `${textHash}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, tts.audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
        cacheControl: "public, max-age=31536000",
      });
    if (uploadError) {
      throw new Error(uploadError.message ?? "Gagal mengunggah audio.");
    }

    // 4) Catat cache permanen
    await supabase.rpc("save_lesson_audio", {
      p_text_hash: textHash,
      p_text_preview: text.slice(0, 100),
      p_path: path,
      p_provider: tts.provider,
      p_model: tts.model,
      p_duration_ms: null,
    });

    // 5) Log biaya (berbasis karakter — bukan token)
    const cost = estimateTtsCostIdr(tts.charCount);
    await supabase.rpc("log_ai_usage", {
      p_provider: tts.provider,
      p_model: tts.model,
      p_purpose: "tts",
      p_prompt_tokens: tts.charCount,
      p_completion_tokens: 0,
      p_estimated_cost_idr: cost,
      p_lesson_id: null,
    });

    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600);

    return NextResponse.json({
      cached: false,
      url: signed?.signedUrl ?? null,
      path,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}