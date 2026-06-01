"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatSum } from "@/lib/format";

const BRAND = "#6366f1";

interface Point {
  date: string;
  amountUzs: number;
}

function TooltipBox({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-soft text-xs">
      <p className="text-muted-foreground">{p.date}</p>
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
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.32} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => d.slice(5)}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <Tooltip content={<TooltipBox />} cursor={{ stroke: BRAND, strokeOpacity: 0.2 }} />
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
