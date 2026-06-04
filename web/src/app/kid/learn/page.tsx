"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";
import { getLessons, getReadingBadges, type Lesson } from "@/lib/lessons";
import { KCard } from "@/components/kidkit";
import { GraduationCap, Star, ArrowLeft, CheckCircle2, Zap } from "lucide-react";
import { useT } from "@/i18n/locale";

export default function KidLearnPage() {
  const { isChildAuthed } = useChildStore();
  const t = useT();
  const qc = useQueryClient();
  const LESSONS = getLessons();
  const BADGES = getReadingBadges();

  const { data: progress } = useQuery({
    queryKey: ["child-lessons"],
    queryFn: async () => {
      const { data } = await childAuthService.lessonsProgress();
      return data.data;
    },
    enabled: isChildAuthed,
  });

  const completeLesson = useMutation({
    mutationFn: ({ lessonId, stars, correct }: { lessonId: string; stars: number; correct: boolean }) =>
      childAuthService.completeLesson(lessonId, stars, correct),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["child-lessons"] });
      qc.invalidateQueries({ queryKey: ["child-gamification"] });
    },
  });

  const [active, setActive] = useState<Lesson | null>(null);
  // Snapshot of "was this already done?" taken when the lesson opens, so the
  // success message doesn't flip from "+5 ⭐" to "Снова верно!" after the
  // progress query refetches.
  const [wasDone, setWasDone] = useState(false);

  const done = new Set(progress?.completedLessonIds ?? []);
  const totalStars = progress?.totalStars ?? 0;
  const completedCount = progress?.completedCount ?? 0;

  // Reading the chosen lesson then answering its quiz.
  const [answered, setAnswered] = useState<number | null>(null);

  function openLesson(l: Lesson) {
    setActive(l);
    setAnswered(null);
    setWasDone(done.has(l.id));
  }

  function pickAnswer(idx: number) {
    if (!active || answered !== null) return;
    setAnswered(idx);
    if (idx === active.quiz.correctIndex && !wasDone) {
      completeLesson.mutate({ lessonId: active.id, stars: active.stars, correct: true });
    }
  }

  // ── Lesson reader / quiz view ──
  if (active) {
    const correct = answered === active.quiz.correctIndex;
    const alreadyDone = wasDone;
    return (
      <div>
        <button
          onClick={() => setActive(null)}
          className="text-sm text-fuchsia-300 mb-3 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> {t("kidl.back")}
        </button>

        <KCard className="p-5">
          <div className="text-center mb-3">
            <div className="text-5xl mb-2">{active.emoji}</div>
            <h2 className="text-lg font-bold">{active.title}</h2>
          </div>
          <div className="space-y-3 text-sm text-white/70 leading-relaxed">
            {active.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Quiz */}
          <div className="mt-5 pt-4 border-t border-white/[0.08]">
            <p className="font-semibold mb-3">{active.quiz.question}</p>
            <div className="space-y-2">
              {active.quiz.options.map((opt, idx) => {
                const isPicked = answered === idx;
                const isRight = idx === active.quiz.correctIndex;
                let cls = "border-white/10 hover:border-fuchsia-400/50 text-white/80";
                if (answered !== null) {
                  if (isRight) cls = "border-emerald-400/50 bg-emerald-500/15 text-emerald-200";
                  else if (isPicked) cls = "border-rose-400/40 bg-rose-500/15 text-rose-200";
                  else cls = "border-white/5 text-white/30";
                }
                return (
                  <button
                    key={idx}
                    onClick={() => pickAnswer(idx)}
                    disabled={answered !== null}
                    className={`w-full text-left rounded-xl border px-4 py-2.5 text-sm transition-colors ${cls}`}
                  >
                    {opt}
                    {answered !== null && isRight && " ✓"}
                    {answered !== null && isPicked && !isRight && " ✕"}
                  </button>
                );
              })}
            </div>

            {answered !== null && (
              <div className="mt-4 text-center">
                {correct ? (
                  <p className="text-emerald-300 font-semibold inline-flex items-center gap-1.5">
                    {alreadyDone ? t("kidl.correctAgain") : <>{t("kidl.correct")} +{active.stars} <Star className="h-4 w-4 fill-current" /> <span className="text-cyan-300 inline-flex items-center gap-0.5"><Zap className="h-3.5 w-3.5" /> XP</span></>}
                  </p>
                ) : (
                  <div>
                    <p className="text-rose-300 font-medium mb-2">{t("kidl.almost")}</p>
                    <button onClick={() => setAnswered(null)} className="text-sm text-fuchsia-300 font-medium">
                      {t("kidl.retry")}
                    </button>
                  </div>
                )}
                {correct && (
                  <button
                    onClick={() => setActive(null)}
                    className="mt-3 block mx-auto bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white rounded-full px-6 py-2 text-sm font-semibold"
                  >
                    {t("kidl.next")}
                  </button>
                )}
              </div>
            )}
          </div>
        </KCard>
      </div>
    );
  }

  // ── Lesson list ──
  return (
    <div>
      <h2 className="text-base font-bold mb-1 px-1 flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-fuchsia-300" /> {t("kidl.title")}</h2>
      <p className="text-xs text-white/40 mb-3 px-1">{t("kidl.subtitle")}</p>

      {/* Stars + badges */}
      <KCard className="p-4 mb-4 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs">{t("kidl.myStars")}</p>
            <p className="text-3xl font-extrabold flex items-center gap-1.5">{totalStars} <Star className="h-6 w-6 text-amber-400 fill-amber-400" /></p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs">{t("kidl.lessonsDone")}</p>
            <p className="text-2xl font-bold">{completedCount} / {LESSONS.length}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {BADGES.map((b) => {
            const earned = completedCount >= b.threshold;
            return (
              <span
                key={b.threshold}
                title={b.label}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  earned ? "bg-white/15 text-white" : "bg-white/[0.04] text-white/30"
                }`}
              >
                {b.emoji} {b.label}
              </span>
            );
          })}
        </div>
      </KCard>

      {/* Lessons */}
      <div className="space-y-2">
        {LESSONS.map((l) => {
          const isDone = done.has(l.id);
          return (
            <button
              key={l.id}
              onClick={() => openLesson(l)}
              className="w-full rounded-3xl bg-white/[0.04] border border-white/[0.07] p-4 flex items-center gap-3 text-left hover:bg-white/[0.07] transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center text-xl shrink-0">
                {l.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{l.title}</p>
                <p className="text-xs text-white/40 truncate">{l.intro}</p>
              </div>
              <span className={`shrink-0 text-sm font-semibold inline-flex items-center gap-1 ${isDone ? "text-emerald-300" : "text-fuchsia-300"}`}>
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <>{l.stars} <Star className="h-3.5 w-3.5 fill-current" /></>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
