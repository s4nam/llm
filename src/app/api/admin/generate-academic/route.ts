import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { promptForSection } from "@/lib/ai/prompts-academic";
import { parseJson } from "@/lib/ai/parse";
import { validateAcademicContent } from "@/lib/ai/validate-academic";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";
import type { AcademicSection } from "@/lib/types-academic";

const SECTIONS: AcademicSection[] = ["reading", "listening", "writing", "speaking"];

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 500 },
    );
  }

  // Rate limit ketat: mencegah biaya AI terbakar
  const limited = await rateLimit(`gen-academic:${clientIp(request)}`, { limit: 10, window: "60 s" });
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
  const section = String(body.section ?? "").trim() as AcademicSection;
  const topic = String(body.topic ?? "").trim();
  const isFree = Boolean(body.isFree);

  if (!SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Section tidak valid." }, { status: 400 });
  }
  if (topic.length < 3) {
    return NextResponse.json(
      { error: "Topik minimal 3 karakter." },
      { status: 400 },
    );
  }

  try {
    const result = await generateWithFallback(
      [
        {
          role: "system",
          content: "You produce structured JSON academic practice content. Output JSON only.",
        },
        { role: "user", content: promptForSection(section, topic) },
      ],
      { maxTokens: 3000 },
    );

    const content = parseJson<Record<string, unknown>>(result.content);

    // Validasi struktur spesifik section
    const problems = validateAcademicContent(section, content as never);
    if (problems.length > 0) {
      throw new Error(problems.slice(0, 5).join(" "));
    }

    const slugBase = `${section}-${topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)}`;
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    const { data: setId, error: insertError } = await supabase.rpc(
      "admin_create_toefl_set",
      {
        p_section: section,
        p_title: topic,
        p_slug: slug,
        p_content: content,
        p_is_free: isFree,
      },
    );

    if (insertError || !setId) {
      throw new Error(insertError?.message ?? "Gagal menyimpan set.");
    }

    await logAiUsage({ result, purpose: "academic", lessonId: null });

    return NextResponse.json({ setId, slug });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}