/**
 * Pemetaan skor tes akademik (skala 0-120, gaya TOEFL) ke level CEFR.
 * Satu sumber mapping yang dipakai di seluruh aplikasi (laporan, hasil, landing).
 *
 * Catatan jujur: pemetaan ini perkiraan umum berdasarkan panduan ETS & praktik
 * industri. Bukan klaim resmi. TOEFL iBT resmi ETS dipetakan maksimal ke C1.
 */

export interface CefrMapping {
  level: string; // "A1".."C2"
  label: string;
}

export function mapScoreToCefr(score: number): CefrMapping {
  const s = Math.max(0, Math.min(120, Math.round(score)));
  if (s >= 96) return { level: "C2", label: "Lancar (Proficient)" };
  if (s >= 76) return { level: "C1", label: "Mahir (Advanced)" };
  if (s >= 46) return { level: "B2", label: "Menengah Atas (Upper-Intermediate)" };
  if (s >= 32) return { level: "B1", label: "Menengah (Intermediate)" };
  if (s >= 16) return { level: "A2", label: "Elementer (Elementary)" };
  return { level: "A1", label: "Pemula (Beginner)" };
}

/** Normalisasi skor section (0-30) ke skala total (0-120) bila semua 4 section diambil. */
export function sumSectionScores(scores: number[]): number {
  return scores.reduce((a, b) => a + b, 0);
}

/** Ambil skor section yang ada lalu petakan; jika kosong → null. */
export function mapSectionsToCefr(sectionScores: Record<string, number | null | undefined>): CefrMapping | null {
  const values = Object.values(sectionScores)
    .filter((v): v is number => typeof v === "number")
    .map((v) => Math.max(0, Math.min(30, v)));
  if (values.length === 0) return null;
  // Skor total = jumlah section yang tersedia (maks 4×30=120)
  return mapScoreToCefr(sumSectionScores(values));
}
