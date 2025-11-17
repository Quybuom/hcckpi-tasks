import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import MyTasks from "@/pages/MyTasks";
import DepartmentTasks from "@/pages/DepartmentTasks";
import Trash from "@/pages/Trash";
import TaskDetail from "@/pages/TaskDetail";
import TaskDetailPrototype from "@/pages/TaskDetailPrototype";
import CreateTaskPrototype from "@/pages/CreateTaskPrototype";
import CreateTask from "@/pages/CreateTask";
import KpiPage from "@/pages/KpiPage";
import ReportsPage from "@/pages/ReportsPage";
import AIAlerts from "@/pages/AIAlerts";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import AdminDepartments from "@/pages/AdminDepartments";
import AdminUsers from "@/pages/AdminUsers";
import { LoginForm } from "@/components/LoginForm";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { IdleTimeout } from "@/components/IdleTimeout";
import { useLocation } from "wouter";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tasks">
        <Redirect to="/tasks/my-tasks" />
      </Route>
      <Route path="/tasks/my-tasks" component={MyTasks} />
      <Route path="/tasks/department" component={DepartmentTasks} />
      <Route path="/tasks/create" component={CreateTask} />
      <Route path="/tasks/trash" component={Trash} />
      <Route path="/tasks/:id" component={TaskDetail} />
      <Route path="/kpi" component={KpiPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/ai-alerts" component={AIAlerts} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin/departments" component={AdminDepartments} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/prototype/task-detail" component={TaskDetailPrototype} />
      <Route path="/prototype/create-task" component={CreateTaskPrototype} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, logout, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const sidebarStyle = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  // Redirect to home after successful login
  useEffect(() => {
    if (user && location === "/login") {
      setLocation("/");
    }
  }, [user, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-96 h-96" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginForm />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <SidebarProvider style={sidebarStyle as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar currentPath={location} />
          <div className="flex flex-col flex-1 overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b h-16 shrink-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {user.fullName} ({user.position || user.role})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  data-testid="button-logout"
                >
                  Đăng xuất
                </Button>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6">
              <Router />
            </main>
            <footer className="border-t py-4 px-6 text-center text-sm text-muted-foreground shrink-0">
              © 2025 Trung tâm Phục vụ hành chính công tỉnh Bắc Ninh. Mọi quyền được bảo lưu.
            </footer>
          </div>
        </div>
      </SidebarProvider>
      <IdleTimeout />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
