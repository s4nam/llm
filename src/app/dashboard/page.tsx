import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { CEFR_LEVELS } from "@/lib/types";

const LEVEL_NAMES: Record<string, string> = {
  A1: "Pemula",
  A2: "Elementer",
  B1: "Menengah",
  B2: "Menengah Atas",
  C1: "Mahir",
  C2: "Lancar",
};

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <Header />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-12 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Aplikasi belum dikonfigurasi
          </h1>
          <p className="mt-3 text-slate-600">
            Dashboard hanya bisa diakses setelah Supabase dikonfigurasi.
            Ikuti panduan di file{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 text-sm">
              .env.example
            </code>{" "}
            untuk mengisi kunci Supabase.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  const supabase = await createClient();
  if (!supabase) redirect("/masuk");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/masuk");

  const name =
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0] ||
    "Sahabat EnglishMudah";

  // Hitung jumlah pelajaran publik per level (RLS: hanya published/free terlihat)
  const { data: published } = await supabase
    .from("lessons")
    .select("level_code")
    .eq("status", "published");
  const counts: Record<string, number> = {};
  for (const row of published ?? []) {
    counts[row.level_code] = (counts[row.level_code] ?? 0) + 1;
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">
          Assalamu&apos;alaikum, {name} 👋
        </h1>
        <p className="mt-2 text-slate-600">
          Pilih level untuk mulai belajar, atau kerjakan tes penempatan agar
          kami menyarankan level yang pas.
        </p>

        {/* Placement */}
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-brand-light/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Tidak yakin mulai dari mana?
            </h2>
            <p className="text-sm text-slate-600">
              Kerjakan tes singkat (12 soal) dan dapatkan rekomendasi level.
            </p>
          </div>
          <Link
            href="/placement-test"
            className="shrink-0 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Ikuti Tes Penempatan
          </Link>
        </div>

        {/* Levels */}
        <h2 className="mt-8 text-lg font-semibold text-slate-900">
          Pilih Level
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CEFR_LEVELS.map((code) => {
            const count = counts[code] ?? 0;
            const ready = count > 0;
            return (
              <div
                key={code}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-5 ${
                  ready
                    ? "border-slate-200 bg-white hover:border-brand"
                    : "border-dashed border-slate-200 bg-surface"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${
                      ready
                        ? "bg-brand-light text-brand"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {code}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {LEVEL_NAMES[code] ?? code}
                    </p>
                    <p className="text-sm text-slate-500">
                      {ready
                        ? `${count} pelajaran tersedia`
                        : "Segera hadir"}
                    </p>
                  </div>
                </div>
                {ready ? (
                  <Link
                    href={`/level/${code}`}
                    className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Buka
                  </Link>
                ) : (
                  <span className="shrink-0 rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-400">
                    Segera
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Free lessons */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Ingin coba tanpa daftar?
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            3 pelajaran gratis bisa dibuka tanpa login.
          </p>
          <Link
            href="/pelajaran-gratis"
            className="mt-4 inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
          >
            Buka Pelajaran Gratis
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
