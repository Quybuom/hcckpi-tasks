/**
 * Evaluation utility functions for task leadership scoring
 */

// Minimal task type for evaluation functions
export interface EvaluationTask {
  status: string;
  deadline: string;
  completedAt?: string | null;
  progress?: number;
}

/**
 * Calculate completion score based on deadline adherence
 * Returns 0-120 score based on completion timing
 */
export function calculateCompletionScore(task: EvaluationTask): number {
  const now = new Date();
  const deadline = new Date(task.deadline);
  const daysDiff = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
  
  if (task.status === "Hoàn thành") {
    if (task.completedAt) {
      const completedAt = new Date(task.completedAt);
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
 * Get explanation text for leadership score cap
 */
export function getLeadershipScoreCapExplanation(completionScore: number): string {
  if (completionScore >= 110) return "Hoàn thành sớm >=1 ngày - Điểm tối đa: 10";
  if (completionScore >= 100) return "Hoàn thành đúng hạn - Điểm tối đa: 8";
  if (completionScore >= 90) return "Hoàn thành trễ 1-3 ngày - Điểm tối đa: 6";
  if (completionScore >= 80) return "Hoàn thành trễ >3 ngày - Điểm tối đa: 4";
  if (completionScore > 0) return "Đang thực hiện nhưng chậm tiến độ - Điểm tối đa: 2";
  return "Quá hạn chưa bắt đầu - Điểm tối đa: 1";
}
