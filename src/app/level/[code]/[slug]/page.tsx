import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CATEGORY_LABELS, type LessonDetail } from "@/lib/types";
import LessonPlayer from "./lesson-player";

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
  if (!user) redirect("/masuk");

  // Ambil pelajaran published. RLS: published & free bisa diakses.
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

  // Cek status member (dari profile)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_member")
    .eq("id", user.id)
    .single();
  const isMember = profile?.is_member === true || Boolean(lesson.is_free);

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

        {!isMember && !lesson.is_free && (
          <div className="mt-4 rounded-xl bg-brand-light/60 p-4 text-sm">
            <p className="text-slate-700">
              Pelajaran ini untuk member.{" "}
              <Link href="/masuk" className="font-semibold text-brand underline">
                Langganan
              </Link>{" "}
              untuk membuka semua materi.
            </p>
          </div>
        )}

        <LessonPlayer lesson={typed} isMember={isMember} />
      </main>
      <Footer />
    </>
  );
}
