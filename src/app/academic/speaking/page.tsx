import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/require-access";
import { ACADEMIC_SEED } from "@/lib/academic-seed";
import type { AcademicSpeakingTask } from "@/lib/types-academic";
import SpeakingPractice from "./speaking-practice";

export const metadata: Metadata = {
  title: "Latihan Speaking",
};

export default async function AcademicSpeakingPage() {
  const guard = await requireAccess();
  const supabase = isSupabaseConfigured() ? guard?.supabase : null;
  const hasAccess = Boolean(guard?.hasAccess);

  let sets: { id: string; title: string; content: { tasks?: AcademicSpeakingTask[] } }[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("toefl_sets")
      .select("id, title, content")
      .eq("section", "speaking")
      .eq("status", "published");
    sets = (data ?? []).filter((s) => s.content?.tasks?.length);
  }

  const seedSets = ACADEMIC_SEED.filter((s) => s.section === "speaking");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Link href="/academic" className="text-sm font-medium text-brand hover:underline">
          ← Latihan Akademik
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Speaking Practice</h1>
        <p className="mt-1 text-sm text-slate-600">
          Rekam jawaban lisan Anda dengan batas waktu.
        </p>

        {!hasAccess ? (
          <div className="mt-6 rounded-2xl border-2 border-brand bg-brand-light/30 p-6 text-center">
            <p className="text-lg font-semibold text-slate-900">🔒 Latihan ini untuk member</p>
            <Link
              href="/langganan"
              className="mt-4 inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              Langganan Sekarang
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            {sets.length === 0 && seedSets.length > 0 && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Belum ada set dari AI — menampilkan set cadangan bawaan agar Anda bisa mencoba.
              </p>
            )}
            {sets.map((s) => (
              <SpeakingPractice key={s.id} title={s.title} tasks={s.content.tasks!} />
            ))}
            {sets.length === 0 &&
              seedSets.map((s) => (
                <SpeakingPractice
                  key={s.slug}
                  title={s.title}
                  tasks={(s.content as { tasks: AcademicSpeakingTask[] }).tasks}
                />
              ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
