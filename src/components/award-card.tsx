import Link from "next/link";
import type { Award } from "@/lib/stats/awards";

type Props = {
  award: Award;
};

function CardInner({ award }: Props) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/60 p-5 transition-colors hover:border-amber-400/60 hover:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div className="text-3xl leading-none">{award.emoji}</div>
      </div>
      <div>
        <div className="font-semibold text-zinc-100">{award.name}</div>
        <div className="mt-1 text-sm text-zinc-400">{award.description}</div>
      </div>
      <div className="mt-auto pt-2">
        {award.winner ? (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-zinc-100">
              {award.winner.displayName}
            </span>
            <span className="shrink-0 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/30">
              {award.winner.value}
            </span>
          </div>
        ) : (
          <span className="text-sm italic text-zinc-500">
            No qualifier yet
          </span>
        )}
      </div>
    </div>
  );
}

export function AwardCard({ award }: Props) {
  if (award.winner) {
    return (
      <Link href={`/players/${award.winner.puuid}`} className="block h-full">
        <CardInner award={award} />
      </Link>
    );
  }
  return <CardInner award={award} />;
}
