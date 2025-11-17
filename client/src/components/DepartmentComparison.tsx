import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Building2 } from "lucide-react";
import { useState } from "react";

interface DepartmentKPI {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  avgKpi: number;
  userCount: number;
}

interface KPIStats {
  overallStats: {
    avgKpi: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalDepartments: number;
    totalUsers: number;
  };
  kpiByDepartment: DepartmentKPI[];
  topPerformers: Array<{
    userId: string;
    fullName: string;
    departmentName: string | null;
    kpi: number;
    taskCount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    avgKpi: number;
  }>;
}

export function DepartmentComparison() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<string>(currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const { data: kpiStats, isLoading } = useQuery<KPIStats>({
    queryKey: ['/api/kpi/stats', { year: selectedYear, month: selectedMonth }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedYear && selectedYear !== "all") {
        params.append("year", selectedYear);
      }
      if (selectedMonth && selectedMonth !== "all") {
        params.append("month", selectedMonth);
      }
      const queryString = params.toString();
      return fetchJson<KPIStats>(`/api/kpi/stats${queryString ? `?${queryString}` : ''}`);
    },
  });

  // Generate years for selector (current year and 2 previous years)
  const years = Array.from({ length: 3 }, (_, i) => currentDate.getFullYear() - i);
  
  // Months in Vietnamese
  const months = [
    { value: "1", label: "Tháng 1" },
    { value: "2", label: "Tháng 2" },
    { value: "3", label: "Tháng 3" },
    { value: "4", label: "Tháng 4" },
    { value: "5", label: "Tháng 5" },
    { value: "6", label: "Tháng 6" },
    { value: "7", label: "Tháng 7" },
    { value: "8", label: "Tháng 8" },
    { value: "9", label: "Tháng 9" },
    { value: "10", label: "Tháng 10" },
    { value: "11", label: "Tháng 11" },
    { value: "12", label: "Tháng 12" },
  ];

  // Color scale based on KPI score
  const getBarColor = (avgKpi: number) => {
    if (avgKpi >= 80) return "hsl(var(--success))";
    if (avgKpi >= 60) return "hsl(var(--info))";
    if (avgKpi >= 40) return "hsl(var(--warning))";
    return "hsl(var(--error))";
  };

  if (isLoading) {
    return (
      <Card data-testid="card-department-comparison">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const departments = kpiStats?.kpiByDepartment || [];

  return (
    <Card data-testid="card-department-comparison">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-md bg-primary/20 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" data-testid="icon-department-comparison" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold" data-testid="text-department-comparison-title">
              So Sánh KPI Phòng Ban
            </CardTitle>
            <CardDescription className="text-sm">
              Hiệu suất trung bình theo phòng ban
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32" data-testid="select-month-department-comparison">
              <SelectValue placeholder="Chọn tháng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Cả năm</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28" data-testid="select-year-department-comparison">
              <SelectValue placeholder="Chọn năm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {departments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-2" />
            <p>Không có dữ liệu KPI</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departments} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="departmentCode" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DepartmentKPI;
                      return (
                        <div className="bg-card border rounded-md p-3 shadow-lg">
                          <p className="font-semibold text-sm">{data.departmentName}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            KPI: <span className="font-bold text-primary">{data.avgKpi.toFixed(1)}</span>/100
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Số người: {data.userCount}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgKpi" radius={[8, 8, 0, 0]}>
                  {departments.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.avgKpi)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
              <div>
                <span className="font-medium">KPI trung bình toàn cơ quan:</span>{' '}
                <span className="font-bold text-primary" data-testid="text-overall-kpi">
                  {kpiStats?.overallStats.avgKpi.toFixed(1) || '0.0'}
                </span>/100
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--success))" }} />
                  <span className="text-xs">≥ 80</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--info))" }} />
                  <span className="text-xs">60-79</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--warning))" }} />
                  <span className="text-xs">40-59</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--error))" }} />
                  <span className="text-xs">&lt; 40</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
