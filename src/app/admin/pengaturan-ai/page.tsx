import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../admin-header";
import AiSettingsForm from "./ai-settings-form";

export const metadata: Metadata = {
  title: "Pengaturan AI",
  robots: { index: false },
};

export default async function PengaturanAiPage() {
  await requireAdmin();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan AI</h1>
        <p className="mt-1 text-slate-600">
          Kelola token API, model, dan budget untuk pembuatan materi.
        </p>
        <AiSettingsForm />
      </main>
    </>
  );
}
