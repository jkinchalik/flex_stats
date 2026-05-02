import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rankSortKey } from "@/lib/stats/ranks";

export type RecapEntry = {
  puuid: string;
  displayName: string;
  avatarUrl: string | null;
  value: string;
  detail?: string;
};

export type WeeklyRecap = {
  weekStart: Date;
  weekEnd: Date;
  mvp: RecapEntry | null;
  biggestMover: RecapEntry | null;
  worstGame: RecapEntry | null;
  hotCold: { hot: RecapEntry | null; cold: RecapEntry | null };
};

type WeekStat = {
  puuid: string;
  displayName: string;
  avatarUrl: string | null;
  games: number;
  wins: number;
  kda: number;
};

type WorstGameRow = {
  puuid: string;
  displayName: string;
  avatarUrl: string | null;
  championName: string;
  win: boolean;
  deaths: number;
};

type RankSnapshot = {
  puuid: string;
  displayName: string;
  avatarUrl: string | null;
  tier: string | null;
  division: string | null;
  lp: number;
};

type LastFiveRow = {
  puuid: string;
  displayName: string;
  avatarUrl: string | null;
  splitGames: number;
  splitWins: number;
  recentGames: number;
  recentWins: number;
};

export async function getWeeklyRecap(
  now: Date,
  splitStart: Date,
  splitEnd: Date,
): Promise<WeeklyRecap> {
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekEnd = now;

  const weekStatsRows = await db.execute<WeekStat>(sql`
    SELECT
      mp.puuid AS "puuid",
      COALESCE(p.display_name, p.game_name, p.riot_id) AS "displayName",
      p.avatar_url AS "avatarUrl",
      COUNT(*)::int AS "games",
      SUM(CASE WHEN mp.win THEN 1 ELSE 0 END)::int AS "wins",
      (SUM(mp.kills + mp.assists)::float / GREATEST(SUM(mp.deaths), 1)) AS "kda"
    FROM match_participants mp
    JOIN matches m ON m.match_id = mp.match_id
    JOIN players p ON p.puuid = mp.puuid
    WHERE m.game_creation >= ${weekStart}
      AND m.game_creation <  ${weekEnd}
    GROUP BY mp.puuid, "displayName", p.avatar_url
  `);

  let mvp: RecapEntry | null = null;
  let mvpScore = -Infinity;
  for (const r of weekStatsRows.rows) {
    if (r.games < 3) continue;
    const winrate = r.wins / r.games;
    const score = winrate * r.games + Number(r.kda);
    if (score > mvpScore) {
      mvpScore = score;
      const wr = Math.round(winrate * 100);
      mvp = {
        puuid: r.puuid,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        value: `${r.games} games · ${wr}% WR`,
        detail: `${Number(r.kda).toFixed(1)} KDA`,
      };
    }
  }

  const earliestSnapshotRows = await db.execute<RankSnapshot>(sql`
    SELECT DISTINCT ON (rh.puuid)
      rh.puuid AS "puuid",
      COALESCE(p.display_name, p.game_name, p.riot_id) AS "displayName",
      p.avatar_url AS "avatarUrl",
      rh.tier AS "tier",
      rh.division AS "division",
      rh.lp AS "lp"
    FROM rank_history rh
    JOIN players p ON p.puuid = rh.puuid
    WHERE rh.recorded_at >= ${weekStart}
      AND rh.recorded_at <  ${weekEnd}
    ORDER BY rh.puuid, rh.recorded_at ASC
  `);

  const latestSnapshotRows = await db.execute<RankSnapshot>(sql`
    SELECT DISTINCT ON (rh.puuid)
      rh.puuid AS "puuid",
      COALESCE(p.display_name, p.game_name, p.riot_id) AS "displayName",
      p.avatar_url AS "avatarUrl",
      rh.tier AS "tier",
      rh.division AS "division",
      rh.lp AS "lp"
    FROM rank_history rh
    JOIN players p ON p.puuid = rh.puuid
    WHERE rh.recorded_at <= ${weekEnd}
    ORDER BY rh.puuid, rh.recorded_at DESC
  `);

  const earliest = new Map(earliestSnapshotRows.rows.map((r) => [r.puuid, r]));
  const latest = new Map(latestSnapshotRows.rows.map((r) => [r.puuid, r]));

  let biggestMover: RecapEntry | null = null;
  let biggestAbs = 0;
  for (const [puuid, e] of earliest) {
    const l = latest.get(puuid);
    if (!l) continue;
    const before = rankSortKey(e.tier, e.division, e.lp);
    const after = rankSortKey(l.tier, l.division, l.lp);
    const delta = after - before;
    if (Math.abs(delta) > biggestAbs) {
      biggestAbs = Math.abs(delta);
      biggestMover = {
        puuid,
        displayName: l.displayName,
        avatarUrl: l.avatarUrl,
        value: `${delta >= 0 ? "+" : ""}${delta} pts`,
      };
    }
  }

  const worstGameRows = await db.execute<WorstGameRow>(sql`
    SELECT
      mp.puuid AS "puuid",
      COALESCE(p.display_name, p.game_name, p.riot_id) AS "displayName",
      p.avatar_url AS "avatarUrl",
      mp.champion_name AS "championName",
      mp.win AS "win",
      mp.deaths AS "deaths"
    FROM match_participants mp
    JOIN matches m ON m.match_id = mp.match_id
    JOIN players p ON p.puuid = mp.puuid
    WHERE m.game_creation >= ${weekStart}
      AND m.game_creation <  ${weekEnd}
      AND mp.deaths >= 5
    ORDER BY mp.deaths DESC
    LIMIT 1
  `);

  const worstGame: RecapEntry | null = worstGameRows.rows[0]
    ? {
        puuid: worstGameRows.rows[0].puuid,
        displayName: worstGameRows.rows[0].displayName,
        avatarUrl: worstGameRows.rows[0].avatarUrl,
        value: `${worstGameRows.rows[0].deaths} deaths`,
        detail: `${worstGameRows.rows[0].championName ?? "Unknown"} · ${worstGameRows.rows[0].win ? "W" : "L"}`,
      }
    : null;

  const hotColdRows = await db.execute<LastFiveRow>(sql`
    WITH split_stats AS (
      SELECT
        mp.puuid,
        COUNT(*)::int AS games,
        SUM(CASE WHEN mp.win THEN 1 ELSE 0 END)::int AS wins
      FROM match_participants mp
      JOIN matches m ON m.match_id = mp.match_id
      WHERE m.game_creation >= ${splitStart}
        AND m.game_creation <  ${splitEnd}
      GROUP BY mp.puuid
    ),
    recent AS (
      SELECT
        mp.puuid,
        mp.win,
        ROW_NUMBER() OVER (PARTITION BY mp.puuid ORDER BY m.game_creation DESC) AS rn
      FROM match_participants mp
      JOIN matches m ON m.match_id = mp.match_id
      WHERE m.game_creation >= ${weekStart}
        AND m.game_creation <  ${weekEnd}
    ),
    recent_agg AS (
      SELECT
        puuid,
        COUNT(*)::int AS games,
        SUM(CASE WHEN win THEN 1 ELSE 0 END)::int AS wins
      FROM recent
      WHERE rn <= 5
      GROUP BY puuid
    )
    SELECT
      ss.puuid AS "puuid",
      COALESCE(p.display_name, p.game_name, p.riot_id) AS "displayName",
      p.avatar_url AS "avatarUrl",
      ss.games AS "splitGames",
      ss.wins AS "splitWins",
      COALESCE(ra.games, 0) AS "recentGames",
      COALESCE(ra.wins, 0) AS "recentWins"
    FROM split_stats ss
    JOIN players p ON p.puuid = ss.puuid
    LEFT JOIN recent_agg ra ON ra.puuid = ss.puuid
    WHERE ss.games >= 10 AND COALESCE(ra.games, 0) >= 3
  `);

  let hot: RecapEntry | null = null;
  let cold: RecapEntry | null = null;
  let bestDelta = 0;
  let worstDelta = 0;
  for (const r of hotColdRows.rows) {
    const splitWr = r.splitWins / r.splitGames;
    const recentWr = r.recentWins / r.recentGames;
    const delta = recentWr - splitWr;
    const losses = r.recentGames - r.recentWins;
    const deltaPct = Math.round(delta * 100);
    if (delta > bestDelta) {
      bestDelta = delta;
      hot = {
        puuid: r.puuid,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        value: `${r.recentWins}-${losses}`,
        detail: `+${deltaPct}% vs avg`,
      };
    }
    if (delta < worstDelta) {
      worstDelta = delta;
      cold = {
        puuid: r.puuid,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        value: `${r.recentWins}-${losses}`,
        detail: `${deltaPct}% vs avg`,
      };
    }
  }

  return { weekStart, weekEnd, mvp, biggestMover, worstGame, hotCold: { hot, cold } };
}