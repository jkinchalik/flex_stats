import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { getAccountByRiotId } from "@/lib/riot/account";
import { getSummonerByPuuid } from "@/lib/riot/summoner";
import { getFlexEntry } from "@/lib/riot/league";
import { getFlexMatchIdsByPuuid, getMatchByIdSafe } from "@/lib/riot/match";

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg || !arg.includes("#")) {
    console.error('Usage: npx tsx scripts/probe.ts "gameName#tagLine"');
    process.exit(1);
  }
  const [gameName, tagLine] = arg.split("#");

  const account = await getAccountByRiotId(gameName, tagLine);
  console.log("account:", account);

  const summoner = await getSummonerByPuuid(account.puuid);
  console.log("summoner:", {
    summonerLevel: summoner.summonerLevel,
    profileIconId: summoner.profileIconId,
  });

  const flex = await getFlexEntry(account.puuid);
  console.log("flex entry:", flex);

  const matchIds = await getFlexMatchIdsByPuuid(account.puuid, { count: 3 });
  console.log("latest 3 flex match ids:", matchIds);

  if (matchIds.length > 0) {
    const match = await getMatchByIdSafe(matchIds[0]);
    if (match) {
      const me = match.info.participants.find((p) => p.puuid === account.puuid);
      console.log("first match summary:", {
        matchId: match.metadata.matchId,
        gameVersion: match.info.gameVersion,
        queueId: match.info.queueId,
        durationSec: match.info.gameDuration,
        you: me
          ? {
              champion: me.championName,
              kda: `${me.kills}/${me.deaths}/${me.assists}`,
              win: me.win,
              cs: me.totalMinionsKilled + me.neutralMinionsKilled,
              gold: me.goldEarned,
              dmg: me.totalDamageDealtToChampions,
            }
          : null,
      });
    } else {
      console.log("first match no longer available from Riot");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
