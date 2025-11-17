import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, CheckCircle, Building2, Award, BarChart3, Info } from "lucide-react";
import { fetchJson } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ExportKpiButton from "@/components/ExportKpiButton";

interface KpiStats {
  overallStats: {
    avgKpi: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalDepartments: number;
    totalUsers: number;
  };
  kpiByDepartment: {
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    avgKpi: number;
    userCount: number;
  }[];
  topPerformers: {
    userId: string;
    fullName: string;
    departmentName: string | null;
    kpi: number;
    taskCount: number;
  }[];
  monthlyTrend: {
    month: string;
    avgKpi: number;
  }[];
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function KpiPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: () => fetchJson<Department[]>("/api/departments"),
  });

  // Get selected department name for export
  const selectedDepartmentName = departments.find(d => d.id === selectedDepartment)?.name;

  const { data: stats, isLoading } = useQuery<KpiStats>({
    queryKey: ["/api/kpi/stats", selectedYear, selectedMonth, selectedDepartment],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedYear !== "all") params.append("year", selectedYear);
      if (selectedMonth !== "all") params.append("month", selectedMonth);
      if (selectedDepartment !== "all") params.append("departmentId", selectedDepartment);
      
      const url = `/api/kpi/stats${params.toString() ? `?${params.toString()}` : ""}`;
      return fetchJson<KpiStats>(url);
    },
  });

  const years = [currentYear.toString()];
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

  const getKpiColor = (kpi: number) => {
    if (kpi >= 8) return "text-green-600";
    if (kpi >= 6) return "text-blue-600";
    if (kpi >= 4) return "text-yellow-600";
    return "text-red-600";
  };

  const getKpiBadgeVariant = (kpi: number): "default" | "secondary" | "destructive" => {
    if (kpi >= 8) return "default";
    if (kpi >= 6) return "secondary";
    return "destructive";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Đang tải thống kê...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-kpi">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Thống kê KPI</h1>
          <p className="text-muted-foreground">
            Theo dõi hiệu suất công việc và KPI của toàn bộ hệ thống
          </p>
        </div>

        {/* Filters and Export Button */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[200px]" data-testid="select-department">
              <SelectValue placeholder="Chọn phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[130px]" data-testid="select-year">
              <SelectValue placeholder="Chọn năm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  Năm {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[130px]" data-testid="select-month">
              <SelectValue placeholder="Chọn tháng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ExportKpiButton 
            stats={stats} 
            filters={{
              year: selectedYear,
              month: selectedMonth,
              department: selectedDepartment,
              departmentName: selectedDepartmentName,
            }}
          />
        </div>
      </div>

      {/* Info Alert */}
      {selectedMonth !== "all" && (
        <Alert data-testid="alert-kpi-info">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Lưu ý:</strong> KPI được tính dựa trên <strong>hạn hoàn thành (deadline)</strong> của nhiệm vụ. 
            Nhiệm vụ có deadline trong tháng được chọn sẽ được tính vào KPI của tháng đó, 
            kể cả khi tháng chưa kết thúc. Để xem KPI cả năm, chọn "Tất cả" ở phần tháng.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-avg-kpi">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">KPI Trung Bình</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getKpiColor(stats?.overallStats.avgKpi || 0)}`} data-testid="text-avg-kpi">
              {stats?.overallStats.avgKpi.toFixed(1) || "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Trên tổng số {stats?.overallStats.totalUsers || 0} cán bộ
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Tổng Nhiệm Vụ</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-tasks">
              {stats?.overallStats.totalTasks || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Hoàn thành: {stats?.overallStats.completedTasks || 0}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-completion-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Tỷ Lệ Hoàn Thành</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-completion-rate">
              {stats?.overallStats.completionRate.toFixed(1) || "0.0"}%
            </div>
            <p className="text-xs text-muted-foreground">
              Trong tổng số nhiệm vụ
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-departments">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Phòng Ban</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-departments">
              {stats?.overallStats.totalDepartments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Số phòng ban hoạt động
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Trend Chart */}
        <Card data-testid="card-monthly-trend">
          <CardHeader>
            <CardTitle>Xu Hướng KPI Theo Tháng</CardTitle>
            <CardDescription>
              12 tháng gần nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.monthlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgKpi" 
                  name="KPI Trung Bình"
                  stroke="#1976D2" 
                  strokeWidth={2}
                  dot={{ fill: "#1976D2", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Comparison Chart */}
        <Card data-testid="card-department-comparison">
          <CardHeader>
            <CardTitle>So Sánh KPI Theo Phòng Ban</CardTitle>
            <CardDescription>
              KPI trung bình của từng phòng ban
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.kpiByDepartment || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="departmentCode" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis domain={[0, 10]} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.departmentName}</p>
                          <p className="text-sm">KPI: {data.avgKpi.toFixed(1)}</p>
                          <p className="text-sm text-muted-foreground">
                            {data.userCount} cán bộ
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="avgKpi" 
                  name="KPI Trung Bình"
                  fill="#1976D2"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Table */}
      <Card data-testid="card-top-performers">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Top 10 Cán Bộ Xuất Sắc
          </CardTitle>
          <CardDescription>
            Xếp hạng theo KPI cao nhất
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Xếp hạng</TableHead>
                <TableHead>Họ và tên</TableHead>
                <TableHead>Phòng ban</TableHead>
                <TableHead className="text-center">Số nhiệm vụ</TableHead>
                <TableHead className="text-right">KPI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.topPerformers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Chưa có dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                stats?.topPerformers.map((performer, index) => (
                  <TableRow key={performer.userId} data-testid={`row-top-performer-${index + 1}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index === 0 && <Award className="h-4 w-4 text-yellow-500" />}
                        {index === 1 && <Award className="h-4 w-4 text-gray-400" />}
                        {index === 2 && <Award className="h-4 w-4 text-orange-600" />}
                        <span className="font-semibold">{index + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-performer-name-${index + 1}`}>
                      {performer.fullName}
                    </TableCell>
                    <TableCell data-testid={`text-performer-department-${index + 1}`}>
                      {performer.departmentName || "Chưa phân công"}
                    </TableCell>
                    <TableCell className="text-center" data-testid={`text-performer-tasks-${index + 1}`}>
                      {performer.taskCount}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-performer-kpi-${index + 1}`}>
                      <Badge variant={getKpiBadgeVariant(performer.kpi)} className="font-mono">
                        {performer.kpi.toFixed(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
