/**
 * Parser JSON yang andal untuk output AI.
 * AI kadang membungkus JSON dengan ```json ... ```, menambahkan teks,
 * atau bahkan menyisipkan teks asing (mis. "[Square A] ...") di depan/belakang.
 * Strategi: coba parse utuh, lalu cari objek/array JSON pertama yang valid
 * dengan mencocokkan pasangan kurung ({...} / [...]) sambil memahami string.
 */

function matchClosing(text: string, start: number): number {
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

export function parseJson<T>(text: string): T {
  let cleaned = text.trim();

  // Hapus blok kode markdown jika ada
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // 1) Coba parse utuh
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // lanjut
  }

  // 2) Cari objek/array JSON pertama yang valid (bracket matching)
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch !== "{" && ch !== "[") continue;
    const end = matchClosing(cleaned, i);
    if (end === -1) continue;
    const candidate = cleaned.slice(i, end + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // coba posisi berikutnya
    }
  }

  // 3) Fallback terakhir: potong dari kurung pertama ke kurung terakhir
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let start = -1;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);

  if (start >= 0) {
    const lastBrace = cleaned.lastIndexOf("}");
    const lastBracket = cleaned.lastIndexOf("]");
    let end = -1;
    if (lastBrace === -1) end = lastBracket;
    else if (lastBracket === -1) end = lastBrace;
    else end = Math.max(lastBrace, lastBracket);

    if (end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        // lanjut
      }
    }
  }

  throw new SyntaxError(
    `Output AI bukan JSON yang valid. Awal respons: ${cleaned.slice(0, 120)}`,
  );
}