import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  matchParticipants,
  matches,
  rankHistory,
} from "@/lib/db/schema";
import type { LeaderboardRow } from "./leaderboard";
import { rankSortKey } from "./ranks";

export type Award = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  winner: { puuid: string; displayName: string; value: string } | null;
};

type Candidate<T> = {
  row: LeaderboardRow;
  metric: T;
};

function pickBest<T extends number>(
  candidates: Candidate<T>[],
  better: (a: T, b: T) => number,
): Candidate<T> | null {
  if (candidates.length === 0) return null;
  let best = candidates[0]!;
  for (let i = 1; i < candidates.length; i++) {
    const cand = candidates[i]!;
    const cmp = better(cand.metric, best.metric);
    if (cmp > 0) {
      best = cand;
    } else if (cmp === 0 && cand.row.rankSortKey > best.row.rankSortKey) {
      best = cand;
    }
  }
  return best;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

function fmtOne(n: number): string {
  return n.toFixed(1);
}

export async function computeAwards(
  rows: LeaderboardRow[],
  splitStart: Date,
  splitEnd: Date,
): Promise<Award[]> {
  const awards: Award[] = [];

  const climber = await computeHighestClimber(rows, splitStart);
  awards.push(climber);

  const intingCandidates: Candidate<number>[] = rows
    .filter((r) => r.games >= 5)
    .map((r) => ({ row: r, metric: r.avgDeaths }));
  const intingBest = pickBest(intingCandidates, (a, b) => a - b);
  awards.push({
    id: "inting-champion",
    name: "Inting Champion",
    emoji: "💀",
    description: "More deaths than KDA.",
    winner: intingBest
      ? {
          puuid: intingBest.row.puuid,
          displayName: intingBest.row.displayName,
          value: `${fmtOne(intingBest.metric)} deaths/game`,
        }
      : null,
  });

  const visionCandidates: Candidate<number>[] = rows
    .filter((r) => r.games >= 5)
    .map((r) => ({ row: r, metric: r.avgVisionPerMin }));
  const visionBest = pickBest(visionCandidates, (a, b) => a - b);
  awards.push({
    id: "vision-god",
    name: "Vision God",
    emoji: "👁️",
    description: "Map awareness on lock.",
    winner: visionBest
      ? {
          puuid: visionBest.row.puuid,
          displayName: visionBest.row.displayName,
          value: `${fmtOne(visionBest.metric)} vis/min`,
        }
      : null,
  });

  const carryCandidates: Candidate<number>[] = rows
    .filter((r) => r.games >= 5)
    .map((r) => ({ row: r, metric: r.avgDamageToChampions }));
  const carryBest = pickBest(carryCandidates, (a, b) => a - b);
  awards.push({
    id: "carry-threat",
    name: "Carry Threat",
    emoji: "⚔️",
    description: "Cooks the enemy team.",
    winner: carryBest
      ? {
          puuid: carryBest.row.puuid,
          displayName: carryBest.row.displayName,
          value: `${fmtInt(carryBest.metric)} dmg`,
        }
      : null,
  });

  const coinCandidates: Candidate<number>[] = rows
    .filter((r) => r.games >= 10)
    .map((r) => ({ row: r, metric: -Math.abs(r.winrate - 0.5) }));
  const coinBest = pickBest(coinCandidates, (a, b) => a - b);
  awards.push({
    id: "coin-flipper",
    name: "Coin Flipper",
    emoji: "🪙",
    description: "50/50 every time.",
    winner: coinBest
      ? {
          puuid: coinBest.row.puuid,
          displayName: coinBest.row.displayName,
          value: `${Math.round(coinBest.row.winrate * 100)}% (${coinBest.row.splitWins}-${coinBest.row.splitLosses})`,
        }
      : null,
  });

  const padderCandidates: Candidate<number>[] = rows
    .filter((r) => r.games > 0)
    .map((r) => ({ row: r, metric: r.games }));
  const padderBest = pickBest(padderCandidates, (a, b) => a - b);
  awards.push({
    id: "stat-padder",
    name: "Stat Padder",
    emoji: "🏆",
    description: "Touches grass? Never heard of it.",
    winner: padderBest
      ? {
          puuid: padderBest.row.puuid,
          displayName: padderBest.row.displayName,
          value: `${padderBest.metric} games`,
        }
      : null,
  });

  const streak = await computeHotStreak(rows, splitStart, splitEnd);
  awards.push(streak);

  const oneTrick = await computeOneTrick(rows, splitStart, splitEnd);
  awards.push(oneTrick);

  return awards;
}

async function computeHighestClimber(
  rows: LeaderboardRow[],
  splitStart: Date,
): Promise<Award> {
  const award: Award = {
    id: "highest-climber",
    name: "Highest Climber",
    emoji: "👑",
    description: "Most points gained this split.",
    winner: null,
  };

  if (rows.length === 0) return award;

  const puuids = rows.map((r) => r.puuid);

  const history = await db
    .select({
      puuid: rankHistory.puuid,
      tier: rankHistory.tier,
      division: rankHistory.division,
      lp: rankHistory.lp,
      recordedAt: rankHistory.recordedAt,
    })
    .from(rankHistory)
    .where(
      and(
        inArray(rankHistory.puuid, puuids),
        gte(rankHistory.recordedAt, splitStart),
      ),
    )
    .orderBy(asc(rankHistory.puuid), asc(rankHistory.recordedAt));

  const earliestByPuuid = new Map<
    string,
    { tier: string | null; division: string | null; lp: number | null }
  >();
  for (const row of history) {
    if (!earliestByPuuid.has(row.puuid)) {
      earliestByPuuid.set(row.puuid, {
        tier: row.tier,
        division: row.division,
        lp: row.lp,
      });
    }
  }

  let best: { row: LeaderboardRow; gained: number } | null = null;
  for (const r of rows) {
    const earliest = earliestByPuuid.get(r.puuid);
    if (!earliest) continue;
    const earliestKey = rankSortKey(earliest.tier, earliest.division, earliest.lp);
    if (earliestKey < 0) continue;
    const gained = r.rankSortKey - earliestKey;
    if (
      best === null ||
      gained > best.gained ||
      (gained === best.gained && r.rankSortKey > best.row.rankSortKey)
    ) {
      best = { row: r, gained };
    }
  }

  if (best) {
    const sign = best.gained >= 0 ? "+" : "";
    award.winner = {
      puuid: best.row.puuid,
      displayName: best.row.displayName,
      value: `${sign}${best.gained} pts`,
    };
  }

  return award;
}

async function computeHotStreak(
  rows: LeaderboardRow[],
  splitStart: Date,
  splitEnd: Date,
): Promise<Award> {
  const award: Award = {
    id: "hot-streak",
    name: "Hot Streak",
    emoji: "🔥",
    description: "On fire right now.",
    winner: null,
  };

  const eligible = rows.filter((r) => r.games > 0);
  if (eligible.length === 0) return award;

  const puuids = eligible.map((r) => r.puuid);

  const recent = await db
    .select({
      puuid: matchParticipants.puuid,
      win: matchParticipants.win,
      gameCreation: matches.gameCreation,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matches.matchId, matchParticipants.matchId))
    .where(
      and(
        inArray(matchParticipants.puuid, puuids),
        gte(matches.gameCreation, splitStart),
        lt(matches.gameCreation, splitEnd),
      ),
    )
    .orderBy(asc(matchParticipants.puuid), desc(matches.gameCreation));

  const streakByPuuid = new Map<string, number>();
  let currentPuuid: string | null = null;
  let currentStreak = 0;
  let stopped = false;
  for (const row of recent) {
    if (row.puuid !== currentPuuid) {
      if (currentPuuid !== null) {
        streakByPuuid.set(currentPuuid, currentStreak);
      }
      currentPuuid = row.puuid;
      currentStreak = 0;
      stopped = false;
    }
    if (stopped) continue;
    if (row.win) {
      currentStreak += 1;
    } else {
      stopped = true;
    }
  }
  if (currentPuuid !== null) {
    streakByPuuid.set(currentPuuid, currentStreak);
  }

  const rowByPuuid = new Map(eligible.map((r) => [r.puuid, r]));
  const candidates: Candidate<number>[] = [];
  for (const [puuid, streak] of streakByPuuid) {
    if (streak < 2) continue;
    const row = rowByPuuid.get(puuid);
    if (!row) continue;
    candidates.push({ row, metric: streak });
  }

  const best = pickBest(candidates, (a, b) => a - b);
  if (best) {
    award.winner = {
      puuid: best.row.puuid,
      displayName: best.row.displayName,
      value: `${best.metric} wins`,
    };
  }
  return award;
}

async function computeOneTrick(
  rows: LeaderboardRow[],
  splitStart: Date,
  splitEnd: Date,
): Promise<Award> {
  const award: Award = {
    id: "one-trick-pony",
    name: "One-Trick Pony",
    emoji: "🐴",
    description: "Plays one champ. Forever.",
    winner: null,
  };

  const eligible = rows.filter((r) => r.games >= 10);
  if (eligible.length === 0) return award;

  const puuids = eligible.map((r) => r.puuid);

  const champRows = await db
    .select({
      puuid: matchParticipants.puuid,
      championId: matchParticipants.championId,
      championName: matchParticipants.championName,
      count: sql<number>`count(*)::int`,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matches.matchId, matchParticipants.matchId))
    .where(
      and(
        inArray(matchParticipants.puuid, puuids),
        gte(matches.gameCreation, splitStart),
        lt(matches.gameCreation, splitEnd),
      ),
    )
    .groupBy(
      matchParticipants.puuid,
      matchParticipants.championId,
      matchParticipants.championName,
    );

  type Top = { championName: string | null; count: number };
  const topByPuuid = new Map<string, Top>();
  for (const row of champRows) {
    const existing = topByPuuid.get(row.puuid);
    if (!existing || row.count > existing.count) {
      topByPuuid.set(row.puuid, {
        championName: row.championName,
        count: row.count,
      });
    }
  }

  let best:
    | {
        row: LeaderboardRow;
        ratio: number;
        count: number;
        championName: string | null;
      }
    | null = null;
  for (const r of eligible) {
    const top = topByPuuid.get(r.puuid);
    if (!top || r.games <= 0) continue;
    const ratio = top.count / r.games;
    if (
      best === null ||
      ratio > best.ratio ||
      (ratio === best.ratio && r.rankSortKey > best.row.rankSortKey)
    ) {
      best = {
        row: r,
        ratio,
        count: top.count,
        championName: top.championName,
      };
    }
  }

  if (best) {
    const pct = Math.round(best.ratio * 100);
    const champ = best.championName ?? "Unknown";
    award.winner = {
      puuid: best.row.puuid,
      displayName: best.row.displayName,
      value: `${pct}% ${champ} (${best.count}/${best.row.games})`,
    };
  }

  return award;
}
