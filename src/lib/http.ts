/**
 * Helper membaca JSON dari Request dengan batas ukuran (S9).
 * Mencegah payload raksasa membebani server.
 */

const DEFAULT_MAX_BYTES = 64 * 1024; // 64 KB

/**
 * Baca body JSON dengan batas ukuran.
 * Lempar Error jika payload melebihi batas atau bukan JSON valid.
 */
export async function readJson<T = unknown>(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<T> {
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new Error(`Ukuran data terlalu besar (maks ${Math.round(maxBytes / 1024)} KB).`);
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Data bukan JSON yang valid.");
  }
}

/** Batas ukuran default (64 KB) untuk dipakai di route handler. */
export const MAX_BODY_BYTES = DEFAULT_MAX_BYTES;
