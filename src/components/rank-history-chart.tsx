"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RankHistoryPoint } from "@/lib/stats/player";
import { formatRank } from "@/lib/stats/ranks";

type Props = {
  points: RankHistoryPoint[];
};

type ChartDatum = {
  t: number;
  rankSortKey: number;
  tier: string | null;
  division: string | null;
  lp: number;
};

export function RankHistoryChart({ points }: Props) {
  if (points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60">
        <p className="text-sm text-zinc-500">Not enough rank data yet</p>
      </div>
    );
  }

  const data: ChartDatum[] = points.map((p) => ({
    t: p.recordedAt.getTime(),
    rankSortKey: p.rankSortKey,
    tier: p.tier,
    division: p.division,
    lp: p.lp,
  }));

  const showDots = points.length <= 30;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
          />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
            tickFormatter={(v: number) =>
              new Date(v).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })
            }
          />
          <YAxis hide domain={["dataMin - 50", "dataMax + 50"]} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const datum = payload[0]?.payload as ChartDatum | undefined;
              if (!datum) return null;
              const date = new Date(datum.t);
              return (
                <div className="rounded-md border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs shadow-lg">
                  <div className="text-zinc-400">
                    {date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="mt-0.5 font-medium text-zinc-100">
                    {formatRank(datum.tier, datum.division, datum.lp)}
                  </div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="rankSortKey"
            stroke="#d4d4d8"
            strokeWidth={2}
            dot={showDots ? { r: 2.5, fill: "#d4d4d8" } : false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
