import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { readJson } from "@/lib/http";
import {
  verifyAuditUnit,
  type AuditQuestion,
  type AuditUnit,
} from "@/lib/ai/verify-answers";

export const dynamic = "force-dynamic";

interface AuditItemReport {
  module: "lesson" | "toefl" | "situational" | "placement";
  refId: string;
  title: string;
  subTitle?: string;
  status: string;
  wrong: {
    index: number;
    question: string;
    options: string[];
    storedAnswerIndex: number;
    correctAnswerIndex: number;
  }[];
  error?: string;
  updated: boolean;
}

type Scope = "all" | "lesson" | "toefl" | "situational" | "placement";

function isScope(v: unknown): v is Scope {
  return (
    v === "all" ||
    v === "lesson" ||
    v === "toefl" ||
    v === "situational" ||
    v === "placement"
  );
}

async function requireAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return Boolean(isAdmin);
}

function buildReport(
  unit: AuditUnit,
  result: Awaited<ReturnType<typeof verifyAuditUnit>>,
  updated: boolean,
): AuditItemReport {
  return {
    module: unit.module,
    refId: unit.refId,
    title: unit.title,
    subTitle: unit.subTitle,
    status: unit.status,
    wrong: result.results
      .map((r, i) => ({
        index: i,
        question: r.question,
        options: r.options,
        storedAnswerIndex: r.storedAnswerIndex,
        correctAnswerIndex: r.correctAnswerIndex ?? r.storedAnswerIndex,
      }))
      .filter((w) => w.correctAnswerIndex !== w.storedAnswerIndex),
    error: result.error,
    updated,
  };
}

