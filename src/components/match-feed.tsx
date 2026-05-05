import Link from "next/link";
import type { SquadMatch } from "@/lib/stats/feed";
import { formatRelative, formatDuration } from "@/lib/stats/_shared/buckets";
import { ChampionIcon } from "@/components/champion-icon";
import { MatchDetailPanel } from "@/components/match-detail-panel";
import { Avatar } from "@/components/avatar";

type Props = {
  matches: SquadMatch[];
};

function summaryText(m: SquadMatch): string {
  const wins = m.friends.filter((f) => f.win).length;
  const losses = m.friends.length - wins;
  if (m.friends.length === 1) {
    return m.friends[0].win ? "W" : "L";
  }
  if (wins === m.friends.length) return `${wins}× W`;
  if (losses === m.friends.length) return `${losses}× L`;
  return `${wins}W / ${losses}L`;
}

export function MatchFeed({ matches }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60">
      <div className="border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">
          📺 Recent Matches
        </h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          Each card is one match. 5-stacks show as one match with all friends listed.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-zinc-400">
            No matches yet. Trigger a sync.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {matches.map((m) => {
            const wins = m.friends.filter((f) => f.win).length;
            const allWon = wins === m.friends.length;
            const allLost = wins === 0;
            const summaryClass = allWon
              ? "text-emerald-300"
              : allLost
                ? "text-rose-300"
                : "text-zinc-300";
            return (
              <li key={m.matchId}>
                <details className="group">
                  <summary className="cursor-pointer list-none px-4 py-3 transition-colors hover:bg-white/5">
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="select-none transition-transform group-open:rotate-90">
                        ▶
                      </span>
                      <span className="tabular-nums">
                        {formatRelative(m.gameCreation)}
                      </span>
                      <span className="text-zinc-700">·</span>
                      <span className="tabular-nums">
                        {formatDuration(m.gameDuration)}
                      </span>
                      <span className="text-zinc-700">·</span>
                      <span>
                        {m.friends.length}{" "}
                        {m.friends.length === 1 ? "friend" : "friends"}
                      </span>
                      <span
                        className={`ml-auto font-semibold tabular-nums ${summaryClass}`}
                      >
                        {summaryText(m)}
                      </span>
                    </div>
                    <div className="mt-2 ml-7 flex flex-col gap-1.5">
                      {m.friends.map((f) => (
                        <div
                          key={f.puuid}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Avatar
                            puuid={f.puuid}
                            displayName={f.displayName}
                            avatarUrl={f.avatarUrl}
                            size={22}
                            className="shrink-0"
                          />
                          <Link
                            href={`/players/${f.puuid}`}
                            className="w-28 shrink-0 truncate font-medium text-zinc-100 hover:text-amber-300 hover:underline"
                          >
                            {f.displayName}
                          </Link>
                          <span
                            className={
                              f.win
                                ? "inline-flex h-5 w-6 shrink-0 items-center justify-center rounded bg-emerald-500/20 text-xs font-bold text-emerald-300"
                                : "inline-flex h-5 w-6 shrink-0 items-center justify-center rounded bg-rose-500/20 text-xs font-bold text-rose-300"
                            }
                          >
                            {f.win ? "W" : "L"}
                          </span>
                          <span className="flex w-32 shrink-0 items-center gap-2 truncate text-zinc-200">
                            <ChampionIcon name={f.championName} size={20} />
                            <span className="truncate">{f.championName}</span>
                          </span>
                          <span className="tabular-nums text-zinc-300">
                            {f.kills}/{f.deaths}/{f.assists}
                          </span>
                          <span className="tabular-nums text-zinc-400">
                            {f.cs} cs
                          </span>
                        </div>
                      ))}
                    </div>
                  </summary>

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
