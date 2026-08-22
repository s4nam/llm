import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/require-access";
import { getTopic, SITUATIONAL_TOPICS } from "@/lib/types-situational";
import { SITUATIONAL_SEED } from "@/lib/situational-seed";

export async function generateMetadata({
  params,
}: PageProps<"/percakapan-situasional/[topic]">): Promise<Metadata> {
  const { topic } = await params;
  const t = getTopic(topic);
  return {
    title: t ? `${t.label} — Percakapan Situasional` : "Percakapan Situasional",
  };
}

export default async function SituationalTopicPage({
  params,
}: PageProps<"/percakapan-situasional/[topic]">) {
  const { topic } = await params;
  const topicInfo = getTopic(topic);
  if (!topicInfo) notFound();

  const guard = await requireAccess();
  if (!guard?.hasAccess) redirect("/percakapan-situasional");

  const supabase = guard.supabase;

  const { data: raw } = await supabase
    .from("situational_sets")
    .select("id, title, slug, is_free")
    .eq("topic", topic)
    .eq("status", "published")
    .order("title");
  const sets = raw ?? [];

  // Fallback seed bila belum ada set AI
  const seedSets = SITUATIONAL_SEED.filter((s) => s.topic === topic);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Link
          href="/percakapan-situasional"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Percakapan Situasional
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-xl">
            {topicInfo.icon}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{topicInfo.label}</h1>
            <p className="text-sm text-slate-500">{topicInfo.description}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {sets.length === 0 && seedSets.length > 0 && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Belum ada set dari AI — menampilkan set cadangan bawaan agar Anda
              bisa mencoba.
            </p>
          )}
          {sets.length === 0 && seedSets.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-surface p-6 text-slate-500">
              Belum ada set untuk topik ini. Admin perlu generate terlebih dahulu.
            </p>
          )}
          {sets.map((s) => (
            <Link
              key={s.id}
              href={`/percakapan-situasional/${topic}/${s.slug}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand"
            >
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{s.title}</h2>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {s.is_free && (
                      <span className="inline-block rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                        Gratis
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-brand">Buka →</span>
            </Link>
          ))}
          {/* Seed fallback */}
          {sets.length === 0 &&
            seedSets.map((s) => (
              <Link
                key={s.slug}
                href={`/percakapan-situasional/${topic}/${s.slug}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand"
              >
                <div>
                  <h2 className="font-semibold text-slate-900">{s.title}</h2>
                  <span className="inline-block rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                    Gratis
                  </span>
                </div>
                <span className="text-brand">Buka →</span>
              </Link>
            ))}
        </div>
      </main>
      <Footer />
    </>
  );
}