function getContext(unit: {
  module: string;
  refId: string;
  title: string;
  subTitle?: string;
  status: string;
  context: string;
  questions: AuditQuestion[];
}): AuditUnit {
  return {
    module: unit.module as AuditUnit["module"],
    refId: unit.refId,
    title: unit.title,
    subTitle: unit.subTitle,
    status: unit.status,
    context: unit.context,
    questions: unit.questions,
  };
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase belum dikonfigurasi." },
      { status: 500 },
    );
  }

  const limited = await rateLimit(`audit-answers:${clientIp(request)}`, {
    limit: 5,
    window: "60 s",
  });
  if (limited) return limited;

  const supabase = await createClient();
  if (!supabase || !(await requireAdmin(supabase))) {
    return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  const scope: Scope = body.scope && isScope(body.scope) ? body.scope : "all";
  const fix = Boolean(body.fix);

  const reports: AuditItemReport[] = [];
  const stats = {
    units: 0,
    questions: 0,
    wrong: 0,
    fixedUnits: 0,
    errors: 0,
    skipped: 0,
  };

  try {
    // ---------- LESSONS ----------
    if (scope === "all" || scope === "lesson") {
      const { data: listRaw, error: listErr } = await supabase.rpc(
        "list_lessons_admin",
      );
      if (!listErr) {
        const list = Array.isArray(listRaw) ? listRaw : [];
        for (const row of list) {
          // Lewati konten yang sudah diverifikasi (kunci jawaban benar/diperbaiki).
          if (row.answers_verified_at) {
            stats.skipped++;
            continue;
          }
          const { data: detailRaw } = await supabase.rpc("get_lesson_admin", {
            p_lesson_id: row.id,
          });
          const lesson = Array.isArray(detailRaw) ? detailRaw[0] : detailRaw;
          if (!lesson) continue;

          const quiz: AuditQuestion[] = (lesson.quiz ?? []).map(
            (q: { question?: string; options?: unknown[]; answerIndex?: unknown }) => ({
              question: q.question ?? "",
              options: (q.options as string[]) ?? [],
              storedAnswerIndex: typeof q.answerIndex === "number" ? q.answerIndex : -1,
            }),
          );

          const context = [
            lesson.intro ?? "",
            ...(lesson.sections ?? []).map(
              (s: { heading?: string; body?: string }) =>
                `${s.heading ?? ""}\n${s.body ?? ""}`,
            ),
          ]
            .filter(Boolean)
            .join("\n\n");

          const unit = getContext({
            module: "lesson",
            refId: lesson.id,
            title: lesson.title ?? "Pelajaran",
            status: lesson.status ?? "draft",
            context,
            questions: quiz,
          });
          stats.units++;
          stats.questions += quiz.length;

          const result = await verifyAuditUnit(unit);
          stats.wrong += result.wrongCount;

          let updated = false;
          if (fix && result.wrongCount > 0) {
            const newQuiz = (lesson.quiz ?? []).map(
              (q: { answerIndex?: unknown }, i: number) => {
                const r = result.results[i];
                if (r?.isWrong && typeof r.correctAnswerIndex === "number") {
                  return { ...q, answerIndex: r.correctAnswerIndex };
                }
                return q;
              },
            );
            const { error: updErr } = await supabase.rpc("admin_update_lesson", {
              p_lesson_id: lesson.id,
              p_intro: lesson.intro ?? "",
              p_sections: lesson.sections ?? [],
              p_quiz: newQuiz,
              p_games: lesson.games ?? [],
            });
            if (!updErr) {
              updated = true;
              stats.fixedUnits++;
            }
          }

          // Tandai diverifikasi saat mode fix: tidak ada masalah ATAU perbaikan berhasil.
          // Dengan begitu konten ini dilewati pada audit berikutnya (hemat beban).
          if (fix && !result.error && result.wrongCount === 0) {
            await supabase.rpc("mark_lesson_answers_verified", {
              p_lesson_id: lesson.id,
            });
          } else if (fix && updated) {
            await supabase.rpc("mark_lesson_answers_verified", {
              p_lesson_id: lesson.id,
            });
          }

          const report = buildReport(unit, result, updated);
          if (report.wrong.length > 0 || report.error) reports.push(report);
          if (report.error) stats.errors++;
        }
      }
    }

    // ---------- TOEFL / AKADEMIK (reading & listening) ----------
    if (scope === "all" || scope === "toefl") {
      const { data: listRaw, error: listErr } = await supabase.rpc(
        "list_toefl_sets_admin",
      );
      if (!listErr) {
        const list = Array.isArray(listRaw) ? listRaw : [];
        for (const row of list) {
          // Lewati konten yang sudah diverifikasi.
          if (row.answers_verified_at) {
            stats.skipped++;
            continue;
          }
          const { data: detailRaw } = await supabase.rpc("get_toefl_set_admin", {
            p_set_id: row.id,
          });
          const set = Array.isArray(detailRaw) ? detailRaw[0] : detailRaw;
          if (!set) continue;
          const content = set.content ?? {};
          let setHadError = false;

          // Reading: passages[].questions
          if (Array.isArray(content.passages)) {
            for (let p = 0; p < content.passages.length; p++) {
              const passage = content.passages[p];
              const questions: AuditQuestion[] = (passage.questions ?? []).map(
                (q: { question?: string; options?: unknown[]; answerIndex?: unknown }) => ({
                  question: q.question ?? "",
                  options: (q.options as string[]) ?? [],
                  storedAnswerIndex: typeof q.answerIndex === "number" ? q.answerIndex : -1,
                }),
              );
              const unit = getContext({
                module: "toefl",
                refId: set.id,
                title: set.title ?? "Latihan Akademik",
                subTitle: `Reading • ${passage.title ?? `Passage ${p + 1}`}`,
                status: set.status ?? "draft",
                context: passage.text ?? "",
                questions,
              });
              stats.units++;
              stats.questions += questions.length;

              const result = await verifyAuditUnit(unit);
              stats.wrong += result.wrongCount;

              let updated = false;
              if (fix && result.wrongCount > 0) {
                const newQuestions = (passage.questions ?? []).map(
                  (q: { answerIndex?: unknown }, i: number) => {
                    const r = result.results[i];
                    if (r?.isWrong && typeof r.correctAnswerIndex === "number") {
                      return { ...q, answerIndex: r.correctAnswerIndex };
                    }
                    return q;
                  },
                );
                content.passages[p] = { ...passage, questions: newQuestions };
                const { error: updErr } = await supabase.rpc(
                  "admin_update_toefl_set",
                  { p_set_id: set.id, p_content: content },
                );
                if (!updErr) {
                  updated = true;
                  stats.fixedUnits++;
                } else {
                  setHadError = true;
                }
              }

              const report = buildReport(unit, result, updated);
              if (report.wrong.length > 0 || report.error) reports.push(report);
              if (report.error) {
                stats.errors++;
                setHadError = true;
              }
            }
          }

          // Listening: scripts[].questions
          if (Array.isArray(content.scripts)) {
            for (let s = 0; s < content.scripts.length; s++) {
              const script = content.scripts[s];
              const questions: AuditQuestion[] = (script.questions ?? []).map(
                (q: { question?: string; options?: unknown[]; answerIndex?: unknown }) => ({
                  question: q.question ?? "",
                  options: (q.options as string[]) ?? [],
                  storedAnswerIndex: typeof q.answerIndex === "number" ? q.answerIndex : -1,
                }),
              );
              const unit = getContext({
                module: "toefl",
                refId: set.id,
                title: set.title ?? "Latihan Akademik",
                subTitle: `Listening • ${script.title ?? `Script ${s + 1}`}`,
                status: set.status ?? "draft",
                context: script.script ?? "",
                questions,
              });
              stats.units++;
              stats.questions += questions.length;

              const result = await verifyAuditUnit(unit);
              stats.wrong += result.wrongCount;

              let updated = false;
              if (fix && result.wrongCount > 0) {
                const newQuestions = (script.questions ?? []).map(
                  (q: { answerIndex?: unknown }, i: number) => {
                    const r = result.results[i];
                    if (r?.isWrong && typeof r.correctAnswerIndex === "number") {
                      return { ...q, answerIndex: r.correctAnswerIndex };
                    }
                    return q;
                  },
                );
                content.scripts[s] = { ...script, questions: newQuestions };
                const { error: updErr } = await supabase.rpc(
                  "admin_update_toefl_set",
                  { p_set_id: set.id, p_content: content },
                );
                if (!updErr) {
                  updated = true;
                  stats.fixedUnits++;
                } else {
                  setHadError = true;
                }
              }

              const report = buildReport(unit, result, updated);
              if (report.wrong.length > 0 || report.error) reports.push(report);
              if (report.error) {
                stats.errors++;
                setHadError = true;
              }
            }
          }

          // Tandai set diverifikasi saat mode fix dan tidak ada error sama sekali.
          if (fix && !setHadError) {
            await supabase.rpc("mark_toefl_answers_verified", {
              p_set_id: set.id,
            });
          }
        }
      }
    }

    // ---------- SITUASIONAL ----------
    if (scope === "all" || scope === "situational") {
      const { data: listRaw, error: listErr } = await supabase.rpc(
        "list_situational_sets_admin",
      );
      if (!listErr) {
        const list = Array.isArray(listRaw) ? listRaw : [];
        for (const row of list) {
          // Lewati konten yang sudah diverifikasi.
          if (row.answers_verified_at) {
            stats.skipped++;
            continue;
          }
          const { data: detailRaw } = await supabase.rpc(
            "get_situational_set_admin",
            { p_set_id: row.id },
          );
          const set = Array.isArray(detailRaw) ? detailRaw[0] : detailRaw;
          if (!set) continue;
          const content = set.content ?? {};

          const aiName = content.aiName ?? "AI";
          const context = (content.dialogues ?? [])
            .map(
              (d: { speaker?: string; text?: string }) =>
                `${d.speaker === "ai" ? aiName : "Kamu"}: ${d.text ?? ""}`,
            )
            .filter(Boolean)
            .join("\n");

          const questions: AuditQuestion[] = (content.quiz ?? []).map(
            (q: { question?: string; options?: unknown[]; answerIndex?: unknown }) => ({
              question: q.question ?? "",
              options: (q.options as string[]) ?? [],
              storedAnswerIndex: typeof q.answerIndex === "number" ? q.answerIndex : -1,
            }),
          );

          const unit = getContext({
            module: "situational",
            refId: set.id,
            title: set.title ?? "Percakapan Situasional",
            status: set.status ?? "draft",
            context,
            questions,
          });
          stats.units++;
          stats.questions += questions.length;

          const result = await verifyAuditUnit(unit);
          stats.wrong += result.wrongCount;

          let updated = false;
          if (fix && result.wrongCount > 0) {
            const newQuiz = (content.quiz ?? []).map(
              (q: { answerIndex?: unknown }, i: number) => {
                const r = result.results[i];
                if (r?.isWrong && typeof r.correctAnswerIndex === "number") {
                  return { ...q, answerIndex: r.correctAnswerIndex };
                }
                return q;
              },
            );
            const newContent = { ...content, quiz: newQuiz };
            const { error: updErr } = await supabase.rpc(
              "admin_update_situational_set",
              { p_set_id: set.id, p_content: newContent },
            );
            if (!updErr) {
              updated = true;
              stats.fixedUnits++;
            }
          }

          // Tandai diverifikasi saat mode fix: tidak ada masalah ATAU perbaikan berhasil.
          if (fix && !result.error && result.wrongCount === 0) {
            await supabase.rpc("mark_situational_answers_verified", {
              p_set_id: set.id,
            });
          } else if (fix && updated) {
            await supabase.rpc("mark_situational_answers_verified", {
              p_set_id: set.id,
            });
          }

          const report = buildReport(unit, result, updated);
          if (report.wrong.length > 0 || report.error) reports.push(report);
          if (report.error) stats.errors++;
        }
      }
    }

    // ---------- PLACEMENT ----------
    if (scope === "all" || scope === "placement") {
      const { data: questionsRaw, error: qErr } = await supabase.rpc(
        "get_placement_questions_admin",
      );
      if (!qErr && Array.isArray(questionsRaw) && questionsRaw.length > 0) {
        // Lewati placement yang sudah diverifikasi (kunci jawaban benar/diperbaiki).
        const { data: verifiedRow } = await supabase.rpc(
          "get_placement_verified_admin",
        );
        const alreadyVerified = Boolean(
          Array.isArray(verifiedRow) ? verifiedRow[0] : verifiedRow,
        );
        if (alreadyVerified) {
          stats.skipped++;
        } else {
        const questions: AuditQuestion[] = questionsRaw.map(
          (q: { question?: string; options?: unknown[]; answerIndex?: unknown }) => ({
            question: q.question ?? "",
            options: (q.options as string[]) ?? [],
            storedAnswerIndex: typeof q.answerIndex === "number" ? q.answerIndex : -1,
          }),
        );

        const unit = getContext({
          module: "placement",
          refId: "placement-1",
          title: "Tes Penempatan (Placement)",
          status: "-",
          context: "",
          questions,
        });
        stats.units++;
        stats.questions += questions.length;

        const result = await verifyAuditUnit(unit);
        stats.wrong += result.wrongCount;

        let updated = false;
        if (fix && result.wrongCount > 0) {
          const newQuestions = questionsRaw.map(
            (q: { answerIndex?: unknown }, i: number) => {
              const r = result.results[i];
              if (r?.isWrong && typeof r.correctAnswerIndex === "number") {
                return { ...q, answerIndex: r.correctAnswerIndex };
              }
              return q;
            },
          );
          const { error: updErr } = await supabase.rpc(
            "save_placement_questions",
            { p_questions: newQuestions },
          );
          if (!updErr) {
            updated = true;
            stats.fixedUnits++;
          }
        }

        // Tandai diverifikasi saat mode fix: tidak ada masalah ATAU perbaikan berhasil.
        if (fix && !result.error && result.wrongCount === 0) {
          await supabase.rpc("mark_placement_answers_verified");
        } else if (fix && updated) {
          await supabase.rpc("mark_placement_answers_verified");
        }

        const report = buildReport(unit, result, updated);
        if (report.wrong.length > 0 || report.error) reports.push(report);
        if (report.error) stats.errors++;
        }
      }
    }

    return NextResponse.json({ ok: true, stats, reports });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}