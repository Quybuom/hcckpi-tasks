import { StatCard } from "../StatCard";
import { ClipboardList, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-background">
      <StatCard
        title="Tổng nhiệm vụ"
        value={48}
        icon={ClipboardList}
        trend={{ value: 12, isPositive: true }}
      />
      <StatCard
        title="Hoàn thành"
        value={32}
        icon={CheckCircle}
        description="Tháng này"
      />
      <StatCard
        title="Quá hạn"
        value={3}
        icon={AlertCircle}
        trend={{ value: 5, isPositive: false }}
      />
      <StatCard
        title="KPI trung bình"
        value="85.5"
        icon={TrendingUp}
        trend={{ value: 3, isPositive: true }}
      />
    </div>
  );
}
