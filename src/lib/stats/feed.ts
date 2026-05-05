import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchParticipants, matches, players } from "@/lib/db/schema";

export type FriendInMatch = {
  puuid: string;
  displayName: string;
  summonerName: string;
  avatarUrl: string | null;
  championName: string;
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  visionScore: number;
  damageToChampions: number;
};

export type SquadMatch = {
  matchId: string;
  gameCreation: Date;
  gameDuration: number;
  friends: FriendInMatch[];
};

export async function getRecentSquadMatches(
  limit: number = 25,
): Promise<SquadMatch[]> {
  const matchRows = await db
    .select({
      matchId: matches.matchId,
      gameCreation: matches.gameCreation,
      gameDuration: matches.gameDuration,
    })
    .from(matches)
    .where(
      sql`EXISTS (SELECT 1 FROM ${matchParticipants} WHERE ${matchParticipants.matchId} = ${matches.matchId})`,
    )
    .orderBy(desc(matches.gameCreation))
    .limit(limit);

  if (matchRows.length === 0) return [];

  const matchIds = matchRows.map((m) => m.matchId);

  const participantRows = await db
    .select({
      matchId: matchParticipants.matchId,
      puuid: matchParticipants.puuid,
      championId: matchParticipants.championId,
      championName: matchParticipants.championName,
      teamId: matchParticipants.teamId,
      win: matchParticipants.win,
      kills: matchParticipants.kills,
      deaths: matchParticipants.deaths,
      assists: matchParticipants.assists,
      cs: matchParticipants.cs,
      visionScore: matchParticipants.visionScore,
      damageToChampions: matchParticipants.damageToChampions,
      displayName: players.displayName,
      gameName: players.gameName,
      riotId: players.riotId,
      avatarUrl: players.avatarUrl,
    })
    .from(matchParticipants)
    .innerJoin(players, eq(players.puuid, matchParticipants.puuid))
    .where(inArray(matchParticipants.matchId, matchIds));

  const byMatch = new Map<string, FriendInMatch[]>();
  for (const p of participantRows) {
    const friend: FriendInMatch = {
      puuid: p.puuid,
      displayName: p.displayName ?? p.gameName ?? p.riotId,
      summonerName: p.gameName ?? p.riotId,
      avatarUrl: p.avatarUrl,
      championName: p.championName ?? `Champion ${p.championId}`,
      teamId: p.teamId ?? 100,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      cs: p.cs,
      visionScore: p.visionScore,
      damageToChampions: p.damageToChampions,
    };
    const list = byMatch.get(p.matchId);
    if (list) list.push(friend);
    else byMatch.set(p.matchId, [friend]);
  }

  return matchRows.map((m) => ({
    matchId: m.matchId,
    gameCreation: m.gameCreation,
    gameDuration: m.gameDuration,
    friends: (byMatch.get(m.matchId) ?? []).sort((a, b) => {
      if (a.win !== b.win) return a.win ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    }),
  }));
}
