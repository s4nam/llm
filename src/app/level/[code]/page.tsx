import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { CEFR_LEVELS, CATEGORY_LABELS, type Category } from "@/lib/types";

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
              {(lessons?.length ?? 0)} pelajaran tersedia
            </p>
          </div>
        </div>

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
                  {items.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={`/level/${level}/${lesson.slug}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand"
                    >
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {lesson.title}
                        </h3>
                        {lesson.is_free && (
                          <span className="mt-1 inline-block rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                            Gratis
                          </span>
                        )}
                      </div>
                      <span className="text-brand">Buka →</span>
                    </Link>
                  ))}
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
