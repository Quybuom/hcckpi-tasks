import { type Task, type TaskAssignment, type ProgressUpdate, type Comment, type File, type TaskEvaluation } from "@shared/schema";
import { storage } from "./storage";

const ROLE_COEFFICIENTS: Record<string, number> = {
  "Chủ trì": 1.0,
  "Phối hợp": 0.3,
};

const PRIORITY_WEIGHTS: Record<string, number> = {
  "Khẩn cấp": 3,
  "Quan trọng": 2,
  "Bình thường": 1,
};

// Activity cache for a single task
export interface TaskActivityCache {
  progressUpdates: ProgressUpdate[];
  comments: Comment[];
  files: File[];
  evaluations: Map<string, TaskEvaluation>; // assignmentId -> evaluation
}

export interface TaskScore {
  taskId: string;
  completionScore: number;
  qualityScore: number;
  taskScore: number;
  roleCoefficient: number;
  priorityWeight: number;
  roleWeightedScore: number;
}

// Preload all activity for tasks (fetch once, reuse multiple times)
export async function preloadTaskActivity(tasks: Task[]): Promise<Map<string, TaskActivityCache>> {
  const activityMap = new Map<string, TaskActivityCache>();
  
  await Promise.all(
    tasks.map(async (task) => {
      const [progressUpdates, comments, files, assignments] = await Promise.all([
        storage.getProgressUpdates(task.id),
        storage.getComments(task.id),
        storage.getTaskFiles(task.id),
        storage.getTaskAssignments(task.id),
      ]);
      
      // Fetch evaluations for all assignments
      const evaluations = new Map<string, TaskEvaluation>();
      await Promise.all(
        assignments.map(async (assignment) => {
          const evaluation = await storage.getTaskEvaluation(task.id, assignment.id);
          if (evaluation) {
            evaluations.set(assignment.id, evaluation);
          }
        })
      );
      
      activityMap.set(task.id, {
        progressUpdates,
        comments,
        files,
        evaluations,
      });
    })
  );
  
  return activityMap;
}

// Check if task has activity in given period
export function hasActivityInPeriod(
  activity: TaskActivityCache | undefined,
  periodStart: Date | undefined,
  periodEnd: Date | undefined
): boolean {
  if (!activity || (!periodStart && !periodEnd)) {
    return false;
  }
  
  // Check progress updates
  const hasProgressInPeriod = activity.progressUpdates.some(u => {
    const date = new Date(u.createdAt);
    if (periodStart && date < periodStart) return false;
    if (periodEnd && date > periodEnd) return false;
    return true;
  });
  
  if (hasProgressInPeriod) return true;
  
  // Check comments
  const hasCommentsInPeriod = activity.comments.some(c => {
    const date = new Date(c.createdAt);
    if (periodStart && date < periodStart) return false;
    if (periodEnd && date > periodEnd) return false;
    return true;
  });
  
  if (hasCommentsInPeriod) return true;
  
  // Check files
  const hasFilesInPeriod = activity.files.some(f => {
    const date = new Date(f.uploadedAt);
    if (periodStart && date < periodStart) return false;
    if (periodEnd && date > periodEnd) return false;
    return true;
  });
  
  if (hasFilesInPeriod) return true;
  
  // Check evaluations
  for (const evaluation of Array.from(activity.evaluations.values())) {
    const date = new Date(evaluation.evaluatedAt);
    if (periodStart && date < periodStart) continue;
    if (periodEnd && date > periodEnd) continue;
    return true;
  }
  
  return false;
}

