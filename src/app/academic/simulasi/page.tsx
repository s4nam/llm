import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireAccess } from "@/lib/require-access";
import { ACADEMIC_SEED } from "@/lib/academic-seed";
import type {
  AcademicPassage,
  AcademicScript,
  AcademicSpeakingTask,
  AcademicWritingTask,
} from "@/lib/types-academic";
import Simulation from "./simulation";

export const metadata: Metadata = {
  title: "Simulasi Tes Akademik",
};

export default async function AcademicSimulationPage() {
  const guard = await requireAccess();
  const supabase = isSupabaseConfigured() ? guard?.supabase : null;
  const hasAccess = Boolean(guard?.hasAccess);

  // Ambil 1 set published per section (fallback ke seed)
  let readingSet: { id: string; title: string; passages: AcademicPassage[] } | null = null;
  let listeningSet: { id: string; title: string; scripts: AcademicScript[] } | null = null;
  let writingSet: { id: string; title: string; task: AcademicWritingTask } | null = null;
  let speakingSet: { id: string; title: string; tasks: AcademicSpeakingTask[] } | null = null;

  if (supabase) {
    const { data: rData } = await supabase
      .from("toefl_sets")
      .select("id, title, content")
      .eq("section", "reading")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1);
    const r = rData?.[0];
    if (r?.content?.passages?.length) {
      readingSet = { id: r.id, title: r.title, passages: r.content.passages };
    }

    const { data: lData } = await supabase
      .from("toefl_sets")
      .select("id, title, content")
      .eq("section", "listening")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1);
    const l = lData?.[0];
    if (l?.content?.scripts?.length) {
      listeningSet = { id: l.id, title: l.title, scripts: l.content.scripts };
    }

    const { data: wData } = await supabase
      .from("toefl_sets")
      .select("id, title, content")
      .eq("section", "writing")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1);
    const w = wData?.[0];
    if (w?.content?.task) {
      writingSet = { id: w.id, title: w.title, task: w.content.task };
    }

    const { data: sData } = await supabase
      .from("toefl_sets")
      .select("id, title, content")
      .eq("section", "speaking")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(1);
    const sp = sData?.[0];
    if (sp?.content?.tasks?.length) {
      speakingSet = { id: sp.id, title: sp.title, tasks: sp.content.tasks };
    }
  }

  if (!readingSet) {
    const seed = ACADEMIC_SEED.find((s) => s.section === "reading");
    if (seed) readingSet = { id: "", title: seed.title, passages: (seed.content as { passages: AcademicPassage[] }).passages };
  }
  if (!listeningSet) {
    const seed = ACADEMIC_SEED.find((s) => s.section === "listening");
    if (seed) listeningSet = { id: "", title: seed.title, scripts: (seed.content as { scripts: AcademicScript[] }).scripts };
  }
  if (!writingSet) {
    const seed = ACADEMIC_SEED.find((s) => s.section === "writing");
    if (seed) writingSet = { id: "", title: seed.title, task: (seed.content as { task: AcademicWritingTask }).task };
  }
  if (!speakingSet) {
    const seed = ACADEMIC_SEED.find((s) => s.section === "speaking");
    if (seed) speakingSet = { id: "", title: seed.title, tasks: (seed.content as { tasks: AcademicSpeakingTask[] }).tasks };
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <Link href="/academic" className="text-sm font-medium text-brand hover:underline">
          ← Latihan Akademik
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">Simulasi Tes Akademik</h1>
        <p className="mt-1 text-sm text-slate-600">
          4 section (Reading, Listening, Writing, Speaking) dalam satu sesi.
          Skor total 0–120.
        </p>

        {!hasAccess ? (
          <div className="mt-6 rounded-2xl border-2 border-brand bg-brand-light/30 p-6 text-center">
            <p className="text-lg font-semibold text-slate-900">🔒 Simulasi ini untuk member</p>
            <Link
              href="/langganan"
              className="mt-4 inline-block rounded-xl bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              Langganan Sekarang
            </Link>
          </div>
        ) : !readingSet || !listeningSet || !writingSet || !speakingSet ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-surface p-6 text-slate-500">
            Belum ada konten lengkap untuk simulasi. Admin perlu generate set keempat
            section terlebih dahulu.
          </div>
        ) : (
          <div className="mt-6">
            <Simulation
              readingSet={readingSet}
              listeningSet={listeningSet}
              writingSet={writingSet}
              speakingSet={speakingSet}
            />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
