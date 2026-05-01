import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchParticipants, matches } from "@/lib/db/schema";

export type DuoSynergy = {
  aPuuid: string;
  bPuuid: string;
  games: number;
  wins: number;
  winrate: number; // 0..1
};

type RawRow = {
  a_puuid: string;
  b_puuid: string;
  games: number;
  wins: number;
};

export async function getDuoSynergy(
  splitStart: Date,
  splitEnd: Date,
): Promise<DuoSynergy[]> {
  const a = matchParticipants;
  const b = matchParticipants;
  const m = matches;

  // Self-join match_participants on (match_id, team_id) with a.puuid < b.puuid
  // so each pair appears exactly once. Join to matches for the date filter.
  const rows = await db.execute<RawRow>(sql`
    SELECT
      ${a.puuid} AS a_puuid,
      ${b.puuid} AS b_puuid,
      COUNT(*)::int AS games,
      COALESCE(SUM(CASE WHEN ${a.win} THEN 1 ELSE 0 END), 0)::int AS wins
    FROM ${matchParticipants} ${sql.raw("a")}
    JOIN ${matchParticipants} ${sql.raw("b")}
      ON  ${sql.raw("a")}.match_id = ${sql.raw("b")}.match_id
      AND ${sql.raw("a")}.team_id  = ${sql.raw("b")}.team_id
      AND ${sql.raw("a")}.puuid    < ${sql.raw("b")}.puuid
    JOIN ${m}
      ON  ${m.matchId} = ${sql.raw("a")}.match_id
    WHERE ${m.gameCreation} >= ${splitStart}
      AND ${m.gameCreation} <  ${splitEnd}
    GROUP BY ${sql.raw("a")}.puuid, ${sql.raw("b")}.puuid
    HAVING COUNT(*) > 0
  `);

  return rows.rows.map((row) => ({
    aPuuid: row.a_puuid,
    bPuuid: row.b_puuid,
    games: row.games,
    wins: row.wins,
    winrate: row.games > 0 ? row.wins / row.games : 0,
  }));
}
