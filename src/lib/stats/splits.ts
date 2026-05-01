import { SPLITS, type Split } from "@/config/splits";

export function getActiveSplit(now: Date = new Date()): Split {
  const nowMs = now.getTime();
  const first = SPLITS[0];
  if (!first) {
    return {
      id: "unknown",
      label: "Unknown",
      startsAt: new Date(0),
      endsAt: new Date(0),
    };
  }
  if (nowMs < first.startsAt.getTime()) {
    return first;
  }
  for (const split of SPLITS) {
    if (split.startsAt.getTime() <= nowMs && nowMs < split.endsAt.getTime()) {
      return split;
    }
  }
  let mostRecent: Split = first;
  for (const split of SPLITS) {
    if (
      split.startsAt.getTime() <= nowMs &&
      split.startsAt.getTime() >= mostRecent.startsAt.getTime()
    ) {
      mostRecent = split;
    }
  }
  return mostRecent;
}

export function getSplitById(id: string): Split | undefined {
  return SPLITS.find((split) => split.id === id);
}
