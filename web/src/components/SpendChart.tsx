"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatSum } from "@/lib/format";

const BRAND = "#e879f9"; // fuchsia accent (dark theme)

interface Point {
  date: string;
  amountUzs: number;
}

function TooltipBox({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-[#15151f] px-3 py-2 text-xs text-white shadow-2xl">
      <p className="text-white/50">{p.date}</p>
      <p className="font-semibold">{formatSum(p.amountUzs)}</p>
    </div>
  );
}

export function SpendChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.45} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <Tooltip content={<TooltipBox />} cursor={{ stroke: BRAND, strokeOpacity: 0.25 }} />
        <Area
          type="monotone"
          dataKey="amountUzs"
          stroke={BRAND}
          strokeWidth={2.5}
          fill="url(#spendFill)"
          dot={false}
          activeDot={{ r: 4, fill: BRAND }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
