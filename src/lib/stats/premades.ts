import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchParticipants, matches, players } from "@/lib/db/schema";

export type PremadeMatch = {
  matchId: string;
  gameCreation: Date;
  gameDuration: number;
  teamId: number;
  win: boolean;
  friendCount: number;
  friends: {
    puuid: string;
    displayName: string;
    avatarUrl: string | null;
    championName: string;
    kills: number;
    deaths: number;
    assists: number;
  }[];
};

export type PremadeSummary = {
  total: number;
  wins: number;
  losses: number;
  winrate: number;
  recent: PremadeMatch[]; // most recent 10
};

type GroupRow = {
  matchId: string;
  teamId: number;
  friends: number;
  won: boolean;
  gameCreation: Date;
  gameDuration: number;
};

type ParticipantRow = {
  matchId: string;
  teamId: number;
  puuid: string;
  displayName: string | null;
  avatarUrl: string | null;
  championName: string | null;
  kills: number;
  deaths: number;
  assists: number;
};

export async function getPremadeRecord(
  splitStart: Date,
  splitEnd: Date,
  minStack: number = 4,
): Promise<PremadeSummary> {
  // Step 1: find all (match_id, team_id) groups with >= minStack players
  const groupRows = await db.execute<GroupRow>(
    sql`
      SELECT
        mp.match_id  AS "matchId",
        mp.team_id   AS "teamId",
        COUNT(*)::int AS friends,
        BOOL_AND(mp.win) AS won,
        MIN(m.game_creation) AS "gameCreation",
        MIN(m.game_duration)::int AS "gameDuration"
      FROM ${matchParticipants} mp
      JOIN ${matches} m ON m.match_id = mp.match_id
      WHERE m.game_creation >= ${splitStart}
        AND m.game_creation < ${splitEnd}
      GROUP BY mp.match_id, mp.team_id
      HAVING COUNT(*) >= ${minStack}
      ORDER BY "gameCreation" DESC
    `,
  );

  const allGroups = groupRows.rows;

  const total = allGroups.length;
  const wins = allGroups.filter((r) => r.won).length;
  const losses = total - wins;
  const winrate = total > 0 ? wins / total : 0;

  if (total === 0) {
    return { total, wins, losses, winrate, recent: [] };
  }

  // Take top 10 most-recent groups for detailed participant fetch
  const top10 = allGroups.slice(0, 10);

  // Build a values list of (match_id, team_id) pairs to filter
  const pairs = top10
    .map((r) => `('${r.matchId}', ${r.teamId})`)
    .join(", ");

  const participantRows = await db.execute<ParticipantRow>(
    sql`
      SELECT
        mp.match_id   AS "matchId",
        mp.team_id    AS "teamId",
        mp.puuid      AS "puuid",
        COALESCE(p.display_name, p.game_name, p.riot_id) AS "displayName",
        p.avatar_url  AS "avatarUrl",
        mp.champion_name AS "championName",
        mp.kills      AS "kills",
        mp.deaths     AS "deaths",
        mp.assists    AS "assists"
      FROM ${matchParticipants} mp
      JOIN ${players} p ON p.puuid = mp.puuid
      WHERE (mp.match_id, mp.team_id) IN (${sql.raw(pairs)})
    `,
  );

  // Group participants by (matchId, teamId)
  const participantsByGroup = new Map<string, ParticipantRow[]>();
  for (const row of participantRows.rows) {
    const key = `${row.matchId}:${row.teamId}`;
    const existing = participantsByGroup.get(key);
    if (existing) {
      existing.push(row);
    } else {
      participantsByGroup.set(key, [row]);
    }
  }

  const recent: PremadeMatch[] = top10.map((group) => {
    const key = `${group.matchId}:${group.teamId}`;
    const rawFriends = participantsByGroup.get(key) ?? [];
    const friends = rawFriends.map((f) => ({
      puuid: f.puuid,
      displayName: f.displayName ?? f.puuid,
      avatarUrl: f.avatarUrl,
      championName: f.championName ?? "",
      kills: f.kills,
      deaths: f.deaths,
      assists: f.assists,
    }));
    return {
      matchId: group.matchId,
      gameCreation: new Date(group.gameCreation as unknown as string | number | Date),
      gameDuration: group.gameDuration,
      teamId: group.teamId,
      win: group.won,
      friendCount: group.friends,
      friends,
    };
  });

  return { total, wins, losses, winrate, recent };
}