export function calculateCompletionScore(task: Task): number {
  const now = new Date();
  const deadline = new Date(task.deadline);
  const daysDiff = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
  
  if (task.status === "Hoàn thành") {
    if (task.completedAt) {
      const completedAt = new Date(task.completedAt);
      const completionDaysDiff = Math.floor((completedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
      
      if (completionDaysDiff < -1) {
        return 120;
      } else if (completionDaysDiff < 0) {
        return 110;
      } else if (completionDaysDiff === 0) {
        return 100;
      } else if (completionDaysDiff <= 3) {
        return 90;
      } else {
        return 80;
      }
    }
    return 100;
  }
  
  if (task.status === "Đang thực hiện") {
    if (daysDiff > 0) {
      return 0;
    }
    return 50 + (task.progress || 0) * 0.5;
  }
  
  if (task.status === "Chưa bắt đầu") {
    if (daysDiff > 0) {
      return 0;
    }
    return 30;
  }
  
  return 0;
}

/**
 * Calculate maximum allowed leadership score based on task completion performance
 * Ensures that leadership evaluation is capped based on deadline adherence
 * 
 * @param completionScore - The completion score (0-120)
 * @returns Maximum leadership score (0-10)
 */
export function calculateMaxLeadershipScore(completionScore: number): number {
  // Hoàn thành sớm >=1 ngày (completionScore >= 110)
  if (completionScore >= 110) {
    return 10;
  }
  
  // Hoàn thành đúng hạn (completionScore = 100)
  if (completionScore >= 100) {
    return 8;
  }
  
  // Hoàn thành trễ 1-3 ngày (completionScore = 90)
  if (completionScore >= 90) {
    return 6;
  }
  
  // Hoàn thành trễ >3 ngày (completionScore = 80)
  if (completionScore >= 80) {
    return 4;
  }
  
  // Đang thực hiện, có tiến độ nhưng chậm (completionScore > 0)
  if (completionScore > 0) {
    return 2;
  }
  
  // Quá hạn chưa bắt đầu hoặc không có tiến độ (completionScore = 0)
  return 1;
}

export async function calculateQualityScore(
  task: Task,
  assignmentId: string,
  activityCache: TaskActivityCache,
  periodStart?: Date,
  periodEnd?: Date
): Promise<number> {
  let baseScore = 0;
  
  // Filter progress updates by period if specified
  const filteredProgressUpdates = periodStart || periodEnd
    ? activityCache.progressUpdates.filter(u => {
        const updateDate = new Date(u.createdAt);
        if (periodStart && updateDate < periodStart) return false;
        if (periodEnd && updateDate > periodEnd) return false;
        return true;
      })
    : activityCache.progressUpdates;
  
  const updateDates = filteredProgressUpdates.map(u => new Date(u.createdAt));
  if (updateDates.length >= 3) {
    const weeklyUpdates = updateDates.filter(date => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= weekAgo;
    });
    
    if (weeklyUpdates.length >= 2) {
      baseScore += 10;
    }
  }
  
  const detailedUpdates = filteredProgressUpdates.filter(u => 
    u.content && u.content.length > 50
  );
  
  // Filter comments by period if specified
  const filteredComments = periodStart || periodEnd
    ? activityCache.comments.filter(c => {
        const commentDate = new Date(c.createdAt);
        if (periodStart && commentDate < periodStart) return false;
        if (periodEnd && commentDate > periodEnd) return false;
        return true;
      })
    : activityCache.comments;
  
  // Filter files by period if specified
  const filteredFiles = periodStart || periodEnd
    ? activityCache.files.filter(f => {
        const fileDate = new Date(f.uploadedAt);
        if (periodStart && fileDate < periodStart) return false;
        if (periodEnd && fileDate > periodEnd) return false;
        return true;
      })
    : activityCache.files;
  
  if (detailedUpdates.length > 0 || filteredFiles.length > 0) {
    baseScore += 10;
  }
  
  if (filteredComments.length >= 3) {
    baseScore += 10;
  }
  
  baseScore = Math.min(baseScore, 30);
  
  // Get evaluation score from cache
  // Only count evaluation if it was created within the period
  const evaluation = activityCache.evaluations.get(assignmentId);
  let rawLeadershipScore = 0;
  
  if (evaluation) {
    const evalDate = new Date(evaluation.evaluatedAt);
    const isInPeriod = (!periodStart || evalDate >= periodStart) && 
                       (!periodEnd || evalDate <= periodEnd);
    
    if (isInPeriod || (!periodStart && !periodEnd)) {
      rawLeadershipScore = Number(evaluation.score);
    }
  }
  
  // Apply leadership score cap based on completion performance
  const completionScore = calculateCompletionScore(task);
  const maxLeadershipScore = calculateMaxLeadershipScore(completionScore);
  
  // Cap the leadership score - cannot exceed maximum based on performance
  const cappedLeadershipScore = Math.min(rawLeadershipScore, maxLeadershipScore);
  const leadershipContribution = (cappedLeadershipScore / 10) * 70;
  
  return baseScore + leadershipContribution;
}

export async function calculateTaskScore(
  task: Task,
  assignment: TaskAssignment,
  activityCache: TaskActivityCache,
  periodStart?: Date,
  periodEnd?: Date
): Promise<TaskScore> {
  const completionScore = calculateCompletionScore(task);
  
  // Use cached activity data (no storage calls)
  const qualityScore = await calculateQualityScore(
    task, 
    assignment.id, 
    activityCache,
    periodStart,
    periodEnd
  );
  
  const taskScore = completionScore * 0.7 + qualityScore * 0.3;
  
  const roleCoefficient = ROLE_COEFFICIENTS[assignment.role] || 1.0;
  const priorityWeight = PRIORITY_WEIGHTS[task.priority] || 1;
  
  const roleWeightedScore = taskScore * roleCoefficient;
  
  return {
    taskId: task.id,
    completionScore,
    qualityScore,
    taskScore,
    roleCoefficient,
    priorityWeight,
    roleWeightedScore,
  };
}

export async function calculateUserKPI(userId: string, periodStart?: Date, periodEnd?: Date): Promise<{
  totalScore: number;
  taskCount: number;
  averageScore: number;
  taskScores: TaskScore[];
}> {
  const assignments = await storage.getUserTaskAssignments(userId);
  
  // Get all tasks for this user
  const tasks: Task[] = [];
  for (const assignment of assignments) {
    const task = await storage.getTask(assignment.taskId);
    if (task && !task.isDeleted) {
      tasks.push(task);
    }
  }
  
  // Preload activity for all tasks (fetch once, reuse)
  const activityMap = await preloadTaskActivity(tasks);
  
  const taskScores: TaskScore[] = [];
  let weightedSum = 0;
  let totalWeights = 0;
  
  for (const assignment of assignments) {
    const task = tasks.find(t => t.id === assignment.taskId);
    if (!task) continue;
    
    // Apply period filtering with activity-based inclusion
    if (periodStart || periodEnd) {
      // Completed tasks: filter by completedAt
      if (task.status === "Hoàn thành" && task.completedAt) {
        const completedDate = new Date(task.completedAt);
        if (periodStart && completedDate < periodStart) continue;
        if (periodEnd && completedDate > periodEnd) continue;
      } else {
        // In-progress/not started: check deadline
        const deadlineDate = new Date(task.deadline);
        const deadlineInPeriod = (!periodStart || deadlineDate >= periodStart) && 
                                 (!periodEnd || deadlineDate <= periodEnd);
        
        if (!deadlineInPeriod) {
          // Overdue tasks: check if they have activity in period
          const activity = activityMap.get(task.id);
          if (!hasActivityInPeriod(activity, periodStart, periodEnd)) {
            continue;
          }
        }
      }
    }
    
    // Use cached activity (no storage calls)
    const activity = activityMap.get(task.id);
    if (!activity) continue;
    
    const score = await calculateTaskScore(task, assignment, activity, periodStart, periodEnd);
    taskScores.push(score);
    
    weightedSum += score.roleWeightedScore * score.priorityWeight;
    totalWeights += score.priorityWeight;
  }
  
  const taskCount = taskScores.length;
  const averageScore = totalWeights > 0 ? weightedSum / totalWeights : 0;
  
  return {
    totalScore: weightedSum,
    taskCount,
    averageScore,
    taskScores,
  };
}

export async function calculateAllUsersKPI(departmentId?: string): Promise<{
  userId: string;
  fullName: string;
  departmentName: string | null;
  kpi: number;
  taskCount: number;
}[]> {
  const users = await storage.getUsers(departmentId ? { departmentId } : {});
  
  const results = await Promise.all(
    users.map(async (user) => {
      const kpiData = await calculateUserKPI(user.id);
      
      let departmentName = null;
      if (user.departmentId) {
        const dept = await storage.getDepartment(user.departmentId);
        departmentName = dept?.name || null;
      }
      
      return {
        userId: user.id,
        fullName: user.fullName,
        departmentName,
        kpi: kpiData.averageScore,
        taskCount: kpiData.taskCount,
      };
    })
  );
  
  return results.sort((a, b) => b.kpi - a.kpi);
}

export async function calculateFilteredUsersKPI(
  filteredTasks: Task[],
  activityMap: Map<string, TaskActivityCache>,
  periodStart?: Date,
  periodEnd?: Date
): Promise<{
  userId: string;
  fullName: string;
  departmentName: string | null;
  kpi: number;
  taskCount: number;
}[]> {
  if (filteredTasks.length === 0) {
    return [];
  }
  
  // Get all assignments for filtered tasks
  const allAssignments: TaskAssignment[] = [];
  for (const task of filteredTasks) {
    const assignments = await storage.getTaskAssignments(task.id);
    allAssignments.push(...assignments);
  }
  
  // Group assignments by userId
  const assignmentsByUser = new Map<string, TaskAssignment[]>();
  for (const assignment of allAssignments) {
    if (!assignmentsByUser.has(assignment.userId)) {
      assignmentsByUser.set(assignment.userId, []);
    }
    assignmentsByUser.get(assignment.userId)!.push(assignment);
  }
  
  // Calculate KPI for each user
  const results = await Promise.all(
    Array.from(assignmentsByUser.entries()).map(async ([userId, assignments]) => {
      const user = await storage.getUser(userId);
      if (!user) {
        return null;
      }
      
      // Calculate KPI from user's assignments in filtered tasks
      const taskScores: TaskScore[] = [];
      let weightedSum = 0;
      let totalWeights = 0;
      
      for (const assignment of assignments) {
        const task = filteredTasks.find(t => t.id === assignment.taskId);
        if (!task) continue;
        
        // Get cached activity for this task
        const activity = activityMap.get(task.id);
        if (!activity) continue;
        
        // Pass cached activity + period parameters (no storage calls)
        const score = await calculateTaskScore(task, assignment, activity, periodStart, periodEnd);
        taskScores.push(score);
        
        weightedSum += score.roleWeightedScore * score.priorityWeight;
        totalWeights += score.priorityWeight;
      }
      
      const taskCount = taskScores.length;
      const averageScore = totalWeights > 0 ? weightedSum / totalWeights : 0;
      
      let departmentName = null;
      if (user.departmentId) {
        const dept = await storage.getDepartment(user.departmentId);
        departmentName = dept?.name || null;
      }
      
      return {
        userId: user.id,
        fullName: user.fullName,
        departmentName,
        kpi: averageScore,
        taskCount,
      };
    })
  );
  
  // Filter out null results and sort by KPI descending
  return results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.kpi - a.kpi);
}
