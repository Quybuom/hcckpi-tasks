/**
 * Server-side evaluation utility functions for task leadership scoring
 */

interface EvaluationTask {
  status: string;
  deadline: Date;
  completedAt?: Date | null;
  progress?: number;
}

/**
 * Calculate completion score based on deadline adherence
 * Returns 0-120 score based on completion timing
 */
export function calculateCompletionScore(task: EvaluationTask): number {
  const now = new Date();
  const deadline = task.deadline;
  const daysDiff = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
  
  if (task.status === "Hoàn thành") {
    if (task.completedAt) {
      const completedAt = task.completedAt;
      const completionDaysDiff = Math.floor((completedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
      
      if (completionDaysDiff < -7) return 120;
      else if (completionDaysDiff < 0) return 110;
      else if (completionDaysDiff === 0) return 100;
      else if (completionDaysDiff <= 3) return 90;
      else return 80;
    }
    return 100;
  }
  
  if (task.status === "Đang thực hiện") {
    if (daysDiff > 0) return 0;
    return 50 + (task.progress || 0) * 0.5;
  }
  
  if (task.status === "Chưa bắt đầu") {
    if (daysDiff > 0) return 0;
    return Math.max(0, 50 + daysDiff * 2);
  }
  
  return 50;
}

/**
 * Calculate maximum allowed leadership score based on completion score
 * Returns 1-10 cap based on performance
 */
export function calculateMaxLeadershipScore(completionScore: number): number {
  if (completionScore >= 110) return 10; // Sớm >=1 ngày
  if (completionScore >= 100) return 8;  // Đúng hạn
  if (completionScore >= 90) return 6;   // Trễ 1-3 ngày
  if (completionScore >= 80) return 4;   // Trễ >3 ngày
  if (completionScore > 0) return 2;     // Đang làm, chậm
  return 1;                               // Quá hạn chưa bắt đầu
}

/**
 * Get the evaluator for a specific task assignment based on hierarchy
 * 
 * Rules:
 * 1. If task has "Người chỉ đạo" (supervisor) → They evaluate EVERYONE
 * 2. If assignment is "Phối hợp" (collaborator) → "Chủ trì" evaluates them
 * 3. If assignment is "Chủ trì" (primary leader) → Fallback by hierarchy:
 *    - Chuyên viên → Trưởng phòng (department head)
 *    - Trưởng phòng → Assigned Phó GĐ (or any Phó GĐ if not assigned)
 *    - Phó GĐ → Giám đốc
 *    - Giám đốc → null (no evaluation)
 */
import { storage } from "./storage";
import type { User } from "@shared/schema";

export async function getEvaluatorForAssignment(
  taskId: string,
  assignmentId: string
): Promise<User | null> {
  // Get task assignments
  const assignments = await storage.getTaskAssignments(taskId);
  const currentAssignment = assignments.find(a => a.id === assignmentId);
  
  if (!currentAssignment) {
    throw new Error("Assignment not found");
  }

  // PRIORITY 1: Phối hợp → ALWAYS evaluated by Chủ trì (not by supervisor)
  if (currentAssignment.role === "Phối hợp") {
    const chuTri = assignments.find(a => a.role === "Chủ trì");
    if (chuTri) {
      const chuTriUser = await storage.getUser(chuTri.userId);
      return chuTriUser || null;
    }
    return null; // No Chủ trì found
  }

  // PRIORITY 2: Check if task has "Người chỉ đạo" (supervisor) for Chủ trì/Chỉ đạo roles
  const supervisor = assignments.find(a => a.role === "Chỉ đạo");
  if (supervisor) {
    // Prevent self-evaluation: Supervisor cannot evaluate themselves
    // If supervisor IS the current assignment, skip to role-based hierarchy
    if (supervisor.userId !== currentAssignment.userId) {
      const supervisorUser = await storage.getUser(supervisor.userId);
      return supervisorUser || null;
    }
    // Fall through to role-based evaluation for supervisor's own assignment
  }

  // For "Chủ trì" and "Chỉ đạo" roles: evaluate by hierarchy
  if (currentAssignment.role === "Chủ trì" || currentAssignment.role === "Chỉ đạo") {
    // Primary leader → Fallback by hierarchy
    const assignee = await storage.getUser(currentAssignment.userId);
    if (!assignee) return null;

    // Chuyên viên → Trưởng phòng (department head)
    if (assignee.role === "Chuyên viên") {
      if (!assignee.departmentId) return null;
      
      // Find department head
      const deptUsers = await storage.getUsers({ 
        departmentId: assignee.departmentId, 
        role: "Trưởng phòng" 
      });
      return deptUsers[0] || null;
    }

    // Trưởng phòng → Assigned Deputy Director
    if (assignee.role === "Trưởng phòng") {
      if (!assignee.departmentId) return null;
      
      const department = await storage.getDepartment(assignee.departmentId);
      if (department?.assignedDeputyDirectorId) {
        const deputyDirector = await storage.getUser(department.assignedDeputyDirectorId);
        if (deputyDirector) return deputyDirector;
      }
      
      // Fallback: Find any Phó GĐ or Giám đốc
      const deputies = await storage.getUsers({ role: "Phó Giám đốc" });
      if (deputies.length > 0) return deputies[0];
      
      const directors = await storage.getUsers({ role: "Giám đốc" });
      return directors[0] || null;
    }

    // Phó GĐ → Giám đốc
    if (assignee.role === "Phó Giám đốc") {
      const directors = await storage.getUsers({ role: "Giám đốc" });
      return directors[0] || null;
    }

    // Giám đốc → No evaluation
    if (assignee.role === "Giám đốc") {
      return null;
    }
  }

  return null;
}

/**
 * Check if a user can evaluate a specific assignment
 */
export async function canUserEvaluateAssignment(
  userId: string,
  taskId: string,
  assignmentId: string
): Promise<boolean> {
  const evaluator = await getEvaluatorForAssignment(taskId, assignmentId);
  return evaluator?.id === userId;
}
