import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/require-access";
import { SITUATIONAL_TOPICS } from "@/lib/types-situational";

export const metadata: Metadata = {
  title: "Percakapan Situasional — Bahasa Inggris Praktis",
  description:
    "Latih percakapan Bahasa Inggris untuk situasi nyata: hotel, restoran, bandara, belanja, dan kesehatan.",
};

export default async function SituationalLandingPage() {
  const guard = await requireAccess();
  const supabase = isSupabaseConfigured() ? guard?.supabase : null;
  const hasAccess = Boolean(guard?.hasAccess);

  // Jumlah set published per topik (hanya yang bisa diakses user — RLS)
  const counts: Record<string, number> = {};
  if (supabase) {
    const { data } = await supabase
      .from("situational_sets")
      .select("topic");
    for (const r of data ?? []) {
      counts[r.topic] = (counts[r.topic] ?? 0) + 1;
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <span className="inline-block rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
          BAHASA INGGRIS PRAKTIS
        </span>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
          Percakapan Situasional
        </h1>
        <p className="mt-2 max-w-xl leading-7 text-slate-600">
          Latihan percakapan untuk situasi kehidupan nyata: hotel, restoran,
          bandara, belanja, dan kesehatan. Pilih topik yang paling kamu butuhkan.
        </p>

        {/* Gate */}
        {!hasAccess && (
          <div className="mt-6 rounded-2xl border-2 border-brand bg-brand-light/30 p-6">
            <p className="font-semibold text-slate-900">
              🔒 Latihan ini untuk member
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Langganan untuk membuka semua topik percakapan situasional.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/langganan"
                className="rounded-xl bg-brand px-6 py-3 text-center font-semibold text-white transition hover:bg-brand-dark"
              >
                Langganan Sekarang
              </Link>
              <Link
                href="/pelajaran-gratis"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Coba Pelajaran Gratis
              </Link>
            </div>
          </div>
        )}

        {/* Grid topik */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SITUATIONAL_TOPICS.map((topic) => {
            const count = counts[topic.id] ?? 0;
            return (
              <div
                key={topic.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-xl">
                    {topic.icon}
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">{topic.label}</h2>
                    <p className="text-xs text-slate-500">
                      {count > 0 ? `${count} set tersedia` : "Belum ada set"}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-600">{topic.description}</p>
                {hasAccess ? (
                  <Link
                    href={`/percakapan-situasional/${topic.id}`}
                    className="mt-auto inline-block rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
                  >
                    Buka Topik →
                  </Link>
                ) : (
                  <span className="mt-auto inline-block rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm text-slate-400">
                    Untuk Member
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 rounded-2xl border border-slate-200 bg-surface p-5 text-sm leading-6 text-slate-500">
          Setiap set berisi dialog 2 pihak (bisa didengarkan), kosakata penting,
          kuis pemahaman, dan latihan percakapan role-play.
        </p>
      </main>
      <Footer />
    </>
  );
}