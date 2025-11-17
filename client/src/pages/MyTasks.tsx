import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/queryClient";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useUserTasksQuery } from "@/lib/useUserTasksQuery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskListDialog } from "@/components/TaskListDialog";
import { TaskEvaluationPanel } from "@/components/TaskEvaluationPanel";
import { ClipboardList, Search, Calendar, AlertCircle, CheckCircle, Clock, Filter, ArrowUpDown, Plus, Users, Star, Network, Layers } from "lucide-react";
import { format, isPast, differenceInDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { STATUS_VARIANTS, PRIORITY_VARIANTS, ROLE_VARIANTS, type TaskStatus, type AssignmentRole } from "@/lib/badge-variants";

type TaskPriority = "Bình thường" | "Quan trọng" | "Khẩn cấp";

interface TaskAssignment {
  id: string;
  fullName: string;
  role: "Chủ trì" | "Phối hợp" | "Chỉ đạo";
  collaborationCompleted: boolean;
}

interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description: string | null;
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  createdAt: string;
  assignments: TaskAssignment[];
  leadershipScore?: string | null;
  parentTaskId?: string | null;
  subtasksCount?: number;
}

// Assignment to evaluate (for new evaluation system)
interface AssignmentToEvaluate {
  task: {
    id: string;
    taskNumber: string;
    title: string;
    deadline: string;
    priority: TaskPriority;
  };
  assignment: {
    id: string;
    role: "Chủ trì" | "Phối hợp" | "Chỉ đạo";
    userId: string;
  };
  assignee: {
    id: string;
    fullName: string;
    role: string;
    departmentId: string | null;
  } | null;
  evaluation: {
    score: string;
    comments: string | null;
    evaluatedAt: string;
  } | null;
  isEvaluated: boolean;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Chưa hoàn thành" },
  { value: "all", label: "Tất cả trạng thái" },
  { value: "Chưa bắt đầu", label: "Chưa bắt đầu" },
  { value: "Đang thực hiện", label: "Đang thực hiện" },
  { value: "Hoàn thành", label: "Hoàn thành" },
  { value: "Quá hạn", label: "Quá hạn" },
];

// Status options for "Phối hợp" tab
const COLLAB_STATUS_OPTIONS = [
  { value: "active", label: "Chưa phối hợp" },
  { value: "Hoàn thành", label: "Đã phối hợp" },
  { value: "all", label: "Tất cả" },
];

// Status options for "Đánh giá" tab
const EVALUATION_STATUS_OPTIONS = [
  { value: "active", label: "Chưa đánh giá" },
  { value: "Hoàn thành", label: "Đã đánh giá" },
  { value: "all", label: "Tất cả" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "Tất cả độ ưu tiên" },
  { value: "Bình thường", label: "Bình thường" },
  { value: "Quan trọng", label: "Quan trọng" },
  { value: "Khẩn cấp", label: "Khẩn cấp" },
];

const SORT_OPTIONS = [
  { value: "deadline-asc", label: "Hạn sớm nhất" },
  { value: "deadline-desc", label: "Hạn muộn nhất" },
  { value: "priority-desc", label: "Ưu tiên cao" },
  { value: "created-desc", label: "Mới nhất" },
  { value: "progress-asc", label: "Tiến độ thấp" },
];

const TIME_FILTER_OPTIONS = [
  { value: "all", label: "Tất cả thời gian" },
  { value: "today", label: "Hôm nay" },
  { value: "this-week", label: "Tuần này" },
  { value: "this-month", label: "Tháng này" },
];

const PRIORITY_WEIGHTS = {
  "Khẩn cấp": 3,
  "Quan trọng": 2,
  "Bình thường": 1,
};

