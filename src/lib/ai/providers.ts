import type { ProviderId } from "./cost";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiResult {
  provider: ProviderId;
  model: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
}

export type ModelMapping = Record<ProviderId, string>;

/**
 * Batas maksimum output token per model (dari dokumentasi provider).
 * max_tokens di atas batas ini akan ditolak API, jadi kita clamp dulu.
 */
const MODEL_MAX_OUTPUT: Record<string, number> = {
  "gpt-4o-mini": 16384,
  "gpt-4o": 16384,
  "gemini-3.5-flash": 65536,
  "gemini-3.1-flash-lite": 32768,
  "gemini-3-flash-preview": 65536,
  "claude-3-5-haiku": 8192,
  "claude-3-5-sonnet": 8192,
};

function clampMaxTokens(model: string, maxTokens: number): number {
  const cap = MODEL_MAX_OUTPUT[model];
  return cap ? Math.min(maxTokens, cap) : maxTokens;
}

/**
 * Panggil satu provider AI lewat REST API (tanpa SDK).
 * Provider diwakili oleh fungsi dengan keys yang sudah didekripsi.
 */
async function callOpenAI(
  apiKey: string,
  model: string,
  messages: AiMessage[],
  maxTokens: number,
): Promise<Omit<AiResult, "provider">> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    model,
    content: data.choices?.[0]?.message?.content ?? "",
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

async function callGemini(
  apiKey: string,
  model: string,
  messages: AiMessage[],
  maxTokens: number,
): Promise<Omit<AiResult, "provider">> {
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  const userText = messages
    .filter((m) => m.role !== "system")
    .map((m) => m.content)
    .join("\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const content =
    data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
    "";
  const usage = data.usageMetadata;
  return {
    model,
    content,
    promptTokens: usage?.promptTokenCount ?? 0,
    completionTokens: usage?.candidatesTokenCount ?? 0,
  };
}

async function callClaude(
  apiKey: string,
  model: string,
  messages: AiMessage[],
  maxTokens: number,
): Promise<Omit<AiResult, "provider">> {
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  const rest = messages.filter((m) => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemText || undefined,
      messages: rest,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    model,
    content: data.content?.map((b: { text?: string }) => b.text ?? "").join("") ?? "",
    promptTokens: data.usage?.input_tokens ?? 0,
    completionTokens: data.usage?.output_tokens ?? 0,
  };
}

/**
 * Panggil satu provider. `keys` berisi key terdekripsi.
 */
export async function callProvider(
  provider: ProviderId,
  apiKey: string,
  model: string,
  messages: AiMessage[],
  maxTokens = 2000,
): Promise<AiResult> {
  const safeMaxTokens = clampMaxTokens(model, maxTokens);
  const base = (() => {
    switch (provider) {
      case "openai":
        return callOpenAI(apiKey, model, messages, safeMaxTokens);
      case "gemini":
        return callGemini(apiKey, model, messages, safeMaxTokens);
      case "claude":
        return callClaude(apiKey, model, messages, safeMaxTokens);
    }
  })();

  const result = await base;
  return { ...result, provider };
}

export interface TtsResult {
  provider: "openai";
  model: string;
  /** Buffer MP3 yang dihasilkan. */
  audioBuffer: Buffer;
  /** Jumlah karakter teks input (dasar biaya TTS). */
  charCount: number;
}

/**
 * Panggil OpenAI TTS (/v1/audio/speech) → MP3.
 * TIDAK memakai callProvider (itu endpoint chat/completions teks).
 * Biaya TTS dihitung per karakter, bukan per token.
 */
export interface SttResult {
  provider: "openai";
  model: string;
  /** Teks hasil transkripsi. */
  text: string;
  /** Durasi audio (detik) sebagai dasar biaya STT. */
  durationSeconds: number;
}

/**
 * Panggil OpenAI STT (/v1/audio/transcriptions) → teks.
 * TIDAK memakai callProvider (itu endpoint chat/completions teks).
 * Biaya STT dihitung per menit audio, bukan per token.
 * Menerima format umum (webm/mp4/wav/mpeg/ogg) dengan batas ~25 MB (kita batasi lebih kecil).
 */
export async function callOpenAITranscribe(
  apiKey: string,
  audioBuffer: Buffer,
  filename: string,
  opts?: { model?: string; durationSeconds?: number },
): Promise<SttResult> {
  const model = opts?.model ?? "gpt-4o-mini-transcribe";

  const form = new FormData();
  form.append("model", model);
  form.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: "audio/webm" }),
    filename,
  );

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI STT ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { text?: string };
  // Durasi audio tidak dikembalikan API — dihitung oleh pemanggil (client)
  // dan diteruskan lewat opts.durationSeconds sebagai dasar biaya STT.
  return {
    provider: "openai",
    model,
    text: data.text ?? "",
    durationSeconds: opts?.durationSeconds ?? 0,
  };
}

export async function callOpenAITTS(
  apiKey: string,
  text: string,
  opts?: { voice?: string; model?: string; speed?: number },
): Promise<TtsResult> {
  const model = opts?.model ?? "gpt-4o-mini-tts";
  const voice = opts?.voice ?? "alloy";

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      speed: opts?.speed ?? 1.0,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI TTS ${res.status}: ${body.slice(0, 200)}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  return {
    provider: "openai",
    model,
    audioBuffer,
    charCount: text.length,
  };
}
