export type Split = {
  id: string;
  label: string;
  startsAt: Date;
  endsAt: Date;
};

// Approximate 2026 split boundaries — update with Riot's official dates as they're announced.
export const SPLITS: Split[] = [
  {
    id: "2026-S1",
    label: "2026 Split 1",
    startsAt: new Date("2026-01-08T00:00:00Z"),
    endsAt: new Date("2026-05-14T00:00:00Z"),
  },
  {
    id: "2026-S2",
    label: "2026 Split 2",
    startsAt: new Date("2026-05-14T00:00:00Z"),
    endsAt: new Date("2026-09-10T00:00:00Z"),
  },
  {
    id: "2026-S3",
    label: "2026 Split 3",
    startsAt: new Date("2026-09-10T00:00:00Z"),
    endsAt: new Date("2027-01-07T00:00:00Z"),
  },
];