function getStatusConfig(status: TaskStatus) {
  const configs = {
    "Chưa bắt đầu": { 
      icon: Clock, 
      variant: STATUS_VARIANTS["Chưa bắt đầu"]
    },
    "Đang thực hiện": { 
      icon: AlertCircle, 
      variant: STATUS_VARIANTS["Đang thực hiện"]
    },
    "Hoàn thành": { 
      icon: CheckCircle, 
      variant: STATUS_VARIANTS["Hoàn thành"]
    },
    "Quá hạn": { 
      icon: AlertCircle, 
      variant: STATUS_VARIANTS["Quá hạn"]
    },
    "Tạm dừng": { 
      icon: Clock, 
      variant: STATUS_VARIANTS["Tạm dừng"]
    },
  };
  return configs[status] || configs["Chưa bắt đầu"];
}

function getPriorityConfig(priority: TaskPriority) {
  const configs = {
    "Bình thường": { variant: PRIORITY_VARIANTS["Bình thường"] },
    "Quan trọng": { variant: PRIORITY_VARIANTS["Quan trọng"] },
    "Khẩn cấp": { variant: PRIORITY_VARIANTS["Khẩn cấp"] },
  };
  return configs[priority] || configs["Bình thường"];
}

function getRoleConfig(role: AssignmentRole) {
  return { variant: ROLE_VARIANTS[role] };
}

function getDeadlineStatus(deadline: string, status: TaskStatus) {
  if (status === "Hoàn thành") return null;
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysLeft = differenceInDays(deadlineDate, now);
  
  if (isPast(deadlineDate)) {
    return { text: "Quá hạn", className: "text-error", icon: AlertCircle };
  } else if (daysLeft <= 3) {
    return { text: `Còn ${daysLeft} ngày`, className: "text-warning", icon: Calendar };
  }
  return null;
}

