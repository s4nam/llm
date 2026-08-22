export type ProviderId = "openai" | "gemini" | "claude";

/**
 * Estimasi biaya per 1 juta token (USD) — diperbarui dari harga publik.
 * Berguna untuk estimasi & monitoring. Nilai bisa dirapikan kapan saja.
 */
export const PROVIDER_MODELS: Record<
  ProviderId,
  { id: string; label: string; inputPer1M: number; outputPer1M: number }[]
> = {
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini (hemat)", inputPer1M: 0.15, outputPer1M: 0.6 },
    { id: "gpt-4o", label: "GPT-4o (kualitas)", inputPer1M: 2.5, outputPer1M: 10 },
  ],
  gemini: [
    { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash (rekomendasi)", inputPer1M: 0.2, outputPer1M: 0.8 },
    { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite (hemat)", inputPer1M: 0.075, outputPer1M: 0.3 },
    { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", inputPer1M: 0.15, outputPer1M: 0.6 },
  ],
  claude: [
    { id: "claude-3-5-haiku", label: "Claude 3.5 Haiku (hemat)", inputPer1M: 1, outputPer1M: 5 },
    { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet (kualitas)", inputPer1M: 3, outputPer1M: 15 },
  ],
};

const USD_TO_IDR = 16500;

export function estimateCostIdr(
  provider: ProviderId,
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const modelList = PROVIDER_MODELS[provider] ?? [];
  const m = modelList.find((x) => x.id === model) ?? modelList[0];
  if (!m) return 0;
  const usd =
    (promptTokens / 1_000_000) * m.inputPer1M +
    (completionTokens / 1_000_000) * m.outputPer1M;
  return usd * USD_TO_IDR;
}

/**
 * Estimasi biaya TTS (per karakter). OpenAI gpt-4o-mini-tts ~ $15/1M karakter.
 * Bisa disesuaikan bila model/penyedia TTS berubah.
 */
export function estimateTtsCostIdr(charCount: number): number {
  const USD_PER_1M_CHARS = 15;
  return (charCount / 1_000_000) * USD_PER_1M_CHARS * USD_TO_IDR;
}

/**
 * Estimasi biaya STT (per menit audio). OpenAI gpt-4o-mini-transcribe
 * ~ $0.003/menit — paling murah di antara model transkripsi OpenAI.
 */
export function estimateSttCostIdr(durationSeconds: number): number {
  const USD_PER_MINUTE = 0.003;
  const minutes = Math.max(0, durationSeconds) / 60;
  return minutes * USD_PER_MINUTE * USD_TO_IDR;
}
