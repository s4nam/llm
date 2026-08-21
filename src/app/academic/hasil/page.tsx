import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/require-access";
import { mapScoreToCefr } from "@/lib/cefr-mapping";
import { ACADEMIC_SECTION_LABELS } from "@/lib/types-academic";

export const metadata: Metadata = {
  title: "Riwayat Skor Latihan Akademik",
};

const SECTION_LABEL: Record<string, string> = {
  ...ACADEMIC_SECTION_LABELS,
  full: "Simulasi",
};

export default async function AcademicHistoryPage() {
  const guard = await requireAccess();
  const supabase = isSupabaseConfigured() ? guard?.supabase : null;
  const hasAccess = Boolean(guard?.hasAccess);

  let results: {
    id: string;
    section: string;
    score: number;
    max_score: number;
    detail: { cefr?: { level: string; label: string } | null } | null;
    created_at: string;
  }[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("toefl_results")
      .select("id, section, score, max_score, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    results = (data ?? []) as typeof results;
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Link href="/academic" className="text-sm font-medium text-brand hover:underline">
          ← Latihan Akademik
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Riwayat Skor</h1>
        <p className="mt-1 text-sm text-slate-600">
          Semua hasil latihan akademik Anda.
        </p>

        {!hasAccess ? (
          <div className="mt-6 rounded-2xl border-2 border-brand bg-brand-light/30 p-6 text-center">
            <p className="text-lg font-semibold text-slate-900">🔒 Untuk member</p>
            <Link
              href="/langganan"
              className="mt-4 inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              Langganan Sekarang
            </Link>
          </div>
        ) : results.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-surface p-8 text-center text-slate-500">
            Belum ada hasil. Kerjakan latihan atau simulasi untuk melihat skor Anda.
            <div className="mt-4">
              <Link
                href="/academic/simulasi"
                className="rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
              >
                Mulai Simulasi
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {results.map((r) => {
              const cefr =
                r.section === "full"
                  ? r.detail?.cefr
                  : mapScoreToCefr((r.score / r.max_score) * 120);
              return (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand">
                        {SECTION_LABEL[r.section] ?? r.section}
                      </span>
                      {cefr && (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                          {cefr.level}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(r.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-brand">
                      {r.score}
                      <span className="text-sm font-medium text-slate-400">
                        /{r.max_score}
                      </span>
                    </p>
                    {cefr && (
                      <p className="text-xs text-slate-500">{cefr.label}</p>
                    )}
                  </div>
                </div>
              );
            })}

            <p className="mt-4 rounded-xl bg-surface p-4 text-xs leading-5 text-slate-500">
              Pemetaan CEFR adalah perkiraan umum (skala 0–120 gaya TOEFL), bukan
              klaim sertifikasi resmi. ETS memetakan TOEFL iBT maksimal ke level C1.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
