import { colorForPuuid } from "@/lib/stats/_shared/palette";

type Props = {
  players: { puuid: string; displayName: string }[];
};

export function Legend({ players }: Props) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {players.map((p) => (
        <div key={p.puuid} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 shrink-0 rounded-sm"
            style={{ backgroundColor: colorForPuuid(p.puuid) }}
          />
          <span className="text-sm text-zinc-300">{p.displayName}</span>
        </div>
      ))}
    </div>
  );
}
