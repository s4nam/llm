import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CATEGORY_LABELS, type LessonDetail } from "@/lib/types";
import { BRAND } from "@/lib/brand";
import { computeAccess } from "@/lib/access";
import LessonPlayer from "./lesson-player";

export async function generateMetadata({
  params,
}: PageProps<"/level/[code]/[slug]">): Promise<Metadata> {
  const { code, slug } = await params;
  const supabase = await createClient();
  if (!supabase) return {};
  const { data: meta } = await supabase.rpc("get_lesson_meta", {
    p_slug: slug,
    p_level: code.toUpperCase(),
  });
  const row = Array.isArray(meta) ? meta[0] : meta;
  if (!row) return {};
  return {
    title: row.title,
    description: `Pelajari ${row.title} — ${
      CATEGORY_LABELS[row.category as keyof typeof CATEGORY_LABELS]
    } level ${row.level_code} di kursus Bahasa Inggris online ${BRAND.name}.`,
  };
}

export default async function LessonPage({
  params,
}: PageProps<"/level/[code]/[slug]">) {
  const { code, slug } = await params;

  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createClient();
  if (!supabase) redirect("/masuk");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAnon = !user;

  // META pelajaran via RPC publik (tanpa konten) — bisa diakses anonim.
  const { data: meta } = await supabase.rpc("get_lesson_meta", {
    p_slug: slug,
    p_level: code.toUpperCase(),
  });
  const metaRow = Array.isArray(meta) ? meta[0] : meta;
  if (!metaRow) notFound();

  // Status akses: pelajaran gratis bisa dibaca anonim; sisanya perlu
  // member/trial (RLS tetap menutup konten berbayar).
  let hasAccess = Boolean(metaRow.is_free);
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_member, member_expires_at, trial_expires_at")
      .eq("id", user.id)
      .single();
    const access = computeAccess(profile);
    hasAccess = access.hasAccess || Boolean(metaRow.is_free);
  }

  // Gate: tanpa akses → judul + ajakan, tanpa konten
  if (!hasAccess) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
          <Link
            href={`/level/${code}`}
            className="text-sm font-medium text-brand hover:underline"
          >
            ← Kembali ke Level {code.toUpperCase()}
          </Link>

          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-brand">
            {metaRow.level_code} •{" "}
            {CATEGORY_LABELS[metaRow.category as keyof typeof CATEGORY_LABELS]}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            {metaRow.title}
          </h1>

          <div className="mt-6 rounded-2xl border-2 border-brand bg-brand-light/30 p-8 text-center">
            <p className="text-lg font-semibold text-slate-900">
              🔒 Pelajaran ini untuk member
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
              Langganan untuk membuka semua materi dan latihan di semua level.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/langganan"
                className="rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
              >
                Langganan Sekarang
              </Link>
              <Link
                href="/pelajaran-gratis"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Coba Pelajaran Gratis
              </Link>
            </div>
            {isAnon && (
              <p className="mt-4 text-sm text-slate-500">
                Sudah punya akun?{" "}
                <Link href="/masuk" className="font-semibold text-brand underline">
                  Masuk
                </Link>
              </p>
            )}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Member/free: ambil konten lengkap (RLS mengizinkan; anonim hanya is_free)
  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, level_code, category, title, slug, intro, sections, quiz, is_free",
    )
    .eq("slug", slug)
    .eq("level_code", code.toUpperCase())
    .eq("status", "published")
    .single();

  if (!lesson) notFound();

  const typed: LessonDetail = {
    id: lesson.id,
    level: lesson.level_code,
    category: lesson.category,
    title: lesson.title,
    slug: lesson.slug,
    intro: lesson.intro ?? "",
    sections: lesson.sections,
    quiz: lesson.quiz,
    is_free: lesson.is_free,
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <Link
          href={`/level/${code}`}
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Kembali ke Level {code.toUpperCase()}
        </Link>

        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-brand">
          {lesson.level_code} • {CATEGORY_LABELS[lesson.category as keyof typeof CATEGORY_LABELS]}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{lesson.title}</h1>

        <LessonPlayer lesson={typed} isMember={!isAnon && hasAccess} />
      </main>
      <Footer />
    </>
  );
}