function TaskCard({ task, currentUserId }: { task: Task; currentUserId: string }) {
  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.priority);
  const deadlineStatus = getDeadlineStatus(task.deadline, task.status);
  const StatusIcon = statusConfig.icon;
  
  // Find current user's assignment to show their role (Chủ trì or Phối hợp)
  const userAssignment = task.assignments.find(a => a.id === currentUserId);
  const roleConfig = userAssignment ? getRoleConfig(userAssignment.role) : null;

  // Determine card background based on task type
  const isParentTask = (task.subtasksCount ?? 0) > 0;
  const isSubtask = !!task.parentTaskId;
  
  let cardClassName = "hover-elevate";
  if (isSubtask) {
    // Subtask: Light yellow background
    cardClassName += " bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800";
  } else if (isParentTask) {
    // Parent task: Light blue background
    cardClassName += " bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
  }

  return (
    <Card className={cardClassName} data-testid={`card-task-${task.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded" data-testid={`text-task-number-${task.id}`}>
                {task.taskNumber}
              </span>
              {isParentTask && (
                <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                  <Network className="w-3 h-3 mr-1" />
                  {task.subtasksCount} nhiệm vụ con
                </Badge>
              )}
              {isSubtask && (
                <Badge variant="outline" className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
                  <Layers className="w-3 h-3 mr-1" />
                  Nhiệm vụ con
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg mb-2 line-clamp-2" data-testid={`text-task-title-${task.id}`}>
              {task.title}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={statusConfig.variant}
                data-testid={`badge-status-${task.id}`}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {task.status}
              </Badge>
              <Badge 
                variant={priorityConfig.variant}
                data-testid={`badge-priority-${task.id}`}
              >
                {task.priority}
              </Badge>
              {roleConfig && userAssignment && (
                <Badge 
                  variant={roleConfig.variant}
                  data-testid={`badge-role-${task.id}`}
                >
                  {userAssignment.role}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {task.description && (
          <CardDescription className="line-clamp-2 mt-2">
            {task.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tiến độ</span>
            <span className="font-medium" data-testid={`text-progress-${task.id}`}>
              {task.progress}%
            </span>
          </div>
          <Progress value={task.progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span data-testid={`text-deadline-${task.id}`}>
              {format(new Date(task.deadline), "dd/MM/yyyy", { locale: vi })}
            </span>
          </div>
          {deadlineStatus && (
            <div className={`flex items-center gap-1 font-medium ${deadlineStatus.className}`}>
              <deadlineStatus.icon className="w-4 h-4" />
              <span>{deadlineStatus.text}</span>
            </div>
          )}
        </div>

        {/* Show leadership evaluation score if task is completed and evaluated */}
        {task.status === "Hoàn thành" && task.leadershipScore && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <div className="flex-1">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Điểm đánh giá lãnh đạo
              </p>
              <p className="text-sm font-bold text-yellow-700 dark:text-yellow-300" data-testid={`text-leadership-score-card-${task.id}`}>
                {task.leadershipScore}/10
              </p>
            </div>
          </div>
        )}

        <Link href={`/tasks/${task.id}`}>
          <Button 
            variant="outline" 
            className="w-full mt-2"
            data-testid={`button-view-task-${task.id}`}
          >
            Xem chi tiết
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function TaskCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export default function MyTasks() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");  // Default: show incomplete tasks
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [deputyDirectorFilter, setDeputyDirectorFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline-asc");
  const [roleTab, setRoleTab] = useState<"chu-tri" | "phoi-hop" | "danh-gia">("chu-tri");

  // Dialog state for task list popup
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogDescription, setDialogDescription] = useState("");
  const [dialogTasks, setDialogTasks] = useState<Task[]>([]);

  const isLeadership = user?.role === "Giám đốc" || user?.role === "Phó Giám đốc";
  const isDirector = user?.role === "Giám đốc";
  const isDeputyDirector = user?.role === "Phó Giám đốc";
  const isDeptHead = user?.role === "Trưởng phòng";
  const canEvaluate = isDirector || isDeputyDirector || isDeptHead;
  
  // Read status from URL query params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get("status");
    if (statusParam) {
      setStatusFilter(decodeURIComponent(statusParam));
    }
  }, []);
  
  // Ensure deputy director filter stays at "all" by default for Directors
  useEffect(() => {
    if (!isDirector) {
      // Reset filter when user is not a director
      setDeputyDirectorFilter("all");
    }
  }, [isDirector]);

  // Set initial status filter based on active tab (runs once on mount and when roleTab changes)
  useEffect(() => {
    // For evaluation tab, default to "active" to show only unevaluated tasks
    if (roleTab === "danh-gia") {
      setStatusFilter("active");
    }
  }, [roleTab]);

  // Reset status filter to valid value when switching tabs
  useEffect(() => {
    // Get valid values for current tab
    const validValues = roleTab === "phoi-hop" 
      ? COLLAB_STATUS_OPTIONS.map(opt => opt.value)
      : roleTab === "danh-gia" 
      ? EVALUATION_STATUS_OPTIONS.map(opt => opt.value)
      : STATUS_OPTIONS.map(opt => opt.value);
    
    // If current filter is not valid for new tab, reset to appropriate default
    if (!validValues.includes(statusFilter)) {
      // For all tabs, default to "active" (incomplete tasks / unevaluated tasks)
      setStatusFilter("active");
    }
  }, [roleTab, statusFilter]);

  const { data: tasks, isLoading } = useUserTasksQuery();
  
  // AUTHENTICATED: Fetch deputy directors (for director filter)
  const { data: deputyDirectors = [] } = useQuery<Array<{ id: string; fullName: string }>>({
    queryKey: ["/api/users", "Phó Giám đốc"],
    queryFn: () => fetchJson<Array<{ id: string; fullName: string }>>("/api/users?role=Phó Giám đốc"),
    enabled: isDirector,
  });

  // AUTHENTICATED: Query for assignments needing evaluation
  const { data: evaluationAssignments = [], isLoading: isLoadingEvaluations } = useQuery<AssignmentToEvaluate[]>({
    queryKey: ["/api/tasks/evaluations", "assignments"],
    queryFn: () => fetchJson<AssignmentToEvaluate[]>("/api/tasks/evaluations?view=assignments"),
    enabled: canEvaluate,
    staleTime: 0,
  });

  // Group assignments by task for evaluation tab
  const groupedEvaluationAssignments = useMemo(() => {
    const grouped = new Map<string, {
      task: AssignmentToEvaluate['task'];
      assignments: AssignmentToEvaluate[];
    }>();

    evaluationAssignments.forEach(assignment => {
      const taskId = assignment.task.id;
      if (!grouped.has(taskId)) {
        grouped.set(taskId, {
          task: assignment.task,
          assignments: [],
        });
      }
      grouped.get(taskId)!.assignments.push(assignment);
    });

    return Array.from(grouped.values());
  }, [evaluationAssignments]);

  // Filtered assignments for evaluation tab based on statusFilter
  const filteredEvaluationAssignments = useMemo(() => {
    if (roleTab !== "danh-gia") return evaluationAssignments;
    
    if (statusFilter === "active") {
      // Show only unevaluated assignments
      return evaluationAssignments.filter(a => !a.isEvaluated);
    } else if (statusFilter === "Hoàn thành") {
      // Show only evaluated assignments
      return evaluationAssignments.filter(a => a.isEvaluated);
    }
    // "all" - show everything
    return evaluationAssignments;
  }, [roleTab, statusFilter, evaluationAssignments]);

  // Group filtered assignments by task
  const filteredGroupedEvaluationAssignments = useMemo(() => {
    const grouped = new Map<string, {
      task: AssignmentToEvaluate['task'];
      assignments: AssignmentToEvaluate[];
    }>();

    filteredEvaluationAssignments.forEach(assignment => {
      const taskId = assignment.task.id;
      if (!grouped.has(taskId)) {
        grouped.set(taskId, {
          task: assignment.task,
          assignments: [],
        });
      }
      grouped.get(taskId)!.assignments.push(assignment);
    });

    return Array.from(grouped.values());
  }, [filteredEvaluationAssignments]);

  // Step 1: Apply role-based filtering based on active tab
  let roleFilteredTasks = tasks || [];
  if (user) {
    if (roleTab === "danh-gia") {
      // "Đánh giá" tab: Will use filteredGroupedEvaluationAssignments instead
      roleFilteredTasks = [];  // Not used for evaluation tab
    } else if (roleTab === "chu-tri") {
      // "Nhiệm vụ của tôi" tab logic varies by role
      if (isDirector) {
        // Giám đốc: See ALL organization tasks
        roleFilteredTasks = tasks || [];
      } else if (isDeputyDirector) {
        // Phó Giám đốc: Tasks where they are Chủ trì OR Chỉ đạo (status filtering happens in Step 2)
        roleFilteredTasks = tasks?.filter(task => 
          task.assignments.some((a: TaskAssignment) => 
            a.id === user.id && (a.role === "Chủ trì" || a.role === "Chỉ đạo")
          )
        ) || [];
      } else {
        // Trưởng phòng & Chuyên viên: All Chủ trì tasks (status filtering happens in Step 2)
        roleFilteredTasks = tasks?.filter(task => 
          task.assignments.some((a: TaskAssignment) => a.id === user.id && a.role === "Chủ trì")
        ) || [];
      }
    } else if (roleTab === "phoi-hop") {
      // "Phối hợp" tab: ALL tasks where user is assigned as Phối hợp (status filtering happens in Step 2)
      roleFilteredTasks = tasks?.filter(task => {
        const userAssignment = task.assignments.find((a: TaskAssignment) => a.id === user.id && a.role === "Phối hợp");
        return !!userAssignment;
      }) || [];
    }
  }

  // All user tasks for statistics cards (independent of tab selection)
  const allUserTasks = useMemo(() => tasks ?? [], [tasks]);

  // Compute tab-specific status counts for dropdown display
  // Each tab has different counting logic based on its business rules
  const statusCounts = useMemo(() => {
    if (roleTab === "phoi-hop") {
      // Tab "Phối hợp": Count based on collaboration completion
      const allCollabTasks = tasks?.filter(task => {
        const userAssignment = task.assignments.find((a: TaskAssignment) => a.id === user?.id && a.role === "Phối hợp");
        return !!userAssignment;
      }) || [];
      
      return {
        active: allCollabTasks.filter(t => {
          const userAssignment = t.assignments.find((a: TaskAssignment) => a.id === user?.id && a.role === "Phối hợp");
          return userAssignment ? !userAssignment.collaborationCompleted : true;
        }).length,
        all: allCollabTasks.length,
        "Chưa bắt đầu": allCollabTasks.filter(t => t.status === "Chưa bắt đầu").length,
        "Đang thực hiện": allCollabTasks.filter(t => t.status === "Đang thực hiện").length,
        "Hoàn thành": allCollabTasks.filter(t => {
          const userAssignment = t.assignments.find((a: TaskAssignment) => a.id === user?.id && a.role === "Phối hợp");
          return userAssignment ? userAssignment.collaborationCompleted : false;
        }).length,
        "Quá hạn": allCollabTasks.filter(t => isPast(new Date(t.deadline)) && t.status !== "Hoàn thành").length,
      };
    } else if (roleTab === "danh-gia") {
      // Tab "Đánh giá": Count based on assignment evaluation status
      const unevaluatedAssignments = evaluationAssignments.filter(a => !a.isEvaluated);
      const evaluatedAssignments = evaluationAssignments.filter(a => a.isEvaluated);
      
      return {
        active: unevaluatedAssignments.length,  // Unevaluated assignments
        all: evaluationAssignments.length,      // All assignments
        "Chưa bắt đầu": unevaluatedAssignments.length,  // Map to unevaluated
        "Đang thực hiện": unevaluatedAssignments.length,  // Map to unevaluated
        "Hoàn thành": evaluatedAssignments.length,      // Evaluated assignments
        "Quá hạn": unevaluatedAssignments.length,  // Map to unevaluated
      };
    } else {
      // Tab "Nhiệm vụ của tôi": Standard status counting
      return {
        active: roleFilteredTasks.filter(t => t.status !== "Hoàn thành").length,
        all: roleFilteredTasks.length,
        "Chưa bắt đầu": roleFilteredTasks.filter(t => t.status === "Chưa bắt đầu").length,
        "Đang thực hiện": roleFilteredTasks.filter(t => t.status === "Đang thực hiện").length,
        "Hoàn thành": roleFilteredTasks.filter(t => t.status === "Hoàn thành").length,
        "Quá hạn": roleFilteredTasks.filter(t => isPast(new Date(t.deadline)) && t.status !== "Hoàn thành").length,
      };
    }
  }, [roleTab, roleFilteredTasks, tasks, user?.id, evaluationAssignments]);

  // Tab counts for badge display (ALWAYS show incomplete tasks count)
  // Red tab "Nhiệm vụ của tôi": Varies by role
  let chuTriTasks: Task[] = [];
  if (isDirector) {
    // Giám đốc: All incomplete tasks
    chuTriTasks = tasks?.filter(task => task.status !== "Hoàn thành") || [];
  } else if (isDeputyDirector) {
    // Phó Giám đốc: Chủ trì OR Chỉ đạo tasks not completed
    chuTriTasks = tasks?.filter(task => 
      task.assignments.some((a: TaskAssignment) => 
        a.id === user?.id && (a.role === "Chủ trì" || a.role === "Chỉ đạo")
      ) && task.status !== "Hoàn thành"
    ) || [];
  } else {
    // Trưởng phòng & Chuyên viên: Chủ trì tasks not completed
    chuTriTasks = tasks?.filter(task => 
      task.assignments.some((a: TaskAssignment) => a.id === user?.id && a.role === "Chủ trì") &&
      task.status !== "Hoàn thành"
    ) || [];
  }
  
  // Blue tab: Phối hợp tasks where collaboration is NOT completed
  const phoiHopTasks = tasks?.filter(task => {
    const userAssignment = task.assignments.find((a: TaskAssignment) => a.id === user?.id && a.role === "Phối hợp");
    return userAssignment && !userAssignment.collaborationCompleted;
  }) || [];

  // Green tab: Unevaluated assignments count for badge
  const unevaluatedAssignmentsCount = evaluationAssignments.filter(a => !a.isEvaluated).length;

  // Helper to open dialog with filtered tasks
  const openTaskDialog = (title: string, description: string, tasks: Task[]) => {
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
        return tasks.filter(t => t.status === status);
      case "Quá hạn":
        return tasks.filter(t => isPast(new Date(t.deadline)) && t.status !== "Hoàn thành");
      default:
        return tasks;
    }
  };

  // Step 2: Apply existing filters on top of role-filtered tasks
  let filteredTasks = roleFilteredTasks.filter((task) => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch = task.title.toLowerCase().includes(searchLower) ||
                         (task.description ?? "").toLowerCase().includes(searchLower) ||
                         task.taskNumber.toLowerCase().includes(searchLower);
    
    // Status filter logic varies by tab:
    let matchesStatus = true;
    
    if (roleTab === "phoi-hop") {
      // "Phối hợp" tab: Filter based on collaboration completion status
      // Step 1 already filtered to only Phối hợp tasks, so assignment MUST exist
      const userAssignment = task.assignments.find((a: TaskAssignment) => a.id === user?.id && a.role === "Phối hợp");
      
      if (statusFilter === "active") {
        // "Chưa hoàn thành": Show tasks where collaboration is not completed
        matchesStatus = userAssignment ? !userAssignment.collaborationCompleted : true;
      } else if (statusFilter === "Hoàn thành") {
        // "Hoàn thành": Show tasks where collaboration is completed
        matchesStatus = userAssignment ? userAssignment.collaborationCompleted : false;
      } else if (statusFilter === "all") {
        // "Tất cả": Show all collaboration tasks
        matchesStatus = true;
      } else {
        // Other status filters (Chưa bắt đầu, Đang thực hiện, Quá hạn) apply to task.status
        matchesStatus = statusFilter === "Quá hạn"
          ? isPast(new Date(task.deadline)) && task.status !== "Hoàn thành"
          : task.status === statusFilter;
      }
    } else if (roleTab === "danh-gia") {
      // "Đánh giá" tab: Backend already filters by evaluationStatus
      // No additional client-side filtering needed
      matchesStatus = true;
    } else {
      // "Nhiệm vụ của tôi" tab: Standard status filtering
      if (statusFilter === "active") {
        matchesStatus = task.status !== "Hoàn thành";  // Incomplete only
      } else if (statusFilter === "all") {
        matchesStatus = true;  // All tasks
      } else if (statusFilter === "Quá hạn") {
        matchesStatus = isPast(new Date(task.deadline)) && task.status !== "Hoàn thành";  // Overdue tasks
      } else {
        matchesStatus = task.status === statusFilter;  // Specific status
      }
    }
    
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    
    const matchesDeputyDirector = deputyDirectorFilter === "all" || 
      task.assignments.some((a: TaskAssignment) => 
        a.id === deputyDirectorFilter && (a.role === "Chủ trì" || a.role === "Chỉ đạo")
      );
    
    let matchesTime = true;
    if (timeFilter !== "all") {
      const taskDeadline = new Date(task.deadline);
      const now = new Date();
      
      switch (timeFilter) {
        case "today":
          matchesTime = taskDeadline >= startOfDay(now) && taskDeadline <= endOfDay(now);
          break;
        case "this-week":
          matchesTime = taskDeadline >= startOfWeek(now, { locale: vi }) && taskDeadline <= endOfWeek(now, { locale: vi });
          break;
        case "this-month":
          matchesTime = taskDeadline >= startOfMonth(now) && taskDeadline <= endOfMonth(now);
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesDeputyDirector && matchesTime;
  }) || [];

  filteredTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case "deadline-asc":
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      case "deadline-desc":
        return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      case "priority-desc":
        return PRIORITY_WEIGHTS[b.priority as TaskPriority] - PRIORITY_WEIGHTS[a.priority as TaskPriority];
      case "created-desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "progress-asc":
        return a.progress - b.progress;
      default:
        return 0;
    }
  });

  // Calculate statistics from ALL user tasks (not role-filtered)
  // This ensures stats show the complete picture across all roles
  const taskCounts = useMemo(() => ({
    total: allUserTasks.length,
    notStarted: allUserTasks.filter(t => t.status === "Chưa bắt đầu").length,
    inProgress: allUserTasks.filter(t => t.status === "Đang thực hiện").length,
    completed: allUserTasks.filter(t => t.status === "Hoàn thành").length,
    overdue: allUserTasks.filter(t => isPast(new Date(t.deadline)) && t.status !== "Hoàn thành").length,
  }), [allUserTasks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="heading-my-tasks">
            <ClipboardList className="w-8 h-8" />
            {isLeadership ? "Tất cả nhiệm vụ" : "Nhiệm vụ của tôi"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isLeadership ? "Xem và quản lý tất cả nhiệm vụ trong tổ chức" : "Quản lý và theo dõi các nhiệm vụ được giao"}
          </p>
        </div>
        <Link href="/tasks/create">
          <Button data-testid="button-create-task">
            <Plus className="w-4 h-4 mr-2" />
            Tạo nhiệm vụ
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card 
          className="cursor-pointer hover-elevate active-elevate-2" 
          onClick={() => openTaskDialog("Tổng số nhiệm vụ", `${taskCounts.total} nhiệm vụ`, allUserTasks)}
          data-testid="stat-card-total"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng số</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="stat-total">{taskCounts.total}</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate active-elevate-2" 
          onClick={() => {
            const filtered = filterTasksByStatus(allUserTasks, "Chưa bắt đầu");
            openTaskDialog("Nhiệm vụ chưa bắt đầu", `${filtered.length} nhiệm vụ`, filtered);
          }}
          data-testid="stat-card-not-started"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chưa bắt đầu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning" data-testid="stat-not-started">{taskCounts.notStarted}</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate active-elevate-2" 
          onClick={() => {
            const filtered = filterTasksByStatus(allUserTasks, "Đang thực hiện");
            openTaskDialog("Nhiệm vụ đang thực hiện", `${filtered.length} nhiệm vụ`, filtered);
          }}
          data-testid="stat-card-in-progress"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Đang thực hiện</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-progress" data-testid="stat-in-progress">{taskCounts.inProgress}</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate active-elevate-2" 
          onClick={() => {
            const filtered = filterTasksByStatus(allUserTasks, "Hoàn thành");
            openTaskDialog("Nhiệm vụ hoàn thành", `${filtered.length} nhiệm vụ`, filtered);
          }}
          data-testid="stat-card-completed"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoàn thành</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success" data-testid="stat-completed">{taskCounts.completed}</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover-elevate active-elevate-2" 
          onClick={() => {
            const filtered = filterTasksByStatus(allUserTasks, "Quá hạn");
            openTaskDialog("Nhiệm vụ quá hạn", `${filtered.length} nhiệm vụ cần xử lý gấp`, filtered);
          }}
          data-testid="stat-card-overdue"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quá hạn</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-error" data-testid="stat-overdue">{taskCounts.overdue}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={roleTab} onValueChange={(v) => {
        const newTab = v as "chu-tri" | "phoi-hop" | "danh-gia";
        setRoleTab(newTab);
        // Set status filter immediately when switching to evaluation tab
        if (newTab === "danh-gia") {
          setStatusFilter("active"); // Default to "Chưa đánh giá" (unevaluated tasks)
        }
      }} className="w-full">
        <TabsList className={`grid w-full max-w-md ${canEvaluate ? 'grid-cols-3' : 'grid-cols-2'}`} data-testid="tabs-role-filter">
          <TabsTrigger 
            value="chu-tri" 
            data-testid="tab-chu-tri"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Nhiệm vụ của tôi ({chuTriTasks.length})
          </TabsTrigger>
          <TabsTrigger 
            value="phoi-hop" 
            data-testid="tab-phoi-hop"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white dark:data-[state=active]:bg-blue-500"
          >
            Phối hợp ({phoiHopTasks.length})
          </TabsTrigger>
          {canEvaluate && (
            <TabsTrigger 
              value="danh-gia" 
              data-testid="tab-danh-gia"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white dark:data-[state=active]:bg-green-500"
            >
              Đánh giá ({unevaluatedAssignmentsCount})
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <Card className="bg-gradient-to-br from-card to-muted/20">
        <CardContent className="pt-6">
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isDirector ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                <Search className="w-3.5 h-3.5" />
                Tìm kiếm
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tên nhiệm vụ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                  data-testid="input-search-tasks"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5" />
                Trạng thái
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-background" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // Select appropriate status options based on active tab
                    const options = roleTab === "phoi-hop" 
                      ? COLLAB_STATUS_OPTIONS 
                      : roleTab === "danh-gia" 
                      ? EVALUATION_STATUS_OPTIONS 
                      : STATUS_OPTIONS;
                    
                    return options.map((option) => {
                      const count = option.value === "all" 
                        ? statusCounts.all 
                        : statusCounts[option.value as keyof typeof statusCounts] || 0;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} ({count})
                        </SelectItem>
                      );
                    });
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                <Filter className="w-3.5 h-3.5" />
                Độ ưu tiên
              </label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="bg-background" data-testid="select-priority-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                Thời gian
              </label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="bg-background" data-testid="select-time-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isDirector && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  Phó Giám đốc
                </label>
                <Select value={deputyDirectorFilter} onValueChange={setDeputyDirectorFilter}>
                  <SelectTrigger className="bg-background" data-testid="select-deputy-director-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả Phó GĐ</SelectItem>
                    {deputyDirectors.map((dd) => (
                      <SelectItem key={dd.id} value={dd.id}>
                        {dd.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sắp xếp
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="bg-background" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {roleTab === "danh-gia" 
              ? `Danh sách đánh giá (${filteredEvaluationAssignments.length} phân công)`
              : `Danh sách nhiệm vụ (${filteredTasks.length})`
            }
          </h2>
        </div>

        {(isLoading || (roleTab === "danh-gia" && isLoadingEvaluations)) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        ) : roleTab === "danh-gia" ? (
          // Evaluation tab: Show grouped assignments
          filteredGroupedEvaluationAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground" data-testid="text-no-evaluations">
                  Không có phân công nào cần đánh giá
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {statusFilter !== "active"
                    ? "Thử thay đổi bộ lọc để xem đánh giá khác"
                    : "Tất cả phân công đã được đánh giá"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredGroupedEvaluationAssignments.map(({ task, assignments }) => (
                <Card key={task.id} data-testid={`evaluation-task-${task.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Link 
                            href={`/tasks/${task.id}`}
                            className="hover:text-primary transition-colors"
                            data-testid={`link-task-${task.id}`}
                          >
                            {task.taskNumber} - {task.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="mt-1 flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(task.deadline), "dd/MM/yyyy", { locale: vi })}
                          </span>
                          <Badge variant={PRIORITY_VARIANTS[task.priority]}>
                            {task.priority}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {assignments.length} phân công cần đánh giá:
                    </p>
                    <div className="space-y-2">
                      {assignments.map((assignment) => (
                        <div 
                          key={assignment.assignment.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                          data-testid={`assignment-${assignment.assignment.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{assignment.assignee?.fullName || "N/A"}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={ROLE_VARIANTS[assignment.assignment.role]} className="text-xs">
                                  {assignment.assignment.role}
                                </Badge>
                                {assignment.assignee?.role && (
                                  <span className="text-xs text-muted-foreground">
                                    {assignment.assignee.role}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {assignment.isEvaluated ? (
                              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Đã đánh giá: {assignment.evaluation?.score}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="w-3 h-3 mr-1" />
                                Chưa đánh giá
                              </Badge>
                            )}
                            <Link href={`/tasks/${task.id}`}>
                              <Button size="sm" variant="outline" data-testid={`button-evaluate-${assignment.assignment.id}`}>
                                {assignment.isEvaluated ? "Xem" : "Đánh giá"}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground" data-testid="text-no-tasks">
                Không có nhiệm vụ nào
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "active" || priorityFilter !== "all" || timeFilter !== "all"
                  ? "Thử thay đổi bộ lọc để xem nhiệm vụ khác"
                  : "Bạn chưa được giao nhiệm vụ nào"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} currentUserId={user?.id || ""} />
            ))}
          </div>
        )}
      </div>

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
