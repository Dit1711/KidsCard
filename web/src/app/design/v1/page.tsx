"use client";

import {
  LayoutGrid, Users, CreditCard, ListChecks, ArrowLeftRight,
  ShieldCheck, BarChart3, Landmark, Search, Plus, Bell, ChevronRight,
  UtensilsCrossed, Gamepad2, Baby, ArrowDownLeft, ArrowUpRight,
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
];

const KIDS = [
  { name: "Исик", pan: "4149 •• 3414", balance: 1240000, net: "HUMO", tone: "bg-indigo-500" },
  { name: "Амир", pan: "5614 •• 7782", balance: 860000, net: "UZCARD", tone: "bg-emerald-500" },
  { name: "Зухра", pan: "9921 •• 1130", balance: 350000, net: "HUMO", tone: "bg-rose-500" },
];

const TX = [
  { name: "Кафе «Plov Center»", cat: "Еда", when: "Сегодня, 14:20", amt: -45000, Icon: UtensilsCrossed },
  { name: "Пополнение с карты", cat: "Пополнение", when: "Сегодня, 09:05", amt: 500000, Icon: ArrowDownLeft },
  { name: "Steam", cat: "Игры", when: "Вчера, 19:40", amt: -18000, Icon: Gamepad2 },
  { name: "Карманные · Исик", cat: "Доход", when: "Понедельник", amt: 100000, Icon: ArrowDownLeft },
  { name: "Детский мир", cat: "Игрушки", when: "Понедельник", amt: -60000, Icon: ArrowUpRight },
];

const SERIES = [12,18,9,22,14,26,19,31,24,17,29,38,21,34].map((v, i) => ({ d: i, v: v * 1000 }));

export default function V1() {
  return (
    <div className="min-h-screen bg-[#fafafb] text-neutral-900 antialiased">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-neutral-200/80 bg-white px-4 py-5">
          <div className="flex items-center gap-2.5 px-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white text-sm font-bold">K</span>
            <span className="font-semibold tracking-tight">KidsCard</span>
          </div>
          <nav className="mt-7 space-y-0.5">
            {NAV.map((n) => (
              <a key={n.label} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
                n.active ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
              }`}>
                <n.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">ДК</span>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">Дилшод К.</p>
              <p className="text-xs text-neutral-400 truncate">Владелец</p>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-neutral-200/80 bg-[#fafafb]/80 px-5 sm:px-8 h-16 backdrop-blur">
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight">Обзор</h1>
              <p className="text-xs text-neutral-400">Семья Калановы</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 h-9 text-sm text-neutral-400 w-56">
                <Search className="h-4 w-4" /> Поиск
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800">
                <Bell className="h-[18px] w-[18px]" />
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 h-9 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
                <Plus className="h-4 w-4" /> Пополнить
              </button>
            </div>
          </header>

          <main className="px-5 sm:px-8 py-7 space-y-6 max-w-5xl">
            {/* Balance + metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-neutral-200/80 bg-white p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-neutral-500">Общий баланс детей</p>
                    <p className="mt-1.5 text-[34px] leading-none font-semibold tracking-tight tabular-nums">
                      2 450 000 <span className="text-lg font-medium text-neutral-400">сум</span>
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-600">
                      <ArrowUpRight className="h-4 w-4" /> +12,4% за месяц
                    </p>
                  </div>
                  <div className="hidden sm:block w-40 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={SERIES} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                        <defs>
                          <linearGradient id="v1spark" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2} fill="url(#v1spark)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-4">
                  <p className="text-xs text-neutral-500">Детей</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">3</p>
                </div>
                <div className="rounded-2xl border border-neutral-200/80 bg-white p-4">
                  <p className="text-xs text-neutral-500">Активных карт</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">3</p>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-2xl border border-neutral-200/80 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium tracking-tight">Динамика трат</p>
                  <p className="text-xs text-neutral-400">Последние 14 дней</p>
                </div>
                <div className="flex gap-1 text-xs">
                  {["14д", "30д", "3м"].map((t, i) => (
                    <span key={t} className={`rounded-md px-2.5 py-1 ${i === 0 ? "bg-neutral-100 font-medium" : "text-neutral-400"}`}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={SERIES} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                    <defs>
                      <linearGradient id="v1area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: "1px solid #ededf0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                      formatter={(v) => [`${fmt(Number(v))} сум`, "Траты"]} labelFormatter={() => ""}
                    />
                    <Area type="monotone" dataKey="v" stroke="#6366f1" strokeWidth={2.5} fill="url(#v1area)" dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Kids' cards */}
              <div>
                <p className="font-medium tracking-tight mb-3">Карты детей</p>
                <div className="space-y-2.5">
                  {KIDS.map((k) => (
                    <div key={k.name} className="flex items-center gap-3.5 rounded-xl border border-neutral-200/80 bg-white p-3.5">
                      <span className={`grid h-10 w-10 place-items-center rounded-full text-white ${k.tone}`}>
                        <Baby className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{k.name}</p>
                        <p className="text-xs text-neutral-400 font-mono">{k.pan} · {k.net}</p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{fmt(k.balance)} <span className="text-neutral-400 font-normal">сум</span></p>
                      <ChevronRight className="h-4 w-4 text-neutral-300" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions */}
              <div>
                <p className="font-medium tracking-tight mb-3">Последние операции</p>
                <div className="rounded-xl border border-neutral-200/80 bg-white divide-y divide-neutral-100">
                  {TX.map((t, i) => (
                    <div key={i} className="flex items-center gap-3.5 p-3.5">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-500">
                        <t.Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-neutral-400">{t.when}</p>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums ${t.amt > 0 ? "text-emerald-600" : "text-neutral-900"}`}>
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
