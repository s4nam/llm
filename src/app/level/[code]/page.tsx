import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CEFR_LEVELS, CATEGORY_LABELS, type Category } from "@/lib/types";
import { BRAND } from "@/lib/brand";
import { getPublicLessonList } from "@/lib/lesson-list";
import ClaimCertificate from "./claim-certificate";

const LEVEL_NAMES: Record<string, string> = {
  A1: "Pemula",
  A2: "Elementer",
  B1: "Menengah",
  B2: "Menengah Atas",
  C1: "Mahir",
  C2: "Lancar",
};

type PublicLesson = {
  id: string;
  title: string;
  slug: string;
  category: string;
  is_free: boolean;
};

export async function generateMetadata({
  params,
}: PageProps<"/level/[code]">): Promise<Metadata> {
  const { code } = await params;
  const level = code.toUpperCase();
  if (!CEFR_LEVELS.includes(level as (typeof CEFR_LEVELS)[number])) return {};
  const label = LEVEL_NAMES[level] ?? level;
  return {
    title: `Level ${level} — ${label}`,
    description: `Belajar Bahasa Inggris level ${label} (${level}) di ${BRAND.name}. Materi bertahap: kosakata, grammar, reading, listening, dan writing.`,
  };
}

export default async function LevelPage({
  params,
}: PageProps<"/level/[code]">) {
  const { code } = await params;
  const level = code.toUpperCase();
  if (!CEFR_LEVELS.includes(level as (typeof CEFR_LEVELS)[number])) {
    notFound();
  }

  if (!isSupabaseConfigured()) redirect("/dashboard");

  const supabase = await createClient();
  if (!supabase) redirect("/masuk");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAnon = !user;

  // Daftar pelajaran published: anonim lewat RPC publik (meta saja, di-cache),
  // user login lewat query biasa (RLS mengizinkan sesuai akses).
  let lessons: PublicLesson[] = [];
  if (isAnon) {
    lessons = await getPublicLessonList(level);
  } else {
    const { data } = await supabase
      .from("lessons")
      .select("id, title, slug, category, is_free")
      .eq("level_code", level)
      .eq("status", "published")
      .order("category")
      .order("title");
    lessons = (data ?? []) as PublicLesson[];
  }

  // Progress + sertifikat hanya untuk user login
  const scoreByLesson = new Map<string, number>();
  let cert: { code: string } | undefined;
  if (user) {
    const { data: progress } = lessons.length
      ? await supabase
          .from("user_progress")
          .select("lesson_id, best_score")
          .eq("user_id", user.id)
          .in("lesson_id", lessons.map((l) => l.id))
      : { data: null };
    for (const p of progress ?? []) {
      if (p.best_score != null) scoreByLesson.set(p.lesson_id, p.best_score);
    }
    const { data: c } = await supabase
      .from("certificates")
      .select("code")
      .eq("user_id", user.id)
      .eq("level_code", level)
      .maybeSingle();
    cert = c ?? undefined;
  }

  const completedCount = lessons.filter(
    (l) => (scoreByLesson.get(l.id) ?? 0) >= 60,
  ).length;

  const grouped = new Map<Category, PublicLesson[]>();
  for (const lesson of lessons) {
    const cat = lesson.category as Category;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(lesson);
  }

  const order: Category[] = ["vocabulary", "grammar", "reading", "listening", "writing"];

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Link
          href={isAnon ? "/" : "/dashboard"}
          className="text-sm font-medium text-brand hover:underline"
        >
          {isAnon ? "← Beranda" : "← Dashboard"}
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-lg font-bold text-brand">
            {level}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Level {level} — {LEVEL_NAMES[level] ?? ""}
            </h1>
            <p className="text-sm text-slate-500">
              {lessons.length} pelajaran{!isAnon && ` • ${completedCount} selesai`}
            </p>
          </div>
        </div>

        {/* CTA untuk pengunjung anonim */}
        {isAnon && lessons.length > 0 && (
          <div className="mt-6 rounded-2xl border-2 border-brand bg-brand-light/30 p-6">
            <p className="text-lg font-semibold text-slate-900">
              🔒 Lihat materi selengkapnya
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Daftar gratis untuk melacak progress belajar & membuka seluruh
              pelajaran di level ini.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/daftar"
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Daftar Gratis
              </Link>
              <Link
                href="/langganan"
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Langganan
              </Link>
            </div>
          </div>
        )}

        {/* Progress bar level (login) */}
        {!isAnon && lessons.length > 0 && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-2 rounded-full bg-brand transition-all"
                style={{ width: `${Math.round((completedCount / lessons.length) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {Math.round((completedCount / lessons.length) * 100)}% selesai
            </p>
          </div>
        )}

        {/* Claim certificate (login) */}
        {!isAnon && lessons.length > 0 && (
          <div className="mt-6">
            <ClaimCertificate levelCode={level} existingCode={cert?.code} />
          </div>
        )}

        <div className="mt-8 flex flex-col gap-8">
          {order.map((cat) => {
            const items = grouped.get(cat) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={cat}>
                <h2 className="text-lg font-semibold text-slate-900">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="mt-3 flex flex-col gap-3">
                  {items.map((lesson) => {
                    const score = isAnon ? null : (scoreByLesson.get(lesson.id) ?? null);
                    return (
                      <Link
                        key={lesson.id}
                        href={`/level/${level}/${lesson.slug}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand"
                      >
                        <div className="flex items-center gap-3">
                          {score !== null && score >= 60 ? (
                            <span className="text-lg text-success">✓</span>
                          ) : score !== null ? (
                            <span className="text-sm font-semibold text-slate-400">
                              {score}%
                            </span>
                          ) : !isAnon ? (
                            <span className="text-sm text-slate-300">○</span>
                          ) : null}
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {lesson.title}
                            </h3>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              {lesson.is_free && (
                                <span className="inline-block rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                                  Gratis
                                </span>
                              )}
                              {score !== null && (
                                <span className="text-xs text-slate-400">
                                  Nilai terbaik: {score}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-brand">Buka →</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {lessons.length === 0 && (
            <p className="text-center text-sm text-slate-400">
              Belum ada pelajaran di level ini.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}