"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { PerfMetric, PerfRow, PerformanceBoards } from "@/lib/stats/performance";

// ── Tab definitions ────────────────────────────────────────────────────────

type TabDef = {
  metric: PerfMetric;
  label: string;
};

const TABS: TabDef[] = [
  { metric: "dpm",       label: "Damage/min" },
  { metric: "kpPct",     label: "KP%"        },
  { metric: "visPerMin", label: "Vision/min" },
  { metric: "gpm",       label: "Gold/min"   },
  { metric: "csPerMin",  label: "CS/min"     },
  { metric: "dmgShare",  label: "Dmg Share"  },
];

// ── Formatting ─────────────────────────────────────────────────────────────

function formatValue(metric: PerfMetric, value: number): string {
  switch (metric) {
    case "dpm":
      return Math.round(value).toLocaleString();
    case "kpPct":
      return `${Math.round(value * 100)}%`;
    case "visPerMin":
      return value.toFixed(1);
    case "gpm":
      return Math.round(value).toLocaleString();
    case "csPerMin":
      return value.toFixed(1);
    case "dmgShare":
      return `${Math.round(value * 100)}%`;
  }
}

// ── Medal / rank label ─────────────────────────────────────────────────────

function rankLabel(position: number): string {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return String(position);
}

// ── Sub-components ─────────────────────────────────────────────────────────

type BoardTableProps = {
  metric: PerfMetric;
  rows: PerfRow[];
};

function BoardTable({ metric, rows }: BoardTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-400">
        Not enough games yet.
      </p>
    );
  }

  const visible = rows.slice(0, 11);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wider text-zinc-400">
          <th className="pb-2 pr-4 font-semibold w-8">#</th>
          <th className="pb-2 pr-4 font-semibold">Player</th>
          <th className="pb-2 text-right font-semibold">Value</th>
        </tr>
      </thead>
      <tbody>
        {visible.map((row, index) => {
          const position = index + 1;
          return (
            <tr
              key={row.puuid}
              className="border-t border-white/5 transition-colors even:bg-white/5 hover:bg-amber-500/5"
            >
              <td className="py-2 pr-4 align-middle text-base font-bold text-zinc-300 w-8">
                {rankLabel(position)}
              </td>
              <td className="py-2 pr-4 align-middle">
                <span className="font-medium text-zinc-100">{row.displayName}</span>
                <span className="ml-2 text-xs text-zinc-500">{row.games}g</span>
              </td>
              <td className="py-2 text-right align-middle font-semibold text-amber-300">
                {formatValue(metric, row.value)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type Props = {
  boards: PerformanceBoards;
};

export function PerformanceTabs({ boards }: Props) {
  const [active, setActive] = useState<PerfMetric>(TABS[0]!.metric);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-zinc-100">
          ⚡ Performance Leaderboards
        </h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          Top performers by metric this split. Min 5 games.
        </p>
      </div>

      {/* Tab strip */}
      <div
        role="tablist"
        className="mb-4 flex flex-wrap gap-1 border-b border-white/10"
      >
        {TABS.map((tab) => {
          const isActive = tab.metric === active;
          return (
            <button
              key={tab.metric}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setActive(tab.metric)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-xs font-semibold transition-colors",
                isActive
                  ? "border-amber-400 text-amber-300"
                  : "border-transparent text-zinc-400 hover:text-zinc-200",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active board */}
      <BoardTable metric={active} rows={boards[active]} />
    </div>
  );
}
