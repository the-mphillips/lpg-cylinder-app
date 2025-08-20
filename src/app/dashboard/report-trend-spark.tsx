"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"

export default function ReportTrendSpark({ data, dataKey }: { data: Array<Record<string, unknown>>; dataKey: string }) {
  return (
    <div className="h-8 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`mini-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" fill={`url(#mini-${dataKey})`} strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}


