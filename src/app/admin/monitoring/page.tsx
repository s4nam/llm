import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../admin-header";
import MonitoringView from "./monitoring-view";

export const metadata: Metadata = {
  title: "Monitoring AI",
  robots: { index: false },
};

export default async function MonitoringPage() {
  await requireAdmin();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Monitoring AI</h1>
        <p className="mt-1 text-slate-600">
          Pantau pemakaian token dan estimasi biaya pembuatan materi.
        </p>
        <MonitoringView />
      </main>
    </>
  );
}
