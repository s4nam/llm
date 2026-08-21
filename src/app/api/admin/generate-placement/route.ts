import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { buildPlacementPrompt } from "@/lib/ai/prompts";
import { parseJson } from "@/lib/ai/parse";
import { validatePlacementQuestions, type PlacementDraft } from "@/lib/ai/validate";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 500 },
    );
  }

  // Rate limit: generate placement memakai AI
  const limited = await rateLimit(`gen-placement:${clientIp(request)}`, { limit: 10, window: "60 s" });
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

  try {
    const result = await generateWithFallback(
      [
        {
          role: "system",
          content: "You produce structured JSON placement tests. Output JSON only.",
        },
        { role: "user", content: buildPlacementPrompt() },
      ],
      { maxTokens: 2500 },
    );

    const draft = parseJson<PlacementDraft>(result.content);
    const problems = validatePlacementQuestions(draft);
    if (problems.length > 0) {
      throw new Error(problems.slice(0, 5).join(" "));
    }

    const { error } = await supabase.rpc("save_placement_questions", {
      p_questions: draft.questions,
    });
    if (error) throw error;

    await logAiUsage({ result, purpose: "placement" });

    return NextResponse.json({ count: draft.questions.length });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
