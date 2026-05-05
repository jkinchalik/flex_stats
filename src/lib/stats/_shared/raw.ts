export type ParticipantRaw = {
  puuid: string;
  riotIdGameName: string;
  riotIdTagline: string;
  teamId: number;
  championId: number;
  championName: string;
  teamPosition: string | null;
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
  pentaKills: number;
  quadraKills: number;
  largestMultiKill: number;
  largestKillingSpree: number;
  firstBloodKill: boolean;
  challenges: {
    killParticipation: number | null;
    kda: number | null;
    damagePerMinute: number | null;
    goldPerMinute: number | null;
    visionScorePerMinute: number | null;
  };
};

export type TeamRaw = { teamId: number; win: boolean };

export type MatchRaw = { participants: ParticipantRaw[]; teams: TeamRaw[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(v: unknown): number {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

function bool(v: unknown): boolean {
  return v === true;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

function parseChallenges(raw: unknown): ParticipantRaw["challenges"] {
  const c = isRecord(raw) ? raw : {};
  return {
    killParticipation: numOrNull(c["killParticipation"]),
    kda: numOrNull(c["kda"]),
    damagePerMinute: numOrNull(c["damagePerMinute"]),
    goldPerMinute: numOrNull(c["goldPerMinute"]),
    visionScorePerMinute: numOrNull(c["visionScorePerMinute"]),
  };
}

function parseParticipant(raw: unknown): ParticipantRaw {
  const p = isRecord(raw) ? raw : {};
  return {
    puuid: str(p["puuid"]),
    riotIdGameName: str(p["riotIdGameName"]) || str(p["summonerName"]),
    riotIdTagline: str(p["riotIdTagline"]),
    teamId: num(p["teamId"]),
    championId: num(p["championId"]),
    championName: str(p["championName"]),
    teamPosition: strOrNull(p["teamPosition"]),
    win: bool(p["win"]),
    kills: num(p["kills"]),
    deaths: num(p["deaths"]),
    assists: num(p["assists"]),
    totalMinionsKilled: num(p["totalMinionsKilled"]),
    neutralMinionsKilled: num(p["neutralMinionsKilled"]),
    goldEarned: num(p["goldEarned"]),
    totalDamageDealtToChampions: num(p["totalDamageDealtToChampions"]),
    visionScore: num(p["visionScore"]),
    wardsPlaced: num(p["wardsPlaced"]),
    timePlayed: num(p["timePlayed"]),
    pentaKills: num(p["pentaKills"]),
    quadraKills: num(p["quadraKills"]),
    largestMultiKill: num(p["largestMultiKill"]),
    largestKillingSpree: num(p["largestKillingSpree"]),
    firstBloodKill: bool(p["firstBloodKill"]),
    challenges: parseChallenges(p["challenges"]),
  };
}

function parseTeam(raw: unknown): TeamRaw {
  const t = isRecord(raw) ? raw : {};
  return {
    teamId: num(t["teamId"]),
    win: bool(t["win"]),
  };
}

export function extractFromRaw(raw: unknown): MatchRaw {
  const root = isRecord(raw) ? raw : {};
  const info = isRecord(root["info"]) ? root["info"] : {};
  const participantsRaw = Array.isArray(info["participants"]) ? info["participants"] : [];
  const teamsRaw = Array.isArray(info["teams"]) ? info["teams"] : [];
  return {
    participants: participantsRaw.map(parseParticipant),
    teams: teamsRaw.map(parseTeam),
  };
}
