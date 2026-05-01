import { riotFetch } from "@/lib/riot/client";
import type { LeagueEntryDto } from "@/lib/riot/types";

export function getLeagueEntriesByPuuid(puuid: string): Promise<LeagueEntryDto[]> {
  return riotFetch<LeagueEntryDto[]>("platform", `/lol/league/v4/entries/by-puuid/${puuid}`);
}

export async function getFlexEntry(puuid: string): Promise<LeagueEntryDto | null> {
  const entries = await getLeagueEntriesByPuuid(puuid);
  return entries.find((e) => e.queueType === "RANKED_FLEX_SR") ?? null;
}
