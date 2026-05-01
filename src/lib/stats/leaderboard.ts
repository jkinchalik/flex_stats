import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  currentRank,
  matchParticipants,
  matches,
  players,
} from "@/lib/db/schema";
import { rankSortKey } from "./ranks";

export type LeaderboardRow = {
  puuid: string;
  displayName: string;
  riotId: string;
  tier: string | null;
  division: string | null;
  lp: number;
  wins: number;
  losses: number;
  rankSortKey: number;
  games: number;
  splitWins: number;
  splitLosses: number;
  winrate: number;
  kda: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  avgCs: number;
  avgGold: number;
  avgDamageToChampions: number;
  avgVisionScore: number;
  avgVisionPerMin: number;
};

type WindowAgg = {
  puuid: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damageToChampions: number;
  visionScore: number;
  timePlayed: number;
};

export async function getLeaderboard(
  splitStart: Date,
  splitEnd: Date,
): Promise<LeaderboardRow[]> {
  const playerRows = await db
    .select({
      puuid: players.puuid,
      riotId: players.riotId,
      gameName: players.gameName,
      displayName: players.displayName,
      tier: currentRank.tier,
      division: currentRank.division,
      lp: currentRank.lp,
      wins: currentRank.wins,
      losses: currentRank.losses,
    })
    .from(players)
    .leftJoin(currentRank, eq(currentRank.puuid, players.puuid));

  const aggRows = await db
    .select({
      puuid: matchParticipants.puuid,
      games: sql<number>`count(*)::int`,
      wins: sql<number>`coalesce(sum(case when ${matchParticipants.win} then 1 else 0 end), 0)::int`,
      kills: sql<number>`coalesce(sum(${matchParticipants.kills}), 0)::int`,
      deaths: sql<number>`coalesce(sum(${matchParticipants.deaths}), 0)::int`,
      assists: sql<number>`coalesce(sum(${matchParticipants.assists}), 0)::int`,
      cs: sql<number>`coalesce(sum(${matchParticipants.cs}), 0)::int`,
      gold: sql<number>`coalesce(sum(${matchParticipants.gold}), 0)::int`,
      damageToChampions: sql<number>`coalesce(sum(${matchParticipants.damageToChampions}), 0)::int`,
      visionScore: sql<number>`coalesce(sum(${matchParticipants.visionScore}), 0)::int`,
      timePlayed: sql<number>`coalesce(sum(${matchParticipants.timePlayed}), 0)::int`,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matches.matchId, matchParticipants.matchId))
    .where(
      and(gte(matches.gameCreation, splitStart), lt(matches.gameCreation, splitEnd)),
    )
    .groupBy(matchParticipants.puuid);

  const aggByPuuid = new Map<string, WindowAgg>();
  for (const row of aggRows) {
    aggByPuuid.set(row.puuid, row);
  }

  const result: LeaderboardRow[] = playerRows.map((p) => {
    const agg = aggByPuuid.get(p.puuid);
    const games = agg?.games ?? 0;
    const splitWins = agg?.wins ?? 0;
    const splitLosses = games - splitWins;
    const kills = agg?.kills ?? 0;
    const deaths = agg?.deaths ?? 0;
    const assists = agg?.assists ?? 0;
    const cs = agg?.cs ?? 0;
    const gold = agg?.gold ?? 0;
    const damage = agg?.damageToChampions ?? 0;
    const vision = agg?.visionScore ?? 0;
    const timePlayed = agg?.timePlayed ?? 0;

    const avgKills = games > 0 ? kills / games : 0;
    const avgDeaths = games > 0 ? deaths / games : 0;
    const avgAssists = games > 0 ? assists / games : 0;
    const avgCs = games > 0 ? cs / games : 0;
    const avgGold = games > 0 ? gold / games : 0;
    const avgDamage = games > 0 ? damage / games : 0;
    const avgVision = games > 0 ? vision / games : 0;
    const avgTimePlayed = games > 0 ? timePlayed / games : 0;
    const avgMinutes = avgTimePlayed / 60;
    const avgVisionPerMin = avgMinutes > 0 ? avgVision / avgMinutes : 0;

    const displayName = p.displayName ?? p.gameName ?? p.riotId;

    return {
      puuid: p.puuid,
      displayName,
      riotId: p.riotId,
      tier: p.tier,
      division: p.division,
      lp: p.lp ?? 0,
      wins: p.wins ?? 0,
      losses: p.losses ?? 0,
      rankSortKey: rankSortKey(p.tier, p.division, p.lp),
      games,
      splitWins,
      splitLosses,
      winrate: games > 0 ? splitWins / games : 0,
      kda: (kills + assists) / Math.max(deaths, 1),
      avgKills,
      avgDeaths,
      avgAssists,
      avgCs,
      avgGold,
      avgDamageToChampions: avgDamage,
      avgVisionScore: avgVision,
      avgVisionPerMin,
    };
  });

  result.sort((a, b) => b.rankSortKey - a.rankSortKey);
  return result;
}
