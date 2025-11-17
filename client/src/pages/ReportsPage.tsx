import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, CheckCircle, Clock, AlertTriangle, Calendar, Sparkles, Loader2 } from "lucide-react";
import { fetchJson, apiRequest } from "@/lib/queryClient";
import ExportReportButton from "@/components/ExportReportButton";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface TaskReportStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgCompletionDays: number;
  tasksByStatus: {
    status: string;
    count: number;
  }[];
  tasksByPriority: {
    priority: string;
    count: number;
  }[];
  tasksByDepartment: {
    departmentId: string;
    departmentName: string;
    count: number;
  }[];
  timelineData: {
    date: string;
    completed: number;
    created: number;
  }[];
}

interface TaskReportInsights {
  summary: string;
  trends: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  
  // Calculate current week number (matches backend logic)
  const getCurrentWeek = () => {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
    const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    // Ensure week is at least 1 (backend can return up to 53 for some years)
    return Math.max(1, week);
  };
  const currentWeek = getCurrentWeek();

  const [timeRange, setTimeRange] = useState<"week" | "month" | "quarter" | "year">("month");
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter.toString());
  const [selectedWeek, setSelectedWeek] = useState(currentWeek.toString());
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [insights, setInsights] = useState<TaskReportInsights | null>(null);

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: () => fetchJson<Department[]>("/api/departments"),
  });

  const { data: stats, isLoading } = useQuery<TaskReportStats>({
    queryKey: ["/api/reports/tasks", timeRange, selectedYear, selectedMonth, selectedQuarter, selectedWeek, selectedDepartment, selectedStatus],
    queryFn: () => {
      const params = new URLSearchParams({
        timeRange,
      });
      
      if (timeRange === "week") {
        params.append("year", selectedYear);
        params.append("week", selectedWeek);
      } else if (timeRange === "month" && selectedMonth !== "all") {
        params.append("year", selectedYear);
        params.append("month", selectedMonth);
      } else if (timeRange === "quarter" && selectedQuarter !== "all") {
        params.append("year", selectedYear);
        params.append("quarter", selectedQuarter);
      } else if (timeRange === "year") {
        params.append("year", selectedYear);
      }
      
      if (selectedDepartment !== "all") {
        params.append("departmentId", selectedDepartment);
      }
      if (selectedStatus !== "all") {
        params.append("status", selectedStatus);
      }

      return fetchJson<TaskReportStats>(`/api/reports/tasks?${params.toString()}`);
    },
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async (stats: TaskReportStats) => {
      const response = await apiRequest("POST", "/api/reports/tasks/insights", { stats });
      return response.json() as Promise<TaskReportInsights>;
    },
    onSuccess: (data) => {
      setInsights(data);
    },
  });

  const handleGenerateInsights = () => {
    if (stats) {
      generateInsightsMutation.mutate(stats);
    }
  };

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

  const quarters = [
    { value: "1", label: "Quý 1" },
    { value: "2", label: "Quý 2" },
    { value: "3", label: "Quý 3" },
    { value: "4", label: "Quý 4" },
  ];

  // Support weeks 1-53 (some years have 53 weeks)
  const weeks = Array.from({ length: 53 }, (_, i) => ({
    value: String(i + 1),
    label: `Tuần ${i + 1}`,
  }));

  const statuses = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "Chưa bắt đầu", label: "Chưa bắt đầu" },
    { value: "Đang thực hiện", label: "Đang thực hiện" },
    { value: "Hoàn thành", label: "Hoàn thành" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const currentDepartmentName = departments.find(d => d.id === selectedDepartment)?.name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-reports">Báo cáo Nhiệm vụ</h1>
          <p className="text-muted-foreground mt-2">
            Phân tích và thống kê tình hình thực hiện nhiệm vụ
          </p>
        </div>
        <ExportReportButton 
          stats={stats}
          filters={{
            timeRange,
            year: selectedYear,
            month: selectedMonth,
            quarter: selectedQuarter,
            week: selectedWeek,
            department: selectedDepartment,
            departmentName: currentDepartmentName,
            status: selectedStatus,
          }}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Time Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Khoảng thời gian</label>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger data-testid="select-timerange">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Tuần</SelectItem>
                  <SelectItem value="month">Tháng</SelectItem>
                  <SelectItem value="quarter">Quý</SelectItem>
                  <SelectItem value="year">Năm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Year (for all time ranges) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Năm</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={currentYear.toString()}>Năm {currentYear}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Month (conditional) */}
            {timeRange === "month" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tháng</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger data-testid="select-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quarter (conditional) */}
            {timeRange === "quarter" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Quý</label>
                <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                  <SelectTrigger data-testid="select-quarter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quarters.map(quarter => (
                      <SelectItem key={quarter.value} value={quarter.value}>
                        {quarter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Week (conditional) */}
            {timeRange === "week" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Tuần</label>
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger data-testid="select-week">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weeks.map(week => (
                      <SelectItem key={week.value} value={week.value}>
                        {week.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Department */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Phòng ban</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger data-testid="select-department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phòng ban</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Tổng Nhiệm Vụ</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-tasks">
              {stats?.totalTasks || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Trong kỳ báo cáo
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Đã Hoàn Thành</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-completed-tasks">
              {stats?.completedTasks || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tỷ lệ: {stats?.completionRate.toFixed(1) || 0}%
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-in-progress-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Đang Thực Hiện</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-in-progress-tasks">
              {stats?.inProgressTasks || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chưa bắt đầu: {stats?.notStartedTasks || 0}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-overdue-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Quá Hạn</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-overdue-tasks">
              {stats?.overdueTasks || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              TB hoàn thành: {stats?.avgCompletionDays || 0} ngày
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Tasks by Status - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Nhiệm vụ theo Trạng thái</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.tasksByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.tasksByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.status}: ${entry.count}`}
                  >
                    {stats.tasksByStatus.map((entry, index) => {
                      const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Không có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks by Priority - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Nhiệm vụ theo Độ ưu tiên</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.tasksByPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.tasksByPriority}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="priority" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#1976D2" name="Số lượng" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Không có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks by Department - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Nhiệm vụ theo Phòng ban</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.tasksByDepartment.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.tasksByDepartment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="departmentName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#059669" name="Số lượng" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Không có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Xu hướng theo Thời gian</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("vi-VN");
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="created" 
                    stroke="#3b82f6" 
                    name="Tạo mới" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#10b981" 
                    name="Hoàn thành" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Không có dữ liệu
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Phân tích AI
            </CardTitle>
            <CardDescription>
              Tự động phân tích và đề xuất cải thiện
            </CardDescription>
          </div>
          <Button 
            onClick={handleGenerateInsights} 
            disabled={generateInsightsMutation.isPending || !stats || stats.totalTasks === 0}
            data-testid="button-generate-insights"
          >
            {generateInsightsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Tạo Phân tích AI
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {insights ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-semibold mb-2">Tóm tắt</h4>
                <p className="text-sm">{insights.summary}</p>
              </div>

              {/* Trends */}
              {insights.trends.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Xu hướng</h4>
                  <ul className="space-y-2">
                    {insights.trends.map((trend, idx) => (
                      <li key={idx} className="text-sm flex gap-2">
                        <span className="text-blue-600">📈</span>
                        <span>{trend}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid md:grid-cols-2 gap-4">
                {insights.strengths.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-green-600">Điểm mạnh</h4>
                    <ul className="space-y-2">
                      {insights.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm flex gap-2">
                          <span>✓</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.weaknesses.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-orange-600">Điểm yếu</h4>
                    <ul className="space-y-2">
                      {insights.weaknesses.map((weakness, idx) => (
                        <li key={idx} className="text-sm flex gap-2">
                          <span>⚠</span>
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Đề xuất hành động</h4>
                  <ul className="space-y-2">
                    {insights.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm flex gap-2">
                        <span className="text-primary">→</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              <p>Nhấn nút "Tạo Phân tích AI" để xem phân tích chi tiết</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
