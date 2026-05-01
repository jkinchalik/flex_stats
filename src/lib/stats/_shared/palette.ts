const PALETTE = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#facc15",
  "#a3e635",
  "#4ade80",
  "#34d399",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
] as const;

export function colorForPuuid(puuid: string): string {
  let hash = 5381;
  for (let i = 0; i < puuid.length; i++) {
    hash = ((hash << 5) + hash) ^ puuid.charCodeAt(i);
    hash = hash >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export const PUUID_PALETTE = PALETTE;
