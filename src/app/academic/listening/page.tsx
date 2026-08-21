import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/require-access";
import { ACADEMIC_SEED } from "@/lib/academic-seed";
import type { AcademicScript } from "@/lib/types-academic";
import ListeningPractice from "./listening-practice";

export const metadata: Metadata = {
  title: "Latihan Listening",
};

export default async function AcademicListeningPage() {
  const guard = await requireAccess();
  const supabase = isSupabaseConfigured() ? guard?.supabase : null;
  const hasAccess = Boolean(guard?.hasAccess);

  let sets: { id: string; title: string; content: { scripts?: AcademicScript[] } }[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("toefl_sets")
      .select("id, title, content")
      .eq("section", "listening")
      .eq("status", "published");
    sets = (data ?? []).filter((s) => s.content?.scripts?.length);
  }

  const seedSets = ACADEMIC_SEED.filter((s) => s.section === "listening");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Link href="/academic" className="text-sm font-medium text-brand hover:underline">
          ← Latihan Akademik
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Listening Practice</h1>
        <p className="mt-1 text-sm text-slate-600">
          Dengarkan audio akademik, lalu jawab soal — tanpa transkrip saat mengerjakan.
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
              <ListeningPractice
                key={s.id}
                setId={s.id}
                title={s.title}
                scripts={s.content.scripts!}
              />
            ))}
            {sets.length === 0 &&
              seedSets.map((s) => (
                <ListeningPractice
                  key={s.slug}
                  setId=""
                  title={s.title}
                  scripts={(s.content as { scripts: AcademicScript[] }).scripts}
                />
              ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
