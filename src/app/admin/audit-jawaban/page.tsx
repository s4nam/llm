import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../admin-header";
import AuditPanel from "./audit-panel";

export const metadata: Metadata = {
  title: "Audit Kunci Jawaban",
  robots: { index: false },
};

export default async function AuditAnswersPage() {
  await requireAdmin();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Audit Kunci Jawaban</h1>
        <p className="mt-1 text-slate-600">
          Periksa semua soal pilihan ganda (materi, TOEFL/akademik, situasional,
          placement) apakah kunci jawabannya benar. Memakai AI — item yang
          diperbaiki kembali ke status <b>draft</b> untuk ditinjau ulang.
        </p>
        <AuditPanel />
      </main>
    </>
  );
}