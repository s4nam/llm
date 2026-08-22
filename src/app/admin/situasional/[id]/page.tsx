import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import AdminHeader from "../../admin-header";
import SituationalDetailView from "./situational-detail-view";

export const metadata: Metadata = {
  title: "Detail Set Situasional",
  robots: { index: false },
};

export default async function SituationalDetailPage({
  params,
}: PageProps<"/admin/situasional/[id]">) {
  const supabase = await requireAdmin();
  const { id } = await params;

  const { data: raw, error } = await supabase.rpc("get_situational_set_admin", {
    p_set_id: id,
  });
  const set = Array.isArray(raw) ? raw[0] : raw;

  if (error || !set) notFound();

  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Link
          href="/admin/situasional/list"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Daftar Set Situasional
        </Link>
        <SituationalDetailView set={set} />
      </main>
    </>
  );
}