import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchParticipants, matches, players } from "@/lib/db/schema";

export type FeedMatch = {
  matchId: string;
  puuid: string;
  displayName: string;
  avatarUrl: string | null;
  championName: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  visionScore: number;
  damageToChampions: number;
  gameCreation: Date;
  gameDuration: number;
};

export async function getRecentSquadMatches(limit = 25): Promise<FeedMatch[]> {
  const rows = await db
    .select({
      matchId: matches.matchId,
      puuid: matchParticipants.puuid,
      displayName: players.displayName,
      gameName: players.gameName,
      riotId: players.riotId,
      avatarUrl: players.avatarUrl,
      championName: matchParticipants.championName,
      championId: matchParticipants.championId,
      win: matchParticipants.win,
      kills: matchParticipants.kills,
      deaths: matchParticipants.deaths,
      assists: matchParticipants.assists,
      cs: matchParticipants.cs,
      visionScore: matchParticipants.visionScore,
      damageToChampions: matchParticipants.damageToChampions,
      gameCreation: matches.gameCreation,
      gameDuration: matches.gameDuration,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matches.matchId, matchParticipants.matchId))
    .innerJoin(players, eq(players.puuid, matchParticipants.puuid))
    .orderBy(desc(matches.gameCreation))
    .limit(limit);

  return rows.map((r) => ({
    matchId: r.matchId,
    puuid: r.puuid,
    displayName: r.displayName ?? r.gameName ?? r.riotId,
    avatarUrl: r.avatarUrl,
    championName: r.championName ?? `Champion ${r.championId}`,
    win: r.win,
    kills: r.kills,
    deaths: r.deaths,
    assists: r.assists,
    cs: r.cs,
    visionScore: r.visionScore,
    damageToChampions: r.damageToChampions,
    gameCreation: r.gameCreation,
    gameDuration: r.gameDuration,
  }));
}