import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchParticipants, matches } from "@/lib/db/schema";

export type WeeklyPoint = {
  weekStart: Date;
  games: number;
  kda: number;
  visionPerMin: number;
  csPerMin: number;
};

export type SquadAverages = {
  kda: number;
  visionPerMin: number;
  csPerMin: number;
};

type RawWeekRow = {
  weekStart: unknown;
  games: number;
  kda: number;
  visionPerMin: number;
  csPerMin: number;
};

type RawAggRow = {
  kda: number;
  visionPerMin: number;
  csPerMin: number;
};

export async function getWeeklyTrends(
  puuid: string,
  splitStart: Date,
  splitEnd: Date,
): Promise<WeeklyPoint[]> {
  const rows = await db
    .select({
      weekStart: sql<unknown>`date_trunc('week', ${matches.gameCreation})`,
      games: sql<number>`count(*)::int`,
      kda: sql<number>`
        (sum(${matchParticipants.kills}) + sum(${matchParticipants.assists}))::float
        / greatest(sum(${matchParticipants.deaths}), 1)
      `,
      visionPerMin: sql<number>`
        sum(${matchParticipants.visionScore})::float
        / (sum(${matchParticipants.timePlayed})::float / 60)
      `,
      csPerMin: sql<number>`
        sum(${matchParticipants.cs})::float
        / (sum(${matchParticipants.timePlayed})::float / 60)
      `,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matches.matchId, matchParticipants.matchId))
    .where(
      and(
        eq(matchParticipants.puuid, puuid),
        gte(matches.gameCreation, splitStart),
        lt(matches.gameCreation, splitEnd),
        sql`${matchParticipants.timePlayed} > 0`,
      ),
    )
    .groupBy(sql`date_trunc('week', ${matches.gameCreation})`)
    .orderBy(sql`date_trunc('week', ${matches.gameCreation}) asc`);

  return (rows as RawWeekRow[]).map((r) => ({
    weekStart: new Date(r.weekStart as string),
    games: r.games,
    kda: Number(r.kda),
    visionPerMin: Number(r.visionPerMin),
    csPerMin: Number(r.csPerMin),
  }));
}

export async function getSquadAverages(
  splitStart: Date,
  splitEnd: Date,
): Promise<SquadAverages> {
  const rows = await db
    .select({
      kda: sql<number>`
        (sum(${matchParticipants.kills}) + sum(${matchParticipants.assists}))::float
        / greatest(sum(${matchParticipants.deaths}), 1)
      `,
      visionPerMin: sql<number>`
        sum(${matchParticipants.visionScore})::float
        / (sum(${matchParticipants.timePlayed})::float / 60)
      `,
      csPerMin: sql<number>`
        sum(${matchParticipants.cs})::float
        / (sum(${matchParticipants.timePlayed})::float / 60)
      `,
    })
    .from(matchParticipants)
    .innerJoin(matches, eq(matches.matchId, matchParticipants.matchId))
    .where(
      and(
        gte(matches.gameCreation, splitStart),
        lt(matches.gameCreation, splitEnd),
        sql`${matchParticipants.timePlayed} > 0`,
      ),
    );

  const row = (rows as RawAggRow[])[0];
  if (!row) {
    return { kda: 0, visionPerMin: 0, csPerMin: 0 };
  }

  return {
    kda: Number(row.kda),
    visionPerMin: Number(row.visionPerMin),
    csPerMin: Number(row.csPerMin),
  };
}
