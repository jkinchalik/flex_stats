import { cache } from "react";
import { gte, lt, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";

export type WindowedMatch = {
  matchId: string;
  gameCreation: Date;
  gameDuration: number;
  raw: unknown;
};

export const getMatchesInWindow = cache(
  async (splitStart: Date, splitEnd: Date): Promise<WindowedMatch[]> => {
    const rows = await db
      .select({
        matchId: matches.matchId,
        gameCreation: matches.gameCreation,
        gameDuration: matches.gameDuration,
        raw: matches.raw,
      })
      .from(matches)
      .where(and(gte(matches.gameCreation, splitStart), lt(matches.gameCreation, splitEnd)));
    return rows.map((r) => ({ ...r, gameCreation: r.gameCreation as Date }));
  },
);
