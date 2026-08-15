import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { generateWithFallback, logAiUsage } from "@/lib/ai";
import { buildPlacementPrompt } from "@/lib/ai/prompts";
import { parseJson } from "@/lib/ai/parse";

interface PlacementDraft {
  questions: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }[];
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 500 },
    );
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
    if (!Array.isArray(draft.questions) || draft.questions.length < 12) {
      throw new Error("Struktur placement test tidak valid dari AI.");
    }

    const { error } = await supabase.from("placement_tests").upsert(
      { id: 1, questions: draft.questions, generated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
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
