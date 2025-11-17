import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";

interface TaskStats {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

interface TaskOverviewChartProps {
  personalStats: TaskStats;
  secondaryStats?: TaskStats;
  secondaryLabel?: string;
  title?: string;
}

export function TaskOverviewChart({ 
  personalStats, 
  secondaryStats, 
  secondaryLabel = "Phòng ban",
  title = "Biểu đồ tổng quan"
}: TaskOverviewChartProps) {
  const chartData = [
    {
      name: "Tổng số",
      "Cá nhân": personalStats.total,
      ...(secondaryStats && { [secondaryLabel]: secondaryStats.total }),
    },
    {
      name: "Chưa bắt đầu",
      "Cá nhân": personalStats.notStarted,
      ...(secondaryStats && { [secondaryLabel]: secondaryStats.notStarted }),
    },
    {
      name: "Đang thực hiện",
      "Cá nhân": personalStats.inProgress,
      ...(secondaryStats && { [secondaryLabel]: secondaryStats.inProgress }),
    },
    {
      name: "Hoàn thành",
      "Cá nhân": personalStats.completed,
      ...(secondaryStats && { [secondaryLabel]: secondaryStats.completed }),
    },
    {
      name: "Quá hạn",
      "Cá nhân": personalStats.overdue,
      ...(secondaryStats && { [secondaryLabel]: secondaryStats.overdue }),
    },
  ];

  return (
    <Card data-testid="card-task-overview-chart">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="name" 
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend 
              wrapperStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar 
              dataKey="Cá nhân" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]}
            />
            {secondaryStats && (
              <Bar 
                dataKey={secondaryLabel} 
                fill="hsl(var(--info))" 
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
