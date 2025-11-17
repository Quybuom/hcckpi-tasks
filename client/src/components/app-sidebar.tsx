import { Home, ClipboardList, Users, BarChart3, Settings, FileText, ShieldAlert, Trash2, Shield, UserCog, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useUserTasksQuery } from "@/lib/useUserTasksQuery";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/queryClient";

interface AppSidebarProps {
  currentPath?: string;
}

function getInitials(fullName: string): string {
  const parts = fullName.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.substring(0, 2).toUpperCase();
}

const menuItems = [
  {
    title: "Tổng quan",
    url: "/",
    icon: Home,
  },
  {
    title: "Nhiệm vụ của tôi",
    url: "/tasks/my-tasks",
    icon: ClipboardList,
  },
  {
    title: "Nhiệm vụ phòng ban",
    url: "/tasks/department",
    icon: Users,
  },
  {
    title: "Thống kê KPI",
    url: "/kpi",
    icon: BarChart3,
  },
  {
    title: "Báo cáo",
    url: "/reports",
    icon: FileText,
  },
  {
    title: "Cảnh báo AI",
    url: "/ai-alerts",
    icon: ShieldAlert,
  },
  {
    title: "Thùng rác",
    url: "/tasks/trash",
    icon: Trash2,
  },
];

export function AppSidebar({ currentPath = "/" }: AppSidebarProps) {
  const { user } = useAuth();
  const { data: myTasks = [] } = useUserTasksQuery();
  
  // Fetch AI alerts pending count
  const { data: aiAlertsCountData, isLoading: isLoadingAiAlerts } = useQuery<{ count: number }>({
    queryKey: ['/api/ai-alerts/pending-count'],
    queryFn: () => fetchJson<{ count: number }>('/api/ai-alerts/pending-count'),
    enabled: !!user,
  });
  
  // Fetch department new tasks count
  const { data: deptTasksCountData, isLoading: isLoadingDeptTasks } = useQuery<{ count: number }>({
    queryKey: ['/api/tasks/department/new-count'],
    queryFn: () => fetchJson<{ count: number }>('/api/tasks/department/new-count'),
    enabled: !!user && !!user.departmentId,
  });
  
  const isDirector = user?.role === "Giám đốc";
  const isDeputyDirector = user?.role === "Phó Giám đốc";
  const isAdmin = isDirector || isDeputyDirector;
  
  // Badge count logic:
  // - Director: INCOMPLETE tasks only (Chưa bắt đầu + Đang thực hiện)
  // - Deputy Director: Chủ trì + Chỉ đạo incomplete tasks only
  // - Staff/Department Head: Chủ trì not completed + Phối hợp not collaboration-completed
  const myTasksCount = isDirector 
    ? myTasks.filter(task => task.status !== "Hoàn thành").length  // Director: count incomplete tasks only
    : isDeputyDirector
      ? myTasks.filter(task => task.status !== "Hoàn thành").length  // Deputy Director: count incomplete tasks only
      : myTasks.filter(task => {
          const userAssignments = task.assignments?.filter((a: any) => a.id === user?.id) || [];
          
          for (const assignment of userAssignments) {
            if (assignment.role === "Chủ trì") {
              // Chủ trì: count if task not completed
              if (task.status !== "Hoàn thành") return true;
            } else if (assignment.role === "Phối hợp") {
              // Phối hợp: count if collaboration not completed
              if (!assignment.collaborationCompleted) return true;
            }
          }
          return false;
        }).length;
  
  const aiAlertsCount = aiAlertsCountData?.count || 0;
  const deptTasksCount = deptTasksCountData?.count || 0;
  
  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            KPI
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">TT PVHCC</h2>
            <p className="text-xs text-muted-foreground truncate">Tỉnh Bắc Ninh</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide px-3">
            Điều hướng
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                let badgeCount = 0;
                let badgeTestId = '';
                
                if (item.url === "/tasks/my-tasks" && myTasksCount > 0) {
                  badgeCount = myTasksCount;
                  badgeTestId = 'badge-my-tasks-count';
                } else if (item.url === "/ai-alerts" && aiAlertsCount > 0) {
                  badgeCount = aiAlertsCount;
                  badgeTestId = 'badge-ai-alerts-count';
                } else if (item.url === "/tasks/department" && deptTasksCount > 0) {
                  badgeCount = deptTasksCount;
                  badgeTestId = 'badge-dept-tasks-count';
                }
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPath === item.url}
                      data-testid={`link-${item.url.slice(1) || 'home'}`}
                    >
                      <a href={item.url} className="flex items-center gap-3 justify-between w-full">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </div>
                        {badgeCount > 0 && (
                          <Badge variant="secondary" className="ml-auto" data-testid={badgeTestId}>
                            {badgeCount}
                          </Badge>
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide px-3">
            Cá nhân
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={currentPath === "/profile"}
                  data-testid="link-profile"
                >
                  <a href="/profile" className="flex items-center gap-3">
                    <User className="w-4 h-4" />
                    <span>Trang cá nhân</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wide px-3">
              Quản lý hệ thống
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === "/admin/departments"}
                    data-testid="link-admin-departments"
                  >
                    <a href="/admin/departments" className="flex items-center gap-3">
                      <Shield className="w-4 h-4" />
                      <span>Quản lý phòng ban</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === "/admin/users"}
                    data-testid="link-admin-users"
                  >
                    <a href="/admin/users" className="flex items-center gap-3">
                      <UserCog className="w-4 h-4" />
                      <span>Quản lý cán bộ</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === "/settings"}
                    data-testid="link-settings"
                  >
                    <a href="/settings" className="flex items-center gap-3">
                      <Settings className="w-4 h-4" />
                      <span>Cài đặt</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {user ? getInitials(user.fullName) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" data-testid="text-username">
              {user?.fullName || 'Loading...'}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-2 py-0">
                {user ? (user.position || user.role) : 'User'}
              </Badge>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
