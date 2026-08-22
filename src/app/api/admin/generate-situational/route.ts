import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateSituationalSet } from "@/lib/ai/generate-situational";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";
import { debugLog } from "@/lib/debug-log";
import { SITUATIONAL_TOPICS, type SituationalTopicId } from "@/lib/types-situational";

const TOPIC_IDS = SITUATIONAL_TOPICS.map((t) => t.id);

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 500 },
    );
  }

  // Rate limit ketat: mencegah biaya AI terbakar
  const limited = await rateLimit(`gen-situational:${clientIp(request)}`, { limit: 10, window: "60 s" });
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
  const topic = String(body.topic ?? "").trim() as SituationalTopicId;
  const title = String(body.title ?? "").trim();
  const isFree = Boolean(body.isFree);

  if (!TOPIC_IDS.includes(topic)) {
    return NextResponse.json({ error: "Topik tidak valid." }, { status: 400 });
  }
  if (title.length < 3) {
    return NextResponse.json(
      { error: "Judul minimal 3 karakter." },
      { status: 400 },
    );
  }

  try {
    debugLog("situational-generate-start", topic, title);
    const content = await generateSituationalSet(topic, title);

    const slugBase = `${topic}-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)}`;
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    const { data: setId, error: insertError } = await supabase.rpc(
      "admin_create_situational_set",
      {
        p_topic: topic,
        p_title: title,
        p_slug: slug,
        p_content: content,
        p_is_free: isFree,
      },
    );

    if (insertError || !setId) {
      throw new Error(insertError?.message ?? "Gagal menyimpan set.");
    }

    debugLog("situational-generate-ok", topic, title, String(setId));
    return NextResponse.json({ setId, slug });
  } catch (err) {
    debugLog("situational-generate-error", topic, title, (err as Error).message);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}