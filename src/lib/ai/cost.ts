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
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash (gratis/murah)", inputPer1M: 0.075, outputPer1M: 0.3 },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (kualitas)", inputPer1M: 1.25, outputPer1M: 5 },
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
