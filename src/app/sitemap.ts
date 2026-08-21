import type { MetadataRoute } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getPublicLessonList } from "@/lib/lesson-list";

export const dynamic = "force-dynamic";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const entries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pelajaran-gratis`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    ...LEVELS.map((level) => ({
      url: `${base}/level/${level.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${base}/daftar`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/masuk`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/placement-test`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/kontak`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/syarat-ketentuan`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/kebijakan-privasi`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Halaman pelajaran per level (meta publik, di-cache). Jika DB gagal
  // (mis. migration 014 belum dijalankan), sitemap tetap valid.
  try {
    if (isSupabaseConfigured()) {
      for (const level of LEVELS) {
        const lessons = await getPublicLessonList(level);
        for (const lesson of lessons) {
          entries.push({
            url: `${base}/level/${level.toLowerCase()}/${lesson.slug}`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.7,
          });
        }
      }
    }
  } catch {
    // abaikan — tetap pulangkan daftar statis
  }

  return entries;
}