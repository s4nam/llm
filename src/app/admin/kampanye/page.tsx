import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../admin-header";
import CampaignView from "./campaign-view";

export const metadata: Metadata = {
  title: "Kampanye",
  robots: { index: false },
};

export default async function KampanyePage() {
  const supabase = await requireAdmin();

  const { data: reportRaw } = await supabase.rpc("get_campaign_report");
  const report = Array.isArray(reportRaw) ? reportRaw : [];

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Kampanye (Kupon)</h1>
        <p className="mt-1 text-slate-600">
          Hasil kampanye per kupon: pemakaian, pendapatan, dan diskon yang
          diberikan. Kupon yang dihapus tetap muncul untuk riwayat.
        </p>
        <CampaignView report={report} />
      </main>
    </>
  );
}
