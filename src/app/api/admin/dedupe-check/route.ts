import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";

/**
 * Diagnostik duplikat materi (admin only, read-only).
 * Menampilkan semua pelajaran duplikat berdasarkan level + kategori + judul
 * (case-insensitive), termasuk draft & published. Tidak menghapus apa pun.
 * Buka: /api/admin/dedupe-check (harus login sebagai admin).
 */
export async function GET() {
  const supabase = await requireAdmin();

  const { data: raw } = await supabase.rpc("list_lessons_admin");
  const lessons = Array.isArray(raw) ? raw : [];

  const keyOf = (l: { level_code: string; category: string; title: string }) =>
    `${l.level_code}|${l.category}|${l.title.trim().toLowerCase()}`;

  const groups = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const key = keyOf(l);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(l);
  }

  const duplicates = [...groups.entries()]
    .filter(([, arr]) => arr.length > 1)
    .map(([key, arr]) => ({
      key,
      count: arr.length,
      items: arr.map((l) => ({
        id: l.id,
        title: l.title,
        status: l.status,
        created_at: l.created_at,
        updated_at: l.updated_at,
      })),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return NextResponse.json({
    totalLessons: lessons.length,
    duplicateGroups: duplicates.length,
    duplicates,
  });
}