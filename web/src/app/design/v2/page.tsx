"use client";

import {
  LayoutGrid, Users, CreditCard, ListChecks, ArrowLeftRight, ShieldCheck,
  BarChart3, Landmark, Wallet, Plus, Send, ArrowDownLeft, Bell, Search,
  UtensilsCrossed, Gamepad2, Gift, Sparkles, Target, ChevronRight,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.abs(n));

const NAV = [
  { icon: LayoutGrid, label: "Обзор", active: true },
  { icon: Users, label: "Семья" },
  { icon: CreditCard, label: "Карты" },
  { icon: ListChecks, label: "Задания" },
  { icon: ArrowLeftRight, label: "Операции" },
  { icon: ShieldCheck, label: "Лимиты" },
  { icon: BarChart3, label: "Аналитика" },
  { icon: Landmark, label: "Банк" },
  { icon: Wallet, label: "Карманные" },
];

const KIDS = [
  { name: "Исик", balance: 1240000, grad: "from-violet-500 to-fuchsia-500", pan: "•• 3414" },
  { name: "Амир", balance: 860000, grad: "from-sky-500 to-indigo-500", pan: "•• 7782" },
  { name: "Зухра", balance: 350000, grad: "from-rose-500 to-orange-400", pan: "•• 1130" },
];

const TX = [
  { name: "Кафе «Plov Center»", when: "Сегодня, 14:20", amt: -45000, Icon: UtensilsCrossed, c: "text-orange-300 bg-orange-500/15" },
  { name: "Пополнение с карты", when: "Сегодня, 09:05", amt: 500000, Icon: ArrowDownLeft, c: "text-emerald-300 bg-emerald-500/15" },
  { name: "Steam · Амир", when: "Вчера, 19:40", amt: -18000, Icon: Gamepad2, c: "text-violet-300 bg-violet-500/15" },
  { name: "Карманные · Исик", when: "Понедельник", amt: 100000, Icon: Gift, c: "text-pink-300 bg-pink-500/15" },
];

const GOALS = [
  { name: "Велосипед · Исик", cur: 640000, target: 1200000, grad: "from-violet-500 to-fuchsia-500" },
  { name: "Наушники · Амир", cur: 180000, target: 400000, grad: "from-sky-500 to-indigo-500" },
];

const SERIES = [12,18,9,22,14,26,19,31,24,17,29,38,21,34].map((v, i) => ({ d: i, v: v * 1000 }));

