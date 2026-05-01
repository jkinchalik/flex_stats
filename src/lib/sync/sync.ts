import { desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  currentRank,
  matchParticipants,
  matches,
  players,
  rankHistory,
} from "@/lib/db/schema";
import { getAccountByRiotId } from "@/lib/riot/account";
import { getFlexEntry } from "@/lib/riot/league";
import { getFlexMatchIdsByPuuid, getMatchByIdSafe } from "@/lib/riot/match";
import { getSummonerByPuuid } from "@/lib/riot/summoner";
import type { MatchDto } from "@/lib/riot/types";
import type { RosterEntry } from "@/config/roster";
import { ROSTER } from "@/config/roster";

export type SyncSummary = {
  playersResolved: number;
  newMatchesInserted: number;
  ranksUpdated: number;
  rankHistoryRowsInserted: number;
  errors: { riotId?: string; puuid?: string; step: string; message: string }[];
};

type ResolvedPlayer = {
  entry: RosterEntry;
  puuid: string;
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

function parseRiotId(riotId: string): { gameName: string; tagLine: string } | null {
  const idx = riotId.lastIndexOf("#");
  if (idx <= 0 || idx === riotId.length - 1) return null;
  return {
    gameName: riotId.slice(0, idx),
    tagLine: riotId.slice(idx + 1),
  };
}

async function resolvePlayer(
  entry: RosterEntry,
  summary: SyncSummary,
): Promise<ResolvedPlayer | null> {
  const parsed = parseRiotId(entry.riotId);
  if (!parsed) {
    summary.errors.push({
      riotId: entry.riotId,
      step: "parseRiotId",
      message: `Invalid riotId format: ${entry.riotId}`,
    });
    return null;
  }

  const existing = await db
    .select()
    .from(players)
    .where(eq(players.riotId, entry.riotId))
    .limit(1);

  if (existing.length > 0 && existing[0].puuid) {
    summary.playersResolved += 1;
    return { entry, puuid: existing[0].puuid };
  }

  try {
    const account = await getAccountByRiotId(parsed.gameName, parsed.tagLine);
    let summonerId: string | null = null;
    try {
      const summoner = await getSummonerByPuuid(account.puuid);
      summonerId = summoner.id;
    } catch (err) {
      summary.errors.push({
        riotId: entry.riotId,
        puuid: account.puuid,
        step: "getSummonerByPuuid",
        message: errorMessage(err),
      });
    }

    await db
      .insert(players)
      .values({
        puuid: account.puuid,
        riotId: entry.riotId,
        gameName: account.gameName,
        tagLine: account.tagLine,
        summonerId,
        displayName: entry.displayName ?? null,
      })
      .onConflictDoUpdate({
        target: players.puuid,
        set: {
          riotId: entry.riotId,
          gameName: account.gameName,
          tagLine: account.tagLine,
          summonerId,
          displayName: entry.displayName ?? null,
        },
      });

    summary.playersResolved += 1;
    return { entry, puuid: account.puuid };
  } catch (err) {
    summary.errors.push({
      riotId: entry.riotId,
      step: "getAccountByRiotId",
      message: errorMessage(err),
    });
    return null;
  }
}

async function fetchMatchIdsForPlayer(
  resolved: ResolvedPlayer,
  summary: SyncSummary,
): Promise<string[]> {
  try {
    return await getFlexMatchIdsByPuuid(resolved.puuid, { count: 20 });
  } catch (err) {
    summary.errors.push({
      riotId: resolved.entry.riotId,
      puuid: resolved.puuid,
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
  resolved: ResolvedPlayer,
  summary: SyncSummary,
): Promise<void> {
  const { puuid } = resolved;
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
      riotId: resolved.entry.riotId,
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

  const changed =
    latest.length === 0 ||
    latest[0].tier !== tier ||
    latest[0].division !== division ||
    latest[0].lp !== lp;

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

  const resolved: ResolvedPlayer[] = [];
  for (const entry of ROSTER) {
    const r = await resolvePlayer(entry, summary);
    if (r) resolved.push(r);
  }

  const rosterPuuids = new Set(resolved.map((r) => r.puuid));

  const playerMatchIds: string[][] = [];
  for (const r of resolved) {
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

  for (const r of resolved) {
    await refreshRank(r, summary);
    try {
      await touchLastSyncedAt(r.puuid);
    } catch (err) {
      summary.errors.push({
        riotId: r.entry.riotId,
        puuid: r.puuid,
        step: "touchLastSyncedAt",
        message: errorMessage(err),
      });
    }
  }

  return summary;
}

export async function syncPlayer(
  entry: RosterEntry,
): Promise<Partial<SyncSummary>> {
  const summary = emptySummary();

  const resolved = await resolvePlayer(entry, summary);
  if (!resolved) return summary;

  const rosterPuuids = new Set<string>([resolved.puuid]);

  const ids = await fetchMatchIdsForPlayer(resolved, summary);
  const newIds = await filterNewMatchIds(ids);

  for (const id of newIds) {
    let match: MatchDto | null = null;
    try {
      match = await getMatchByIdSafe(id);
    } catch (err) {
      summary.errors.push({
        riotId: entry.riotId,
        puuid: resolved.puuid,
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
        riotId: entry.riotId,
        puuid: resolved.puuid,
        step: "insertMatchAndParticipants",
        message: `${id}: ${errorMessage(err)}`,
      });
    }
  }

  await refreshRank(resolved, summary);

  try {
    await touchLastSyncedAt(resolved.puuid);
  } catch (err) {
    summary.errors.push({
      riotId: entry.riotId,
      puuid: resolved.puuid,
      step: "touchLastSyncedAt",
      message: errorMessage(err),
    });
  }

  return summary;
}
