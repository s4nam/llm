import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CEFR_LEVELS } from "@/lib/types";
import MergeProgressPrompt from "./merge-progress-prompt";
import TimeGreeting from "./time-greeting";

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

  // Jumlah pelajaran publik per level
  const { data: published } = await supabase
    .from("lessons")
    .select("level_code")
    .eq("status", "published");
  const counts: Record<string, number> = {};
  for (const row of published ?? []) {
    counts[row.level_code] = (counts[row.level_code] ?? 0) + 1;
  }

  // Progress user per level (count pelajaran yang completed)
  const { data: progress } = await supabase
    .from("user_progress")
    .select("lesson_id, completed")
    .eq("user_id", user.id);
  const completedLessonIds = new Set(
    (progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id),
  );

  // Sertifikat user
  const { data: certificates } = await supabase
    .from("certificates")
    .select("level_code")
    .eq("user_id", user.id);
  const earnedLevels = new Set((certificates ?? []).map((c) => c.level_code));

  // Streak
  const { data: streak } = await supabase
    .from("user_streaks")
    .select("current_streak, best_streak")
    .eq("user_id", user.id)
    .single();

  // Status member / trial
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_member, member_expires_at, trial_expires_at")
    .eq("id", user.id)
    .single();
  const { computeAccess } = await import("@/lib/access");
  const access = computeAccess(profile);
  const memberEnds = profile?.member_expires_at
    ? new Date(profile.member_expires_at)
    : null;

  const isNewUser = completedLessonIds.size === 0;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">
          <TimeGreeting name={name} />
        </h1>
        <p className="mt-2 text-slate-600">
          Lanjutkan belajar atau pilih level baru.
        </p>

        {/* Panduan cara pakai (untuk pengguna baru) */}
        {isNewUser && (
          <div className="mt-6 rounded-2xl border border-brand bg-brand-light/30 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              🎉 Selamat datang! Cara pakainya gampang:
            </h2>
            <ol className="mt-3 flex flex-col gap-2 text-sm text-slate-700">
              <li>1️⃣ Pilih level di bawah (atau kerjakan tes penempatan).</li>
              <li>2️⃣ Buka pelajaran → baca materi → kerjakan soal.</li>
              <li>3️⃣ Dapat nilai ≥60% = pelajaran selesai.</li>
              <li>4️⃣ Selesaikan semua pelajaran di level → klaim sertifikat 🏅.</li>
            </ol>
          </div>
        )}

        {/* Stat mini */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-brand">{completedLessonIds.size}</p>
            <p className="text-xs text-slate-500">Pelajaran selesai</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-brand">{streak?.current_streak ?? 0}🔥</p>
            <p className="text-xs text-slate-500">Streak hari ini</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-brand">{earnedLevels.size}</p>
            <p className="text-xs text-slate-500">Sertifikat</p>
          </div>
        </div>

        {/* Status langganan */}
        {access.isMember ? (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border-2 border-success bg-success/5 p-5">
            <div>
              <p className="font-semibold text-success">✓ Member aktif</p>
              <p className="text-sm text-slate-600">
                {memberEnds
                  ? `Berlaku sampai ${memberEnds.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`
                  : "Akses penuh semua level."}
              </p>
            </div>
            <Link
              href="/langganan"
              className="shrink-0 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Kelola
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border-2 border-brand bg-brand-light/30 p-5">
            <div>
              <p className="font-semibold text-slate-900">
                {access.trialActive ? "⏳ Masa trial aktif" : "Akses terbatas"}
              </p>
              <p className="text-sm text-slate-600">
                {access.trialActive
                  ? "Nikmati akses penuh selama trial. "
                  : "Langganan atau trial untuk membuka semua level & pelajaran."}
              </p>
            </div>
            <Link
              href="/langganan"
              className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              {access.trialActive ? "Perpanjang" : "Langganan"}
            </Link>
          </div>
        )}

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

        {/* Gabung progress browser */}
        <MergeProgressPrompt />

        {/* Levels */}
        <h2 className="mt-8 text-lg font-semibold text-slate-900">Pilih Level</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CEFR_LEVELS.map((code) => {
            const count = counts[code] ?? 0;
            const ready = count > 0;
            const earned = earnedLevels.has(code);
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
                      {earned && <span className="ml-1 text-success">🏅</span>}
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

        {/* Profil link */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/profil"
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Profil &amp; Sertifikat
          </Link>
          <Link
            href="/pelajaran-gratis"
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Pelajaran Gratis
          </Link>
          <Link
            href="/academic"
            className="rounded-xl bg-brand-light px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand/10"
          >
            🎓 Latihan Akademik
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
