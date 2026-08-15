import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { FREE_LESSONS } from "@/lib/free-lessons";
import FreeLessonCard from "./free-lesson-card";

export default function FreeLessonsPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">
          3 Pelajaran Gratis
        </h1>
        <p className="mt-2 text-slate-600">
          Coba dulu tanpa daftar. Pelajari kosakata, grammar, dan membaca
          sederhana. Kalau cocok, lanjutkan dengan{" "}
          <Link href="/daftar" className="font-medium text-brand underline">
            mendaftar
          </Link>
          .
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {FREE_LESSONS.map((lesson, i) => (
            <FreeLessonCard
              key={lesson.id}
              lesson={lesson}
              index={i}
            />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
