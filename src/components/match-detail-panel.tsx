"use client";

import { useEffect, useState } from "react";
import { ChampionIcon } from "@/components/champion-icon";
import {
  getMatchDetail,
  type MatchDetail,
  type MatchDetailParticipant,
} from "@/lib/stats/match-detail";

type Props = {
  matchId: string;
};

function ParticipantRow({ p }: { p: MatchDetailParticipant }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs">
      <span
        className="flex w-32 shrink-0 items-center gap-1.5 truncate font-medium text-zinc-200"
        title={p.championName}
      >
        <ChampionIcon name={p.championName} size={20} />
        <span className="truncate">{p.summonerName}</span>
      </span>
      <span className="tabular-nums text-zinc-300">
        {p.kills}/{p.deaths}/{p.assists}
      </span>
      <span className="tabular-nums text-zinc-400">{p.cs} cs</span>
      <span className="tabular-nums text-zinc-500">
        {(p.damageToChampions / 1000).toFixed(1)}k dmg
      </span>
    </div>
  );
}

function TeamPanel({
  participants,
  won,
  side,
}: {
  participants: MatchDetailParticipant[];
  won: boolean;
  side: "blue" | "red";
}) {
  const borderColor =
    side === "blue" ? "border-blue-500/40" : "border-rose-500/40";
  const headerColor =
    side === "blue" ? "text-blue-400" : "text-rose-400";
  const badgeWon =
    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300";
  const badgeLost =
    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-300";

  return (
    <div className={`flex-1 rounded-lg border ${borderColor} bg-zinc-900/40`}>
      <div className="flex items-center justify-between border-b border-white/5 px-2 py-1.5">
        <span className={`text-xs font-semibold uppercase tracking-wide ${headerColor}`}>
          {side === "blue" ? "Blue" : "Red"}
        </span>
        <span className={won ? badgeWon : badgeLost}>{won ? "WIN" : "LOSS"}</span>
      </div>
      <div className="divide-y divide-white/5">
        {participants.map((p) => (
          <ParticipantRow key={p.puuid} p={p} />
        ))}
      </div>
    </div>
  );
}

export function MatchDetailPanel({ matchId }: Props) {
  const [data, setData] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getMatchDetail(matchId)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setError("Match data unavailable");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-zinc-400">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
        Loading match…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center gap-3 px-4 py-6">
        <span className="text-sm text-zinc-400">{error}</span>
        <button
          onClick={load}
          className="rounded bg-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-6 text-center text-sm text-zinc-400">
        Match not found.
      </div>
    );
  }

  const blueWon = data.winningTeamId === 100;
  const redWon = data.winningTeamId === 200;

  return (
    <div className="border-t border-white/5 px-4 py-3">
      <div className="flex gap-3">
        <TeamPanel participants={data.blueTeam} won={blueWon} side="blue" />
        <TeamPanel participants={data.redTeam} won={redWon} side="red" />
      </div>
    </div>
  );
}
