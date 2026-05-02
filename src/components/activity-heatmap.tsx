import type { HeatmapCell } from "@/lib/stats/activity";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HOUR_LABEL_EVERY = 6;

interface ActivityHeatmapProps {
  cells: HeatmapCell[];
  title?: string;
}

export function ActivityHeatmap({ cells, title }: ActivityHeatmapProps) {
  if (cells.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-100">
          {title ?? "📅 Activity"}
        </h2>
        <p className="text-sm text-zinc-400">No matches yet.</p>
      </div>
    );
  }

  const lookup = new Map<string, number>();
  let max = 0;
  for (const cell of cells) {
    lookup.set(`${cell.dow}-${cell.hour}`, cell.games);
    if (cell.games > max) max = cell.games;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-100">
        {title ?? "📅 Activity"}
      </h2>
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Hour labels row */}
          <div className="mb-1 flex">
            {/* spacer for DOW label column */}
            <div className="w-8 shrink-0" />
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="w-5 shrink-0 text-center text-[10px] leading-none text-zinc-500"
              >
                {hour % HOUR_LABEL_EVERY === 0 ? hour : ""}
              </div>
            ))}
          </div>
          {/* Data rows */}
          {DOW_LABELS.map((dayLabel, dow) => (
            <div key={dow} className="flex items-center">
              <div className="w-8 shrink-0 pr-1 text-right text-[10px] text-zinc-500">
                {dayLabel}
              </div>
              {Array.from({ length: 24 }, (_, hour) => {
                const games = lookup.get(`${dow}-${hour}`) ?? 0;
                const opacity = max > 0 ? Math.min(1, games / max) : 0;
                const showColor = opacity >= 0.05;
                return (
                  <div
                    key={hour}
                    className={`m-px h-4 w-4 shrink-0 rounded-sm border border-white/5${showColor ? " bg-amber-400" : ""}`}
                    style={showColor ? { opacity } : undefined}
                    title={
                      games > 0
                        ? `${dayLabel} ${String(hour).padStart(2, "0")}:00 · ${games} game${games === 1 ? "" : "s"}`
                        : undefined
                    }
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
