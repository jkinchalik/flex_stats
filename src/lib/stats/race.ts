import { db } from "@/lib/db";
import { rankHistory, players } from "@/lib/db/schema";
import { and, eq, gte, lt, asc } from "drizzle-orm";
import { rankSortKey } from "@/lib/stats/ranks";
import { colorForPuuid } from "@/lib/stats/_shared/palette";

export type RankRacePoint = {
  recordedAt: Date;
  rankSortKey: number;
  lp: number;
  tier: string | null;
  division: string | null;
};

export type RankRaceSeries = {
  puuid: string;
  displayName: string;
  color: string;
  points: RankRacePoint[];
};

export async function getRankRaceData(
  splitStart: Date,
  splitEnd: Date,
): Promise<RankRaceSeries[]> {
  const rows = await db
    .select({
      puuid: rankHistory.puuid,
      riotId: players.riotId,
      gameName: players.gameName,
      tier: rankHistory.tier,
      division: rankHistory.division,
      lp: rankHistory.lp,
      recordedAt: rankHistory.recordedAt,
    })
    .from(rankHistory)
    .innerJoin(players, eq(rankHistory.puuid, players.puuid))
    .where(
      and(
        gte(rankHistory.recordedAt, splitStart),
        lt(rankHistory.recordedAt, splitEnd),
      ),
    )
    .orderBy(asc(rankHistory.puuid), asc(rankHistory.recordedAt));

  const byPuuid = new Map<
    string,
    { riotId: string; gameName: string | null; points: RankRacePoint[] }
  >();

  for (const row of rows) {
    if (!row.recordedAt) continue;

    let entry = byPuuid.get(row.puuid);
    if (!entry) {
      entry = { riotId: row.riotId, gameName: row.gameName, points: [] };
      byPuuid.set(row.puuid, entry);
    }

    entry.points.push({
      recordedAt: row.recordedAt,
      rankSortKey: rankSortKey(row.tier, row.division, row.lp),
      lp: row.lp ?? 0,
      tier: row.tier,
      division: row.division,
    });
  }

  const result: RankRaceSeries[] = [];
  for (const [puuid, { riotId, gameName, points }] of byPuuid) {
    if (points.length === 0) continue;
    result.push({
      puuid,
      displayName: gameName ?? riotId,
      color: colorForPuuid(puuid),
      points,
    });
  }

  return result;
}
