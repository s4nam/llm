import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/require-access";

export const metadata: Metadata = {
  title: "Latihan Akademik — Bergaya Tes TOEFL",
  description:
    "Latihan tes bahasa Inggris akademik bergaya TOEFL: Reading, Listening, Writing, dan Speaking. Dibuat otomatis oleh AI, konten orisinal.",
};

const SECTIONS = [
  {
    id: "reading",
    label: "Reading",
    icon: "📖",
    desc: "Bacaan akademik dengan soal pemahaman & inferensi.",
    href: "/academic/reading",
    ready: true,
  },
  {
    id: "listening",
    label: "Listening",
    icon: "🎧",
    desc: "Dengarkan audio akademik lalu jawab soal tanpa transkrip.",
    href: "/academic/listening",
    ready: true,
  },
  {
    id: "writing",
    label: "Writing",
    icon: "✍️",
    desc: "Menulis esai dengan penilaian rubrik AI (0–30).",
    href: "/academic/writing",
    ready: true,
  },
  {
    id: "speaking",
    label: "Speaking",
    icon: "🎙️",
    desc: "Rekam jawaban lisan dengan batas waktu & putar ulang.",
    href: "/academic/speaking",
    ready: true,
  },
];

export default async function AcademicLandingPage() {
  const guard = await requireAccess();
  const hasAccess = Boolean(guard?.hasAccess);
  const supabase = isSupabaseConfigured() ? guard?.supabase : null;

  // Statistik: berapa set published per section
  const counts: Record<string, number> = {};
  if (supabase) {
    const { data } = await supabase.from("toefl_sets").select("section");
    for (const r of data ?? []) {
      counts[r.section] = (counts[r.section] ?? 0) + 1;
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <span className="inline-block rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
          BERGAYA TES AKADEMIK
        </span>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl">
          Latihan Akademik
        </h1>
        <p className="mt-2 max-w-xl leading-7 text-slate-600">
          Latihan tes bahasa Inggris akademik bergaya TOEFL untuk membiasakan Anda
          dengan format soal universitas: bacaan panjang, listening, menulis esai,
          dan respons lisan.
        </p>

        {/* CTA / gate */}
        {!hasAccess ? (
          <div className="mt-6 rounded-2xl border-2 border-brand bg-brand-light/30 p-6">
            <p className="font-semibold text-slate-900">
              🔒 Latihan ini untuk member
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Langganan untuk membuka semua latihan akademik.
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
        ) : (
          <div className="mt-6 rounded-2xl border border-success bg-success/5 p-5">
            <p className="font-semibold text-success">✓ Akses member aktif</p>
            <p className="mt-1 text-sm text-slate-600">
              Anda dapat mengerjakan semua latihan akademik.
            </p>
          </div>
        )}

        {/* Grid section */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SECTIONS.map((s) => {
            const count = counts[s.id] ?? 0;
            return (
              <div
                key={s.id}
                className={`flex flex-col gap-3 rounded-2xl border p-5 ${
                  s.ready
                    ? "border-slate-200 bg-white"
                    : "border-dashed border-slate-200 bg-surface"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-xl">
                    {s.icon}
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">{s.label}</h2>
                    <p className="text-xs text-slate-500">
                      {count > 0 ? `${count} set tersedia` : s.ready ? "Belum ada set" : "Segera hadir"}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-slate-600">{s.desc}</p>
                {s.ready ? (
                  <Link
                    href={s.href}
                    className="mt-auto inline-block rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
                  >
                    Mulai Latihan →
                  </Link>
                ) : (
                  <span className="mt-auto inline-block rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm text-slate-400">
                    Segera
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Simulasi & Riwayat */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-2xl border-2 border-brand bg-brand-light/30 p-5">
            <h2 className="font-semibold text-slate-900">🎯 Simulasi Tes</h2>
            <p className="text-sm text-slate-600">
              Reading + Listening dalam satu sesi dengan timer &amp; skor total.
            </p>
            <Link
              href="/academic/simulasi"
              className="mt-auto inline-block rounded-xl bg-brand px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Mulai Simulasi →
            </Link>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">📊 Riwayat Skor</h2>
            <p className="text-sm text-slate-600">
              Lihat hasil latihan &amp; simulasi Anda, termasuk perkiraan level CEFR.
            </p>
            <Link
              href="/academic/hasil"
              className="mt-auto inline-block rounded-xl border border-slate-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Lihat Riwayat →
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-surface p-5 text-sm leading-6 text-slate-500">
          <p>
            Konten latihan dibuat otomatis oleh AI dan bukan materi resmi ETS.
            englishmudah.id tidak berafiliasi dengan ETS. Nama &ldquo;TOEFL&rdquo;
            hanyalah deskripsi gaya latihan, bukan produk atau sertifikasi resmi.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
