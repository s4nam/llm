import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CEFR_LEVELS, CATEGORY_LABELS, type Category } from "@/lib/types";
import ClaimCertificate from "./claim-certificate";

const LEVEL_NAMES: Record<string, string> = {
  A1: "Pemula",
  A2: "Elementer",
  B1: "Menengah",
  B2: "Menengah Atas",
  C1: "Mahir",
  C2: "Lancar",
};

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
  if (!user) redirect("/masuk");

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, slug, category, is_free")
    .eq("level_code", level)
    .eq("status", "published")
    .order("category")
    .order("title");

  // Progress user di level ini
  const { data: progress } = lessons?.length
    ? await supabase
        .from("user_progress")
        .select("lesson_id, completed, best_score")
        .eq("user_id", user.id)
        .in("lesson_id", lessons.map((l) => l.id))
    : { data: null };
  const scoreByLesson = new Map(
    (progress ?? []).map((p) => [p.lesson_id, p.best_score]),
  );
  const completedCount = lessons?.filter(
    (l) => (scoreByLesson.get(l.id) ?? 0) >= 60,
  ).length ?? 0;

  // Sertifikat sudah ada?
  const { data: cert } = await supabase
    .from("certificates")
    .select("code")
    .eq("user_id", user.id)
    .eq("level_code", level)
    .maybeSingle();

  const grouped = new Map<Category, typeof lessons>();
  for (const lesson of lessons ?? []) {
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
          href="/dashboard"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Dashboard
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
              {(lessons?.length ?? 0)} pelajaran • {completedCount} selesai
            </p>
          </div>
        </div>

        {/* Progress bar level */}
        {lessons && lessons.length > 0 && (
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

        {/* Claim certificate */}
        {(lessons?.length ?? 0) > 0 && (
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
                    const score = scoreByLesson.get(lesson.id) ?? null;
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
                          ) : (
                            <span className="text-sm text-slate-300">○</span>
                          )}
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
        </div>
      </main>
      <Footer />
    </>
  );
}
