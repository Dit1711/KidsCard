"use client";

// MOCKUP SANDBOX — three gamified "teen (11–16)" home-screen directions, side by side.
// Pure static mock data, no backend. For design selection only.

import { Golos_Text } from "next/font/google";
import {
  Flame, Zap, Trophy, Target, Sparkles, TrendingUp, Lock, Check,
  ChevronRight, Rocket, Crown, Gift, PiggyBank, Award, Coins, BookOpen,
} from "lucide-react";

const golos = Golos_Text({ subsets: ["latin", "cyrillic"], display: "swap" });

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " сум";

/* ---------- shared phone frame ---------- */
function Phone({ title, sub, accent, children }: { title: string; sub: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-center">
        <p className="text-sm font-semibold text-white" style={{ color: accent }}>{title}</p>
        <p className="text-xs text-white/40 max-w-[15rem]">{sub}</p>
      </div>
      <div className="w-[320px] h-[680px] rounded-[2.5rem] border-[10px] border-black bg-black overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-2xl z-20" />
        <div className="w-full h-full overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ============================================================
   VARIANT A — "Neon Arcade": dark base, vivid neon, gamer energy
   ============================================================ */
function VariantA() {
  return (
    <div className="min-h-full bg-[#0a0a16] text-white pt-8 pb-6 px-4 space-y-4">
      {/* header: avatar + level ring + streak */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-lg font-black">И</div>
            <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-lime-400 text-black rounded-full px-1.5 py-0.5 shadow">12</span>
          </div>
          <div>
            <p className="text-sm font-semibold">Исик</p>
            <p className="text-[11px] text-cyan-300">Уровень 12 · Инвестор</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 px-2.5 py-1">
          <Flame className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-bold text-orange-300">7</span>
        </div>
      </div>

      {/* XP bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-white/50">240 / 400 XP</span>
          <span className="text-cyan-300">до ур. 13</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: "60%" }} />
        </div>
      </div>

      {/* balance card — neon glass */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-violet-600/40 to-cyan-500/20 border border-white/10">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-400/30 blur-2xl" />
        <p className="text-xs text-white/60 relative">Мой баланс</p>
        <p className="text-3xl font-black tracking-tight relative mt-1">{fmt(101232000)}</p>
        <div className="mt-3 flex gap-2 relative">
          <button className="flex-1 rounded-xl bg-white/15 backdrop-blur py-2 text-xs font-semibold">Накопить</button>
          <button className="flex-1 rounded-xl bg-cyan-400 text-black py-2 text-xs font-bold">Магазин</button>
        </div>
      </div>

      {/* daily quests */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold flex items-center gap-1.5"><Zap className="h-4 w-4 text-lime-400" /> Квесты дня</p>
          <span className="text-[11px] text-white/40">2/3</span>
        </div>
        <div className="space-y-2">
          {[
            { t: "Выполни задание", xp: 50, done: true },
            { t: "Отложи 5 000 в цель", xp: 40, done: true },
            { t: "Пройди урок «Бюджет»", xp: 60, done: false },
          ].map((q, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-2xl p-3 border ${q.done ? "bg-lime-400/10 border-lime-400/20" : "bg-white/[0.04] border-white/10"}`}>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center ${q.done ? "bg-lime-400 text-black" : "bg-white/10 text-white/40"}`}>
                {q.done ? <Check className="h-4 w-4" /> : <Target className="h-4 w-4" />}
              </div>
              <span className={`text-sm flex-1 ${q.done ? "text-white/50 line-through" : ""}`}>{q.t}</span>
              <span className="text-[11px] font-bold text-cyan-300">+{q.xp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* goal as journey */}
      <div className="rounded-3xl p-4 bg-white/[0.04] border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-1.5"><Rocket className="h-4 w-4 text-fuchsia-400" /> Цель: Самолёт</p>
          <span className="text-[11px] text-fuchsia-300">22%</span>
        </div>
        <div className="relative h-2 rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: "22%" }} />
          <span className="absolute -top-1.5 text-sm" style={{ left: "22%" }}>🚀</span>
        </div>
        <p className="text-[11px] text-white/50 mt-2">{fmt(130076)} из {fmt(6000000)}</p>
      </div>
    </div>
  );
}

/* ============================================================
   VARIANT B — "Companion": Duolingo-style mascot + league feel
   ============================================================ */
function VariantB() {
  return (
    <div className="min-h-full bg-gradient-to-b from-[#1b1340] to-[#0f0a26] text-white pt-8 pb-6 px-4 space-y-4">
      {/* top stats row */}
      <div className="flex items-center justify-between text-sm font-bold">
        <div className="flex items-center gap-1 text-orange-400"><Flame className="h-5 w-5" /> 7</div>
        <div className="flex items-center gap-1 text-cyan-300"><Zap className="h-5 w-5" /> 240</div>
        <div className="flex items-center gap-1 text-amber-300"><Coins className="h-5 w-5" /> 85</div>
        <div className="flex items-center gap-1 text-violet-300"><Crown className="h-5 w-5" /> Ур.12</div>
      </div>

      {/* mascot */}
      <div className="flex flex-col items-center py-2">
        <div className="relative h-32 w-32 rounded-full bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30 flex items-center justify-center text-6xl border border-white/10">
          🦉
          <span className="absolute -bottom-1 right-3 text-2xl">💰</span>
        </div>
        <p className="mt-3 text-sm text-white/70 text-center bg-white/[0.06] rounded-2xl px-4 py-2 border border-white/10">
          «Ты копишь 7 дней подряд! Так держать 🔥»
        </p>
      </div>

      {/* level progress */}
      <div className="rounded-3xl p-4 bg-white/[0.05] border border-white/10 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="font-semibold">Уровень 12</span>
          <span className="text-white/50">240 / 400 XP</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" style={{ width: "60%" }} />
        </div>
      </div>

      {/* league / leaderboard hint */}
      <div className="rounded-3xl p-4 bg-gradient-to-br from-amber-500/15 to-transparent border border-amber-500/20 flex items-center gap-3">
        <Trophy className="h-9 w-9 text-amber-400" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Золотая лига</p>
          <p className="text-[11px] text-white/50">Ты на 3 месте среди друзей</p>
        </div>
        <ChevronRight className="h-5 w-5 text-white/30" />
      </div>

      {/* missions */}
      <div className="space-y-2">
        <p className="text-sm font-bold">Задания</p>
        {[
          { t: "Помыть посуду", r: 10000, icon: Check, done: false },
          { t: "Урок «Бюджет»", r: 0, icon: BookOpen, done: false, xp: 60 },
        ].map((m, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl p-3 bg-white/[0.05] border border-white/10">
            <div className="h-9 w-9 rounded-xl bg-violet-500/20 flex items-center justify-center"><m.icon className="h-4 w-4 text-violet-300" /></div>
            <span className="text-sm flex-1">{m.t}</span>
            <span className="text-xs font-bold text-emerald-300">{m.r ? fmt(m.r) : `+${m.xp} XP`}</span>
          </div>
        ))}
      </div>

      {/* balance pill */}
      <div className="rounded-3xl p-4 bg-white/[0.05] border border-white/10 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-white/50">Баланс</p>
          <p className="text-xl font-black">{fmt(101232000)}</p>
        </div>
        <button className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-bold">Копить</button>
      </div>
    </div>
  );
}

/* ============================================================
   VARIANT C — "Premium + game layer": Revolut <18 sleek, subtle gamify
   ============================================================ */
function VariantC() {
  return (
    <div className="min-h-full bg-[#08080f] text-white pt-8 pb-6 px-4 space-y-5">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* avatar with XP ring */}
          <div className="relative h-12 w-12">
            <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
              <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              <circle cx="24" cy="24" r="21" fill="none" stroke="#e879f9" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 21 * 0.6} ${2 * Math.PI * 21}`} />
            </svg>
            <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-sm font-bold">И</div>
          </div>
          <div>
            <p className="text-sm font-semibold">Исик</p>
            <p className="text-[11px] text-white/40">Уровень 12 · 240/400 XP</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1">
          <Flame className="h-4 w-4 text-orange-400" />
          <span className="text-sm font-bold">7</span>
        </div>
      </div>

      {/* balance — premium dark card */}
      <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#1a1438] to-[#0d0b1f] border border-white/10">
        <p className="text-xs text-white/50">Доступно</p>
        <p className="text-3xl font-bold tracking-tight mt-1">{fmt(101232000)}</p>
        <p className="text-[11px] text-emerald-300 mt-1 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> +12 000 за неделю</p>
      </div>

      {/* achievement shelf */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Достижения</p>
          <span className="text-[11px] text-fuchsia-300">8 из 20</span>
        </div>
        <div className="flex gap-3">
          {[
            { Icon: PiggyBank, on: true, c: "#34d399" },
            { Icon: Award, on: true, c: "#e879f9" },
            { Icon: Target, on: true, c: "#60a5fa" },
            { Icon: Crown, on: false, c: "#6b7280" },
            { Icon: Lock, on: false, c: "#6b7280" },
          ].map((b, i) => (
            <div key={i} className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${b.on ? "border-white/15 bg-white/[0.06]" : "border-white/5 bg-white/[0.02]"}`}>
              <b.Icon className="h-5 w-5" style={{ color: b.c }} />
            </div>
          ))}
        </div>
      </div>

      {/* goal */}
      <div className="rounded-3xl p-4 bg-white/[0.04] border border-white/[0.06] space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-1.5"><Rocket className="h-4 w-4 text-fuchsia-400" /> Самолёт</p>
          <span className="text-[11px] text-white/40">{fmt(130076)} / {fmt(6000000)}</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: "22%" }} />
        </div>
      </div>

      {/* next task */}
      <div className="rounded-3xl p-4 bg-white/[0.04] border border-white/[0.06] flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-fuchsia-500/15 flex items-center justify-center"><Sparkles className="h-5 w-5 text-fuchsia-300" /></div>
        <div className="flex-1">
          <p className="text-sm font-medium">Урок «Бюджет»</p>
          <p className="text-[11px] text-white/40">+60 XP · 3 мин</p>
        </div>
        <button className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-3.5 py-2 text-xs font-semibold">Начать</button>
      </div>
    </div>
  );
}

export default function KidDesignSandbox() {
  return (
    <div className={`min-h-screen bg-[#050509] text-white p-8 ${golos.className}`}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Gift className="h-6 w-6 text-fuchsia-400" /> Детский кабинет — геймификация (11–16)
        </h1>
        <p className="text-white/50 mt-1 text-sm">Три направления главного экрана. Выбери одно — раскатаю его на все разделы.</p>

        <div className="mt-8 flex flex-wrap gap-10 justify-center">
          <Phone title="A · Neon Arcade" sub="Тёмная гейм-эстетика, неон, XP/квесты. Энергично, для тех, кто любит игры." accent="#22d3ee">
            <VariantA />
          </Phone>
          <Phone title="B · Companion" sub="Маскот-наставник в стиле Duolingo + лиги. Тёплый, мотивирующий, привычка." accent="#c084fc">
            <VariantB />
          </Phone>
          <Phone title="C · Premium + game layer" sub="Сдержанный финтех в стиле Revolut <18, геймификация тонким слоем. Взрослее." accent="#e879f9">
            <VariantC />
          </Phone>
        </div>
      </div>
    </div>
  );
}
