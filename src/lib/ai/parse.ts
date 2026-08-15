/**
 * Parser JSON yang andal untuk output AI.
 * AI kadang membungkus JSON dengan ```json ... ``` atau menambahkan teks.
 */
export function parseJson<T>(text: string): T {
  let cleaned = text.trim();

  // Hapus blok kode markdown jika ada
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Cari objek/array JSON pertama yang valid
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let start = -1;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);

  if (start > 0) {
    cleaned = cleaned.slice(start);
  }

  // Buang trailing text setelah JSON
  const lastBrace = cleaned.lastIndexOf("}");
  const lastBracket = cleaned.lastIndexOf("]");
  let end = -1;
  if (lastBrace === -1) end = lastBracket;
  else if (lastBracket === -1) end = lastBrace;
  else end = Math.max(lastBrace, lastBracket);

  if (end >= 0 && end < cleaned.length - 1) {
    cleaned = cleaned.slice(0, end + 1);
  }

  return JSON.parse(cleaned) as T;
}
