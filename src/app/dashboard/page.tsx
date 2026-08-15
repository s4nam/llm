import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

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

  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900">
          Assalamu&apos;alaikum, {name} 👋
        </h1>
        <p className="mt-2 text-slate-600">
          Selamat datang di englishmudah.id. Dashboard lengkap (progress
          belajar, level, dan kuis) akan hadir di Fase 3.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Mulai belajar sekarang
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Sambil menunggu kurikulum lengkap, Anda bisa mencoba 3 pelajaran
            gratis.
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
