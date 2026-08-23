import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { requireAccess } from "@/lib/require-access";
import { getTopic } from "@/lib/types-situational";
import { SITUATIONAL_SEED } from "@/lib/situational-seed";
import type { SituationalSetContent } from "@/lib/types-situational";
import SituationalPlayer from "./situational-player";

export async function generateMetadata({
  params,
}: PageProps<"/percakapan-situasional/[topic]/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function SituationalSetPage({
  params,
}: PageProps<"/percakapan-situasional/[topic]/[slug]">) {
  const { topic, slug } = await params;
  const topicInfo = getTopic(topic);
  if (!topicInfo) notFound();

  const guard = await requireAccess();
  if (!guard?.hasAccess) notFound();

  const supabase = guard.supabase;

  // Ambil set published (RLS: is_free atau member)
  const { data: setRow } = await supabase
    .from("situational_sets")
    .select("id, topic, title, slug, content, is_free")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (setRow) {
    return (
      <>
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
          <Link
            href={`/percakapan-situasional/${topic}`}
            className="text-sm font-medium text-brand hover:underline"
          >
            ← {topicInfo.label}
          </Link>
          <p className="mt-6 text-xs font-medium uppercase tracking-wide text-brand">
            {topicInfo.icon} {topicInfo.label} • Percakapan
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{setRow.title}</h1>
          <SituationalPlayer
            title={setRow.title}
            content={setRow.content as SituationalSetContent}
            setId={setRow.id}
            slug={setRow.slug}
          />
        </main>
        <Footer />
      </>
    );
  }

  // Fallback seed (is_free)
  const seed = SITUATIONAL_SEED.find((s) => s.topic === topic && s.slug === slug);
  if (!seed) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <Link
          href={`/percakapan-situasional/${topic}`}
          className="text-sm font-medium text-brand hover:underline"
        >
          ← {topicInfo.label}
        </Link>
        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-brand">
          {topicInfo.icon} {topicInfo.label} • Percakapan
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{seed.title}</h1>
        <SituationalPlayer title={seed.title} content={seed.content} slug={seed.slug} />
      </main>
      <Footer />
    </>
  );
}