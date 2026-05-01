import Link from "next/link";
import type { PremadeSummary } from "@/lib/stats/premades";
import { colorForPuuid } from "@/lib/stats/_shared/palette";
import { formatRelative, formatDuration } from "@/lib/stats/_shared/buckets";

type Props = {
  summary: PremadeSummary;
  minStack: number;
};

export function PremadeRecord({ summary, minStack }: Props) {
  const winratePct = Math.round(summary.winrate * 100);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-5">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-100">
          🎯 Squad Premades ({minStack}+ stack)
        </h2>
        <p className="mt-0.5 text-sm text-zinc-400">
          When the boys queue together this split
        </p>
      </div>

      {/* Big stat block */}
      {summary.total > 0 && (
        <div className="mb-5 flex items-center gap-4">
          <span className="text-4xl font-bold text-amber-400">
            {summary.wins}-{summary.losses}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${
              winratePct >= 50
                ? "bg-green-500/15 text-green-400 ring-green-500/30"
                : "bg-red-500/15 text-red-400 ring-red-500/30"
            }`}
          >
            {winratePct}% WR
          </span>
        </div>
      )}

      {/* Recent matches list */}
      {summary.recent.length === 0 ? (
        <p className="py-4 text-center text-sm italic text-zinc-500">
          No premade matches yet this split. Queue up!
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {summary.recent.map((match) => (
            <li key={`${match.matchId}:${match.teamId}`}>
              <Link
                href={`/players/${match.friends[0]?.puuid ?? ""}`}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-zinc-800/50 px-3 py-2.5 transition-colors hover:border-amber-400/30 hover:bg-zinc-800"
              >
                {/* Time ago */}
                <span className="w-14 shrink-0 text-xs text-zinc-500">
                  {formatRelative(match.gameCreation)}
                </span>

                {/* W/L pill */}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                    match.win
                      ? "bg-green-500/15 text-green-400 ring-green-500/30"
                      : "bg-red-500/15 text-red-400 ring-red-500/30"
                  }`}
                >
                  {match.win ? "W" : "L"}
                </span>

                {/* Friend initials in colored circles */}
                <div className="flex items-center gap-1">
                  {match.friends.map((friend) => {
                    const color = colorForPuuid(friend.puuid);
                    const initials = friend.displayName
                      .split(/\s+/)
                      .map((w) => w[0] ?? "")
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <span
                        key={friend.puuid}
                        title={`${friend.displayName} — ${friend.championName} (${friend.kills}/${friend.deaths}/${friend.assists})`}
                        style={{ backgroundColor: color + "26", color, borderColor: color + "4d" }}
                        className="flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold"
                      >
                        {initials || "?"}
                      </span>
                    );
                  })}
                </div>

                {/* Duration */}
                <span className="ml-auto shrink-0 text-xs text-zinc-500">
                  {formatDuration(match.gameDuration)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
