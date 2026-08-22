import { redirect } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import StudySetsManager from "./study-sets-manager";

export const metadata = {
  title: "Study Sets — Kosakata Pribadi",
};

export default async function StudySetsPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/masuk");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  // RLS: set milik saya + set publik (login-only)
  const { data: sets } = await supabase
    .from("study_sets")
    .select("id, title, is_public, user_id, updated_at")
    .order("updated_at", { ascending: false });

  // Jumlah kata per set (untuk daftar)
  const { data: allItems } = await supabase
    .from("study_set_items")
    .select("set_id, id");
  const countBySet: Record<string, number> = {};
  for (const it of allItems ?? []) {
    countBySet[it.set_id] = (countBySet[it.set_id] ?? 0) + 1;
  }

  const mySets = (sets ?? [])
    .filter((s) => s.user_id === user.id)
    .map((s) => ({ ...s, item_count: countBySet[s.id] ?? 0 }));
  const publicSets = (sets ?? [])
    .filter((s) => s.user_id !== user.id && s.is_public)
    .map((s) => ({ ...s, item_count: countBySet[s.id] ?? 0 }));

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Study Sets</h1>
        <p className="mt-2 text-slate-600">
          Simpan kata &amp; frasa penting, buat daftar pribadi, dan berlatih
          kapan saja.
        </p>
        <StudySetsManager
          mySets={mySets}
          publicSets={publicSets}
          currentUserId={user.id}
        />
      </main>
      <Footer />
    </>
  );
}