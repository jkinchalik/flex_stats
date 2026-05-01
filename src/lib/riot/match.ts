import { riotFetch, RiotNotFoundError } from "@/lib/riot/client";
import type { MatchDto } from "@/lib/riot/types";

export function getFlexMatchIdsByPuuid(
  puuid: string,
  opts?: { count?: number; start?: number; startTime?: number }
): Promise<string[]> {
  const count = opts?.count ?? 20;
  const start = opts?.start ?? 0;
  let path = `/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=440&count=${count}&start=${start}`;
  if (opts?.startTime !== undefined) {
    path += `&startTime=${opts.startTime}`;
  }
  return riotFetch<string[]>("regional", path);
}

export function getMatchById(matchId: string): Promise<MatchDto> {
  return riotFetch<MatchDto>("regional", `/lol/match/v5/matches/${matchId}`);
}

export async function getMatchByIdSafe(matchId: string): Promise<MatchDto | null> {
  try {
    return await getMatchById(matchId);
  } catch (err) {
    if (err instanceof RiotNotFoundError) return null;
    throw err;
  }
}
