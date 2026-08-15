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
  const base = (() => {
    switch (provider) {
      case "openai":
        return callOpenAI(apiKey, model, messages, maxTokens);
      case "gemini":
        return callGemini(apiKey, model, messages, maxTokens);
      case "claude":
        return callClaude(apiKey, model, messages, maxTokens);
    }
  })();

  const result = await base;
  return { ...result, provider };
}
