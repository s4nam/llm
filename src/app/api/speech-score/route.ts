import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage, logSttUsage, transcribeWithFallback } from "@/lib/ai";
import { requireAccess } from "@/lib/require-access";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const SPEAKING_QUOTA = 10; // per section per bulan (toefl_quota)
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_TARGET_LEN = 200;
const MAX_AUDIO_SECONDS = 30;

const ORIGINALITY_RULE = `CRITICAL — COPYRIGHT: Give feedback in your own words. NEVER reproduce or imitate text from
ELSA, published textbooks, paywalled materials, or any other copyrighted work. Write original, concise feedback only.`;

/**
 * Latihan "Ucapkan & Dapatkan Nilai" (Repeat After Me + skor AI).
 * Body (FormData): { audio: File, target: string, durationSeconds?: number }
 * - Cek login + akses member (paywall).
 * - Transkripsi audio via OpenAI STT (gpt-4o-mini-transcribe).
 * - AI menilai transcript vs target: skor 0-100 + kata bermasalah + 2 tips.
 * - Kuota via toefl_quota section 'speaking' (10/bulan). Audio TIDAK disimpan.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 500 });
  }

  const limited = await rateLimit(`speech-score:${clientIp(request)}`, { limit: 20, window: "60 s" });
  if (limited) return limited;

  const guard = await requireAccess();
  if (!guard) {
    return NextResponse.json({ error: "Belum masuk." }, { status: 401 });
  }
  if (!guard.hasAccess) {
    return NextResponse.json(
      { error: "Latihan ucapan untuk member. Silakan langganan." },
      { status: 403 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const file = form.get("audio");
  const targetRaw = String(form.get("target") ?? "");
  const durationRaw = Number(form.get("durationSeconds") ?? 0);
  const durationSeconds = Number.isFinite(durationRaw)
    ? Math.min(Math.max(0, durationRaw), MAX_AUDIO_SECONDS)
    : 0;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File audio tidak ditemukan." }, { status: 400 });
  }
  const target = targetRaw.trim().slice(0, MAX_TARGET_LEN);
  if (!target) {
    return NextResponse.json({ error: "Teks target tidak boleh kosong." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Audio terlalu besar (maks 5 MB)." },
      { status: 400 },
    );
  }

  // Cek kuota section bulan ini
  const { data: used } = await guard.supabase.rpc("get_toefl_quota_used", {
    p_user_id: guard.userId,
    p_section: "speaking",
  });
  if ((used ?? 0) >= SPEAKING_QUOTA) {
    return NextResponse.json(
      { error: `Kuota latihan ucapan bulan ini sudah habis (${SPEAKING_QUOTA}). Lanjut bulan depan.` },
      { status: 429 },
    );
  }

  try {
    const arrayBuf = await file.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuf);
    const filename = `speak-${guard.userId.slice(0, 8)}-${Date.now()}.webm`;

    // 1) Transkripsi
    const stt = await transcribeWithFallback(audioBuffer, filename, { durationSeconds });
    if (!stt.text.trim()) {
      return NextResponse.json(
        { error: "Audio tidak terdengar jelas. Coba rekam lebih dekat dengan mikrofon." },
        { status: 400 },
      );
    }

    // 2) Nilai: transcript vs target
    const result = await generateWithFallback(
      [
        {
          role: "system",
          content: `You are a friendly English pronunciation & fluency coach for an Indonesian learner.
${ORIGINALITY_RULE}
Compare the student's spoken transcript to the target sentence. Score pronunciation/fluency 0-100.
Respond ONLY in this exact JSON (no markdown, no code fences):
{"score": number 0-100, "highlights": [string], "tips": [string]}
- "highlights": max 3 words/phrases from the TARGET that the student mispronounced or missed (short, e.g. ["pronunciation", "schedule"]). Empty array if transcript is a close match.
- "tips": exactly 2 short tips in Bahasa Indonesia (clear, encouraging, concrete).`,
        },
        {
          role: "user",
          content: `Target: "${target}"\n\nStudent's transcript (may contain errors from speech recognition): "${stt.text}"`,
        },
      ],
      { maxTokens: 400 },
    );

    let score: number | null = null;
    let highlights: string[] = [];
    let tips: string[] = [];
    try {
      const parsed = JSON.parse(result.content);
      if (typeof parsed.score === "number") score = Math.min(100, Math.max(0, parsed.score));
      if (Array.isArray(parsed.highlights)) highlights = parsed.highlights.map(String).slice(0, 3);
      if (Array.isArray(parsed.tips)) tips = parsed.tips.map(String).slice(0, 2);
    } catch {
      const m = result.content.match(/(\d{1,3})\s*(?:[\/]|dari\s*)?100/i);
      score = m ? Math.min(100, Math.max(0, Number(m[1]))) : null;
    }
    if (score === null) score = 70;

    // 3) Kuota + log biaya (STT + LLM)
    await guard.supabase.rpc("bump_toefl_quota", {
      p_user_id: guard.userId,
      p_section: "speaking",
    });
    await logSttUsage({ result: stt, purpose: "speech-practice", lessonId: null });
    await logAiUsage({ result, purpose: "speech-practice", lessonId: null });

    return NextResponse.json({
      transcript: stt.text,
      score,
      highlights,
      tips,
      used: (used ?? 0) + 1,
      limit: SPEAKING_QUOTA,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}