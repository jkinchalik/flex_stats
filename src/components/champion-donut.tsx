"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ChampionStat } from "@/lib/stats/player";

type Props = {
  stats: ChampionStat[];
};

type SliceData = {
  championId: number | null;
  championName: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  kda: number;
};

const ZINC_600 = "#52525b";
const MAX_NAMED_SLICES = 8;
const MIN_GAMES_FOR_NAMED = 3;

function championColor(championId: number, winrate: number): string {
  const hue = (championId * 137) % 360;
  const saturation = 65;
  const lightness = Math.round(40 + winrate * 20);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function sliceColor(slice: SliceData): string {
  if (slice.championId === null) return ZINC_600;
  return championColor(slice.championId, slice.winrate);
}

function buildSlices(stats: ChampionStat[]): SliceData[] {
  const sorted = [...stats].sort((a, b) => b.games - a.games);

  const named: ChampionStat[] = [];
  const other: ChampionStat[] = [];

  for (const s of sorted) {
    if (s.games < MIN_GAMES_FOR_NAMED) {
      other.push(s);
    } else if (named.length < MAX_NAMED_SLICES) {
      named.push(s);
    } else {
      other.push(s);
    }
  }

  const slices: SliceData[] = named.map((s) => ({
    championId: s.championId,
    championName: s.championName,
    games: s.games,
    wins: s.wins,
    losses: s.losses,
    winrate: s.winrate,
    kda: s.kda,
  }));

  if (other.length > 0) {
    const totalGames = other.reduce((acc, s) => acc + s.games, 0);
    const totalWins = other.reduce((acc, s) => acc + s.wins, 0);
    const totalLosses = other.reduce((acc, s) => acc + s.losses, 0);
    const totalKills = other.reduce(
      (acc, s) => acc + s.avgKills * s.games,
      0,
    );
    const totalDeaths = other.reduce(
      (acc, s) => acc + s.avgDeaths * s.games,
      0,
    );
    const totalAssists = other.reduce(
      (acc, s) => acc + s.avgAssists * s.games,
      0,
    );
    const kda = (totalKills + totalAssists) / Math.max(totalDeaths, 1);
    slices.push({
      championId: null,
      championName: "Other",
      games: totalGames,
      wins: totalWins,
      losses: totalLosses,
      winrate: totalGames > 0 ? totalWins / totalGames : 0,
      kda,
    });
  }

  return slices;
}

export function ChampionDonut({ stats }: Props) {
  if (stats.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
        <p className="mb-3 text-sm font-medium text-zinc-100">
          🎮 Champions Played
        </p>
        <div>No matches yet.</div>
      </div>
    );
  }

  const slices = buildSlices(stats);
  const totalGames = stats.reduce((acc, s) => acc + s.games, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
      <p className="mb-3 text-sm font-medium text-zinc-100">
        🎮 Champions Played
      </p>

      {/* Chart + center label */}
      <div className="relative" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="games"
              nameKey="championName"
              innerRadius={60}
              outerRadius={100}
              strokeWidth={1}
              stroke="rgba(0,0,0,0.3)"
              isAnimationActive={false}
            >
              {slices.map((slice, i) => (
                <Cell key={i} fill={sliceColor(slice)} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const slice = payload[0]?.payload as SliceData | undefined;
                if (!slice) return null;
                const winratePct = Math.round(slice.winrate * 100);
                return (
                  <div className="rounded-md border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs shadow-lg">
                    <div className="font-medium text-zinc-100">
                      {slice.championName}
                    </div>
                    <div className="mt-0.5 text-zinc-400">
                      {slice.games} games
                    </div>
                    <div className="text-zinc-400">
                      {slice.wins}W&nbsp;–&nbsp;{slice.losses}L&nbsp;(
                      {winratePct}%)
                    </div>
                    <div className="text-zinc-400">
                      KDA&nbsp;{slice.kda.toFixed(1)}
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-zinc-100">{totalGames}</span>
          <span className="text-xs text-zinc-400">games</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {slices.map((slice, i) => (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: sliceColor(slice) }}
            />
            <span
              className="max-w-[7rem] truncate text-xs text-zinc-400"
              title={slice.championName}
            >
              {slice.championName}
            </span>
            <span className="text-xs text-zinc-500">{slice.games}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
