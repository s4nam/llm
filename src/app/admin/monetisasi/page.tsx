import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../admin-header";
import MonetizationManager from "./monetization-manager";

export const metadata: Metadata = {
  title: "Monetisasi",
  robots: { index: false },
};

export default async function MonetisasiPage() {
  const supabase = await requireAdmin();

  const { data: pricingRaw } = await supabase.rpc("get_pricing");
  const pricing = Array.isArray(pricingRaw) ? pricingRaw[0] : pricingRaw;

  const { data: membersRaw } = await supabase.rpc("get_members_admin");
  const members = Array.isArray(membersRaw) ? membersRaw : [];

  const { data: coupons } = await supabase.rpc("list_coupons_admin");

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Monetisasi</h1>
        <p className="mt-1 text-slate-600">
          Kelola harga paket, kupon, dan status member.
        </p>
        <MonetizationManager
          pricing={pricing}
          members={members}
          coupons={coupons ?? []}
        />
      </main>
    </>
  );
}
