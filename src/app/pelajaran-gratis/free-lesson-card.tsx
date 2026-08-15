import Link from "next/link";
import { CATEGORY_LABELS, type FreeLesson } from "@/lib/types";

export default function FreeLessonCard({
  lesson,
  index,
}: {
  lesson: FreeLesson;
  index: number;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-light text-lg font-bold text-brand">
          {index + 1}
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand">
            {lesson.level} • {CATEGORY_LABELS[lesson.category]}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {lesson.title}
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {lesson.intro}
          </p>
        </div>
      </div>
      <Link
        href={`/pelajaran-gratis/${lesson.id}`}
        className="shrink-0 rounded-xl bg-brand px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Mulai Belajar
      </Link>
    </div>
  );
}
