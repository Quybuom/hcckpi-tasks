import { storage } from "./storage";
import type { Task } from "@shared/schema";

export interface TaskReportFilters {
  timeRange: "week" | "month" | "quarter" | "year";
  year?: number;
  month?: number;
  quarter?: number;
  week?: number;
  departmentId?: string;
  status?: string;
}

export interface TaskReportStats {
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

function getDateRange(filters: TaskReportFilters): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date();

  if (filters.timeRange === "week") {
    // Current week or specific week
    const year = filters.year || now.getFullYear();
    const week = filters.week || getCurrentWeek(now);
    startDate = getStartOfWeek(year, week);
    endDate = getEndOfWeek(year, week);
  } else if (filters.timeRange === "month") {
    const year = filters.year || now.getFullYear();
    const month = filters.month || now.getMonth() + 1;
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59, 999);
  } else if (filters.timeRange === "quarter") {
    const year = filters.year || now.getFullYear();
    const quarter = filters.quarter || getCurrentQuarter(now);
    const startMonth = (quarter - 1) * 3;
    startDate = new Date(year, startMonth, 1);
    endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  } else {
    // Year
    const year = filters.year || now.getFullYear();
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
  }

  return { startDate, endDate };
}

function getCurrentWeek(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getCurrentQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

function getStartOfWeek(year: number, week: number): Date {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = (week - 1) * 7 - firstDayOfYear.getDay();
  return new Date(year, 0, 1 + daysToAdd);
}

function getEndOfWeek(year: number, week: number): Date {
  const startOfWeek = getStartOfWeek(year, week);
  return new Date(startOfWeek.getTime() + 6 * 86400000 + 86399999);
}

function filterTasksByDateRange(tasks: Task[], startDate: Date, endDate: Date): Task[] {
  return tasks.filter(task => {
    const deadline = new Date(task.deadline);
    const completedAt = task.completedAt ? new Date(task.completedAt) : null;
    const createdAt = new Date(task.createdAt);

    // Include task if:
    // 1. Deadline is in range
    // 2. Completed in range
    // 3. Created in range and still active
    return (
      (deadline >= startDate && deadline <= endDate) ||
      (completedAt && completedAt >= startDate && completedAt <= endDate) ||
      (createdAt >= startDate && createdAt <= endDate)
    );
  });
}

export async function calculateTaskReportStats(filters: TaskReportFilters): Promise<TaskReportStats> {
  const { startDate, endDate } = getDateRange(filters);

  // Get all tasks (filter by status if provided, but NOT departmentId yet)
  let allTasks = await storage.getTasks({
    status: filters.status,
  });

  // Apply department filtering: include tasks that either:
  // 1. Have task.departmentId matching the selected department, OR
  // 2. Are assigned to users in the selected department
  if (filters.departmentId && filters.departmentId !== "all") {
    // Get all users in the selected department
    const usersInDept = await storage.getUsers({ departmentId: filters.departmentId });
    const userIdsInDept = usersInDept.map(u => u.id);
    
    // Get task IDs assigned to users in this department (only if department has users)
    let taskIdsAssignedToDept = new Set<string>();
    if (userIdsInDept.length > 0) {
      const deptAssignments = await storage.getTaskAssignmentsForUsers(userIdsInDept);
      taskIdsAssignedToDept = new Set(deptAssignments.map(a => a.taskId));
    }
    
    // Filter: include tasks with matching departmentId OR assigned to department users
    allTasks = allTasks.filter(t => 
      t.departmentId === filters.departmentId || taskIdsAssignedToDept.has(t.id)
    );
  }

  // Filter by date range
  const tasks = filterTasksByDateRange(allTasks, startDate, endDate);

  const now = new Date();

  // Calculate basic stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "Hoàn thành").length;
  const inProgressTasks = tasks.filter(t => t.status === "Đang thực hiện").length;
  const notStartedTasks = tasks.filter(t => t.status === "Chưa bắt đầu").length;
  const overdueTasks = tasks.filter(t => 
    new Date(t.deadline) < now && t.status !== "Hoàn thành"
  ).length;

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Calculate average completion days
  const completedTasksWithDates = tasks.filter(t => 
    t.status === "Hoàn thành" && t.completedAt
  );

  let avgCompletionDays = 0;
  if (completedTasksWithDates.length > 0) {
    const totalDays = completedTasksWithDates.reduce((sum, task) => {
      const created = new Date(task.createdAt);
      const completed = new Date(task.completedAt!);
      const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    avgCompletionDays = Math.round(totalDays / completedTasksWithDates.length);
  }

  // Tasks by status
  const statusCounts = new Map<string, number>();
  tasks.forEach(task => {
    statusCounts.set(task.status, (statusCounts.get(task.status) || 0) + 1);
  });

  const tasksByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({
    status,
    count,
  }));

  // Tasks by priority
  const priorityCounts = new Map<string, number>();
  tasks.forEach(task => {
    priorityCounts.set(task.priority, (priorityCounts.get(task.priority) || 0) + 1);
  });

  const tasksByPriority = Array.from(priorityCounts.entries()).map(([priority, count]) => ({
    priority,
    count,
  }));

  // Tasks by department
  const departments = await storage.getDepartments();
  const deptCounts = new Map<string, number>();
  tasks.forEach(task => {
    if (task.departmentId) {
      deptCounts.set(task.departmentId, (deptCounts.get(task.departmentId) || 0) + 1);
    }
  });

  const tasksByDepartment = Array.from(deptCounts.entries()).map(([departmentId, count]) => {
    const dept = departments.find(d => d.id === departmentId);
    return {
      departmentId,
      departmentName: dept?.name || "Không xác định",
      count,
    };
  });

  // Timeline data (daily)
  const timelineData = generateTimelineData(tasks, startDate, endDate);

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    notStartedTasks,
    overdueTasks,
    completionRate,
    avgCompletionDays,
    tasksByStatus,
    tasksByPriority,
    tasksByDepartment,
    timelineData,
  };
}

function generateTimelineData(
  tasks: Task[], 
  startDate: Date, 
  endDate: Date
): { date: string; completed: number; created: number }[] {
  const dayMap = new Map<string, { completed: number; created: number }>();

  // Initialize all days in range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dayMap.set(dateKey, { completed: 0, created: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Count created and completed tasks per day
  tasks.forEach(task => {
    const createdDate = new Date(task.createdAt).toISOString().split('T')[0];
    if (dayMap.has(createdDate)) {
      dayMap.get(createdDate)!.created++;
    }

    if (task.completedAt) {
      const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
      if (dayMap.has(completedDate)) {
        dayMap.get(completedDate)!.completed++;
      }
    }
  });

  return Array.from(dayMap.entries())
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function generateAIInsights(
  stats: TaskReportStats, 
  filters: TaskReportFilters
): Promise<string> {
  // This will be implemented with OpenAI later
  // For now, return a placeholder
  return "AI insights will be generated here";
}
