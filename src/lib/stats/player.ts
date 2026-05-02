import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  currentRank,
  matchParticipants,
  matches,
  players,
  rankHistory,
} from "@/lib/db/schema";
import { rankSortKey } from "./ranks";

export type PlayerOverview = {
  puuid: string;
  riotId: string;
  displayName: string;
  gameName: string | null;
  tagLine: string | null;
  avatarUrl: string | null;
  tier: string | null;
  division: string | null;
  lp: number;
  wins: number;
  losses: number;
  lastSyncedAt: Date | null;
};

export type RankHistoryPoint = {
  recordedAt: Date;
  tier: string | null;
  division: string | null;
  lp: number;
  rankSortKey: number;
};

export type RecentMatch = {
  matchId: string;
  gameCreation: Date;
  gameDuration: number;
  championId: number;
  championName: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  visionScore: number;
  damageToChampions: number;
};

export type ChampionStat = {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  kda: number;
};

export async function getPlayerOverview(
  puuid: string,
): Promise<PlayerOverview | null> {
  const rows = await db
    .select({
      puuid: players.puuid,
      riotId: players.riotId,
      gameName: players.gameName,
      tagLine: players.tagLine,
      displayName: players.displayName,
      avatarUrl: players.avatarUrl,
      lastSyncedAt: players.lastSyncedAt,
      tier: currentRank.tier,
      division: currentRank.division,
      lp: currentRank.lp,
      wins: currentRank.wins,
      losses: currentRank.losses,
    })
    .from(players)
    .leftJoin(currentRank, eq(currentRank.puuid, players.puuid))
    .where(eq(players.puuid, puuid))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const displayName = row.displayName ?? row.gameName ?? row.riotId;

  return {
    puuid: row.puuid,
    riotId: row.riotId,
    displayName,
    gameName: row.gameName,
    tagLine: row.tagLine,
    avatarUrl: row.avatarUrl ?? null,
    tier: row.tier,
    division: row.division,
    lp: row.lp ?? 0,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    lastSyncedAt: row.lastSyncedAt,
  };
}

export async function getRankHistory(
  puuid: string,
  since: Date,
): Promise<RankHistoryPoint[]> {
  const rows = await db
    .select({
      recordedAt: rankHistory.recordedAt,
      tier: rankHistory.tier,
      division: rankHistory.division,
      lp: rankHistory.lp,
    })
    .from(rankHistory)
    .where(
      and(eq(rankHistory.puuid, puuid), gte(rankHistory.recordedAt, since)),
    )
    .orderBy(rankHistory.recordedAt);

  return rows.map((r) => ({
    recordedAt: r.recordedAt,
    tier: r.tier,
    division: r.division,
    lp: r.lp ?? 0,
    rankSortKey: rankSortKey(r.tier, r.division, r.lp),
  }));
}

export async function getRecentMatches(
  puuid: string,
  limit = 20,
): Promise<RecentMatch[]> {
  const rows = await db
    .select({
      matchId: matches.matchId,
      gameCreation: matches.gameCreation,
      gameDuration: matches.gameDuration,
      championId: matchParticipants.championId,
      championName: matchParticipants.championName,
      win: matchParticipants.win,
      kills: matchParticipants.kills,
      deaths: matchParticipants.deaths,
      assists: matchParticipants.assists,
      cs: matchParticipants.cs,
      visionScore: matchParticipants.visionScore,
      damageToChampions: matchParticipants.damageToChampions,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matches.matchId, matchParticipants.matchId))
    .where(eq(matchParticipants.puuid, puuid))
    .orderBy(desc(matches.gameCreation))
    .limit(limit);

  return rows.map((r) => ({
    matchId: r.matchId,
    gameCreation: r.gameCreation,
    gameDuration: r.gameDuration,
    championId: r.championId,
    championName: r.championName ?? `Champion ${r.championId}`,
    win: r.win,
    kills: r.kills,
    deaths: r.deaths,
    assists: r.assists,
    cs: r.cs,
    visionScore: r.visionScore,
    damageToChampions: r.damageToChampions,
  }));
}

export async function getChampionStats(
  puuid: string,
  since: Date,
): Promise<ChampionStat[]> {
  const rows = await db
    .select({
      championId: matchParticipants.championId,
      championName: matchParticipants.championName,
      win: matchParticipants.win,
      kills: matchParticipants.kills,
      deaths: matchParticipants.deaths,
      assists: matchParticipants.assists,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matches.matchId, matchParticipants.matchId))
    .where(
      and(
        eq(matchParticipants.puuid, puuid),
        gte(matches.gameCreation, since),
      ),
    );

  type Acc = {
    championId: number;
    championName: string;
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
  };

  const byChamp = new Map<number, Acc>();
  for (const r of rows) {
    const existing = byChamp.get(r.championId);
    const name = r.championName ?? `Champion ${r.championId}`;
    if (existing) {
      existing.games += 1;
      existing.wins += r.win ? 1 : 0;
      existing.kills += r.kills;
      existing.deaths += r.deaths;
      existing.assists += r.assists;
    } else {
      byChamp.set(r.championId, {
        championId: r.championId,
        championName: name,
        games: 1,
        wins: r.win ? 1 : 0,
        kills: r.kills,
        deaths: r.deaths,
        assists: r.assists,
      });
    }
  }

  const result: ChampionStat[] = Array.from(byChamp.values()).map((a) => {
    const losses = a.games - a.wins;
    return {
      championId: a.championId,
      championName: a.championName,
      games: a.games,
      wins: a.wins,
      losses,
      winrate: a.games > 0 ? a.wins / a.games : 0,
      avgKills: a.games > 0 ? a.kills / a.games : 0,
      avgDeaths: a.games > 0 ? a.deaths / a.games : 0,
      avgAssists: a.games > 0 ? a.assists / a.games : 0,
      kda: (a.kills + a.assists) / Math.max(a.deaths, 1),
    };
  });

  result.sort((a, b) => b.games - a.games);
  return result;
}