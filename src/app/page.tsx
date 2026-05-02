import { ActivityHeatmap } from "@/components/activity-heatmap";
import { AwardCard } from "@/components/award-card";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { LpRaceChart } from "@/components/lp-race-chart";
import { MatchFeed } from "@/components/match-feed";
import { PremadeRecord } from "@/components/premade-record";
import { SynergyMatrix } from "@/components/synergy-matrix";
import { Tabs } from "@/components/tabs";
import { WeeklyRecap } from "@/components/weekly-recap";
import { ROSTER } from "@/config/roster";
import { getActivityHeatmap } from "@/lib/stats/activity";
import { computeAwards } from "@/lib/stats/awards";
import { getLeaderboard } from "@/lib/stats/leaderboard";
import { getRecentSquadMatches } from "@/lib/stats/feed";
import { getPremadeRecord, type PremadeSummary } from "@/lib/stats/premades";
import { getRankRaceData } from "@/lib/stats/race";
import { getWeeklyRecap, type WeeklyRecap as WeeklyRecapData } from "@/lib/stats/recap";
import { getActiveSplit } from "@/lib/stats/splits";
import { getDuoSynergy } from "@/lib/stats/synergy";

export const dynamic = "force-dynamic";
export const revalidate = 300;

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const EMPTY_PREMADE: PremadeSummary = {
  total: 0,
  wins: 0,
  losses: 0,
  winrate: 0,
  recent: [],
};

export default async function Home() {
  const split = getActiveSplit();
  const dbReady = Boolean(process.env.DATABASE_URL);

  const EMPTY_RECAP: WeeklyRecapData = {
    weekStart: new Date(),
    weekEnd: new Date(),
    mvp: null,
    biggestMover: null,
    worstGame: null,
    hotCold: { hot: null, cold: null },
  };

  const [rows, raceData, synergy, premades, feed, heatmap, recap] = dbReady
    ? await Promise.all([
        getLeaderboard(split.startsAt, split.endsAt).catch(() => []),
        getRankRaceData(split.startsAt, split.endsAt).catch(() => []),
        getDuoSynergy(split.startsAt, split.endsAt).catch(() => []),
        getPremadeRecord(split.startsAt, split.endsAt).catch(() => EMPTY_PREMADE),
        getRecentSquadMatches(25).catch(() => []),
        getActivityHeatmap(null, split.startsAt, split.endsAt).catch(() => []),
        getWeeklyRecap(new Date(), split.startsAt, split.endsAt).catch(
          () => EMPTY_RECAP,
        ),
      ])
    : [[], [], [], EMPTY_PREMADE, [], [], EMPTY_RECAP];

  const awards = dbReady
    ? await computeAwards(rows, split.startsAt, split.endsAt).catch(() => [])
    : [];

  const players = rows.map((r) => ({ puuid: r.puuid, displayName: r.displayName }));

  const leaderboardTab = (
    <div className="space-y-12">
      {raceData.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold tracking-tight">
            <span aria-hidden>📈</span> LP Race
          </h2>
          <LpRaceChart series={raceData} />
        </section>
      )}

      <div className="grid gap-12 lg:grid-cols-[1fr_22rem]">
        <section>
          <h2 className="mb-4 text-2xl font-bold tracking-tight">
            <span aria-hidden>🏆</span> Leaderboard
          </h2>
          <LeaderboardTable rows={rows} />
        </section>

        <section>
          <MatchFeed matches={feed} />
        </section>
      </div>

      <section>
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          <span aria-hidden>🎖️</span> Awards
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {awards.map((award) => (
            <AwardCard key={award.id} award={award} />
          ))}
        </div>
      </section>
    </div>
  );

  const recordsTab = (
    <div className="space-y-12">
      <PremadeRecord summary={premades} minStack={4} />
      <section className="rounded-xl border border-white/10 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
        Personal records & Hall of Shame coming soon.
      </section>
    </div>
  );

  const synergyTab = <SynergyMatrix players={players} pairs={synergy} />;

  const activityTab = (
    <ActivityHeatmap cells={heatmap} title="📅 Squad activity (when the boys play)" />
  );

  const recapTab = <WeeklyRecap recap={recap} />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8">
          <div className="flex items-baseline gap-3">
            <h1 className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
              Flex Stats
            </h1>
            <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/30">
              {split.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            {formatDate(split.startsAt)} — {formatDate(split.endsAt)}
          </p>
          <p className="mt-3 text-base text-zinc-300">
            Last 5 Flex matches matter. The grind never sleeps.
          </p>
          {!dbReady && (
            <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              <strong className="font-semibold">Preview mode.</strong> No
              database connected yet — see{" "}
              <code className="rounded bg-black/30 px-1 py-0.5">README.md</code>{" "}
              to wire up the database and Riot API key.
            </div>
          )}
        </header>

        <Tabs
          tabs={[
            { id: "leaderboard", label: "🏆 Leaderboard", content: leaderboardTab },
            { id: "records", label: "💎 Records", content: recordsTab },
            { id: "synergy", label: "🤝 Synergy", content: synergyTab },
            { id: "activity", label: "📅 Activity", content: activityTab },
            { id: "recap", label: "📰 Recap", content: recapTab },
          ]}
        />

        <footer className="mt-16 border-t border-white/5 pt-6 text-center text-xs text-zinc-500">
          Tracking {ROSTER.length} friend{ROSTER.length === 1 ? "" : "s"} ·
          Updated every 30 min · Made with{" "}
          <span className="text-rose-400">❤</span>
        </footer>
      </div>
    </div>
  );
}
