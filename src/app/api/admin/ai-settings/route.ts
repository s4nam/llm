import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { encryptKey } from "@/lib/ai/keys";
import { callProvider } from "@/lib/ai/providers";
import { getAiSettings } from "@/lib/ai";
import type { ProviderId } from "@/lib/ai/cost";

async function requireAdmin() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return null;
  return supabase;
}

export async function GET() {
  const supabase = await requireAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const settings = await getAiSettings();
  // Jangan bocorkan key — kirim info provider mana yang sudah diisi
  const configured = Object.fromEntries(
    Object.entries(settings.encryptedKeys).map(([k, v]) => [
      k,
      Boolean(v && v.length > 0),
    ]),
  );

  return NextResponse.json({
    configured,
    defaultProvider: settings.defaultProvider,
    defaultModel: settings.defaultModel,
    budgetAlarmIdr: settings.budgetAlarmIdr,
  });
}

export async function POST(request: Request) {
  const supabase = await requireAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  const body = await request.json();
  // body.keys: { openai?: string, gemini?: string, claude?: string } — HANYA yang mau diubah
  const keys: Record<string, string> = body.keys ?? {};
  const defaultProvider = body.defaultProvider as ProviderId;
  const defaultModel = String(body.defaultModel ?? "").trim();
  const budgetAlarmIdr = Number(body.budgetAlarmIdr ?? 0);

  if (!["openai", "gemini", "claude"].includes(defaultProvider)) {
    return NextResponse.json({ error: "Provider default tidak valid." }, { status: 400 });
  }

  // Ambil settings saat ini untuk mempertahankan key lama yang tidak diisi ulang
  const current = await getAiSettings();
  const newEncrypted: Record<string, string> = { ...current.encryptedKeys };

  for (const [provider, rawKey] of Object.entries(keys)) {
    const trimmed = String(rawKey).trim();
    if (trimmed.length > 0) {
      newEncrypted[provider] = encryptKey(trimmed);
    }
  }

  const { error } = await supabase.rpc("save_ai_settings", {
    p_encrypted_keys: JSON.stringify(newEncrypted),
    p_default_provider: defaultProvider,
    p_default_model: defaultModel,
    p_budget_alarm_idr: budgetAlarmIdr,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const supabase = await requireAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  // Test koneksi: body { provider, model }
  const body = await request.json();
  const provider = body.provider as ProviderId;
  const model = String(body.model ?? "").trim();

  const settings = await getAiSettings();
  const encrypted = settings.encryptedKeys[provider];
  if (!encrypted) {
    return NextResponse.json({ error: "API key provider ini belum diisi." }, { status: 400 });
  }

  const { decryptKey } = await import("@/lib/ai/keys");
  const apiKey = decryptKey(encrypted);

  // Default model per provider (untuk test koneksi)
  const defaultModels: Record<string, string> = {
    openai: "gpt-4o-mini",
    gemini: "gemini-3-flash-preview",
    claude: "claude-3-5-haiku",
  };

  try {
    const result = await callProvider(
      provider,
      apiKey,
      model || defaultModels[provider] || "gpt-4o-mini",
      [{ role: "user", content: "Reply with the single word: OK" }],
      20,
    );
    return NextResponse.json({
      ok: true,
      reply: result.content.slice(0, 50),
      provider: result.provider,
      model: result.model,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
