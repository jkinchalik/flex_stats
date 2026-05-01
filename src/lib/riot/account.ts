import { riotFetch } from "@/lib/riot/client";
import type { AccountDto } from "@/lib/riot/types";

export function getAccountByRiotId(gameName: string, tagLine: string): Promise<AccountDto> {
  const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return riotFetch<AccountDto>("regional", path);
}
