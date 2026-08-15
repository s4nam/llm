import type { Metadata } from "next";
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

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Kelola Materi</h1>
        <p className="mt-1 text-slate-600">
          Buat materi baru dengan AI dan pantau kelengkapan kurikulum.
        </p>
        <CurriculumManager rows={rows} />
      </main>
    </>
  );
}
