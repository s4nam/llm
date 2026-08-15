import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "./admin-header";
import AdminDashboard from "./dashboard-content";

export const metadata: Metadata = {
  title: "Dashboard Admin",
  robots: { index: false },
};

export default async function AdminPage() {
  await requireAdmin();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin</h1>
        <p className="mt-1 text-slate-600">
          Ringkasan performa aplikasi Anda.
        </p>
        <AdminDashboard />
      </main>
    </>
  );
}
