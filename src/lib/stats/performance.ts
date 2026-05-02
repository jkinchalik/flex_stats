import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchParticipants, matches, players } from "@/lib/db/schema";

export type PerfMetric =
  | "dpm"
  | "kpPct"
  | "visPerMin"
  | "gpm"
  | "csPerMin"
  | "dmgShare";

export type PerfRow = {
  puuid: string;
  displayName: string;
  value: number;
  games: number;
};

export type PerformanceBoards = Record<PerfMetric, PerfRow[]>;

// ── Row types for db.execute ───────────────────────────────────────────────

type SimpleAggRow = {
  puuid: string;
  displayName: string | null;
  dpm: number;
  visPerMin: number;
  gpm: number;
  csPerMin: number;
  games: number;
};

type TeamAggRow = {
  puuid: string;
  displayName: string | null;
  kpAvg: number;
  dmgShare: number;
  games: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function toRows(
  rows: Array<{ puuid: string; displayName: string | null; value: number; games: number }>,
): PerfRow[] {
  return rows
    .map((r) => ({
      puuid: r.puuid,
      displayName: r.displayName ?? r.puuid,
      value: Number(r.value),
      games: Number(r.games),
    }))
    .sort((a, b) => b.value - a.value);
}

// ── Main export ────────────────────────────────────────────────────────────

export async function getPerformanceLeaderboards(
  splitStart: Date,
  splitEnd: Date,
): Promise<PerformanceBoards> {
  // ── Query 1: per-minute metrics derivable from match_participants alone ──
  const simpleResult = await db.execute<SimpleAggRow>(
    sql`
      SELECT
        mp.puuid                                                         AS "puuid",
        COALESCE(p.display_name, p.game_name, p.riot_id)                AS "displayName",
        SUM(mp.damage_to_champions)::float
          / NULLIF(SUM(mp.time_played)::float / 60.0, 0)                AS "dpm",
        SUM(mp.vision_score)::float
          / NULLIF(SUM(mp.time_played)::float / 60.0, 0)                AS "visPerMin",
        SUM(mp.gold)::float
          / NULLIF(SUM(mp.time_played)::float / 60.0, 0)                AS "gpm",
        SUM(mp.cs)::float
          / NULLIF(SUM(mp.time_played)::float / 60.0, 0)                AS "csPerMin",
        COUNT(*)::int                                                    AS "games"
      FROM ${matchParticipants} mp
      JOIN ${matches} m ON m.match_id = mp.match_id
      JOIN ${players} p  ON p.puuid   = mp.puuid
      WHERE m.game_creation >= ${splitStart}
        AND m.game_creation <  ${splitEnd}
        AND mp.time_played  >  0
      GROUP BY mp.puuid, p.display_name, p.game_name, p.riot_id
      HAVING COUNT(*) >= 5
    `,
  );

  const simpleRows = simpleResult.rows;

  // ── Query 2: KP% and damage share via raw JSON unroll ───────────────────
  const teamResult = await db.execute<TeamAggRow>(
    sql`
      WITH unrolled AS (
        SELECT
          m.match_id,
          (e->>'puuid')::text                                 AS puuid,
          (e->>'teamId')::int                                 AS team_id,
          (e->>'kills')::int                                  AS kills,
          (e->>'totalDamageDealtToChampions')::int            AS dmg,
          ((e->'challenges'->>'killParticipation')::float)    AS kp
        FROM ${matches} m,
             jsonb_array_elements(m.raw->'info'->'participants') e
        WHERE m.game_creation >= ${splitStart}
          AND m.game_creation <  ${splitEnd}
      ),
      team_totals AS (
        SELECT match_id, team_id,
               SUM(kills) AS team_kills,
               SUM(dmg)   AS team_dmg
        FROM unrolled
        GROUP BY match_id, team_id
      )
      SELECT
        u.puuid                                                          AS "puuid",
        COALESCE(p.display_name, p.game_name, p.riot_id)                AS "displayName",
        AVG(u.kp)                                                        AS "kpAvg",
        AVG(u.dmg::float / NULLIF(t.team_dmg, 0))                       AS "dmgShare",
        COUNT(*)::int                                                    AS "games"
      FROM unrolled u
      JOIN team_totals t USING (match_id, team_id)
      JOIN ${players} p ON p.puuid = u.puuid
      GROUP BY u.puuid, p.display_name, p.game_name, p.riot_id
      HAVING COUNT(*) >= 5
    `,
  );

  const teamRows = teamResult.rows;

  // ── Assemble boards ──────────────────────────────────────────────────────

  return {
    dpm: toRows(simpleRows.map((r) => ({ ...r, value: Number(r.dpm) }))),
    visPerMin: toRows(simpleRows.map((r) => ({ ...r, value: Number(r.visPerMin) }))),
    gpm: toRows(simpleRows.map((r) => ({ ...r, value: Number(r.gpm) }))),
    csPerMin: toRows(simpleRows.map((r) => ({ ...r, value: Number(r.csPerMin) }))),
    kpPct: toRows(teamRows.map((r) => ({ ...r, value: Number(r.kpAvg) }))),
    dmgShare: toRows(teamRows.map((r) => ({ ...r, value: Number(r.dmgShare) }))),
  };
}
