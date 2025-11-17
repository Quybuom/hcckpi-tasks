import { KPIScoreCard } from "../KPIScoreCard";

export default function KPIScoreCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-background">
      <KPIScoreCard
        score={85.5}
        completionScore={88}
        qualityScore={80}
        trend={{ value: 3.2, period: "tháng trước" }}
        rank={{ current: 5, total: 28 }}
      />
      <KPIScoreCard
        score={92.3}
        completionScore={95}
        qualityScore={86}
        trend={{ value: 5.1, period: "tháng trước" }}
        rank={{ current: 2, total: 28 }}
      />
      <KPIScoreCard
        score={68.7}
        completionScore={70}
        qualityScore={65}
        trend={{ value: -2.3, period: "tháng trước" }}
        rank={{ current: 18, total: 28 }}
      />
    </div>
  );
}
