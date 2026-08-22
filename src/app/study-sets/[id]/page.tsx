import { redirect } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { computeAccess } from "@/lib/access";
import StudySetPractice from "./study-set-practice";

export const metadata = {
  title: "Study Set",
};

export default async function StudySetPage({
  params,
}: PageProps<"/study-sets/[id]">) {
  const { id } = await params;

  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/masuk");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk");

  // RLS: set milik saya atau publik (login)
  const { data: set } = await supabase
    .from("study_sets")
    .select("id, title, is_public, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!set) redirect("/study-sets");

  const { data: items } = await supabase
    .from("study_set_items")
    .select("id, word, translation")
    .eq("set_id", id);

  // Status member (untuk fitur "Ucapkan" yang berbayar)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_member, member_expires_at, trial_expires_at")
    .eq("id", user.id)
    .single();
  const hasAccess = computeAccess(profile).hasAccess;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <StudySetPractice
          setId={id}
          title={set.title}
          isOwner={set.user_id === user.id}
          isPublic={set.is_public}
          hasAccess={hasAccess}
          initialItems={(items ?? []).map((i) => ({ word: i.word, translation: i.translation }))}
        />
      </main>
      <Footer />
    </>
  );
}