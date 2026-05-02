"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { extractFromRaw } from "@/lib/stats/_shared/raw";

export type MatchDetailParticipant = {
  puuid: string;
  teamId: number;
  championName: string;
  championId: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  damageToChampions: number;
};

export type MatchDetail = {
  matchId: string;
  blueTeam: MatchDetailParticipant[]; // teamId 100
  redTeam: MatchDetailParticipant[]; // teamId 200
  winningTeamId: number | null;
};

export async function getMatchDetail(
  matchId: string,
): Promise<MatchDetail | null> {
  const rows = await db
    .select({ raw: matches.raw })
    .from(matches)
    .where(eq(matches.matchId, matchId))
    .limit(1);

  if (rows.length === 0) return null;

  const { participants, teams } = extractFromRaw(rows[0].raw);

  const toParticipant = (p: (typeof participants)[number]): MatchDetailParticipant => ({
    puuid: p.puuid,
    teamId: p.teamId,
    championName: p.championName,
    championId: p.championId,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    cs: p.totalMinionsKilled + p.neutralMinionsKilled,
    damageToChampions: p.totalDamageDealtToChampions,
  });

  const blueTeam = participants
    .filter((p) => p.teamId === 100)
    .map(toParticipant);
  const redTeam = participants
    .filter((p) => p.teamId === 200)
    .map(toParticipant);

  const winningTeam = teams.find((t) => t.win);
  const winningTeamId = winningTeam?.teamId ?? null;

  return { matchId, blueTeam, redTeam, winningTeamId };
}
