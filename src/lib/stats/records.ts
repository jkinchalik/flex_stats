import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// ── Public types ────────────────────────────────────────────────────────────

export type RecordEntry = {
  puuid: string;
  displayName: string;
  value: string;
  detail?: string;
};

export type RecordsAndShame = {
  records: {
    id: string;
    emoji: string;
    name: string;
    description: string;
    winners: RecordEntry[];
  }[];
  shame: {
    id: string;
    emoji: string;
    name: string;
    description: string;
    winners: RecordEntry[];
  }[];
};

// ── Raw row types from db.execute ───────────────────────────────────────────

type ParticipantRow = {
  match_id: string;
  puuid: string;
  display_name: string | null;
  champion: string;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  dmg: number;
  penta: number;
  quadra: number;
  multi: number;
  spree: number;
  first_blood: boolean;
};

type ShameDeathRow = {
  match_id: string;
  puuid: string;
  display_name: string | null;
  champion: string | null;
  win: boolean;
  deaths: number;
};

type LossStreakRow = {
  puuid: string;
  display_name: string | null;
  win: boolean;
};

type IntingRow = {
  puuid: string;
  display_name: string | null;
  total_deaths: number;
  games: number;
};

type ZeroKdaRow = {
  puuid: string;
  display_name: string | null;
  zero_games: number;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function displayName(row: {
  display_name: string | null;
  [k: string]: unknown;
}): string {
  return row.display_name ?? "Unknown";
}

function winLoss(win: boolean): string {
  return win ? "W" : "L";
}

/** Find all rows that share the maximum value of `metric`. Stable by puuid. */
function topTied<T>(
  rows: T[],
  metric: (r: T) => number,
  min: number,
): T[] {
  let best = -Infinity;
  for (const r of rows) {
    const v = metric(r);
    if (v > best) best = v;
  }
  if (best < min) return [];
  return rows
    .filter((r) => metric(r) === best)
    .sort((a, b) => {
      const pa = (a as { puuid?: string }).puuid ?? "";
      const pb = (b as { puuid?: string }).puuid ?? "";
      return pa < pb ? -1 : pa > pb ? 1 : 0;
    });
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function getRecordsAndShame(
  splitStart: Date,
  splitEnd: Date,
): Promise<RecordsAndShame> {
  // ── Fetch JSONB participant rows (records data) ───────────────────────────
  const participantResult = await db.execute<ParticipantRow>(sql`
    WITH p AS (
      SELECT
        m.match_id,
        m.game_creation,
        (e->>'puuid')::text                               AS puuid,
        (e->>'championName')::text                        AS champion,
        (e->>'win')::boolean                              AS win,
        (e->>'kills')::int                                AS kills,
        (e->>'deaths')::int                               AS deaths,
        (e->>'assists')::int                              AS assists,
        (e->>'totalDamageDealtToChampions')::int          AS dmg,
        (e->>'pentaKills')::int                           AS penta,
        (e->>'quadraKills')::int                          AS quadra,
        (e->>'largestMultiKill')::int                     AS multi,
        (e->>'largestKillingSpree')::int                  AS spree,
        (e->>'firstBloodKill')::boolean                   AS first_blood
      FROM matches m,
           jsonb_array_elements(m.raw->'info'->'participants') e
      WHERE m.game_creation >= ${splitStart}
        AND m.game_creation <  ${splitEnd}
    )
    SELECT
      p.match_id,
      p.puuid,
      COALESCE(pl.display_name, pl.game_name, pl.riot_id) AS display_name,
      p.champion,
      p.win,
      p.kills,
      p.deaths,
      p.assists,
      p.dmg,
      p.penta,
      p.quadra,
      p.multi,
      p.spree,
      p.first_blood
    FROM p
    JOIN players pl ON pl.puuid = p.puuid
  `);

  const pRows = participantResult.rows;

  // ── most-pentas ─────────────────────────────────────────────────────────
  const mostPentasWinners: RecordEntry[] = topTied(pRows, (r) => r.penta, 1).map(
    (r) => ({
      puuid: r.puuid,
      displayName: displayName(r),
      value: r.penta === 1 ? "1 pentakill" : `${r.penta} pentakills`,
      detail: `as ${r.champion} · ${winLoss(r.win)}`,
    }),
  );

  // ── most-multikill ───────────────────────────────────────────────────────
  const mostMultikillWinners: RecordEntry[] = topTied(
    pRows,
    (r) => r.multi,
    4,
  ).map((r) => {
    const label = r.multi >= 5 ? "Pentakill" : "Quadrakill";
    return {
      puuid: r.puuid,
      displayName: displayName(r),
      value: label,
      detail: `as ${r.champion} · ${winLoss(r.win)}`,
    };
  });

  // ── biggest-damage ───────────────────────────────────────────────────────
  const biggestDamageWinners: RecordEntry[] = topTied(
    pRows,
    (r) => r.dmg,
    0,
  ).map((r) => ({
    puuid: r.puuid,
    displayName: displayName(r),
    value: `${r.dmg.toLocaleString()} damage`,
    detail: `as ${r.champion} · ${winLoss(r.win)}`,
  }));

  // ── best-kda ─────────────────────────────────────────────────────────────
  const kdaEligible = pRows.filter((r) => r.kills >= 5);
  const kdaWinners: RecordEntry[] = topTied(
    kdaEligible,
    (r) => (r.kills + r.assists) / Math.max(r.deaths, 1),
    0,
  ).map((r) => {
    const kda = ((r.kills + r.assists) / Math.max(r.deaths, 1)).toFixed(1);
    return {
      puuid: r.puuid,
      displayName: displayName(r),
      value: `${r.kills}/${r.deaths}/${r.assists} (${kda} KDA)`,
      detail: `as ${r.champion} · ${winLoss(r.win)}`,
    };
  });

  // ── longest-spree ────────────────────────────────────────────────────────
  const spreeWinners: RecordEntry[] = topTied(pRows, (r) => r.spree, 5).map(
    (r) => ({
      puuid: r.puuid,
      displayName: displayName(r),
      value: `${r.spree}-kill spree`,
      detail: `as ${r.champion} · ${winLoss(r.win)}`,
    }),
  );

  // ── first-blood-king ─────────────────────────────────────────────────────
  const fbByPuuid = new Map<
    string,
    { count: number; display_name: string | null; puuid: string }
  >();
  for (const r of pRows) {
    if (!r.first_blood) continue;
    const existing = fbByPuuid.get(r.puuid);
    if (existing) {
      existing.count += 1;
    } else {
      fbByPuuid.set(r.puuid, {
        count: 1,
        display_name: r.display_name,
        puuid: r.puuid,
      });
    }
  }
  const fbEntries = Array.from(fbByPuuid.values());
  const fbWinners: RecordEntry[] = topTied(fbEntries, (r) => r.count, 3).map(
    (r) => ({
      puuid: r.puuid,
      displayName: displayName(r),
      value: `${r.count} first bloods`,
    }),
  );

  // ── HALL OF SHAME ────────────────────────────────────────────────────────

  // most-deaths-single-game
  const shameDeathResult = await db.execute<ShameDeathRow>(sql`
    SELECT
      mp.match_id,
      mp.puuid,
      COALESCE(p.display_name, p.game_name, p.riot_id) AS display_name,
      mp.champion_name                                  AS champion,
      mp.win,
      mp.deaths
    FROM match_participants mp
    JOIN matches m ON m.match_id = mp.match_id
    JOIN players p ON p.puuid = mp.puuid
    WHERE m.game_creation >= ${splitStart}
      AND m.game_creation <  ${splitEnd}
  `);

  const shameRows = shameDeathResult.rows;

  const mostDeathsWinners: RecordEntry[] = topTied(
    shameRows,
    (r) => r.deaths,
    8,
  ).map((r) => ({
    puuid: r.puuid,
    displayName: displayName(r),
    value: `${r.deaths} deaths`,
    detail: r.champion ? `as ${r.champion} · ${winLoss(r.win)}` : winLoss(r.win),
  }));

  // longest-loss-streak
  const lossStreakResult = await db.execute<LossStreakRow>(sql`
    SELECT
      mp.puuid,
      COALESCE(p.display_name, p.game_name, p.riot_id) AS display_name,
      mp.win
    FROM match_participants mp
    JOIN matches m ON m.match_id = mp.match_id
    JOIN players p ON p.puuid = mp.puuid
    WHERE m.game_creation >= ${splitStart}
      AND m.game_creation <  ${splitEnd}
    ORDER BY mp.puuid ASC, m.game_creation ASC
  `);

  type StreakAcc = {
    display_name: string | null;
    currentLoss: number;
    maxLoss: number;
  };
  const streakByPuuid = new Map<string, StreakAcc>();
  for (const r of lossStreakResult.rows) {
    let acc = streakByPuuid.get(r.puuid);
    if (!acc) {
      acc = { display_name: r.display_name, currentLoss: 0, maxLoss: 0 };
      streakByPuuid.set(r.puuid, acc);
    }
    if (!r.win) {
      acc.currentLoss += 1;
      if (acc.currentLoss > acc.maxLoss) acc.maxLoss = acc.currentLoss;
    } else {
      acc.currentLoss = 0;
    }
  }

  type StreakEntry = {
    puuid: string;
    display_name: string | null;
    maxLoss: number;
  };
  const streakEntries: StreakEntry[] = Array.from(
    streakByPuuid.entries(),
  ).map(([puuid, acc]) => ({
    puuid,
    display_name: acc.display_name,
    maxLoss: acc.maxLoss,
  }));

  const lossStreakWinners: RecordEntry[] = topTied(
    streakEntries,
    (r) => r.maxLoss,
    3,
  ).map((r) => ({
    puuid: r.puuid,
    displayName: displayName(r),
    value: `${r.maxLoss}-game loss streak`,
  }));

  // inting-champion (most total deaths, min 5 games)
  const intingResult = await db.execute<IntingRow>(sql`
    SELECT
      mp.puuid,
      COALESCE(p.display_name, p.game_name, p.riot_id) AS display_name,
      SUM(mp.deaths)::int                               AS total_deaths,
      COUNT(*)::int                                     AS games
    FROM match_participants mp
    JOIN matches m ON m.match_id = mp.match_id
    JOIN players p ON p.puuid = mp.puuid
    WHERE m.game_creation >= ${splitStart}
      AND m.game_creation <  ${splitEnd}
    GROUP BY mp.puuid, p.display_name, p.game_name, p.riot_id
    HAVING COUNT(*) >= 5
  `);

  const intingWinners: RecordEntry[] = topTied(
    intingResult.rows,
    (r) => r.total_deaths,
    0,
  ).map((r) => ({
    puuid: r.puuid,
    displayName: displayName(r),
    value: `${r.total_deaths} deaths over ${r.games} games`,
  }));

  // 0-kda-club (games with 0 kills + 0 assists)
  const zeroKdaResult = await db.execute<ZeroKdaRow>(sql`
    SELECT
      mp.puuid,
      COALESCE(p.display_name, p.game_name, p.riot_id) AS display_name,
      COUNT(*)::int                                     AS zero_games
    FROM match_participants mp
    JOIN matches m ON m.match_id = mp.match_id
    JOIN players p ON p.puuid = mp.puuid
    WHERE m.game_creation >= ${splitStart}
      AND m.game_creation <  ${splitEnd}
      AND mp.kills = 0
      AND mp.assists = 0
    GROUP BY mp.puuid, p.display_name, p.game_name, p.riot_id
    HAVING COUNT(*) >= 1
  `);

  const zeroKdaWinners: RecordEntry[] = topTied(
    zeroKdaResult.rows,
    (r) => r.zero_games,
    1,
  ).map((r) => ({
    puuid: r.puuid,
    displayName: displayName(r),
    value:
      r.zero_games === 1 ? "1 game (0/x/0)" : `${r.zero_games} games (0/x/0)`,
  }));

  // ── Assemble ─────────────────────────────────────────────────────────────

  return {
    records: [
      {
        id: "most-pentas",
        emoji: "🌟",
        name: "Penta King",
        description: "Most pentakills in a single game.",
        winners: mostPentasWinners,
      },
      {
        id: "most-multikill",
        emoji: "⚡",
        name: "Multikill Monster",
        description: "Quadra or penta in a single game.",
        winners: mostMultikillWinners,
      },
      {
        id: "biggest-damage",
        emoji: "⚔️",
        name: "Damage Record",
        description: "Highest damage to champions in one game.",
        winners: biggestDamageWinners,
      },
      {
        id: "best-kda",
        emoji: "🎯",
        name: "KDA Record",
        description: "Best KDA in a single game (min 5 kills).",
        winners: kdaWinners,
      },
      {
        id: "longest-spree",
        emoji: "🔥",
        name: "Killing Spree",
        description: "Longest killing spree in a single game (min 5).",
        winners: spreeWinners,
      },
      {
        id: "first-blood-king",
        emoji: "🩸",
        name: "First Blood King",
        description: "Most first bloods this split (min 3).",
        winners: fbWinners,
      },
    ],
    shame: [
      {
        id: "most-deaths-single-game",
        emoji: "💀",
        name: "Most Deaths",
        description: "Died the most in a single game (min 8).",
        winners: mostDeathsWinners,
      },
      {
        id: "longest-loss-streak",
        emoji: "📉",
        name: "Longest Loss Streak",
        description: "Most consecutive losses this split (min 3).",
        winners: lossStreakWinners,
      },
      {
        id: "inting-champion",
        emoji: "🤡",
        name: "Inting Champion",
        description: "Most total deaths across the split (min 5 games).",
        winners: intingWinners,
      },
      {
        id: "0-kda-club",
        emoji: "🥚",
        name: "0-KDA Club",
        description: "Most games with 0 kills and 0 assists.",
        winners: zeroKdaWinners,
      },
    ],
  };
}
