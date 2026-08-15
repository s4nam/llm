import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { BRAND } from "@/lib/brand";
import { CEFR_LEVELS } from "@/lib/types";

const features = [
  {
    title: "Materi dari dasar sampai mahir",
    desc: "Level A1 sampai C2 (CEFR). Mulai dari nol, tanpa bingung harus mulai dari mana.",
  },
  {
    title: "Belajar tanpa biaya dulu",
    desc: "Coba 3 pelajaran gratis tanpa daftar. Kalau cocok, lanjutkan dengan trial 3 hari.",
  },
  {
    title: "Kosakata + pelafalan",
    desc: "Setiap kata ada cara bacanya. Latihan langsung dengan kuis berpenjelasan.",
  },
  {
    title: "Pelan-pelan, ramah pemula",
    desc: "Bahasa Indonesia sebagai penuntun di level awal. Tanpa istilah rumit.",
  },
];

const levels = CEFR_LEVELS.map((level, i) => ({
  code: level,
  label:
    ["Pemula", "Elementer", "Menengah", "Menengah Atas", "Mahir", "Lancar"][i] ??
    level,
}));

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-light/60 to-white">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-20 text-center">
            <span className="rounded-full bg-brand-light px-4 py-1 text-sm font-medium text-brand-dark">
              Dari nol sampai lancar 🇬🇧
            </span>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              {BRAND.tagline}
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              Kursus Bahasa Inggris online dengan materi bertahap sesuai
              kemampuanmu. Coba gratis sekarang — tanpa kartu, tanpa ribet.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/pelajaran-gratis"
                className="rounded-xl bg-brand px-8 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
              >
                Coba Gratis Sekarang
              </Link>
              <Link
                href="/daftar"
                className="rounded-xl border border-slate-300 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Daftar Member
              </Link>
            </div>
            <p className="text-sm text-slate-400">
              Tanpa daftar • Tanpa kartu • Langsung belajar
            </p>
          </div>
        </section>

        {/* Levels */}
        <section className="bg-white">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
              Pilih levelmu, mulai belajar
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-slate-600">
              Level mengikuti standar internasional CEFR — dari pemula total
              sampai setara penutur asli.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {levels.map((l) => (
                <div
                  key={l.code}
                  className="rounded-2xl border border-slate-200 p-4 text-center transition hover:border-brand"
                >
                  <p className="text-2xl font-bold text-brand">{l.code}</p>
                  <p className="mt-1 text-sm text-slate-600">{l.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
              Kenapa englishmudah.id?
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6"
                >
                  <h3 className="text-lg font-semibold text-slate-900">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-slate-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-brand">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center">
            <h2 className="text-3xl font-bold text-white">
              Mulai dari 3 pelajaran gratis
            </h2>
            <p className="max-w-lg text-brand-light">
              Tidak perlu daftar. Langsung buka pelajaran pertama dan rasakan
              sendiri caranya.
            </p>
            <Link
              href="/pelajaran-gratis"
              className="rounded-xl bg-white px-8 py-4 text-base font-semibold text-brand transition hover:bg-brand-light"
            >
              Buka Pelajaran Gratis
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
