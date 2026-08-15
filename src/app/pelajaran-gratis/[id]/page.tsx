import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { FREE_LESSONS } from "@/lib/free-lessons";
import { CATEGORY_LABELS, type FreeLesson } from "@/lib/types";
import LessonPlayer from "./lesson-player";

export default async function FreeLessonPage({
  params,
}: PageProps<"/pelajaran-gratis/[id]">) {
  const { id } = await params;
  const lesson = FREE_LESSONS.find((l) => l.id === id);

  if (!lesson) notFound();

  const allIds = FREE_LESSONS.map((l) => l.id);
  const currentIndex = allIds.indexOf(id);
  const nextLesson: FreeLesson | null = allIds[currentIndex + 1]
    ? (FREE_LESSONS.find((l) => l.id === allIds[currentIndex + 1]) ?? null)
    : null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <Link
          href="/pelajaran-gratis"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Semua pelajaran gratis
        </Link>

        <p className="mt-6 text-xs font-medium uppercase tracking-wide text-brand">
          {lesson.level} • {CATEGORY_LABELS[lesson.category]}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          {lesson.title}
        </h1>

        <LessonPlayer lesson={lesson} nextLesson={nextLesson} />
      </main>
      <Footer />
    </>
  );
}
