import { StatSparkline } from "@/components/stat-sparkline";
import type { SquadAverages, WeeklyPoint } from "@/lib/stats/trends";

type Props = {
  points: WeeklyPoint[];
  squadAvg: SquadAverages;
};

export function StatSparklineRow({ points, squadAvg }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatSparkline
        points={points}
        metric="kda"
        squadAvg={squadAvg.kda}
        label="KDA"
      />
      <StatSparkline
        points={points}
        metric="visionPerMin"
        squadAvg={squadAvg.visionPerMin}
        label="Vision / min"
      />
      <StatSparkline
        points={points}
        metric="csPerMin"
        squadAvg={squadAvg.csPerMin}
        label="CS / min"
      />
    </div>
  );
}
