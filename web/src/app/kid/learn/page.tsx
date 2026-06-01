"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { childAuthService } from "@/lib/api";
import { useChildStore } from "@/store/child";
import { LESSONS, BADGES, type Lesson } from "@/lib/lessons";

export default function KidLearnPage() {
  const { isChildAuthed } = useChildStore();
  const qc = useQueryClient();

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["child-lessons"] }),
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
          className="text-sm text-purple-500 mb-3"
        >
          ← Назад к урокам
        </button>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="text-center mb-3">
            <div className="text-5xl mb-2">{active.emoji}</div>
            <h2 className="text-lg font-bold text-purple-800">{active.title}</h2>
          </div>
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            {active.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Quiz */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="font-semibold text-purple-800 mb-3">❓ {active.quiz.question}</p>
            <div className="space-y-2">
              {active.quiz.options.map((opt, idx) => {
                const isPicked = answered === idx;
                const isRight = idx === active.quiz.correctIndex;
                let cls = "border-gray-200 hover:border-purple-300";
                if (answered !== null) {
                  if (isRight) cls = "border-green-400 bg-green-50 text-green-700";
                  else if (isPicked) cls = "border-red-300 bg-red-50 text-red-600";
                  else cls = "border-gray-100 text-gray-400";
                }
                return (
                  <button
                    key={idx}
                    onClick={() => pickAnswer(idx)}
                    disabled={answered !== null}
                    className={`w-full text-left rounded-xl border px-4 py-2.5 text-sm transition-colors ${cls}`}
                  >
                    {opt}
                    {answered !== null && isRight && " ✅"}
                    {answered !== null && isPicked && !isRight && " ❌"}
                  </button>
                );
              })}
            </div>

            {answered !== null && (
              <div className="mt-4 text-center">
                {correct ? (
                  <p className="text-green-600 font-semibold">
                    {alreadyDone ? "Снова верно! 🎉" : `Верно! +${active.stars} ⭐`}
                  </p>
                ) : (
                  <div>
                    <p className="text-red-500 font-medium mb-2">Почти! Попробуй ещё разок 🙂</p>
                    <button
                      onClick={() => setAnswered(null)}
                      className="text-sm text-purple-600 font-medium"
                    >
                      Ответить заново
                    </button>
                  </div>
                )}
                {correct && (
                  <button
                    onClick={() => setActive(null)}
                    className="mt-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6 py-2 text-sm font-medium"
                  >
                    Дальше
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Lesson list ──
  return (
    <div>
      <h2 className="text-base font-bold text-purple-800 mb-1 px-1">🎓 Учёба про деньги</h2>
      <p className="text-xs text-gray-400 mb-3 px-1">Проходи уроки, отвечай на вопросы, копи звёзды</p>

      {/* Stars + badges */}
      <div className="bg-gradient-to-br from-amber-400 to-orange-400 text-white rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-xs">Мои звёзды</p>
            <p className="text-3xl font-extrabold">{totalStars} ⭐</p>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-xs">Уроков пройдено</p>
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
                  earned ? "bg-white/25" : "bg-black/10 opacity-50"
                }`}
              >
                {b.emoji} {b.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Lessons */}
      <div className="space-y-2">
        {LESSONS.map((l) => {
          const isDone = done.has(l.id);
          return (
            <button
              key={l.id}
              onClick={() => openLesson(l)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 text-left hover:bg-purple-50 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-purple-50 flex items-center justify-center text-xl shrink-0">
                {l.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{l.title}</p>
                <p className="text-xs text-gray-400 truncate">{l.intro}</p>
              </div>
              <span className={`shrink-0 text-sm font-semibold ${isDone ? "text-green-600" : "text-purple-400"}`}>
                {isDone ? "✅" : `${l.stars} ⭐`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
