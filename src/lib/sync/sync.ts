import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  currentRank,
  matchParticipants,
  matches,
  players,
  rankHistory,
} from "@/lib/db/schema";
import { getFlexEntry } from "@/lib/riot/league";
import { getFlexMatchIdsByPuuid, getMatchByIdSafe } from "@/lib/riot/match";
import type { MatchDto } from "@/lib/riot/types";

export type SyncSummary = {
  playersResolved: number;
  newMatchesInserted: number;
  ranksUpdated: number;
  rankHistoryRowsInserted: number;
  errors: { riotId?: string; puuid?: string; step: string; message: string }[];
};

type RosterPlayer = {
  puuid: string;
  riotId: string;
};

function emptySummary(): SyncSummary {
  return {
    playersResolved: 0,
    newMatchesInserted: 0,
    ranksUpdated: 0,
    rankHistoryRowsInserted: 0,
    errors: [],
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function loadRosterFromDb(): Promise<RosterPlayer[]> {
  return db
    .select({ puuid: players.puuid, riotId: players.riotId })
    .from(players);
}

async function fetchMatchIdsForPlayer(
  player: RosterPlayer,
  summary: SyncSummary,
): Promise<string[]> {
  try {
    return await getFlexMatchIdsByPuuid(player.puuid, { count: 20 });
  } catch (err) {
    summary.errors.push({
      riotId: player.riotId,
      puuid: player.puuid,
      step: "getFlexMatchIdsByPuuid",
      message: errorMessage(err),
    });
    return [];
  }
}

async function filterNewMatchIds(matchIds: string[]): Promise<string[]> {
  if (matchIds.length === 0) return [];
  const existing = await db
    .select({ matchId: matches.matchId })
    .from(matches)
    .where(inArray(matches.matchId, matchIds));
  const existingSet = new Set(existing.map((row) => row.matchId));
  return matchIds.filter((id) => !existingSet.has(id));
}

// neon-http does not support transactions; rely on onConflictDoNothing for idempotency.
async function insertMatchAndParticipants(
  match: MatchDto,
  rosterPuuids: Set<string>,
): Promise<boolean> {
  const inserted = await db
    .insert(matches)
    .values({
      matchId: match.metadata.matchId,
      queueId: match.info.queueId,
      gameCreation: new Date(match.info.gameCreation),
      gameDuration: match.info.gameDuration,
      gameVersion: match.info.gameVersion,
      raw: match,
    })
    .onConflictDoNothing({ target: matches.matchId })
    .returning({ matchId: matches.matchId });

  const participantRows = match.info.participants
    .filter((p) => rosterPuuids.has(p.puuid))
    .map((p) => ({
      matchId: match.metadata.matchId,
      puuid: p.puuid,
      championId: p.championId,
      championName: p.championName,
      teamId: p.teamId,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      cs: p.totalMinionsKilled + p.neutralMinionsKilled,
      gold: p.goldEarned,
      damageToChampions: p.totalDamageDealtToChampions,
      visionScore: p.visionScore,
      wardsPlaced: p.wardsPlaced,
      timePlayed: p.timePlayed,
    }));

  if (participantRows.length > 0) {
    await db
      .insert(matchParticipants)
      .values(participantRows)
      .onConflictDoNothing({
        target: [matchParticipants.matchId, matchParticipants.puuid],
      });
  }

  return inserted.length > 0;
}

async function refreshRank(
  player: RosterPlayer,
  summary: SyncSummary,
): Promise<void> {
  const { puuid } = player;
  let tier: string | null = null;
  let division: string | null = null;
  let lp = 0;
  let wins = 0;
  let losses = 0;

  try {
    const entry = await getFlexEntry(puuid);
    if (entry) {
      tier = entry.tier;
      division = entry.rank;
      lp = entry.leaguePoints;
      wins = entry.wins;
      losses = entry.losses;
    }
  } catch (err) {
    summary.errors.push({
      riotId: player.riotId,
      puuid,
      step: "getFlexEntry",
      message: errorMessage(err),
    });
    return;
  }

  await db
    .insert(currentRank)
    .values({
      puuid,
      tier,
      division,
      lp,
      wins,
      losses,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: currentRank.puuid,
      set: {
        tier,
        division,
        lp,
        wins,
        losses,
        updatedAt: new Date(),
      },
    });
  summary.ranksUpdated += 1;

  const latest = await db
    .select()
    .from(rankHistory)
    .where(eq(rankHistory.puuid, puuid))
    .orderBy(desc(rankHistory.recordedAt))
    .limit(1);

  // consistent timeline for LP race chart: cap at ~1 row/hour/puuid even when rank is unchanged
  const latestRow = latest[0];
  const rankChanged =
    latest.length === 0 ||
    latestRow.tier !== tier ||
    latestRow.division !== division ||
    latestRow.lp !== lp;
  const staleSnapshot =
    latestRow !== undefined &&
    latestRow.recordedAt !== null &&
    Date.now() - latestRow.recordedAt.getTime() > 60 * 60 * 1000;
  const changed = rankChanged || staleSnapshot;

  if (changed) {
    await db.insert(rankHistory).values({
      puuid,
      tier,
      division,
      lp,
      wins,
      losses,
    });
    summary.rankHistoryRowsInserted += 1;
  }
}

async function touchLastSyncedAt(puuid: string): Promise<void> {
  await db
    .update(players)
    .set({ lastSyncedAt: new Date() })
    .where(eq(players.puuid, puuid));
}

export async function syncRoster(): Promise<SyncSummary> {
  const summary = emptySummary();

  const roster = await loadRosterFromDb();
  summary.playersResolved = roster.length;
  const rosterPuuids = new Set(roster.map((r) => r.puuid));

  const playerMatchIds: string[][] = [];
  for (const r of roster) {
    const ids = await fetchMatchIdsForPlayer(r, summary);
    playerMatchIds.push(ids);
  }

  const allMatchIds = Array.from(new Set(playerMatchIds.flat()));
  const newMatchIds = await filterNewMatchIds(allMatchIds);

  for (const id of newMatchIds) {
    let match: MatchDto | null = null;
    try {
      match = await getMatchByIdSafe(id);
    } catch (err) {
      summary.errors.push({
        step: "getMatchByIdSafe",
        message: `${id}: ${errorMessage(err)}`,
      });
      continue;
    }
    if (!match) continue;
    try {
      const wasInserted = await insertMatchAndParticipants(match, rosterPuuids);
      if (wasInserted) summary.newMatchesInserted += 1;
    } catch (err) {
      summary.errors.push({
        step: "insertMatchAndParticipants",
        message: `${id}: ${errorMessage(err)}`,
      });
    }
  }

  for (const r of roster) {
    await refreshRank(r, summary);
    try {
      await touchLastSyncedAt(r.puuid);
    } catch (err) {
      summary.errors.push({
        riotId: r.riotId,
        puuid: r.puuid,
        step: "touchLastSyncedAt",
        message: errorMessage(err),
      });
    }
  }

  return summary;
}

export async function syncSinglePlayer(puuid: string): Promise<SyncSummary> {
  const summary = emptySummary();

  const rows = await db
    .select({ puuid: players.puuid, riotId: players.riotId })
    .from(players)
    .where(eq(players.puuid, puuid))
    .limit(1);
  const player = rows[0];
  if (!player) {
    summary.errors.push({
      puuid,
      step: "loadPlayer",
      message: `Player ${puuid} not found in DB`,
    });
    return summary;
  }
  summary.playersResolved = 1;

  const rosterPuuids = new Set<string>([puuid]);
  const ids = await fetchMatchIdsForPlayer(player, summary);
  const newIds = await filterNewMatchIds(ids);

  for (const id of newIds) {
    let match: MatchDto | null = null;
    try {
      match = await getMatchByIdSafe(id);
    } catch (err) {
      summary.errors.push({
        riotId: player.riotId,
        puuid,
        step: "getMatchByIdSafe",
        message: `${id}: ${errorMessage(err)}`,
      });
      continue;
    }
    if (!match) continue;
    try {
      const wasInserted = await insertMatchAndParticipants(match, rosterPuuids);
      if (wasInserted) summary.newMatchesInserted += 1;
    } catch (err) {
      summary.errors.push({
        riotId: player.riotId,
        puuid,
        step: "insertMatchAndParticipants",
        message: `${id}: ${errorMessage(err)}`,
      });
    }
  }

  await refreshRank(player, summary);
  try {
    await touchLastSyncedAt(puuid);
  } catch (err) {
    summary.errors.push({
      riotId: player.riotId,
      puuid,
      step: "touchLastSyncedAt",
      message: errorMessage(err),
    });
  }

  return summary;
}