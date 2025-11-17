import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Award } from "lucide-react";

interface KPIScoreCardProps {
  score: number;
  completionScore: number;
  qualityScore: number;
  trend?: {
    value: number;
    period: string;
  };
  rank?: {
    current: number;
    total: number;
  };
}

export function KPIScoreCard({
  score,
  completionScore,
  qualityScore,
  trend,
  rank,
}: KPIScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Xuất sắc";
    if (score >= 70) return "Tốt";
    if (score >= 50) return "Khá";
    return "Cần cải thiện";
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
            <Award className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Điểm KPI tháng này
          </h3>
          <div className={`text-5xl font-bold mb-2 ${getScoreColor(score)}`} data-testid="text-kpi-score">
            {score.toFixed(1)}
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {getScoreLabel(score)}
          </p>
          {trend && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {trend.value >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend.value >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.value >= 0 ? "+" : ""}{trend.value}% so với {trend.period}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Điểm hoàn thành (70%)</span>
              <span className="font-mono font-medium">{completionScore.toFixed(1)}</span>
            </div>
            <Progress value={completionScore} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Điểm chất lượng (30%)</span>
              <span className="font-mono font-medium">{qualityScore.toFixed(1)}</span>
            </div>
            <Progress value={qualityScore} className="h-2" />
          </div>
        </div>

        {rank && (
          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Xếp hạng:{" "}
              <span className="font-bold text-foreground">
                #{rank.current}
              </span>{" "}
              / {rank.total} người
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
