import { redirect } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import AchievementsBoard from "./achievements-board";

export const metadata = {
  title: "Prestasi & Peringkat",
};

export default async function PrestasiPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/masuk");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  // Buka achievement (best-effort) lalu ambil daftar
  await supabase.rpc("unlock_achievements", { p_user_id: user.id });

  const { data: achRaw } = await supabase.rpc("list_user_achievements", {
    p_user_id: user.id,
  });
  const achievements = Array.isArray(achRaw) ? achRaw : [];

  const { data: lbRaw } = await supabase.rpc("get_leaderboard", {
    p_limit: 20,
  });
  const leaderboard = Array.isArray(lbRaw) ? lbRaw : [];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Prestasi & Peringkat</h1>
        <p className="mt-1 text-slate-600">
          Badge pencapaian yang sudah kamu raih dan posisimu di papan peringkat.
        </p>
        <AchievementsBoard
          achievements={achievements}
          leaderboard={leaderboard}
          currentUserId={user.id}
        />
      </main>
      <Footer />
    </>
  );
}