import { unstable_cache } from "next/cache";
import { createClient as createDataClient } from "@supabase/supabase-js";

export type PublicLessonMeta = {
  id: string;
  title: string;
  slug: string;
  category: string;
  is_free: boolean;
};

async function fetchPublicLessons(level: string): Promise<PublicLessonMeta[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return [];

  // Klien data biasa (bukan SSR) — tidak membaca cookies, aman di dalam cache.
  // RPC list_lessons_public bersifat security definer & hanya meta publik.
  const supabase = createDataClient(url, anonKey);
  const { data, error } = await supabase.rpc("list_lessons_public", {
    p_level: level,
  });
  if (error || !Array.isArray(data)) return [];
  return data as PublicLessonMeta[];
}

/**
 * Daftar pelajaran published per level untuk pengunjung anonim.
 * Dijaga oleh tag "lessons-public" (di-invalidate saat admin publish/hapus)
 * plus revalidate 60 detik agar materi baru tetap muncul cepat.
 */
export const getPublicLessonList = unstable_cache(
  fetchPublicLessons,
  ["lessons-public"],
  {
    tags: ["lessons-public"],
    revalidate: 60,
  },
);
