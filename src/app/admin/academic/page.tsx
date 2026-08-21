import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../admin-header";
import AcademicManager from "./academic-manager";

export const metadata: Metadata = {
  title: "Kelola Latihan Akademik",
  robots: { index: false },
};

export default async function AdminAcademicPage() {
  await requireAdmin();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Kelola Latihan Akademik
            </h1>
            <p className="mt-1 text-slate-600">
              Buat set latihan Reading/Listening/Writing/Speaking dengan AI.
            </p>
          </div>
          <Link
            href="/admin/academic/list"
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Daftar Set (draft)
          </Link>
        </div>
        <AcademicManager />
      </main>
    </>
  );
}
