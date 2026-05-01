import { AwardCard } from "@/components/award-card";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { ROSTER } from "@/config/roster";
import { computeAwards } from "@/lib/stats/awards";
import { getLeaderboard } from "@/lib/stats/leaderboard";
import { getActiveSplit } from "@/lib/stats/splits";

export const dynamic = "force-dynamic";
export const revalidate = 300;

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function Home() {
  const split = getActiveSplit();
  const dbReady = Boolean(process.env.DATABASE_URL);
  const rows = dbReady
    ? await getLeaderboard(split.startsAt, split.endsAt).catch(() => [])
    : [];
  const awards = dbReady
    ? await computeAwards(rows, split.startsAt, split.endsAt).catch(() => [])
    : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-10">
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
              database connected yet — see <code className="rounded bg-black/30 px-1 py-0.5">README.md</code> to wire up Neon and your Riot API key.
            </div>
          )}
        </header>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-zinc-100">
            <span aria-hidden>🏆</span> Leaderboard
          </h2>
          <LeaderboardTable rows={rows} />
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-zinc-100">
            <span aria-hidden>🎖️</span> Awards
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {awards.map((award) => (
              <AwardCard key={award.id} award={award} />
            ))}
          </div>
        </section>

        <footer className="mt-16 border-t border-white/5 pt-6 text-center text-xs text-zinc-500">
          Tracking {ROSTER.length} friend{ROSTER.length === 1 ? "" : "s"} ·
          Updated every 30 min · Made with{" "}
          <span className="text-rose-400">❤</span>
        </footer>
      </div>
    </div>
  );
}
