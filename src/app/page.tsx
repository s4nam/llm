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
            <span className="flex items-center gap-2 rounded-full bg-brand-light px-4 py-1 text-sm font-medium text-brand-dark">
              <svg
                aria-hidden="true"
                viewBox="0 0 60 30"
                className="h-3 w-6"
              >
                <clipPath id="gb-flag">
                  <path d="M0,0 v30 h60 v-30 z" />
                </clipPath>
                <g clipPath="url(#gb-flag)">
                  <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
                  <path
                    d="M0,0 L60,30 M60,0 L0,30"
                    stroke="#fff"
                    strokeWidth="6"
                  />
                  <path
                    d="M0,0 L60,30 M60,0 L0,30"
                    stroke="#C8102E"
                    strokeWidth="4"
                  />
                  <path d="M0,0 L0,30 M60,0 L60,30 M0,15 L60,15" stroke="#fff" strokeWidth="10" />
                  <path d="M0,0 L0,30 M60,0 L60,30 M0,15 L60,15" stroke="#C8102E" strokeWidth="6" />
                  <path d="M30,0 L30,30" stroke="#fff" strokeWidth="6" />
                </g>
              </svg>
              Dari nol sampai lancar, Bahasa Inggris
            </span>
            <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              {BRAND.tagline}
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              Kursus Bahasa Inggris online dengan materi bertahap sesuai
              kemampuanmu. Coba gratis sekarang.
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
                className="group rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:border-brand/40 hover:text-brand"
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
              <span className="inline-block rounded-full bg-brand-light px-3 py-0.5 text-xs font-semibold text-brand">
                KURSUS UTAMA
              </span>
            </p>
            <p className="mx-auto mt-3 max-w-lg text-center text-slate-600">
              Diukur dengan standar internasional CEFR (A1–C2) — skala yang sama
              dipakai Cambridge, IELTS, dan universitas di seluruh dunia.
            </p>
            <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-6 text-slate-500">
              Dari pemula total sampai setara penutur asli. Tidak perlu menebak
              level — kerjakan tes penempatan singkat, dan materinya disesuaikan
              dengan kemampuanmu.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {levels.map((l) => (
                <Link
                  key={l.code}
                  href={`/level/${l.code}`}
                  className="rounded-2xl border border-slate-200 p-4 text-center transition hover:border-brand hover:shadow-sm"
                >
                  <p className="text-2xl font-bold text-brand">{l.code}</p>
                  <p className="mt-1 text-sm text-slate-600">{l.label}</p>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/placement-test"
                className="rounded-xl bg-brand px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
              >
                Ikuti Tes Penempatan
              </Link>
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
