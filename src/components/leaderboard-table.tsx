import Link from "next/link";
import { formatRank, TIER_COLORS } from "@/lib/stats/ranks";
import type { LeaderboardRow } from "@/lib/stats/leaderboard";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/avatar";

type Props = {
  rows: LeaderboardRow[];
};

function rankBadge(position: number): string {
  if (position === 1) return "";
  if (position === 2) return "";
  if (position === 3) return "";
  return String(position);
}

function tierColor(tier: string | null): string {
  if (!tier) return TIER_COLORS.unranked ?? "text-zinc-400";
  return TIER_COLORS[tier.toLowerCase()] ?? "text-zinc-400";
}

export function LeaderboardTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-10 text-center">
        <p className="text-lg font-medium text-zinc-200">No data yet</p>
        <p className="mt-2 text-sm text-zinc-400">
          Kick off a sync at{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-amber-300">
            /api/sync
          </code>{" "}
          to populate the leaderboard.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
            <tr className="text-left text-xs uppercase tracking-wider text-zinc-400">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Player</th>
              <th className="px-4 py-3 font-semibold">Rank</th>
              <th className="px-4 py-3 text-right font-semibold">Games</th>
              <th className="px-4 py-3 text-right font-semibold">Win%</th>
              <th className="px-4 py-3 text-right font-semibold">KDA</th>
              <th className="px-4 py-3 text-right font-semibold">DMG/game</th>
              <th className="px-4 py-3 text-right font-semibold">Vis/min</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const position = index + 1;
              const winratePct = (row.winrate * 100).toFixed(1);
              return (
                <tr
                  key={row.puuid}
                  className="group border-t border-white/5 transition-colors even:bg-white/5 hover:bg-amber-500/5"
                >
                  <td className="px-4 py-3 align-middle">
                    <Link
                      href={`/players/${row.puuid}`}
                      className="block text-base font-bold text-zinc-200"
                    >
                      {rankBadge(position)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <Link
                      href={`/players/${row.puuid}`}
                      className="block"
                    >
                      <div className="inline-flex items-center gap-2 font-semibold text-zinc-100 group-hover:text-amber-300">
                        <Avatar puuid={row.puuid} displayName={row.displayName} avatarUrl={row.avatarUrl} size={28} />
                        {row.displayName}
                      </div>
                      <div className="text-xs text-zinc-500">{row.riotId}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <Link
                      href={`/players/${row.puuid}`}
                      className={cn("block font-medium", tierColor(row.tier))}
                    >
                      {formatRank(row.tier, row.division, row.lp)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <Link
                      href={`/players/${row.puuid}`}
                      className="block text-zinc-200"
                    >
                      {row.games}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <Link href={`/players/${row.puuid}`} className="block">
                      <div className="font-medium text-zinc-100">
                        {winratePct}%
                      </div>
                      <div className="text-xs text-zinc-500">
                        {row.splitWins}W - {row.splitLosses}L
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <Link href={`/players/${row.puuid}`} className="block">
                      <div className="font-medium text-zinc-100">
                        {row.kda.toFixed(1)}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {row.avgKills.toFixed(1)} / {row.avgDeaths.toFixed(1)} /
                        {row.avgAssists.toFixed(1)}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <Link
                      href={`/players/${row.puuid}`}
                      className="block text-zinc-200"
                    >
                      {Math.round(row.avgDamageToChampions).toLocaleString()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <Link
                      href={`/players/${row.puuid}`}
                      className="block text-zinc-200"
                    >
                      {row.avgVisionPerMin.toFixed(1)}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}