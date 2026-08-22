import {
  decryptKey,
} from "./keys";
import { callProvider, callOpenAITranscribe, type AiMessage, type AiResult, type SttResult } from "./providers";
import { estimateCostIdr, estimateSttCostIdr, PROVIDER_MODELS, type ProviderId } from "./cost";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export interface AiSettingsData {
  encryptedKeys: Record<string, string>;
  defaultProvider: ProviderId;
  defaultModel: string;
  budgetAlarmIdr: number;
}

const DEFAULT_SETTINGS: AiSettingsData = {
  encryptedKeys: {},
  defaultProvider: "openai",
  defaultModel: "gpt-4o-mini",
  budgetAlarmIdr: 0,
};

/**
 * Ambil pengaturan AI dari database (ai_settings, single row id=1).
 * Jika Supabase belum dikonfigurasi atau tabel belum ada, pakai default.
 */
export async function getAiSettings(): Promise<AiSettingsData> {
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;

  try {
    const supabase = await createClient();
    if (!supabase) return DEFAULT_SETTINGS;

    // Baca lewat RPC get_ai_settings (security definer, admin-only).
    const { data, error } = await supabase.rpc("get_ai_settings");

    if (error || !data) return DEFAULT_SETTINGS;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return DEFAULT_SETTINGS;

    return {
      encryptedKeys: JSON.parse(row.encrypted_keys ?? "{}"),
      defaultProvider: (row.default_provider as ProviderId) ?? "openai",
      defaultModel: row.default_model ?? "gpt-4o-mini",
      budgetAlarmIdr: row.budget_alarm_idr ?? 0,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function getDecryptedKeys(settings: AiSettingsData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [provider, encrypted] of Object.entries(settings.encryptedKeys)) {
    if (encrypted) {
      try {
        out[provider] = decryptKey(encrypted);
      } catch {
        // kunci rusak — abaikan
      }
    }
  }
  return out;
}

export function getModelsFor(provider: ProviderId) {
  return PROVIDER_MODELS[provider] ?? [];
}

/**
 * Coba panggil AI dengan fallback:
 * 1. Provider default & model default
 * 2. Provider lain (dalam urutan preferensi) dengan model default masing-masing
 * Jika semua gagal, lempar error yang menjelaskan.
 */
export async function generateWithFallback(
  messages: AiMessage[],
  opts?: { provider?: ProviderId; model?: string; maxTokens?: number },
): Promise<AiResult> {
  const settings = await getAiSettings();
  const keys = getDecryptedKeys(settings);

  const preferred: ProviderId[] = ["openai", "gemini", "claude"];
  const requestedProvider = opts?.provider ?? settings.defaultProvider;

  // Urutkan: provider yang diminta dulu, sisanya mengikuti preferensi
  const order: ProviderId[] = [
    requestedProvider,
    ...preferred.filter((p) => p !== requestedProvider),
  ];

  let lastError: Error | null = null;

  for (const provider of order) {
    const apiKey = keys[provider];
    if (!apiKey) continue;

    // Model default per provider (jika model saat ini tidak cocok dengan provider)
    const defaultModelFor: Record<string, string> = {
      openai: "gpt-4o-mini",
      gemini: "gemini-3.5-flash",
      claude: "claude-3-5-haiku",
    };
    const requestedModel = opts?.model;
    const defaultModel =
      settings.defaultModel in (PROVIDER_MODELS[provider]?.map((m) => m.id) ?? [])
        ? settings.defaultModel
        : (defaultModelFor[provider] ?? settings.defaultModel);
    const model =
      provider === requestedProvider && requestedModel
        ? requestedModel
        : defaultModel;

    // Daftar model yang dicoba untuk provider ini:
    // model yang diminta/default dulu, lalu model lain di provider yang sama.
    const providerModels = (PROVIDER_MODELS[provider] ?? []).map((m) => m.id);
    const candidates = [
      model,
      ...providerModels.filter((m) => m !== model),
      ...Object.values(defaultModelFor).filter((m) => m !== model && !providerModels.includes(m)),
    ];
    // de-duplikasi
    const uniqueCandidates = [...new Set(candidates)];

    for (const candidateModel of uniqueCandidates) {
      try {
        return await callProvider(
          provider,
          apiKey,
          candidateModel,
          messages,
          opts?.maxTokens ?? 2000,
        );
      } catch (err) {
        lastError = err as Error;
        // lanjut ke model berikutnya di provider yang sama
      }
    }
  }

  throw new Error(
    lastError
      ? `Semua provider AI gagal. Terakhir: ${lastError.message}`
      : "Belum ada API key AI yang dikonfigurasi. Atur di menu Admin → Pengaturan AI.",
  );
}

/**
 * Transkripsi audio via OpenAI STT.
 * STT saat ini hanya didukung OpenAI (model termurah & terintegrasi dengan key
 * yang sudah dikonfigurasi). Jika key OpenAI kosong, lempar error jelas.
 */
export async function transcribeWithFallback(
  audioBuffer: Buffer,
  filename: string,
  opts?: { model?: string; durationSeconds?: number },
): Promise<SttResult> {
  const settings = await getAiSettings();
  const keys = getDecryptedKeys(settings);
  const apiKey = keys.openai;

  if (!apiKey) {
    throw new Error(
      "Fitur ucapan butuh API key OpenAI. Atur di menu Admin → Pengaturan AI.",
    );
  }

  try {
    return await callOpenAITranscribe(apiKey, audioBuffer, filename, {
      model: opts?.model,
      durationSeconds: opts?.durationSeconds,
    });
  } catch (err) {
    throw new Error(
      `Transkripsi gagal. ${(err as Error).message}`,
    );
  }
}

/**
 * Catat pemakaian STT ke ai_usage_log (via RPC) untuk monitoring biaya.
 * Best-effort: jika gagal, tidak menghentikan alur utama.
 */
export async function logSttUsage(params: {
  result: SttResult;
  purpose: string;
  lessonId?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    if (!supabase) return;
    const cost = estimateSttCostIdr(params.result.durationSeconds);
    await supabase.rpc("log_ai_usage", {
      p_provider: params.result.provider,
      p_model: params.result.model,
      p_purpose: params.purpose,
      p_prompt_tokens: 0,
      p_completion_tokens: 0,
      p_estimated_cost_idr: cost,
      p_lesson_id: params.lessonId ?? null,
    });
  } catch {
    // abaikan
  }
}

/**
 * Catat pemakaian token ke ai_usage_log (via RPC) untuk monitoring biaya.
 * Best-effort: jika gagal, tidak menghentikan alur utama.
 */
export async function logAiUsage(params: {
  result: AiResult;
  purpose: string;
  lessonId?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createClient();
    if (!supabase) return;
    const cost = estimateCostIdr(
      params.result.provider,
      params.result.model,
      params.result.promptTokens,
      params.result.completionTokens,
    );
    await supabase.rpc("log_ai_usage", {
      p_provider: params.result.provider,
      p_model: params.result.model,
      p_purpose: params.purpose,
      p_prompt_tokens: params.result.promptTokens,
      p_completion_tokens: params.result.completionTokens,
      p_estimated_cost_idr: cost,
      p_lesson_id: params.lessonId ?? null,
    });
  } catch {
    // abaikan
  }
}
