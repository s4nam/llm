import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/require-access";
import { ACADEMIC_SEED } from "@/lib/academic-seed";
import type { AcademicPassage } from "@/lib/types-academic";
import ReadingPractice from "./reading-practice";

export const metadata: Metadata = {
  title: "Latihan Reading",
};

export default async function AcademicReadingPage() {
  const guard = await requireAccess();
  const supabase = isSupabaseConfigured() ? guard?.supabase : null;
  const hasAccess = Boolean(guard?.hasAccess);

  let sets: { id: string; title: string; content: { passages?: AcademicPassage[] } }[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("toefl_sets")
      .select("id, title, content")
      .eq("section", "reading")
      .eq("status", "published");
    sets = (data ?? []).filter((s) => s.content?.passages?.length);
  }

  // Fallback seed
  const seedSets = ACADEMIC_SEED.filter((s) => s.section === "reading");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Link href="/academic" className="text-sm font-medium text-brand hover:underline">
          ← Latihan Akademik
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Reading Practice</h1>
        <p className="mt-1 text-sm text-slate-600">
          Baca passage akademik lalu jawab soal pemahaman.
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
            {sets.length === 0 && seedSets.length === 0 && (
              <p className="rounded-2xl border border-slate-200 bg-surface p-6 text-slate-500">
                Belum ada latihan reading. Admin perlu generate set terlebih dahulu.
              </p>
            )}
            {sets.map((s) => (
              <ReadingPractice
                key={s.id}
                setId={s.id}
                title={s.title}
                passages={s.content.passages!}
              />
            ))}
            {/* Seed fallback (hanya jika tidak ada set AI) */}
            {sets.length === 0 &&
              seedSets.map((s) => (
                <ReadingPractice
                  key={s.slug}
                  setId=""
                  title={s.title}
                  passages={(s.content as { passages: AcademicPassage[] }).passages}
                />
              ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
