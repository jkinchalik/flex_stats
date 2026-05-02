import type { ChampionStat } from "@/lib/stats/player";
import { ChampionIcon } from "@/components/champion-icon";

type Props = {
  stats: ChampionStat[];
};

export function ChampionStatsTable({ stats }: Props) {
  if (stats.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-6 text-center">
        <p className="text-sm text-zinc-400">No champion data yet.</p>
      </div>
    );
  }

  const top = stats.slice(0, 10);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950/95">
            <tr className="text-left text-xs uppercase tracking-wider text-zinc-400">
              <th className="px-3 py-2 font-semibold">Champion</th>
              <th className="px-3 py-2 text-right font-semibold">Games</th>
              <th className="px-3 py-2 text-right font-semibold">W-L</th>
              <th className="px-3 py-2 text-right font-semibold">Win%</th>
              <th className="px-3 py-2 text-right font-semibold">KDA</th>
            </tr>
          </thead>
          <tbody>
            {top.map((s) => (
              <tr
                key={s.championId}
                className="border-t border-white/5 even:bg-white/5"
              >
                <td className="px-3 py-2 font-medium text-zinc-100">
                  <span className="flex items-center gap-2">
                    <ChampionIcon name={s.championName} size={24} />
                    <span>{s.championName}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-200">
                  {s.games}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-300">
                  <span className="text-emerald-300">{s.wins}</span>
                  <span className="text-zinc-500">-</span>
                  <span className="text-rose-300">{s.losses}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-200">
                  {(s.winrate * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-200">
                  {s.kda.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
