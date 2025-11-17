import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Building2,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { AISuggestions } from "@/components/AISuggestions";
import { TaskOverviewChart } from "@/components/TaskOverviewChart";
import { TaskListDialog } from "@/components/TaskListDialog";
import { DepartmentComparison } from "@/components/DepartmentComparison";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  deadline: string;
  progress: number;
  departmentId: string | null;
  createdById: string;
  assignments: Array<{
    id: string;
    fullName: string;
    userId: string;
    role: string;
  }>;
}

interface Stats {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

function calculateStats(
  tasks: Task[],
  currentUserId?: string,
  filterByUser: boolean = false,
): Stats {
  const now = new Date();

  const filteredTasks =
    filterByUser && currentUserId
      ? tasks.filter((task) =>
          task.assignments.some((a) => a.userId === currentUserId),
        )
      : tasks;

  return {
    total: filteredTasks.length,
    notStarted: filteredTasks.filter((t) => t.status === "Chưa bắt đầu").length,
    inProgress: filteredTasks.filter((t) => t.status === "Đang thực hiện")
      .length,
    completed: filteredTasks.filter((t) => t.status === "Hoàn thành").length,
    overdue: filteredTasks.filter((t) => {
      const isOverdue = new Date(t.deadline) < now && t.status !== "Hoàn thành";
      return isOverdue;
    }).length,
  };
}

// Status color variants for stat cards
type StatVariant = "info" | "warning" | "progress" | "success" | "error";

const statVariants: Record<
  StatVariant,
  { bg: string; iconBg: string; iconColor: string }
> = {
  info: {
    bg: "bg-[hsl(var(--info-tint))]",
    iconBg: "bg-[hsl(var(--info))]",
    iconColor: "text-white",
  },
  warning: {
    bg: "bg-[hsl(var(--warning-tint))]",
    iconBg: "bg-[hsl(var(--warning))]",
    iconColor: "text-white",
  },
  progress: {
    bg: "bg-[hsl(var(--progress-tint))]",
    iconBg: "bg-[hsl(var(--progress))]",
    iconColor: "text-white",
  },
  success: {
    bg: "bg-[hsl(var(--success-tint))]",
    iconBg: "bg-[hsl(var(--success))]",
    iconColor: "text-white",
  },
  error: {
    bg: "bg-[hsl(var(--error-tint))]",
    iconBg: "bg-[hsl(var(--error))]",
    iconColor: "text-white",
  },
};

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "info",
  onClick,
}: {
  title: string;
  value: number;
  icon: any;
  description?: string;
  variant?: StatVariant;
  onClick?: () => void;
}) {
  const colors = statVariants[variant];

  return (
    <Card
      className={`${colors.bg} ${onClick ? "cursor-pointer hover-elevate active-elevate-2" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className={`h-8 w-8 rounded-md ${colors.iconBg} flex items-center justify-center`}
        >
          <Icon className={`h-4 w-4 ${colors.iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyKPICard({
  kpiData,
  currentMonth,
  currentYear,
}: {
  kpiData?: { totalScore: number; taskCount: number; averageScore: number };
  currentMonth: number;
  currentYear: number;
}) {
  return (
    <Card
      className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
      data-testid="card-monthly-kpi"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-md bg-primary/20 flex items-center justify-center">
            <TrendingUp
              className="h-5 w-5 text-primary"
              data-testid="icon-kpi"
            />
          </div>
          <div>
            <CardTitle
              className="text-base font-semibold"
              data-testid="text-kpi-title"
            >
              Điểm KPI Tháng {currentMonth}/{currentYear}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Hiệu suất cá nhân</p>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className="text-3xl font-bold text-primary"
            data-testid="text-monthly-kpi-score"
          >
            {kpiData?.averageScore?.toFixed(1) ?? "0.0"}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span data-testid="text-kpi-task-count">
            Số nhiệm vụ: {kpiData?.taskCount ?? 0}
          </span>
          {(kpiData?.averageScore ?? 0) >= 80 && (
            <Badge
              variant="default"
              className="bg-success/20 text-success hover:bg-success/30"
              data-testid="badge-kpi-excellent"
            >
              Xuất sắc
            </Badge>
          )}
          {(kpiData?.averageScore ?? 0) >= 60 &&
            (kpiData?.averageScore ?? 0) < 80 && (
              <Badge
                variant="default"
                className="bg-info/20 text-info hover:bg-info/30"
                data-testid="badge-kpi-good"
              >
                Tốt
              </Badge>
            )}
          {(kpiData?.averageScore ?? 0) < 60 &&
            (kpiData?.averageScore ?? 0) > 0 && (
              <Badge
                variant="default"
                className="bg-warning/20 text-warning hover:bg-warning/30"
                data-testid="badge-kpi-needs-improvement"
              >
                Cần cải thiện
              </Badge>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<string>(
    currentYear.toString(),
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    currentMonth.toString(),
  );

  // Build query params
  const buildQueryParams = (departmentId?: string, userId?: string) => {
    const params = new URLSearchParams();
    if (departmentId) params.append("departmentId", departmentId);
    if (userId) params.append("userId", userId);
    if (selectedYear !== "all") params.append("year", selectedYear);
    if (selectedMonth !== "all") params.append("month", selectedMonth);
    return params.toString() ? `?${params.toString()}` : "";
  };

  // Define role checks once (used in queries and UI logic)
  const isLeadership = user?.role === "Giám đốc" || user?.role === "Phó Giám đốc";
  const isDeptHead = user?.role === "Trưởng phòng";
  const isDeptHeadOrDeputy = user?.role === "Trưởng phòng" || user?.role === "Phó trưởng phòng";
  const isStaff = user?.role === "Chuyên viên" || user?.role === "Phó trưởng phòng";

  // AUTHENTICATED: Fetch all tasks (backend filters by permissions)
  const { data: allTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { year: selectedYear, month: selectedMonth }],
    queryFn: () => fetchJson<Task[]>(`/api/tasks${buildQueryParams()}`),
    enabled: !!user,
  });

  // AUTHENTICATED: Fetch ALL user tasks (no year/month filter) for personal stats
  // - Director/Deputy Director: Get all organization tasks (no userId filter)
  // - Department Head/Deputy: Get all tasks assigned to user (with userId filter)
  // - Staff: Backend auto-filters by userId
  const { data: allUserTasksUnfiltered = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { unfiltered: true, userId: isDeptHeadOrDeputy ? user?.id : undefined }],
    queryFn: () => {
      // Department Heads & Deputies need userId parameter to get ALL their assigned tasks (not just department tasks)
      const url = isDeptHeadOrDeputy ? `/api/tasks?userId=${user?.id}` : "/api/tasks";
      return fetchJson<Task[]>(url);
    },
    enabled: !!user,
  });

  // AUTHENTICATED: Fetch department tasks if user has departmentId
  const { data: deptTasks = [] } = useQuery<Task[]>({
    queryKey: [
      "/api/tasks",
      {
        departmentId: user?.departmentId,
        year: selectedYear,
        month: selectedMonth,
      },
    ],
    queryFn: async () => {
      if (!user?.departmentId) return [];
      return fetchJson<Task[]>(
        `/api/tasks${buildQueryParams(user.departmentId)}`,
      );
    },
    enabled: !!user?.departmentId,
  });

  // AUTHENTICATED: Fetch monthly KPI score for current user
  const kpiYear = selectedYear !== "all" ? parseInt(selectedYear) : currentYear;
  const kpiMonth =
    selectedMonth !== "all" ? parseInt(selectedMonth) : currentMonth;

  const { data: monthlyKPI } = useQuery<{
    totalScore: number;
    taskCount: number;
    averageScore: number;
  }>({
    queryKey: ["/api/kpi/user", user?.id, { month: kpiMonth, year: kpiYear }],
    queryFn: async () => {
      if (!user) return { totalScore: 0, taskCount: 0, averageScore: 0 };
      const monthStart = new Date(kpiYear, kpiMonth - 1, 1);
      const monthEnd = new Date(kpiYear, kpiMonth, 0, 23, 59, 59, 999);
      return fetchJson<{
        totalScore: number;
        taskCount: number;
        averageScore: number;
      }>(
        `/api/kpi/user/${user.id}?periodStart=${monthStart.toISOString()}&periodEnd=${monthEnd.toISOString()}`,
      );
    },
    enabled: !!user,
  });

  if (!user) return null;

  // Dialog state for task list popup
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogDescription, setDialogDescription] = useState("");
  const [dialogTasks, setDialogTasks] = useState<Task[]>([]);

  // Calculate stats
  // Use allUserTasksUnfiltered for personal stats to show ALL user tasks (not just month-filtered)
  // - Staff & Department Heads: Backend already filters by userId, so no need to filter again (filterByUser=false)
  // - Leadership (Directors): Backend returns all tasks, so filter by userId on frontend (filterByUser=true)
  const needsUserFilter = isLeadership; // Only filter for Leadership (Directors get all org tasks)
  const personalStats = calculateStats(
    allUserTasksUnfiltered,
    user.id,
    needsUserFilter,
  );
  const deptStats = user.departmentId ? calculateStats(deptTasks) : null; // All dept tasks (no user filter)
  const orgStats = isLeadership ? calculateStats(allTasks) : null; // All org tasks (no user filter)

  // Helper to open dialog with filtered tasks
  const openTaskDialog = (
    title: string,
    description: string,
    tasks: Task[],
  ) => {
    setDialogTitle(title);
    setDialogDescription(description);
    setDialogTasks(tasks);
    setDialogOpen(true);
  };

  // Helper to filter tasks by status for dialog
  const filterTasksByStatus = (tasks: Task[], status: string): Task[] => {
    const now = new Date();

    switch (status) {
      case "all":
        return tasks;
      case "Chưa bắt đầu":
      case "Đang thực hiện":
      case "Hoàn thành":
        return tasks.filter((t) => t.status === status);
      case "Quá hạn":
        return tasks.filter(
          (t) => new Date(t.deadline) < now && t.status !== "Hoàn thành",
        );
      default:
        return tasks;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const years = [currentYear];
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
            Tổng quan
          </h1>
          <p className="text-muted-foreground">
            Chào mừng {user.fullName} ({user.position || user.role})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32" data-testid="select-year">
              <SelectValue placeholder="Năm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả năm</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  Năm {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32" data-testid="select-month">
              <SelectValue placeholder="Tháng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tháng</SelectItem>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leadership view: Tabs for Personal vs Organization */}
      {isLeadership && (
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal" data-testid="tab-personal">
              <User className="h-4 w-4 mr-2" />
              Cá nhân
            </TabsTrigger>
            <TabsTrigger value="organization" data-testid="tab-organization">
              <Building2 className="h-4 w-4 mr-2" />
              Toàn cơ quan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="Tổng số"
                value={personalStats.total}
                icon={ClipboardList}
                description="Nhiệm vụ cá nhân"
                variant="info"
                onClick={() => {
                  // For Staff & Department Heads: allUserTasksUnfiltered already filtered by backend
                  // For Leadership: filter by user assignments on frontend
                  const personalTasks = isLeadership
                    ? allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      )
                    : allUserTasksUnfiltered;
                  openTaskDialog(
                    "Tổng số nhiệm vụ cá nhân",
                    `${personalStats.total} nhiệm vụ`,
                    personalTasks,
                  );
                }}
              />
              <StatCard
                title="Chưa bắt đầu"
                value={personalStats.notStarted}
                icon={Clock}
                variant="warning"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Chưa bắt đầu",
                  );
                  openTaskDialog(
                    "Nhiệm vụ chưa bắt đầu",
                    `${filtered.length} nhiệm vụ cá nhân`,
                    filtered,
                  );
                }}
              />
              <StatCard
                title="Đang thực hiện"
                value={personalStats.inProgress}
                icon={AlertCircle}
                variant="progress"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Đang thực hiện",
                  );
                  openTaskDialog(
                    "Nhiệm vụ đang thực hiện",
                    `${filtered.length} nhiệm vụ cá nhân`,
                    filtered,
                  );
                }}
              />
              <StatCard
                title="Hoàn thành"
                value={personalStats.completed}
                icon={CheckCircle}
                variant="success"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Hoàn thành",
                  );
                  openTaskDialog(
                    "Nhiệm vụ hoàn thành",
                    `${filtered.length} nhiệm vụ cá nhân`,
                    filtered,
                  );
                }}
              />
              <StatCard
                title="Quá hạn"
                value={personalStats.overdue}
                icon={AlertCircle}
                description="Cần xử lý"
                variant="error"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Quá hạn",
                  );
                  openTaskDialog(
                    "Nhiệm vụ quá hạn",
                    `${filtered.length} nhiệm vụ cần xử lý gấp`,
                    filtered,
                  );
                }}
              />
            </div>

            <MonthlyKPICard
              kpiData={monthlyKPI}
              currentMonth={kpiMonth}
              currentYear={kpiYear}
            />

            <AISuggestions />

            <TaskOverviewChart
              personalStats={personalStats}
              title="Biểu đồ công việc cá nhân"
            />
          </TabsContent>

          <TabsContent value="organization" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="Tổng số"
                value={orgStats?.total || 0}
                icon={ClipboardList}
                description="Toàn cơ quan"
                variant="info"
              />
              <StatCard
                title="Chưa bắt đầu"
                value={orgStats?.notStarted || 0}
                icon={Clock}
                variant="warning"
              />
              <StatCard
                title="Đang thực hiện"
                value={orgStats?.inProgress || 0}
                icon={AlertCircle}
                variant="progress"
              />
              <StatCard
                title="Hoàn thành"
                value={orgStats?.completed || 0}
                icon={CheckCircle}
                variant="success"
              />
              <StatCard
                title="Quá hạn"
                value={orgStats?.overdue || 0}
                icon={AlertCircle}
                description="Cần xử lý"
                variant="error"
              />
            </div>

            <MonthlyKPICard
              kpiData={monthlyKPI}
              currentMonth={kpiMonth}
              currentYear={kpiYear}
            />

            <DepartmentComparison />

            <AISuggestions />

            <TaskOverviewChart
              personalStats={personalStats}
              secondaryStats={orgStats || undefined}
              secondaryLabel="Toàn cơ quan"
              title="So sánh: Cá nhân vs Toàn cơ quan"
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Department Head view: Tabs for Personal vs Department */}
      {isDeptHead && (
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal" data-testid="tab-personal">
              <User className="h-4 w-4 mr-2" />
              Cá nhân
            </TabsTrigger>
            <TabsTrigger value="department" data-testid="tab-department">
              <Building2 className="h-4 w-4 mr-2" />
              Phòng ban
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="Tổng số"
                value={personalStats.total}
                icon={ClipboardList}
                description="Nhiệm vụ cá nhân"
                variant="info"
                onClick={() => {
                  // For Staff & Department Heads: allUserTasksUnfiltered already filtered by backend
                  // For Leadership: filter by user assignments on frontend
                  const personalTasks = isLeadership
                    ? allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      )
                    : allUserTasksUnfiltered;
                  openTaskDialog(
                    "Tổng số nhiệm vụ cá nhân",
                    `${personalStats.total} nhiệm vụ`,
                    personalTasks,
                  );
                }}
              />
              <StatCard
                title="Chưa bắt đầu"
                value={personalStats.notStarted}
                icon={Clock}
                variant="warning"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Chưa bắt đầu",
                  );
                  openTaskDialog(
                    "Nhiệm vụ chưa bắt đầu",
                    `${filtered.length} nhiệm vụ cá nhân`,
                    filtered,
                  );
                }}
              />
              <StatCard
                title="Đang thực hiện"
                value={personalStats.inProgress}
                icon={AlertCircle}
                variant="progress"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Đang thực hiện",
                  );
                  openTaskDialog(
                    "Nhiệm vụ đang thực hiện",
                    `${filtered.length} nhiệm vụ cá nhân`,
                    filtered,
                  );
                }}
              />
              <StatCard
                title="Hoàn thành"
                value={personalStats.completed}
                icon={CheckCircle}
                variant="success"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Hoàn thành",
                  );
                  openTaskDialog(
                    "Nhiệm vụ hoàn thành",
                    `${filtered.length} nhiệm vụ cá nhân`,
                    filtered,
                  );
                }}
              />
              <StatCard
                title="Quá hạn"
                value={personalStats.overdue}
                icon={AlertCircle}
                description="Cần xử lý"
                variant="error"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Quá hạn",
                  );
                  openTaskDialog(
                    "Nhiệm vụ quá hạn",
                    `${filtered.length} nhiệm vụ cần xử lý gấp`,
                    filtered,
                  );
                }}
              />
            </div>

            <MonthlyKPICard
              kpiData={monthlyKPI}
              currentMonth={kpiMonth}
              currentYear={kpiYear}
            />

            <AISuggestions />

            <TaskOverviewChart
              personalStats={personalStats}
              title="Biểu đồ công việc cá nhân"
            />
          </TabsContent>

          <TabsContent value="department" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="Tổng số"
                value={deptStats?.total || 0}
                icon={ClipboardList}
                description="Toàn phòng"
                variant="info"
              />
              <StatCard
                title="Chưa bắt đầu"
                value={deptStats?.notStarted || 0}
                icon={Clock}
                variant="warning"
              />
              <StatCard
                title="Đang thực hiện"
                value={deptStats?.inProgress || 0}
                icon={AlertCircle}
                variant="progress"
              />
              <StatCard
                title="Hoàn thành"
                value={deptStats?.completed || 0}
                icon={CheckCircle}
                variant="success"
              />
              <StatCard
                title="Quá hạn"
                value={deptStats?.overdue || 0}
                icon={AlertCircle}
                description="Cần xử lý"
                variant="error"
              />
            </div>

            <MonthlyKPICard
              kpiData={monthlyKPI}
              currentMonth={kpiMonth}
              currentYear={kpiYear}
            />

            <AISuggestions />

            <TaskOverviewChart
              personalStats={personalStats}
              secondaryStats={deptStats || undefined}
              secondaryLabel="Phòng ban"
              title="So sánh: Cá nhân vs Phòng ban"
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Staff view: Tabs for Personal vs Department (if has department) */}
      {isStaff && user.departmentId && (
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal" data-testid="tab-personal">
              <User className="h-4 w-4 mr-2" />
              Cá nhân
            </TabsTrigger>
            <TabsTrigger value="department" data-testid="tab-department">
              <Building2 className="h-4 w-4 mr-2" />
              Phòng ban
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="Tổng số"
                value={personalStats.total}
                icon={ClipboardList}
                description="Nhiệm vụ cá nhân"
                variant="info"
                onClick={() => {
                  // For Staff & Department Heads: allUserTasksUnfiltered already filtered by backend
                  // For Leadership: filter by user assignments on frontend
                  const personalTasks = isLeadership
                    ? allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      )
                    : allUserTasksUnfiltered;
                  openTaskDialog(
                    "Tổng số nhiệm vụ cá nhân",
                    `${personalStats.total} nhiệm vụ`,
                    personalTasks,
                  );
                }}
              />
              <StatCard
                title="Chưa bắt đầu"
                value={personalStats.notStarted}
                icon={Clock}
                variant="warning"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Chưa bắt đầu",
                  );
                  openTaskDialog(
                    "Nhiệm vụ chưa bắt đầu",
                    `${filtered.length} nhiệm vụ cá nhân`,
                    filtered,
                  );
                }}
              />
              <StatCard
                title="Đang thực hiện"
                value={personalStats.inProgress}
                icon={AlertCircle}
                variant="progress"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Đang thực hiện",
                  );
                  openTaskDialog(
                    "Nhiệm vụ đang thực hiện",
                    `${filtered.length} nhiệm vụ cá nhân`,
                    filtered,
                  );
                }}
              />
              <StatCard
                title="Hoàn thành"
                value={personalStats.completed}
                icon={CheckCircle}
                variant="success"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Hoàn thành",
                  );
                  openTaskDialog(
                    "Nhiệm vụ hoàn thành",
                    `${filtered.length} nhiệm vụ cá nhân`,
                    filtered,
                  );
                }}
              />
              <StatCard
                title="Quá hạn"
                value={personalStats.overdue}
                icon={AlertCircle}
                description="Cần xử lý"
                variant="error"
                onClick={() => {
                  const personalTasks = isStaff
                    ? allUserTasksUnfiltered
                    : allUserTasksUnfiltered.filter((t) =>
                        t.assignments.some((a) => a.userId === user.id),
                      );
                  const filtered = filterTasksByStatus(
                    personalTasks,
                    "Quá hạn",
                  );
                  openTaskDialog(
                    "Nhiệm vụ quá hạn",
                    `${filtered.length} nhiệm vụ cần xử lý gấp`,
                    filtered,
                  );
                }}
              />
            </div>

            <MonthlyKPICard
              kpiData={monthlyKPI}
              currentMonth={kpiMonth}
              currentYear={kpiYear}
            />

            <AISuggestions />

            <TaskOverviewChart
              personalStats={personalStats}
              title="Biểu đồ công việc cá nhân"
            />
          </TabsContent>

          <TabsContent value="department" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="Tổng số"
                value={deptStats?.total || 0}
                icon={ClipboardList}
                description="Toàn phòng"
                variant="info"
              />
              <StatCard
                title="Chưa bắt đầu"
                value={deptStats?.notStarted || 0}
                icon={Clock}
                variant="warning"
              />
              <StatCard
                title="Đang thực hiện"
                value={deptStats?.inProgress || 0}
                icon={AlertCircle}
                variant="progress"
              />
              <StatCard
                title="Hoàn thành"
                value={deptStats?.completed || 0}
                icon={CheckCircle}
                variant="success"
              />
              <StatCard
                title="Quá hạn"
                value={deptStats?.overdue || 0}
                icon={AlertCircle}
                description="Cần xử lý"
                variant="error"
              />
            </div>

            <MonthlyKPICard
              kpiData={monthlyKPI}
              currentMonth={kpiMonth}
              currentYear={kpiYear}
            />

            <AISuggestions />

            <TaskOverviewChart
              personalStats={personalStats}
              secondaryStats={deptStats || undefined}
              secondaryLabel="Phòng ban"
              title="So sánh: Cá nhân vs Phòng ban"
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Staff view without department: Show only personal stats */}
      {isStaff && !user.departmentId && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Tổng số"
              value={personalStats.total}
              icon={ClipboardList}
              description="Nhiệm vụ cá nhân"
              variant="info"
            />
            <StatCard
              title="Chưa bắt đầu"
              value={personalStats.notStarted}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title="Đang thực hiện"
              value={personalStats.inProgress}
              icon={AlertCircle}
              variant="progress"
            />
            <StatCard
              title="Hoàn thành"
              value={personalStats.completed}
              icon={CheckCircle}
              variant="success"
            />
            <StatCard
              title="Quá hạn"
              value={personalStats.overdue}
              icon={AlertCircle}
              description="Cần xử lý"
              variant="error"
            />
          </div>

          <MonthlyKPICard
            kpiData={monthlyKPI}
            currentMonth={currentMonth}
            currentYear={currentYear}
          />

          <AISuggestions />

          <TaskOverviewChart
            personalStats={personalStats}
            title="Biểu đồ công việc cá nhân"
          />
        </div>
      )}

      <Card>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Thông tin tài khoản:</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <strong>Họ tên:</strong> {user.fullName}
              </li>
              <li>
                <strong>Chức vụ:</strong> {user.position || user.role}
              </li>
            </ul>
          </div>

          <div className="p-4 bg-primary/5 rounded-md">
            <p className="text-sm">
              {isLeadership && (
                <span>
                  <strong>Quyền hạn:</strong> Bạn có thể xem và quản lý tất cả
                  nhiệm vụ của cơ quan. Sử dụng các tab "Cá nhân" và "Toàn cơ
                  quan" để chuyển đổi chế độ xem.
                </span>
              )}
              {isDeptHead && (
                <span>
                  <strong>Quyền hạn:</strong> Bạn có thể xem nhiệm vụ của phòng
                  ban và quản lý nhân viên trong phòng. Sử dụng các tab "Cá
                  nhân" và "Phòng ban" để chuyển đổi.
                </span>
              )}
              {isStaff && (
                <span>
                  <strong>Quyền hạn:</strong> Bạn có thể xem nhiệm vụ được giao
                  cho mình và tổng quan nhiệm vụ của phòng ban. Sử dụng các tab
                  "Cá nhân" và "Phòng ban" để chuyển đổi.
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <TaskListDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTitle}
        description={dialogDescription}
        tasks={dialogTasks}
      />
    </div>
  );
}
