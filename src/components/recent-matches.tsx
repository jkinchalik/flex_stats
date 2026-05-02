import type { RecentMatch } from "@/lib/stats/player";
import { formatRelative, formatDuration } from "@/lib/stats/_shared/buckets";
import { ChampionIcon } from "@/components/champion-icon";

type Props = {
  matches: RecentMatch[];
};

export function RecentMatches({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-6 text-center">
        <p className="text-sm text-zinc-400">No matches yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/95">
            <tr className="text-left text-xs uppercase tracking-wider text-zinc-400">
              <th className="px-3 py-2 font-semibold">Result</th>
              <th className="px-3 py-2 font-semibold">Champion</th>
              <th className="px-3 py-2 text-right font-semibold">K/D/A</th>
              <th className="px-3 py-2 text-right font-semibold">CS</th>
              <th className="px-3 py-2 text-right font-semibold">Vis</th>
              <th className="px-3 py-2 text-right font-semibold">Time</th>
              <th className="px-3 py-2 text-right font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr
                key={m.matchId}
                className="border-t border-white/5 even:bg-white/5"
              >
                <td className="px-3 py-2">
                  <span
                    className={
                      m.win
                        ? "inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-500/20 text-xs font-bold text-emerald-300"
                        : "inline-flex h-6 w-6 items-center justify-center rounded bg-rose-500/20 text-xs font-bold text-rose-300"
                    }
                  >
                    {m.win ? "W" : "L"}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium text-zinc-100">
                  <span className="flex items-center gap-2">
                    <ChampionIcon name={m.championName} size={24} />
                    <span>{m.championName}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-200">
                  {m.kills}/{m.deaths}/{m.assists}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                  {m.cs}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                  {m.visionScore}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-400">
                  {formatDuration(m.gameDuration)}
                </td>
                <td className="px-3 py-2 text-right text-zinc-500">
                  {formatRelative(m.gameCreation)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
