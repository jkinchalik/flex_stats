export type AccountDto = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type SummonerDto = {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
};

export type LeagueEntryDto = {
  leagueId: string;
  queueType: "RANKED_FLEX_SR" | "RANKED_SOLO_5x5" | string;
  tier: string;
  rank: string;
  summonerId: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
};

export type ParticipantDto = {
  puuid: string;
  championId: number;
  championName: string;
  teamId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  visionScore: number;
  wardsPlaced: number;
  timePlayed: number;
};

export type MatchInfoDto = {
  gameCreation: number;
  gameDuration: number;
  gameVersion: string;
  queueId: number;
  participants: ParticipantDto[];
};

export type MatchDto = {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: MatchInfoDto;
};
