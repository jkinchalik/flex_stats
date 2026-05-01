const TIER_WEIGHTS: Record<string, number> = {
  CHALLENGER: 9,
  GRANDMASTER: 8,
  MASTER: 7,
  DIAMOND: 6,
  EMERALD: 5,
  PLATINUM: 4,
  GOLD: 3,
  SILVER: 2,
  BRONZE: 1,
  IRON: 0,
};

const DIVISION_WEIGHTS: Record<string, number> = {
  I: 4,
  II: 3,
  III: 2,
  IV: 1,
};

const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

export function tierWeight(tier: string | null | undefined): number {
  if (!tier) return -1;
  const key = tier.toUpperCase();
  const weight = TIER_WEIGHTS[key];
  return weight ?? -1;
}

export function divisionWeight(division: string | null | undefined): number {
  if (!division) return 0;
  const key = division.toUpperCase();
  return DIVISION_WEIGHTS[key] ?? 0;
}

export function rankSortKey(
  tier: string | null | undefined,
  division: string | null | undefined,
  lp: number | null | undefined,
): number {
  const tw = tierWeight(tier);
  if (tw < 0) return -1;
  return tw * 10000 + divisionWeight(division) * 100 + (lp ?? 0);
}

export function formatRank(
  tier: string | null | undefined,
  division: string | null | undefined,
  lp: number | null | undefined,
): string {
  if (!tier || tierWeight(tier) < 0) return "Unranked";
  const upper = tier.toUpperCase();
  const lpVal = lp ?? 0;
  if (APEX_TIERS.has(upper)) {
    return `${upper} — ${lpVal} LP`;
  }
  const div = division ? division.toUpperCase() : "IV";
  return `${upper} ${div} — ${lpVal} LP`;
}

export const TIER_COLORS: Record<string, string> = {
  challenger: "text-yellow-300",
  grandmaster: "text-red-400",
  master: "text-purple-400",
  diamond: "text-cyan-400",
  emerald: "text-emerald-400",
  platinum: "text-teal-300",
  gold: "text-amber-400",
  silver: "text-slate-300",
  bronze: "text-orange-700",
  iron: "text-stone-500",
  unranked: "text-zinc-500",
};
