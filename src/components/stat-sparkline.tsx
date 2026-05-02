"use client";

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyPoint } from "@/lib/stats/trends";

type Metric = "kda" | "visionPerMin" | "csPerMin";

type Props = {
  points: WeeklyPoint[];
  metric: Metric;
  squadAvg: number;
  label: string;
};

const UNITS: Record<Metric, string> = {
  kda: "KDA",
  visionPerMin: "vis/min",
  csPerMin: "CS/min",
};

function fmt(v: number, metric: Metric): string {
  return `${v.toFixed(1)} ${UNITS[metric]}`;
}

export function StatSparkline({ points, metric, squadAvg, label }: Props) {
  const data = points.map((p) => ({ x: p.weekStart.getTime(), y: p[metric] }));
  const current = data.length > 0 ? data[data.length - 1].y : null;

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {label}
        </span>
        <span className="text-sm font-semibold text-zinc-100">
          {current === null ? "—" : fmt(current, metric)}
        </span>
      </div>
      <div className="my-2 h-[60px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center text-xs italic text-zinc-500">
            Not enough data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <ReferenceLine
                y={squadAvg}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="2 4"
              />
              <Line
                type="monotone"
                dataKey="y"
                stroke="#fcd34d"
                strokeWidth={2}
                dot={data.length <= 5 ? { r: 2.5, fill: "#fcd34d" } : false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="text-[11px] text-zinc-500">
        vs squad avg {fmt(squadAvg, metric)}
      </p>
    </div>
  );
}
