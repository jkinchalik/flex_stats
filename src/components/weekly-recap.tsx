import type { RecapEntry, WeeklyRecap } from "@/lib/stats/recap";
import { Avatar } from "@/components/avatar";

type Props = { recap: WeeklyRecap };

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Tile({
  emoji,
  label,
  accent,
  entry,
}: {
  emoji: string;
  label: string;
  accent: string;
  entry: RecapEntry | null;
}) {
  if (!entry) {
    return (
      <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-4 opacity-60">
        <div className="text-2xl">{emoji}</div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {label}
        </div>
        <div className="mt-3 text-sm italic text-zinc-500">
          No qualifier yet
        </div>
      </div>
    );
  }
  return (
    <div className={`rounded-lg border bg-zinc-900/60 p-4 ${accent}`}>
      <div className="text-2xl">{emoji}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Avatar puuid={entry.puuid} displayName={entry.displayName} avatarUrl={entry.avatarUrl ?? null} size={24} />
        <span className="truncate text-sm font-semibold text-zinc-100">
          {entry.displayName}
        </span>
      </div>
      <div className="mt-1.5 text-sm font-medium text-zinc-200">
        {entry.value}
      </div>
      {entry.detail && (
        <div className="mt-0.5 text-xs text-zinc-500">{entry.detail}</div>
      )}
    </div>
  );
}

export function WeeklyRecap({ recap }: Props) {
  const hotOrCold =
    recap.hotCold.hot
      ? { emoji: "", label: "Hot Streak", entry: recap.hotCold.hot, accent: "border-rose-400/30" }
      : recap.hotCold.cold
        ? { emoji: "", label: "Cold Streak", entry: recap.hotCold.cold, accent: "border-cyan-400/30" }
        : { emoji: "", label: "Hot / Cold", entry: null, accent: "border-white/10" };

  return (
    <section className="rounded-xl border border-white/10 bg-zinc-900/40 p-5">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-zinc-100">
          📰 Week of {formatDate(recap.weekStart)} – {formatDate(recap.weekEnd)}
        </h2>
        <p className="mt-0.5 text-sm text-zinc-400">
          Last 7 days. Hot/cold compares to your split average.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          emoji=""
          label="MVP"
          accent="border-amber-400/30"
          entry={recap.mvp}
        />
        <Tile
          emoji=""
          label="Biggest Mover"
          accent={
            recap.biggestMover && recap.biggestMover.value.startsWith("+")
              ? "border-emerald-400/30"
              : "border-rose-400/30"
          }
          entry={recap.biggestMover}
        />
        <Tile
          emoji=""
          label="Worst Single Game"
          accent="border-rose-400/30"
          entry={recap.worstGame}
        />
        <Tile
          emoji={hotOrCold.emoji}
          label={hotOrCold.label}
          accent={hotOrCold.accent}
          entry={hotOrCold.entry}
        />
      </div>
    </section>
  );
}