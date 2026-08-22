import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../admin-header";
import CurriculumManager from "./curriculum-manager";

export const metadata: Metadata = {
  title: "Kelola Materi",
  robots: { index: false },
};

export default async function MateriPage() {
  const supabase = await requireAdmin();

  const { data: raw } = await supabase.rpc("get_curriculum_admin");
  const rows = Array.isArray(raw) ? raw : [];

  // Daftar topik yang sudah ada (draft & published) — untuk peringatan duplikat
  // sebelum generate (lapis client).
  const { data: lessonsRaw } = await supabase.rpc("list_lessons_admin");
  const existingLessons = (Array.isArray(lessonsRaw) ? lessonsRaw : []).map(
    (l: { level_code: string; category: string; title: string; status: string }) => ({
      level: l.level_code,
      category: l.category,
      title: l.title,
      status: l.status,
    }),
  );

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kelola Materi</h1>
            <p className="mt-1 text-slate-600">
              Buat materi baru dengan AI dan pantau kelengkapan kurikulum.
            </p>
          </div>
          <Link
            href="/admin/materi/list"
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Daftar Materi (draft)
          </Link>
        </div>
        <CurriculumManager rows={rows} existingLessons={existingLessons} />
      </main>
    </>
  );
}
