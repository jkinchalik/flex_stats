import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ChampionStatsTable } from "@/components/champion-stats-table";
import { RankHistoryChart } from "@/components/rank-history-chart";
import { RecentMatches } from "@/components/recent-matches";
import {
  getChampionStats,
  getPlayerOverview,
  getRankHistory,
  getRecentMatches,
} from "@/lib/stats/player";
import { formatRank, TIER_COLORS } from "@/lib/stats/ranks";
import { getActiveSplit } from "@/lib/stats/splits";

export const dynamic = "force-dynamic";
export const revalidate = 300;

function tierColor(tier: string | null): string {
  if (!tier) return TIER_COLORS.unranked ?? "text-zinc-400";
  return TIER_COLORS[tier.toLowerCase()] ?? "text-zinc-400";
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ puuid: string }>;
}) {
  const { puuid } = await params;

  const overview = await getPlayerOverview(puuid);
  if (!overview) {
    notFound();
  }

  const split = getActiveSplit();
  const [rankPoints, recent, champStats] = await Promise.all([
    getRankHistory(puuid, split.startsAt),
    getRecentMatches(puuid, 20),
    getChampionStats(puuid, split.startsAt),
  ]);

  const totalGames = overview.wins + overview.losses;
  const winratePct =
    totalGames > 0 ? ((overview.wins / totalGames) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to leaderboard
          </Link>
        </div>

        <header className="mb-8 flex flex-col gap-4 rounded-xl border border-white/10 bg-zinc-900/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">
              {overview.displayName}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{overview.riotId}</p>
            <p
              className={`mt-3 text-base font-semibold ${tierColor(overview.tier)}`}
            >
              {formatRank(overview.tier, overview.division, overview.lp)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-zinc-500">
              {split.label}
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">
              <span className="text-emerald-300">{overview.wins}</span>
              <span className="mx-1 text-zinc-600">-</span>
              <span className="text-rose-300">{overview.losses}</span>
            </div>
            <div className="text-sm text-zinc-400">{winratePct}% winrate</div>
          </div>
        </header>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-zinc-200">
            📈 Rank this split
          </h2>
          <RankHistoryChart points={rankPoints} />
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-200">
              🎮 Recent Matches
            </h2>
            <RecentMatches matches={recent} />
          </section>
          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-200">
              🏹 Champions
            </h2>
            <ChampionStatsTable stats={champStats} />
          </section>
        </div>

        <footer className="mt-10 text-xs text-zinc-600">
          {overview.lastSyncedAt
            ? `Last synced ${formatRelative(overview.lastSyncedAt)}`
            : "Never synced"}
        </footer>
      </div>
    </div>
  );
}