export default function V2() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#08080f] text-white antialiased">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-[34rem] w-[34rem] rounded-full bg-violet-600/20 blur-[130px]" />
        <div className="absolute top-1/3 -right-32 h-[30rem] w-[30rem] rounded-full bg-fuchsia-600/15 blur-[130px]" />
      </div>

      <div className="relative flex min-h-full">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0b15]/60 backdrop-blur px-3 py-5 sticky top-0 h-screen">
          <div className="flex items-center gap-2.5 px-2 mb-6">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-bold">K</span>
            <span className="font-semibold tracking-tight">KidsCard</span>
          </div>
          <nav className="space-y-0.5">
            {NAV.map((n) => (
              <a key={n.label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                n.active ? "bg-white/[0.08] text-white font-medium" : "text-white/45 hover:text-white hover:bg-white/[0.04]"
              }`}>
                <n.icon className="h-[18px] w-[18px]" style={n.active ? { color: "#e879f9" } : undefined} />
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-semibold">ДК</span>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">Дилшод К.</p>
              <p className="text-xs text-white/40 truncate">Владелец</p>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 px-5 sm:px-8 h-16">
            <div>
              <p className="text-xs text-white/40">Семья Калановы</p>
              <h1 className="text-lg font-semibold tracking-tight">Обзор</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/[0.05] px-3.5 h-10 text-sm text-white/40 w-52">
                <Search className="h-4 w-4" /> Поиск
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.05] text-white/70 hover:text-white">
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </header>

          <main className="px-5 sm:px-8 pb-10 space-y-6 max-w-5xl">
            {/* Balance hero */}
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600 p-7 sm:p-8">
              <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <Sparkles className="h-4 w-4" /> Общий баланс детей
                </div>
                <p className="mt-2 text-5xl sm:text-6xl font-bold tracking-tight tabular-nums">2 450 000</p>
                <p className="text-white/70 mt-1">сум · +12,4% за месяц</p>
                <div className="flex flex-wrap gap-2.5 mt-6">
                  {[["Пополнить", Plus], ["Перевести", Send], ["Лимиты", ShieldCheck], ["Задания", ListChecks]].map(([label, Icon]) => {
                    const I = Icon as React.ElementType;
                    return (
                      <button key={label as string} className="flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur px-4 py-2.5 text-sm font-medium transition-colors">
                        <I className="h-4 w-4" /> {label as string}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Kids cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold tracking-tight">Карты детей</p>
                <a className="text-sm text-fuchsia-300/80 hover:text-fuchsia-300 cursor-pointer">Все карты</a>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1">
                {KIDS.map((k) => (
                  <div key={k.name} className={`shrink-0 w-56 rounded-3xl bg-gradient-to-br ${k.grad} p-5`}>
                    <div className="flex items-center justify-between">
                      <CreditCard className="h-5 w-5 text-white/80" />
                      <span className="text-xs text-white/70 font-mono">{k.pan}</span>
                    </div>
                    <p className="mt-8 text-white/70 text-xs">{k.name}</p>
                    <p className="text-2xl font-bold tabular-nums">{fmt(k.balance)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Chart */}
              <div className="lg:col-span-3 rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium tracking-tight">Динамика трат</p>
                    <p className="text-xs text-white/40">Последние 14 дней</p>
                  </div>
                  <div className="flex gap-1 text-xs">
                    {["14д", "30д", "3м"].map((t, i) => (
                      <span key={t} className={`rounded-lg px-2.5 py-1 ${i === 0 ? "bg-white/10 text-white" : "text-white/40"}`}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="h-44 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={SERIES} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                      <defs>
                        <linearGradient id="v2area" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d946ef" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#d946ef" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "#15151f", color: "#fff", fontSize: 12 }}
                        formatter={(v) => [`${fmt(Number(v))} сум`, "Траты"]} labelFormatter={() => ""}
                      />
                      <Area type="monotone" dataKey="v" stroke="#e879f9" strokeWidth={2.5} fill="url(#v2area)" dot={false} activeDot={{ r: 4, fill: "#e879f9" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Goals */}
              <div className="lg:col-span-2 rounded-3xl bg-white/[0.04] border border-white/[0.06] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-fuchsia-300" />
                  <p className="font-medium tracking-tight">Цели накопления</p>
                </div>
                <div className="space-y-4">
                  {GOALS.map((g) => {
                    const pct = Math.round((g.cur / g.target) * 100);
                    return (
                      <div key={g.name}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-white/80">{g.name}</span>
                          <span className="text-white/50 tabular-nums">{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${g.grad}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-white/40 mt-1 tabular-nums">{fmt(g.cur)} из {fmt(g.target)} сум</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Transactions */}
            <div className="rounded-3xl bg-white/[0.04] border border-white/[0.06] p-3">
              <div className="flex items-center justify-between px-3 pt-2 pb-2">
                <p className="font-medium tracking-tight">Последние операции</p>
                <a className="flex items-center gap-1 text-sm text-white/40 hover:text-white cursor-pointer">Все <ChevronRight className="h-4 w-4" /></a>
              </div>
              <div className="space-y-1">
                {TX.map((t, i) => (
                  <div key={i} className="flex items-center gap-3.5 rounded-2xl px-3 py-3 hover:bg-white/5 transition-colors">
                    <span className={`grid h-11 w-11 place-items-center rounded-full ${t.c}`}>
                      <t.Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs text-white/40">{t.when}</p>
                    </div>
                    <p className={`text-sm font-semibold tabular-nums ${t.amt > 0 ? "text-emerald-300" : "text-white"}`}>
                      {t.amt > 0 ? "+" : "−"}{fmt(t.amt)} <span className="text-white/40 font-normal">сум</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
