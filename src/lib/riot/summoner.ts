import { riotFetch } from "@/lib/riot/client";
import type { SummonerDto } from "@/lib/riot/types";

export function getSummonerByPuuid(puuid: string): Promise<SummonerDto> {
  return riotFetch<SummonerDto>("platform", `/lol/summoner/v4/summoners/by-puuid/${puuid}`);
}
