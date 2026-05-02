import { and, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchParticipants, matches } from "@/lib/db/schema";

export type HeatmapCell = { dow: number; hour: number; games: number };

// Eastern time because the squad is on NA1 — a single TZ gives consistent
// night-owl patterns without per-user config; swap this string to change it.
const LOCAL_TZ = "America/New_York";

export async function getActivityHeatmap(
  puuid: string | null,
  splitStart: Date,
  splitEnd: Date,
): Promise<HeatmapCell[]> {
  if (puuid === null) {
    const rows = await db.execute<HeatmapCell>(sql`
      SELECT
        EXTRACT(DOW FROM m.game_creation AT TIME ZONE ${LOCAL_TZ})::int AS dow,
        EXTRACT(HOUR FROM m.game_creation AT TIME ZONE ${LOCAL_TZ})::int AS hour,
        COUNT(DISTINCT mp.match_id)::int AS games
      FROM ${matchParticipants} mp
      INNER JOIN ${matches} m ON m.match_id = mp.match_id
      WHERE m.game_creation >= ${splitStart}
        AND m.game_creation < ${splitEnd}
      GROUP BY dow, hour
      HAVING COUNT(DISTINCT mp.match_id) > 0
    `);
    return rows.rows;
  }

  const rows = await db.execute<HeatmapCell>(sql`
    SELECT
      EXTRACT(DOW FROM m.game_creation AT TIME ZONE ${LOCAL_TZ})::int AS dow,
      EXTRACT(HOUR FROM m.game_creation AT TIME ZONE ${LOCAL_TZ})::int AS hour,
      COUNT(*)::int AS games
    FROM ${matchParticipants} mp
    INNER JOIN ${matches} m ON m.match_id = mp.match_id
    WHERE mp.puuid = ${puuid}
      AND m.game_creation >= ${splitStart}
      AND m.game_creation < ${splitEnd}
    GROUP BY dow, hour
    HAVING COUNT(*) > 0
  `);  return rows.rows;
}
