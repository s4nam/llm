import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../admin-header";
import ReportsList from "./reports-list";

export const metadata: Metadata = {
  title: "Laporan Masalah",
  robots: { index: false },
};

export default async function LaporanPage() {
  await requireAdmin();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">
          Laporan Masalah
        </h1>
        <p className="mt-1 text-slate-600">
          Laporan dari siswa tentang kesalahan materi. Perbaiki dengan
          Regenerate di halaman Materi, lalu tandai selesai.
        </p>
        <ReportsList />
      </main>
    </>
  );
}
