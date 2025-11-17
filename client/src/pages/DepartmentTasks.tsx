import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users, Search, Filter, Building2, User, CheckCircle, Clock, AlertCircle, Plus, Network, Layers } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { STATUS_VARIANTS, PRIORITY_VARIANTS, type TaskStatus, type TaskPriority } from "@/lib/badge-variants";

interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description: string | null;
  deadline: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  departmentId: string | null;
  createdAt: string;
  averageScore: number | null;
  parentTaskId: string | null;
  subtasksCount?: number;
  assignments: Array<{
    id: string;
    fullName: string;
    role: string;
    position: string | null;
    departmentId: string | null;
  }>;
}

interface Department {
  id: string;
  name: string;
}

interface User {
  id: string;
  fullName: string;
  role: string;
  position: string | null;
  departmentId: string | null;
}

const STATUS_ICONS = {
  "Chưa bắt đầu": Clock,
  "Đang thực hiện": AlertCircle,
  "Hoàn thành": CheckCircle,
  "Quá hạn": AlertCircle,
  "Tạm dừng": Clock,
} as const;

export default function DepartmentTasks() {
  const { user } = useAuth();
  
  // Role-based permissions
  const isDirector = user?.role === "Giám đốc";
  const isDeputyDirector = user?.role === "Phó Giám đốc";
  const canViewAllDepartments = isDirector || isDeputyDirector;
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Initialize department filter after user loads - SECURITY: Prevent pre-auth queries
  useEffect(() => {
    if (user) {
      const newDept = canViewAllDepartments ? "all" : (user.departmentId || "");
      setSelectedDepartment(newDept);
    }
  }, [user?.id, canViewAllDepartments]); // Only depend on user.id to avoid infinite loops

  // AUTHENTICATED: Fetch departments
  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: () => fetchJson<Department[]>("/api/departments"),
  });

  // AUTHENTICATED: Fetch department KPI (when a specific department is selected)
  const { data: departmentKPI } = useQuery<{
    users: Array<{ userId: string; fullName: string; kpi: number }>;
    departmentAverageKPI: number;
    userCount: number;
  }>({
    queryKey: ["/api/kpi/department", selectedDepartment],
    queryFn: () => fetchJson(`/api/kpi/department/${selectedDepartment}`),
    enabled: !!user && !!selectedDepartment && selectedDepartment !== "all",
  });

  // SECURITY: Manual fetch for users to prevent global fetcher race conditions
  // React Query's global fetcher could trigger unauthorized requests
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  useEffect(() => {
    // Only fetch when user is loaded, department is set, and it's not "all"
    if (!user || !selectedDepartment || selectedDepartment === "all") {
      setUsers([]);
      return;
    }
    
    let cancelled = false;
    setUsersLoading(true);
    
    const fetchUsers = async () => {
      try {
        const params = new URLSearchParams({ departmentId: selectedDepartment });
        const res = await fetch(`/api/users?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        if (!cancelled) {
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        if (!cancelled) {
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    };
    
    fetchUsers();
    
    return () => {
      cancelled = true;
    };
  }, [user, selectedDepartment]);

  // SECURITY: Manual fetch for tasks to prevent global fetcher race conditions
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Only fetch when user is loaded and department is set
    if (!user || !selectedDepartment) {
      setTasks([]);
      return;
    }
    
    let cancelled = false;
    setIsLoading(true);
    
    const fetchTasks = async () => {
      try {
        const queryParams = new URLSearchParams();
        const effectiveDepartment = canViewAllDepartments ? selectedDepartment : (user.departmentId || "");
        
        // For non-directors: Always send their departmentId
        if (effectiveDepartment && effectiveDepartment !== "all") {
          queryParams.append("departmentId", effectiveDepartment);
        }
        if (selectedUser !== "all") queryParams.append("userId", selectedUser);
        if (selectedStatus !== "all") queryParams.append("status", selectedStatus);
        
        const res = await fetch(`/api/tasks?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch tasks");
        const data = await res.json();
        if (!cancelled) {
          setTasks(data);
        }
      } catch (error) {
        console.error("Error fetching tasks:", error);
        if (!cancelled) {
          setTasks([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    
    fetchTasks();
    
    return () => {
      cancelled = true;
    };
  }, [user, selectedDepartment, selectedUser, selectedStatus, canViewAllDepartments]);

  // Filter by search query
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.taskNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort tasks: incomplete tasks first, then completed tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aCompleted = a.status === "Hoàn thành" ? 1 : 0;
    const bCompleted = b.status === "Hoàn thành" ? 1 : 0;
    
    // If completion status differs, show incomplete first
    if (aCompleted !== bCompleted) {
      return aCompleted - bCompleted;
    }
    
    // Within same completion group, sort by priority (Khẩn cấp > Quan trọng > Bình thường)
    const priorityWeight = { "Khẩn cấp": 3, "Quan trọng": 2, "Bình thường": 1 };
    return priorityWeight[b.priority] - priorityWeight[a.priority];
  });

  // Calculate statistics
  const stats = {
    total: filteredTasks.length,
    notStarted: filteredTasks.filter(t => t.status === "Chưa bắt đầu").length,
    inProgress: filteredTasks.filter(t => t.status === "Đang thực hiện").length,
    completed: filteredTasks.filter(t => t.status === "Hoàn thành").length,
    overdue: filteredTasks.filter(t => t.status === "Quá hạn").length,
  };

  // Get department name for selected department
  const selectedDeptName = departments.find(d => d.id === selectedDepartment)?.name || "Tất cả phòng ban";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Nhiệm vụ phòng ban</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý và theo dõi nhiệm vụ của phòng ban
          </p>
        </div>
        <Link href="/tasks/create">
          <Button data-testid="button-create-task">
            <Plus className="w-4 h-4 mr-2" />
            Tạo nhiệm vụ mới
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng số</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chưa bắt đầu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600" data-testid="stat-not-started">{stats.notStarted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Đang thực hiện</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-in-progress">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoàn thành</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-completed">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quá hạn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-overdue">{stats.overdue}</div>
          </CardContent>
        </Card>
        {/* Department KPI Card */}
        {selectedDepartment && selectedDepartment !== "all" && departmentKPI && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">KPI Phòng ban</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary" data-testid="stat-department-kpi">
                {departmentKPI.departmentAverageKPI.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Trung bình {departmentKPI.userCount} người
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Department Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Phòng ban</label>
              <Select 
                value={selectedDepartment} 
                onValueChange={setSelectedDepartment}
                disabled={!canViewAllDepartments}
              >
                <SelectTrigger data-testid="select-department">
                  <SelectValue placeholder="Chọn phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  {canViewAllDepartments && <SelectItem value="all">Tất cả phòng ban</SelectItem>}
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Người thực hiện</label>
              <Select 
                value={selectedUser} 
                onValueChange={setSelectedUser}
                disabled={!canViewAllDepartments && selectedDepartment === "all"}
              >
                <SelectTrigger data-testid="select-user">
                  <SelectValue placeholder="Chọn người" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} ({u.position || u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="Chưa bắt đầu">Chưa bắt đầu</SelectItem>
                  <SelectItem value="Đang thực hiện">Đang thực hiện</SelectItem>
                  <SelectItem value="Hoàn thành">Hoàn thành</SelectItem>
                  <SelectItem value="Quá hạn">Quá hạn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm nhiệm vụ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Danh sách nhiệm vụ ({filteredTasks.length})</span>
            <Badge variant="outline">{selectedDeptName}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Không có nhiệm vụ nào
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Thử thay đổi bộ lọc hoặc tạo nhiệm vụ mới
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedTasks.map(task => {
                const StatusIcon = STATUS_ICONS[task.status as TaskStatus];
                
                // Determine card background based on task type
                const isParentTask = (task.subtasksCount ?? 0) > 0;
                const isSubtask = !!task.parentTaskId;
                
                let cardClassName = "hover-elevate cursor-pointer";
                if (isSubtask) {
                  // Subtask: Light yellow background
                  cardClassName += " bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800";
                } else if (isParentTask) {
                  // Parent task: Light blue background
                  cardClassName += " bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
                }
                
                return (
                  <Link key={task.id} href={`/tasks/${task.id}`}>
                    <Card className={cardClassName} data-testid={`task-card-${task.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant="outline" className="font-mono text-xs">
                                {task.taskNumber}
                              </Badge>
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
                              <h3 className="font-semibold truncate">{task.title}</h3>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{format(new Date(task.deadline), "dd/MM/yyyy", { locale: vi })}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                <span>{task.assignments.length} người</span>
                              </div>
                              <Badge variant={PRIORITY_VARIANTS[task.priority]}>
                                {task.priority}
                              </Badge>
                              <Badge variant={STATUS_VARIANTS[task.status as TaskStatus]}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {task.status}
                              </Badge>
                            </div>

                            {/* Assignees */}
                            <div className="flex items-center gap-2 mt-2">
                              {task.assignments.slice(0, 3).map(assignee => (
                                <Badge key={assignee.id} variant="secondary" className="text-xs">
                                  <User className="w-3 h-3 mr-1" />
                                  {assignee.fullName}
                                </Badge>
                              ))}
                              {task.assignments.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{task.assignments.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Progress and Score */}
                          <div className="text-right shrink-0">
                            <div className="text-2xl font-bold">{task.progress}%</div>
                            <div className="text-xs text-muted-foreground">Tiến độ</div>
                            {task.status === "Hoàn thành" && task.averageScore !== null && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="text-xl font-bold text-green-600">{task.averageScore}</div>
                                <div className="text-xs text-muted-foreground">Điểm TB</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
