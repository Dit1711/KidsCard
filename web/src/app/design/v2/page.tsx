"use client";

import {
  LayoutGrid, Users, CreditCard, ListChecks, ArrowLeftRight, ShieldCheck,
  BarChart3, Landmark, Plus, Send, ArrowDownLeft, ArrowUpRight, Bell,
  UtensilsCrossed, Gamepad2, Gift, Sparkles,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.abs(n));

const NAV = [LayoutGrid, Users, CreditCard, ListChecks, ArrowLeftRight, ShieldCheck, BarChart3, Landmark];

const KIDS = [
  { name: "Исик", balance: 1240000, grad: "from-violet-500 to-fuchsia-500", pan: "•• 3414" },
  { name: "Амир", balance: 860000, grad: "from-sky-500 to-indigo-500", pan: "•• 7782" },
  { name: "Зухра", balance: 350000, grad: "from-rose-500 to-orange-400", pan: "•• 1130" },
];

const TX = [
  { name: "Кафе «Plov Center»", when: "Сегодня", amt: -45000, Icon: UtensilsCrossed, c: "text-orange-300 bg-orange-500/15" },
  { name: "Пополнение", when: "Сегодня", amt: 500000, Icon: ArrowDownLeft, c: "text-emerald-300 bg-emerald-500/15" },
  { name: "Steam", when: "Вчера", amt: -18000, Icon: Gamepad2, c: "text-violet-300 bg-violet-500/15" },
  { name: "Карманные · Исик", when: "Пн", amt: 100000, Icon: Gift, c: "text-pink-300 bg-pink-500/15" },
];

const SERIES = [12,18,9,22,14,26,19,31,24,17,29,38,21,34].map((v, i) => ({ d: i, v: v * 1000 }));

export default function V2() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white antialiased relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-20 h-[32rem] w-[32rem] rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 -left-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/15 blur-[120px]" />

      <div className="relative flex min-h-screen">
        {/* Rail */}
        <aside className="hidden md:flex w-[72px] shrink-0 flex-col items-center gap-1 border-r border-white/5 py-5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-bold mb-4">K</span>
          {NAV.map((Icon, i) => (
            <button key={i} className={`grid h-11 w-11 place-items-center rounded-2xl transition-colors ${i === 0 ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
              <Icon className="h-5 w-5" />
            </button>
          ))}
          <span className="mt-auto grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-semibold">ДК</span>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <header className="flex items-center justify-between px-5 sm:px-8 h-16">
            <div>
              <p className="text-xs text-white/40">Семья Калановы</p>
              <h1 className="text-lg font-semibold tracking-tight">Обзор</h1>
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/70 hover:text-white">
              <Bell className="h-5 w-5" />
            </button>
          </header>

          <main className="px-5 sm:px-8 pb-10 space-y-6 max-w-4xl">
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
                  {[["Пополнить", Plus], ["Перевести", Send], ["Лимиты", ShieldCheck]].map(([label, Icon]) => {
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
              <p className="font-semibold tracking-tight mb-3">Карты детей</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chart */}
              <div className="rounded-3xl bg-white/[0.04] border border-white/5 p-6">
                <p className="font-medium tracking-tight">Динамика трат</p>
                <p className="text-xs text-white/40 mb-3">14 дней</p>
                <div className="h-40">
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

              {/* Transactions */}
              <div className="rounded-3xl bg-white/[0.04] border border-white/5 p-3">
                <p className="font-medium tracking-tight px-3 pt-3 pb-2">Операции</p>
                <div className="space-y-1">
                  {TX.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                      <span className={`grid h-10 w-10 place-items-center rounded-full ${t.c}`}>
                        <t.Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-white/40">{t.when}</p>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums ${t.amt > 0 ? "text-emerald-300" : "text-white"}`}>
                        {t.amt > 0 ? "+" : "−"}{fmt(t.amt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
