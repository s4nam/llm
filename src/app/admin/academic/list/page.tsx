import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../../admin-header";
import { ACADEMIC_SECTION_LABELS, type AcademicSection } from "@/lib/types-academic";

export const metadata: Metadata = {
  title: "Daftar Set Latihan Akademik",
  robots: { index: false },
};

export default async function AcademicListPage() {
  const supabase = await requireAdmin();

  const { data: raw } = await supabase.rpc("list_toefl_sets_admin");
  const sets = Array.isArray(raw) ? raw : [];

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Daftar Set Latihan Akademik</h1>
            <p className="mt-1 text-slate-600">
              Pratinjau, setujui, atau perbaiki set yang dibuat AI.
            </p>
          </div>
          <Link
            href="/admin/academic"
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            + Generate Baru
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {sets.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
              Belum ada set. Gunakan menu &ldquo;Generate Baru&rdquo; untuk membuat set pertama.
            </p>
          )}
          {sets.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                    {ACADEMIC_SECTION_LABELS[s.section as AcademicSection] ?? s.section}
                  </span>
                  {s.status === "published" ? (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                      Tampil
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      Draft
                    </span>
                  )}
                  {s.is_free && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                      Gratis
                    </span>
                  )}
                </div>
                <h2 className="mt-2 font-semibold text-slate-900">{s.title}</h2>
                <p className="text-xs text-slate-400">
                  Diperbarui {new Date(s.updated_at).toLocaleDateString("id-ID")}
                </p>
              </div>
              <Link
                href={`/admin/academic/${s.id}`}
                className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Pratinjau
              </Link>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
