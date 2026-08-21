import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../../admin-header";
import { ACADEMIC_SECTION_LABELS, type AcademicSection } from "@/lib/types-academic";
import AcademicDetailView from "./academic-detail-view";

export const metadata: Metadata = {
  title: "Pratinjau Set Latihan Akademik",
  robots: { index: false },
};

export default async function AcademicDetailPage({
  params,
}: PageProps<"/admin/academic/[id]">) {
  const { id } = await params;
  const supabase = await requireAdmin();

  const { data: raw } = await supabase.rpc("get_toefl_set_admin", { p_set_id: id });
  const setRow = Array.isArray(raw) ? raw[0] : raw;
  if (!setRow) notFound();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Link href="/admin/academic/list" className="text-sm font-medium text-brand hover:underline">
          ← Daftar Set Latihan Akademik
        </Link>

        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-brand">
          {ACADEMIC_SECTION_LABELS[setRow.section as AcademicSection] ?? setRow.section} •{" "}
          {setRow.status === "published" ? "Tampil" : "Draft"}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{setRow.title}</h1>

        <AcademicDetailView
          setId={id}
          section={setRow.section}
          title={setRow.title}
          content={setRow.content}
          status={setRow.status}
        />
      </main>
    </>
  );
}
