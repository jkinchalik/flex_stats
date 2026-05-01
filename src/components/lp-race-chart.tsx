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
import type { RankRaceSeries } from "@/lib/stats/race";
import { formatRank } from "@/lib/stats/ranks";
import { Legend } from "@/components/charts/legend";

type Props = {
  series: RankRaceSeries[];
};

type MergedDatum = {
  t: number;
  [puuid: string]: number | null | undefined;
};

type TooltipRow = {
  puuid: string;
  displayName: string;
  color: string;
  tier: string | null;
  division: string | null;
  lp: number;
};

function buildMergedData(series: RankRaceSeries[]): MergedDatum[] {
  const timestamps = new Set<number>();
  for (const s of series) {
    for (const p of s.points) {
      timestamps.add(p.recordedAt.getTime());
    }
  }

  const sorted = Array.from(timestamps).sort((a, b) => a - b);

  return sorted.map((t) => {
    const datum: MergedDatum = { t };
    for (const s of series) {
      const match = s.points.find((p) => p.recordedAt.getTime() === t);
      datum[s.puuid] = match?.rankSortKey ?? null;
    }
    return datum;
  });
}

type TooltipPayloadItem = {
  dataKey?: string;
  value?: number | null;
  payload?: MergedDatum;
};

export function LpRaceChart({ series }: Props) {
  if (series.length === 0) {
    return (
      <div className="flex h-[360px] items-center justify-center rounded-xl border border-white/10 bg-zinc-900/60">
        <p className="text-sm text-zinc-500">
          Not enough rank data yet — chart fills in as the cron runs.
        </p>
      </div>
    );
  }

  const data = buildMergedData(series);
  const showDots = series.length <= 1;

  const metaByPuuid = new Map<
    string,
    { displayName: string; color: string; tier: string | null; division: string | null; lp: number }
  >();
  for (const s of series) {
    const last = s.points[s.points.length - 1];
    metaByPuuid.set(s.puuid, {
      displayName: s.displayName,
      color: s.color,
      tier: last?.tier ?? null,
      division: last?.division ?? null,
      lp: last?.lp ?? 0,
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
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
                const first = payload[0] as TooltipPayloadItem | undefined;
                const datum = first?.payload;
                if (!datum) return null;
                const date = new Date(datum.t);

                const rows: TooltipRow[] = (payload as unknown as TooltipPayloadItem[])
                  .filter((item) => item.value != null && typeof item.dataKey === "string")
                  .map((item) => {
                    const puuid = item.dataKey as string;
                    const rankPoint = series
                      .find((s) => s.puuid === puuid)
                      ?.points.find((p) => p.recordedAt.getTime() === datum.t);
                    return {
                      puuid,
                      displayName: metaByPuuid.get(puuid)?.displayName ?? puuid,
                      color: metaByPuuid.get(puuid)?.color ?? "#fff",
                      tier: rankPoint?.tier ?? null,
                      division: rankPoint?.division ?? null,
                      lp: rankPoint?.lp ?? 0,
                    };
                  });

                return (
                  <div className="rounded-md border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs shadow-lg">
                    <div className="mb-1 text-zinc-400">
                      {date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    {rows.map((r) => (
                      <div key={r.puuid} className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: r.color }}
                        />
                        <span className="text-zinc-300">{r.displayName}</span>
                        <span className="text-zinc-100 font-medium">
                          {formatRank(r.tier, r.division, r.lp)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            {series.map((s) => (
              <Line
                key={s.puuid}
                type="monotone"
                dataKey={s.puuid}
                stroke={s.color}
                strokeWidth={2}
                dot={showDots ? { r: 2.5, fill: s.color } : false}
                activeDot={{ r: 4 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Legend players={series.map((s) => ({ puuid: s.puuid, displayName: s.displayName }))} />
    </div>
  );
}
