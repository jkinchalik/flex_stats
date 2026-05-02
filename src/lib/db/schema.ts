import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  bigserial,
  jsonb,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

export const players = pgTable(
  "players",
  {
    puuid: text("puuid").primaryKey(),
    riotId: text("riot_id").notNull(),
    gameName: text("game_name"),
    tagLine: text("tag_line"),
    summonerId: text("summoner_id"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  },
  (table) => [index("players_riot_id_idx").on(table.riotId)],
);

export const currentRank = pgTable("current_rank", {
  puuid: text("puuid")
    .primaryKey()
    .references(() => players.puuid, { onDelete: "cascade" }),
  tier: text("tier"),
  division: text("division"),
  lp: integer("lp"),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const rankHistory = pgTable(
  "rank_history",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    puuid: text("puuid")
      .notNull()
      .references(() => players.puuid, { onDelete: "cascade" }),
    tier: text("tier"),
    division: text("division"),
    lp: integer("lp"),
    wins: integer("wins"),
    losses: integer("losses"),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("rank_history_puuid_recorded_at_idx").on(
      table.puuid,
      table.recordedAt.desc(),
    ),
  ],
);

export const matches = pgTable(
  "matches",
  {
    matchId: text("match_id").primaryKey(),
    queueId: integer("queue_id").notNull(),
    gameCreation: timestamp("game_creation", { withTimezone: true }).notNull(),
    gameDuration: integer("game_duration").notNull(),
    gameVersion: text("game_version"),
    raw: jsonb("raw").$type<unknown>(),
  },
  (table) => [
    index("matches_game_creation_idx").on(table.gameCreation.desc()),
  ],
);

export const matchParticipants = pgTable(
  "match_participants",
  {
    matchId: text("match_id")
      .notNull()
      .references(() => matches.matchId, { onDelete: "cascade" }),
    puuid: text("puuid")
      .notNull()
      .references(() => players.puuid, { onDelete: "cascade" }),
    championId: integer("champion_id").notNull(),
    championName: text("champion_name"),
    teamId: integer("team_id"),
    win: boolean("win").notNull(),
    kills: integer("kills").notNull().default(0),
    deaths: integer("deaths").notNull().default(0),
    assists: integer("assists").notNull().default(0),
    cs: integer("cs").notNull().default(0),
    gold: integer("gold").notNull().default(0),
    damageToChampions: integer("damage_to_champions").notNull().default(0),
    visionScore: integer("vision_score").notNull().default(0),
    wardsPlaced: integer("wards_placed").notNull().default(0),
    timePlayed: integer("time_played").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.puuid] }),
    index("match_participants_puuid_idx").on(table.puuid),
    index("match_participants_puuid_match_id_idx").on(
      table.puuid,
      table.matchId,
    ),
    index("match_participants_champion_id_idx").on(table.championId),
  ],
);

export const syncState = pgTable("sync_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

export type CurrentRank = typeof currentRank.$inferSelect;
export type NewCurrentRank = typeof currentRank.$inferInsert;

export type RankHistory = typeof rankHistory.$inferSelect;
export type NewRankHistory = typeof rankHistory.$inferInsert;

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;

export type MatchParticipant = typeof matchParticipants.$inferSelect;
export type NewMatchParticipant = typeof matchParticipants.$inferInsert;

export type SyncState = typeof syncState.$inferSelect;
export type NewSyncState = typeof syncState.$inferInsert;