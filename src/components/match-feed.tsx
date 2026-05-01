import Link from "next/link";
import type { FeedMatch } from "@/lib/stats/feed";
import { formatRelative } from "@/lib/stats/_shared/buckets";
import { colorForPuuid } from "@/lib/stats/_shared/palette";

type Props = {
  matches: FeedMatch[];
};

export function MatchFeed({ matches }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">
          📺 Recent Matches
        </h2>
        <p className="mt-0.5 text-xs text-zinc-400">Latest from the squad.</p>
      </div>

      {/* Body */}
      {matches.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-zinc-400">
            No matches yet. Trigger a sync.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {matches.map((m) => {
            const color = colorForPuuid(m.puuid);
            const initial = m.displayName.charAt(0).toUpperCase();

            return (
              <li key={`${m.matchId}-${m.puuid}`}>
                <Link
                  href={`/players/${m.puuid}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                >
                  {/* Friend initial circle */}
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-zinc-900"
                    style={{ backgroundColor: color }}
                  >
                    {initial}
                  </span>

                  {/* Display name */}
                  <span className="w-28 shrink-0 truncate font-medium text-zinc-100">
                    {m.displayName}
                  </span>

                  {/* W/L pill */}
                  <span
                    className={
                      m.win
                        ? "inline-flex h-5 w-6 shrink-0 items-center justify-center rounded bg-emerald-500/20 text-xs font-bold text-emerald-300"
                        : "inline-flex h-5 w-6 shrink-0 items-center justify-center rounded bg-rose-500/20 text-xs font-bold text-rose-300"
                    }
                  >
                    {m.win ? "W" : "L"}
                  </span>

                  {/* Champion */}
                  <span className="w-24 shrink-0 truncate text-zinc-200">
                    {m.championName}
                  </span>

                  {/* K/D/A */}
                  <span className="tabular-nums text-zinc-300">
                    {m.kills}/{m.deaths}/{m.assists}
                  </span>

                  {/* CS */}
                  <span className="tabular-nums text-zinc-400">
                    {m.cs} cs
                  </span>

                  {/* Time ago — pushed to the right */}
                  <span className="ml-auto shrink-0 tabular-nums text-zinc-500">
                    {formatRelative(m.gameCreation)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
