import type { FeedMatch } from "@/lib/stats/feed";
import { formatRelative } from "@/lib/stats/_shared/buckets";
import { ChampionIcon } from "@/components/champion-icon";
import { MatchDetailPanel } from "@/components/match-detail-panel";
import { Avatar } from "@/components/avatar";

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
            return (
              <li key={`${m.matchId}-${m.puuid}`}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5">
                    {/* Expand indicator */}
                    <span className="shrink-0 select-none text-zinc-500 transition-transform group-open:rotate-90">
                      
                    </span>

                    {/* Player avatar */}
                    <Avatar puuid={m.puuid} displayName={m.displayName} avatarUrl={m.avatarUrl} size={28} className="shrink-0" />

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
                    <span className="flex w-32 shrink-0 items-center gap-2 truncate text-zinc-200">
                      <ChampionIcon name={m.championName} size={22} />
                      <span className="truncate">{m.championName}</span>
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
                  </summary>

                  {/* Lazy-loaded match detail */}
                  <MatchDetailPanel matchId={m.matchId} />
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}