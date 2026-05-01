import type { DuoSynergy } from "@/lib/stats/synergy";

type Props = {
  players: { puuid: string; displayName: string }[];
  pairs: DuoSynergy[];
};

/** Map winrate 0..1 → HSL background colour string. */
function cellBg(winrate: number): string {
  // 0% → hsl(0,60%,30%)  |  50% → hsl(220,10%,20%) (zinc-ish)  |  100% → hsl(140,60%,35%)
  if (winrate < 0.5) {
    // lerp from red to zinc
    const t = winrate / 0.5; // 0..1
    const hue = Math.round(t * 220); // 0 → 220
    const sat = Math.round(60 - t * 50); // 60 → 10
    const lit = Math.round(30 - t * 10); // 30 → 20
    return `hsl(${hue},${sat}%,${lit}%)`;
  } else {
    // lerp from zinc to green
    const t = (winrate - 0.5) / 0.5; // 0..1
    const hue = Math.round(220 + t * (140 - 220)); // 220 → 140
    const sat = Math.round(10 + t * 50); // 10 → 60
    const lit = Math.round(20 + t * 15); // 20 → 35
    return `hsl(${hue},${sat}%,${lit}%)`;
  }
}

const MIN_GAMES = 3;
const MAX_NAME_LEN = 10;

function truncate(name: string): string {
  return name.length > MAX_NAME_LEN ? name.slice(0, MAX_NAME_LEN) + "…" : name;
}

export function SynergyMatrix({ players, pairs }: Props) {
  // Index pairs by canonical (aPuuid, bPuuid) where aPuuid < bPuuid
  const pairMap = new Map<string, DuoSynergy>();
  for (const p of pairs) {
    const key = `${p.aPuuid}::${p.bPuuid}`;
    pairMap.set(key, p);
  }

  function getPair(puuidX: string, puuidY: string): DuoSynergy | undefined {
    const [a, b] = puuidX < puuidY ? [puuidX, puuidY] : [puuidY, puuidX];
    return pairMap.get(`${a}::${b}`);
  }

  const hasData = pairs.length > 0;

  return (
    <section className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">🤝 Synergy</h2>
        <p className="text-sm text-zinc-400">
          Winrate when teamed up this split. Min {MIN_GAMES} games.
        </p>
      </div>

      {/* Empty state */}
      {!hasData ? (
        <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-10 text-center">
          <p className="text-sm text-zinc-400">
            No teamed-up matches yet this split.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/60 shadow-lg">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                {/* top-left corner cell */}
                <th className="min-w-[7rem] border-b border-r border-white/10 bg-zinc-950/80 px-3 py-2" />
                {players.map((col) => (
                  <th
                    key={col.puuid}
                    className="min-w-[5.5rem] border-b border-r border-white/10 bg-zinc-950/80 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-zinc-400"
                  >
                    <span title={col.displayName}>
                      {truncate(col.displayName)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((row) => (
                <tr key={row.puuid} className="border-t border-white/5">
                  {/* Row header */}
                  <td className="border-r border-white/10 bg-zinc-950/60 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <span title={row.displayName}>
                      {truncate(row.displayName)}
                    </span>
                  </td>
                  {players.map((col) => {
                    // Diagonal
                    if (row.puuid === col.puuid) {
                      return (
                        <td
                          key={col.puuid}
                          className="border-r border-white/10 px-3 py-2 text-center text-zinc-600"
                          style={{ background: "hsl(220,10%,14%)" }}
                        >
                          —
                        </td>
                      );
                    }

                    const pair = getPair(row.puuid, col.puuid);

                    // Sparse / no data
                    if (!pair || pair.games < MIN_GAMES) {
                      return (
                        <td
                          key={col.puuid}
                          className="border-r border-white/10 px-3 py-2 text-center text-zinc-600"
                          style={{ background: "hsl(220,10%,17%)" }}
                        >
                          —
                        </td>
                      );
                    }

                    const winratePct = Math.round(pair.winrate * 100);
                    const bg = cellBg(pair.winrate);

                    return (
                      <td
                        key={col.puuid}
                        className="border-r border-white/10 px-3 py-2 text-center"
                        style={{ background: bg }}
                      >
                        <div className="font-semibold text-zinc-100">
                          {pair.games}-{pair.wins}
                        </div>
                        <div className="text-xs text-zinc-300">
                          {winratePct}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
