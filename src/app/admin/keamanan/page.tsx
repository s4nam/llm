import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../admin-header";
import SecurityManager from "./security-manager";

export const metadata: Metadata = {
  title: "Keamanan Admin",
  robots: { index: false },
};

export default async function KeamananPage() {
  await requireAdmin();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Keamanan Admin</h1>
        <p className="mt-1 text-slate-600">
          Aktifkan verifikasi dua langkah untuk melindungi akun admin Anda.
        </p>
        <SecurityManager />
      </main>
    </>
  );
}
