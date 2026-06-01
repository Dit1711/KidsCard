"use client";

import {
  LayoutGrid, Users, CreditCard, ListChecks, ArrowLeftRight, ShieldCheck,
  BarChart3, Landmark, Search, ChevronRight, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.abs(n));
const ACCENT = "#8b7cf6";

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

const METRICS = [
  { label: "Общий баланс", value: "2 450 000", unit: "сум", delta: "+12,4%", up: true },
  { label: "Траты за месяц", value: "318 000", unit: "сум", delta: "−4,1%", up: false },
  { label: "Детей", value: "3", unit: "", delta: "активны", up: true },
  { label: "Карт активно", value: "3", unit: "", delta: "из 3", up: true },
];

const TX = [
  { name: "Plov Center", kid: "Исик", cat: "Еда", when: "14:20", amt: -45000 },
  { name: "Пополнение с карты", kid: "—", cat: "Доход", when: "09:05", amt: 500000 },
  { name: "Steam", kid: "Амир", cat: "Игры", when: "Вчера", amt: -18000 },
  { name: "Карманные", kid: "Исик", cat: "Доход", when: "Пн", amt: 100000 },
  { name: "Детский мир", kid: "Зухра", cat: "Игрушки", when: "Пн", amt: -60000 },
];

const SERIES = [12,18,9,22,14,26,19,31,24,17,29,38,21,34].map((v, i) => ({ d: i, v: v * 1000 }));

export default function V3() {
  return (
    <div className="min-h-screen bg-[#0b0b0d] text-neutral-200 antialiased"
      style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)", backgroundSize: "26px 26px" }}>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-white/[0.06] bg-[#0e0e10]/80 px-3 py-4">
          <div className="flex items-center gap-2 px-2 pb-4">
            <span className="grid h-7 w-7 place-items-center rounded-md text-[#0b0b0d] text-sm font-bold" style={{ background: ACCENT }}>K</span>
            <span className="text-sm font-semibold tracking-tight text-white">KidsCard</span>
          </div>
          <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-neutral-600">Семья</p>
          <nav className="space-y-px">
            {NAV.map((n) => (
              <a key={n.label} className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors cursor-pointer ${
                n.active ? "bg-white/[0.06] text-white" : "text-neutral-400 hover:bg-white/[0.03] hover:text-neutral-200"
              }`}>
                <n.icon className="h-4 w-4" style={n.active ? { color: ACCENT } : undefined} />
                {n.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-2.5 rounded-md px-2 py-2 text-[13px]">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-[10px] font-semibold">ДК</span>
            <span className="text-neutral-300">Дилшод К.</span>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <header className="flex items-center justify-between border-b border-white/[0.06] px-6 h-12">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="text-neutral-500">Калановы</span>
              <ChevronRight className="h-3.5 w-3.5 text-neutral-600" />
              <span className="text-white font-medium">Обзор</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 h-7 text-xs text-neutral-500">
                <Search className="h-3.5 w-3.5" /> Поиск
                <kbd className="ml-2 rounded border border-white/10 bg-white/5 px-1 text-[10px]">⌘K</kbd>
              </div>
              <button className="rounded-md px-3 h-7 text-xs font-medium text-[#0b0b0d]" style={{ background: ACCENT }}>Пополнить</button>
            </div>
          </header>

          <main className="p-6 space-y-4 max-w-5xl">
            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {METRICS.map((m) => (
                <div key={m.label} className="rounded-lg border border-white/[0.06] bg-[#121214] p-3.5">
                  <p className="text-[11px] text-neutral-500">{m.label}</p>
                  <p className="mt-1.5 font-mono text-xl text-white tabular-nums">
                    {m.value}{m.unit && <span className="text-xs text-neutral-500 ml-1">{m.unit}</span>}
                  </p>
                  <p className={`mt-1 inline-flex items-center gap-1 text-[11px] ${m.up ? "text-emerald-400" : "text-rose-400"}`}>
                    {m.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{m.delta}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="rounded-lg border border-white/[0.06] bg-[#121214] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">Динамика трат</p>
                <div className="flex gap-1 text-[11px]">
                  {["14д", "30д", "3м"].map((t, i) => (
                    <span key={t} className={`rounded px-2 py-0.5 ${i === 0 ? "bg-white/[0.06] text-white" : "text-neutral-500"}`}>{t}</span>
                  ))}
                </div>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={SERIES} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                    <defs>
                      <linearGradient id="v3area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "#1a1a1e", color: "#fff", fontSize: 11 }}
                      formatter={(v) => [`${fmt(Number(v))} сум`, "Траты"]} labelFormatter={() => ""}
                    />
                    <Area type="monotone" dataKey="v" stroke={ACCENT} strokeWidth={2} fill="url(#v3area)" dot={false} activeDot={{ r: 3, fill: ACCENT }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transactions table */}
            <div className="rounded-lg border border-white/[0.06] bg-[#121214] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm font-medium text-white">Последние операции</p>
                <span className="text-[11px] text-neutral-500">5 из 248</span>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] text-neutral-500">
                    <th className="font-normal px-4 py-2">Операция</th>
                    <th className="font-normal px-4 py-2 hidden sm:table-cell">Ребёнок</th>
                    <th className="font-normal px-4 py-2 hidden sm:table-cell">Категория</th>
                    <th className="font-normal px-4 py-2">Время</th>
                    <th className="font-normal px-4 py-2 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {TX.map((t, i) => (
                    <tr key={i} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-white">{t.name}</td>
                      <td className="px-4 py-2.5 text-neutral-400 hidden sm:table-cell">{t.kid}</td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[11px] text-neutral-400">{t.cat}</span>
                      </td>
                      <td className="px-4 py-2.5 text-neutral-400">{t.when}</td>
                      <td className={`px-4 py-2.5 text-right font-mono tabular-nums ${t.amt > 0 ? "text-emerald-400" : "text-white"}`}>
                        {t.amt > 0 ? "+" : "−"}{fmt(t.amt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
