import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../../admin-header";
import LessonDetailView from "./lesson-detail-view";

export const metadata: Metadata = {
  title: "Detail Materi",
  robots: { index: false },
};

export default async function LessonDetailPage({
  params,
}: PageProps<"/admin/materi/[id]">) {
  const supabase = await requireAdmin();
  const { id } = await params;

  const { data: raw, error } = await supabase.rpc("get_lesson_admin", {
    p_lesson_id: id,
  });
  const lesson = Array.isArray(raw) ? raw[0] : raw;

  if (error || !lesson) notFound();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Link
          href="/admin/materi/list"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Daftar Materi
        </Link>
        <LessonDetailView lesson={lesson} />
      </main>
    </>
  );
}
