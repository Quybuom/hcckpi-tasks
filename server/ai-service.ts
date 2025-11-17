import Groq from "groq-sdk";
import { storage } from "./storage";
import { type Task, type ProgressUpdate, type Comment } from "@shared/schema";

// Using Groq API for AI-powered features
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export interface TaskQualityScore {
  score: number;
  reasoning: string;
  suggestions: string[];
}

export interface RiskAlert {
  type: "deadline_risk" | "no_updates" | "overload" | "complexity" | "resource" | "quality" | "coordination";
  severity: "high" | "medium" | "low";
  reason: string;
  suggestion: string;
}

export async function evaluateTaskQuality(
  task: Task,
  progressUpdates: ProgressUpdate[],
  comments: Comment[]
): Promise<TaskQualityScore> {
  try {
    const prompt = `Bạn là chuyên gia đánh giá hiệu suất công việc. Hãy đánh giá chất lượng thực hiện nhiệm vụ dựa trên thông tin sau:

Nhiệm vụ: ${task.title}
Mô tả: ${task.description || "Không có"}
Tiến độ hiện tại: ${task.progress}%
Trạng thái: ${task.status}
Deadline: ${task.deadline}

Số lượng cập nhật tiến độ: ${progressUpdates.length}
Nội dung cập nhật gần nhất: ${progressUpdates[0]?.content || "Chưa có cập nhật"}

Số lượng trao đổi: ${comments.length}

Hãy đánh giá chất lượng thực hiện từ 0-100 điểm và đưa ra:
1. Điểm số chất lượng (0-100)
2. Lý do đánh giá
3. Gợi ý cải thiện (tối đa 3 điểm)

Trả về JSON theo format:
{
  "score": <số>,
  "reasoning": "<lý do>",
  "suggestions": ["<gợi ý 1>", "<gợi ý 2>", "<gợi ý 3>"]
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    return {
      score: result.score || 70,
      reasoning: result.reasoning || "Đánh giá tự động",
      suggestions: result.suggestions || [],
    };
  } catch (error) {
    console.error("AI evaluation error:", error);
    return {
      score: 70,
      reasoning: "Không thể đánh giá tự động",
      suggestions: [],
    };
  }
}

export async function detectTaskRisks(
  task: Task,
  progressUpdates: ProgressUpdate[]
): Promise<RiskAlert[]> {
  const alerts: RiskAlert[] = [];
  const now = new Date();
  const deadline = new Date(task.deadline);
  const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // CHỈ CẢNH BÁO VỀ RỦI RO DEADLINE - ẢNH HƯỞNG TRỰC TIẾP ĐÉN KPI
  // Mỗi task chỉ có tối đa 1 cảnh báo để tránh quá tải thông tin
  
  if (task.status !== "Hoàn thành") {
    // Case 0: Đã quá hạn
    if (daysUntilDeadline < 0) {
      alerts.push({
        type: "deadline_risk",
        severity: "high",
        reason: `Nhiệm vụ đã quá hạn ${Math.abs(daysUntilDeadline)} ngày và chỉ hoàn thành ${task.progress}%`,
        suggestion: "Cần khẩn trương hoàn thành hoặc báo cáo lý do chậm trễ",
      });
    }
    // Case 1: Deadline nguy cấp (còn ≤ 2 ngày mà tiến độ < 50%)
    else if (daysUntilDeadline <= 2 && task.progress < 50) {
      alerts.push({
        type: "deadline_risk",
        severity: "high",
        reason: `Nhiệm vụ còn ${daysUntilDeadline} ngày đến hạn nhưng mới hoàn thành ${task.progress}%`,
        suggestion: "Nên tăng cường nhân lực hoặc điều chỉnh deadline ngay lập tức",
      });
    }
    // Case 2: Deadline gần (còn ≤ 5 ngày mà tiến độ < 70%)
    else if (daysUntilDeadline <= 5 && task.progress < 70) {
      alerts.push({
        type: "deadline_risk",
        severity: "high",
        reason: `Nhiệm vụ còn ${daysUntilDeadline} ngày đến hạn nhưng mới hoàn thành ${task.progress}%`,
        suggestion: "Cần đẩy nhanh tiến độ để đảm bảo hoàn thành đúng hạn",
      });
    }
    // Case 3: Deadline cảnh báo sớm (còn ≤ 7 ngày mà tiến độ < 50%)
    else if (daysUntilDeadline <= 7 && task.progress < 50) {
      alerts.push({
        type: "deadline_risk",
        severity: "medium",
        reason: `Nhiệm vụ còn ${daysUntilDeadline} ngày đến hạn nhưng mới hoàn thành ${task.progress}%`,
        suggestion: "Cần theo dõi sát tiến độ và xem xét tăng nguồn lực",
      });
    }
  }
  
  // Chỉ trả về MỘT cảnh báo duy nhất (cảnh báo nghiêm trọng nhất)
  return alerts.slice(0, 1);
}

export async function suggestTaskReassignment(userId: string): Promise<{
  shouldReassign: boolean;
  reason: string;
  suggestion: string;
  recommendedUsers: string[];
}> {
  try {
    const assignments = await storage.getUserTaskAssignments(userId);
    const activeTasks = await Promise.all(
      assignments.map(a => storage.getTask(a.taskId))
    );
    const activeTasksCount = activeTasks.filter(t => 
      t && t.status !== "Hoàn thành"
    ).length;
    
    if (activeTasksCount <= 5) {
      return {
        shouldReassign: false,
        reason: `Người dùng có ${activeTasksCount} nhiệm vụ đang thực hiện, chưa quá tải`,
        suggestion: "",
        recommendedUsers: [],
      };
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return {
        shouldReassign: false,
        reason: "Không tìm thấy người dùng",
        suggestion: "",
        recommendedUsers: [],
      };
    }
    
    const sameDeptUsers = await storage.getUsers({ departmentId: user.departmentId || undefined });
    
    const userWorkloads = await Promise.all(
      sameDeptUsers
        .filter(u => u.id !== userId && (u.role === "Chuyên viên" || u.role === "Phó trưởng phòng"))
        .map(async (u) => {
          const userAssignments = await storage.getUserTaskAssignments(u.id);
          const userTasks = await Promise.all(
            userAssignments.map(a => storage.getTask(a.taskId))
          );
          const activeCount = userTasks.filter(t => t && t.status !== "Hoàn thành").length;
          return { userId: u.id, fullName: u.fullName, activeTasksCount: activeCount };
        })
    );
    
    const availableUsers = userWorkloads
      .filter(w => w.activeTasksCount < 5)
      .sort((a, b) => a.activeTasksCount - b.activeTasksCount)
      .slice(0, 3);
    
    if (availableUsers.length > 0) {
      return {
        shouldReassign: true,
        reason: `Người dùng ${user.fullName} có ${activeTasksCount} nhiệm vụ đang thực hiện (quá tải)`,
        suggestion: `Nên phân công lại một số nhiệm vụ cho những người có khối lượng công việc thấp hơn`,
        recommendedUsers: availableUsers.map(u => u.userId),
      };
    }
    
    return {
      shouldReassign: true,
      reason: `Người dùng ${user.fullName} có ${activeTasksCount} nhiệm vụ (quá tải) nhưng toàn bộ phòng ban đang bận`,
      suggestion: "Nên cân nhắc tuyển thêm nhân sự hoặc điều chỉnh deadline các nhiệm vụ",
      recommendedUsers: [],
    };
  } catch (error) {
    console.error("Task reassignment suggestion error:", error);
    return {
      shouldReassign: false,
      reason: "Lỗi khi phân tích",
      suggestion: "",
      recommendedUsers: [],
    };
  }
}

export async function generateDailyTaskSummary(userId: string): Promise<string> {
  try {
    const assignments = await storage.getUserTaskAssignments(userId);
    const tasks = await Promise.all(
      assignments.map(a => storage.getTask(a.taskId))
    );
    
    const activeTasks = tasks.filter(t => t && t.status !== "Hoàn thành");
    const nearDeadlineTasks = activeTasks.filter(t => {
      if (!t) return false;
      const deadline = new Date(t.deadline);
      const now = new Date();
      const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 3;
    });
    
    const summary = `📊 Tổng hợp công việc ngày ${new Date().toLocaleDateString('vi-VN')}

🔹 Tổng số nhiệm vụ đang thực hiện: ${activeTasks.length}
🔹 Nhiệm vụ sắp đến hạn (≤3 ngày): ${nearDeadlineTasks.length}

${nearDeadlineTasks.length > 0 ? `⚠️ CẦN ƯU TIÊN:
${nearDeadlineTasks.map(t => {
  if (!t) return '';
  const deadline = new Date(t.deadline);
  const now = new Date();
  const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return `  • ${t.title} - Tiến độ: ${t.progress}% - Còn ${daysUntil} ngày`;
}).join('\n')}` : '✅ Không có nhiệm vụ sắp đến hạn'}`;

    return summary;
  } catch (error) {
    console.error("Daily summary error:", error);
    return "Không thể tạo tổng hợp";
  }
}

export interface DashboardSuggestion {
  id: string;
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  content: string;
  actionable: boolean;
  details?: string;
}

export async function generateDashboardSuggestions(
  userId: string,
  role: string,
  dismissedTypes: string[] = []
): Promise<DashboardSuggestion[]> {
  try {
    const suggestions: DashboardSuggestion[] = [];
    const user = await storage.getUser(userId);
    if (!user) return suggestions;

    const assignments = await storage.getUserTaskAssignments(userId);
    const tasks = await Promise.all(
      assignments.map(a => storage.getTask(a.taskId))
    );
    const activeTasks = tasks.filter(t => t && t.status !== "Hoàn thành");

    const now = new Date();
    const nearDeadlineTasks = activeTasks.filter(t => {
      if (!t) return false;
      const deadline = new Date(t.deadline);
      const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 3 && daysUntil >= 0;
    });

    const overdueTask = activeTasks.filter(t => {
      if (!t) return false;
      const deadline = new Date(t.deadline);
      return deadline < now;
    });

    if (role === "Chuyên viên" || role === "Phó trưởng phòng") {
      // Analyze user's assignment roles
      const leadTasks = assignments.filter(a => a.role === "Chủ trì").length;
      const supportTasks = assignments.filter(a => a.role === "Phối hợp").length;
      
      if (!dismissedTypes.includes("deadline_warning") && nearDeadlineTasks.length > 0) {
        const urgentTask = nearDeadlineTasks[0];
        const daysLeft = Math.floor(((new Date(urgentTask!.deadline)).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const userAssignment = assignments.find(a => a.taskId === urgentTask!.id);
        const roleLabel = userAssignment?.role === "Chủ trì" ? "(Chủ trì)" : "(Phối hợp)";
        
        suggestions.push({
          id: "deadline_warning",
          type: "deadline_warning",
          priority: "high",
          title: `"${urgentTask!.title}" ${roleLabel} còn ${daysLeft} ngày`,
          content: `Nhiệm vụ "${urgentTask!.title}" bạn đang ${userAssignment?.role} sẽ đến hạn trong ${daysLeft} ngày. Tiến độ hiện tại: ${urgentTask!.progress}%. ${nearDeadlineTasks.length > 1 ? `Còn ${nearDeadlineTasks.length - 1} nhiệm vụ khác cũng sắp đến hạn.` : ''}`,
          actionable: true,
          details: nearDeadlineTasks.map(t => {
            const userA = assignments.find(a => a.taskId === t!.id);
            return `• ${t!.title} [${userA?.role}] - ${t!.progress}% (Còn ${Math.floor(((new Date(t!.deadline)).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} ngày)`;
          }).join('\n'),
        });
      }

      if (!dismissedTypes.includes("overdue_alert") && overdueTask.length > 0) {
        const mostOverdueTask = overdueTask.sort((a, b) => 
          new Date(a!.deadline).getTime() - new Date(b!.deadline).getTime()
        )[0];
        const daysOverdue = Math.abs(Math.floor(((new Date(mostOverdueTask!.deadline)).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const userAssignment = assignments.find(a => a.taskId === mostOverdueTask!.id);
        
        suggestions.push({
          id: "overdue_alert",
          type: "overdue_alert",
          priority: "high",
          title: `"${mostOverdueTask!.title}" quá hạn ${daysOverdue} ngày`,
          content: `Nhiệm vụ "${mostOverdueTask!.title}" (${userAssignment?.role}) đã quá hạn ${daysOverdue} ngày. ${mostOverdueTask!.priority === "Khẩn cấp" ? "Đây là nhiệm vụ KHẨN CẤP - cần xử lý ngay!" : "Hãy cập nhật tiến độ và báo cáo trưởng phòng."} ${overdueTask.length > 1 ? `Bạn còn ${overdueTask.length - 1} nhiệm vụ quá hạn khác.` : ''}`,
          actionable: true,
          details: overdueTask.map(t => {
            const userA = assignments.find(a => a.taskId === t!.id);
            return `• ${t!.title} [${userA?.role}] - ${t!.priority} (Quá hạn ${Math.abs(Math.floor(((new Date(t!.deadline)).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))} ngày)`;
          }).join('\n'),
        });
      }

      const lowProgressTasks = activeTasks.filter(t => {
        if (!t) return false;
        const deadline = new Date(t.deadline);
        const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return t.progress < 30 && daysUntil <= 5 && daysUntil > 0;
      });

      if (!dismissedTypes.includes("progress_slow") && lowProgressTasks.length > 0) {
        const criticalTask = lowProgressTasks.find(t => t!.priority === "Khẩn cấp") || lowProgressTasks[0];
        const userAssignment = assignments.find(a => a.taskId === criticalTask!.id);
        
        suggestions.push({
          id: "progress_slow",
          type: "progress_slow",
          priority: "medium",
          title: `"${criticalTask!.title}" tiến độ ${criticalTask!.progress}% - chậm`,
          content: `Nhiệm vụ "${criticalTask!.title}" (${userAssignment?.role}) chỉ đạt ${criticalTask!.progress}% tiến độ nhưng sắp đến hạn. ${userAssignment?.role === "Chủ trì" ? "Bạn là người chủ trì - cần đẩy nhanh tiến độ hoặc báo cáo khó khăn." : "Hãy phối hợp tích cực với người chủ trì."}`,
          actionable: true,
          details: lowProgressTasks.map(t => {
            const userA = assignments.find(a => a.taskId === t!.id);
            return `• ${t!.title} [${userA?.role}] - ${t!.progress}% - ${t!.priority}`;
          }).join('\n'),
        });
      }

      if (!dismissedTypes.includes("kpi_improvement") && leadTasks + supportTasks > 0) {
        const completedCount = tasks.filter(t => t && t.status === "Hoàn thành").length;
        const completionRate = Math.round((completedCount / (leadTasks + supportTasks)) * 100);
        
        suggestions.push({
          id: "kpi_improvement",
          type: "kpi_improvement",
          priority: "low",
          title: `${user.fullName}: ${leadTasks} nhiệm vụ Chủ trì, ${supportTasks} Phối hợp`,
          content: `Bạn đang có ${leadTasks} nhiệm vụ Chủ trì (KPI x1.0) và ${supportTasks} nhiệm vụ Phối hợp (KPI x0.3). Tỷ lệ hoàn thành: ${completionRate}%. Mẹo: Ưu tiên nhiệm vụ Chủ trì + Khẩn cấp để tối đa hóa KPI.`,
          actionable: false,
        });
      }
    }

    if (role === "Trưởng phòng") {
      const deptTasks = await storage.getTasks({ departmentId: user.departmentId! });
      const deptActiveTasks = deptTasks.filter(t => t.status !== "Hoàn thành");
      const deptOverdue = deptTasks.filter(t => {
        const deadline = new Date(t.deadline);
        return deadline < now && t.status !== "Hoàn thành";
      });

      if (!dismissedTypes.includes("dept_overdue") && deptOverdue.length > 0) {
        const urgentOverdue = deptOverdue.find(t => t.priority === "Khẩn cấp");
        const targetTask = urgentOverdue || deptOverdue[0];
        const daysOverdue = Math.abs(Math.floor(((new Date(targetTask.deadline)).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        
        // Get assignees for this task
        const taskAssignments = await storage.getTaskAssignments(targetTask.id);
        const assigneeNames = await Promise.all(
          taskAssignments.map(async (a) => {
            const u = await storage.getUser(a.userId);
            return u ? `${u.fullName} (${a.role})` : 'Unknown';
          })
        );
        
        suggestions.push({
          id: "dept_overdue",
          type: "dept_overdue",
          priority: "high",
          title: `"${targetTask.title}" quá hạn ${daysOverdue} ngày`,
          content: `Nhiệm vụ "${targetTask.title}" ${targetTask.priority === "Khẩn cấp" ? "(KHẨN CẤP) " : ""}đã quá hạn ${daysOverdue} ngày. Người thực hiện: ${assigneeNames.join(", ")}. ${deptOverdue.length > 1 ? `Phòng còn ${deptOverdue.length - 1} nhiệm vụ quá hạn khác.` : ''} Hãy họp với team để xử lý.`,
          actionable: true,
          details: deptOverdue.slice(0, 5).map(t => `• ${t.title} - ${t.priority} (Quá hạn ${Math.abs(Math.floor(((new Date(t.deadline)).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))} ngày)`).join('\n'),
        });
      }

      const completionRate = deptTasks.length > 0 
        ? Math.round((deptTasks.filter(t => t.status === "Hoàn thành").length / deptTasks.length) * 100)
        : 0;

      if (!dismissedTypes.includes("dept_performance") && completionRate < 70 && deptTasks.length > 0) {
        const completedCount = deptTasks.filter(t => t.status === "Hoàn thành").length;
        const inProgressCount = deptTasks.filter(t => t.status === "Đang thực hiện").length;
        const dept = user.departmentId ? await storage.getDepartment(user.departmentId) : null;
        
        suggestions.push({
          id: "dept_performance",
          type: "dept_performance",
          priority: "medium",
          title: `Phòng ${dept?.name || 'của bạn'}: ${completionRate}% hoàn thành`,
          content: `Hiệu suất phòng đang ở mức ${completionRate}% (${completedCount}/${deptTasks.length} nhiệm vụ). Có ${inProgressCount} nhiệm vụ đang thực hiện, ${deptOverdue.length} quá hạn. Đề xuất: Họp team để tái phân công workload và hỗ trợ những người đang quá tải.`,
          actionable: true,
        });
      }
    }

    if (role === "Phó Giám đốc") {
      // Deputy Directors: Focus on directive/supervisory tasks
      const directiveTasks = activeTasks.filter(t => {
        const assignment = assignments.find(a => a.taskId === t?.id);
        return assignment && assignment.role === "Chỉ đạo";
      });
      
      const directiveOverdue = directiveTasks.filter(t => {
        if (!t) return false;
        const deadline = new Date(t.deadline);
        return deadline < now;
      });
      
      const directiveNearDeadline = directiveTasks.filter(t => {
        if (!t) return false;
        const deadline = new Date(t.deadline);
        const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 3 && daysUntil >= 0;
      });

      if (!dismissedTypes.includes("directive_overdue") && directiveOverdue.length > 0) {
        const urgentTask = directiveOverdue.find(t => t!.priority === "Khẩn cấp") || directiveOverdue[0];
        const daysOverdue = Math.abs(Math.floor(((new Date(urgentTask!.deadline)).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        
        suggestions.push({
          id: "directive_overdue",
          type: "directive_overdue",
          priority: "high",
          title: `Nhiệm vụ Chỉ đạo quá hạn: "${urgentTask!.title}"`,
          content: `Nhiệm vụ "${urgentTask!.title}" bạn đang Chỉ đạo đã quá hạn ${daysOverdue} ngày. ${urgentTask!.priority === "Khẩn cấp" ? "Đây là nhiệm vụ KHẨN CẤP - " : ""}Tiến độ hiện tại: ${urgentTask!.progress}%. ${directiveOverdue.length > 1 ? `Bạn còn ${directiveOverdue.length - 1} nhiệm vụ Chỉ đạo quá hạn khác.` : ''} Đề xuất: Họp với người thực hiện để đôn đốc.`,
          actionable: true,
          details: directiveOverdue.map(t => `• ${t!.title} - ${t!.priority} - ${t!.progress}% (Quá hạn ${Math.abs(Math.floor(((new Date(t!.deadline)).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))} ngày)`).join('\n'),
        });
      }

      if (!dismissedTypes.includes("directive_supervision") && directiveTasks.length > 0) {
        const lowProgressTasks = directiveTasks.filter(t => t && t.progress < 50);
        const completedDirective = tasks.filter(t => {
          const assignment = assignments.find(a => a.taskId === t?.id);
          return t && t.status === "Hoàn thành" && assignment && assignment.role === "Chỉ đạo";
        }).length;
        
        suggestions.push({
          id: "directive_supervision",
          type: "directive_supervision",
          priority: "medium",
          title: `Giám sát: ${directiveTasks.length} nhiệm vụ Chỉ đạo (${completedDirective} hoàn thành)`,
          content: `Bạn đang Chỉ đạo ${directiveTasks.length} nhiệm vụ, đã hoàn thành ${completedDirective}. ${lowProgressTasks.length > 0 ? `Có ${lowProgressTasks.length} nhiệm vụ tiến độ < 50% cần theo dõi sát.` : 'Các nhiệm vụ đang tiến triển tốt.'} ${directiveNearDeadline.length > 0 ? `⚠️ ${directiveNearDeadline.length} nhiệm vụ sắp đến hạn trong 3 ngày.` : ''}`,
          actionable: lowProgressTasks.length > 0,
          details: lowProgressTasks.length > 0
            ? lowProgressTasks.slice(0, 5).map(t => `• ${t!.title} - ${t!.progress}% - ${t!.priority}`).join('\n')
            : 'Tất cả nhiệm vụ đang tiến triển theo kế hoạch.',
        });
      }
    }

    if (role === "Giám đốc") {
      // Directors: Organizational-level strategic insights
      const allTasks = await storage.getTasks({});
      const allActiveTasks = allTasks.filter(t => t.status !== "Hoàn thành");
      const allOverdue = allTasks.filter(t => {
        const deadline = new Date(t.deadline);
        return deadline < now && t.status !== "Hoàn thành";
      });

      if (!dismissedTypes.includes("org_overdue") && allOverdue.length > 0) {
        // Group overdue tasks by department
        const overdueByDept: Record<string, number> = {};
        for (const task of allOverdue) {
          if (task.departmentId) {
            const dept = await storage.getDepartment(task.departmentId);
            const deptName = dept?.name || 'Không rõ';
            overdueByDept[deptName] = (overdueByDept[deptName] || 0) + 1;
          } else {
            overdueByDept['Không phòng ban'] = (overdueByDept['Không phòng ban'] || 0) + 1;
          }
        }
        
        const deptSummary = Object.entries(overdueByDept)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([dept, count]) => `${dept}: ${count}`)
          .join(', ');
        
        const urgentOverdue = allOverdue.filter(t => t.priority === "Khẩn cấp").length;
        
        suggestions.push({
          id: "org_overdue",
          type: "org_overdue",
          priority: "high",
          title: `Toàn cơ quan: ${allOverdue.length} nhiệm vụ quá hạn (${urgentOverdue} khẩn cấp)`,
          content: `Cả cơ quan có ${allOverdue.length} nhiệm vụ quá hạn, trong đó ${urgentOverdue} nhiệm vụ KHẨN CẤP. Top đơn vị: ${deptSummary}. Đề xuất chiến lược: Họp khẩn với trưởng phòng các đơn vị trọng điểm để xử lý và tái cấu trúc quy trình.`,
          actionable: true,
          details: allOverdue.slice(0, 10).map(t => `• ${t.title} - ${t.priority} (Quá hạn ${Math.abs(Math.floor(((new Date(t.deadline)).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))} ngày)`).join('\n'),
        });
      }

      const orgCompletionRate = allTasks.length > 0
        ? Math.round((allTasks.filter(t => t.status === "Hoàn thành").length / allTasks.length) * 100)
        : 0;

      if (!dismissedTypes.includes("org_progress") && allTasks.length > 0) {
        const completedCount = allTasks.filter(t => t.status === "Hoàn thành").length;
        const urgentCount = allActiveTasks.filter(t => t.priority === "Khẩn cấp").length;
        const importantCount = allActiveTasks.filter(t => t.priority === "Quan trọng").length;
        
        suggestions.push({
          id: "org_progress",
          type: "org_progress",
          priority: "medium",
          title: `Hiệu suất tổ chức: ${orgCompletionRate}% (${completedCount}/${allTasks.length})`,
          content: `Toàn cơ quan đạt ${orgCompletionRate}% tỷ lệ hoàn thành với ${allActiveTasks.length} nhiệm vụ đang triển khai. Ưu tiên: ${urgentCount} Khẩn cấp, ${importantCount} Quan trọng. ${allOverdue.length > 0 ? `⚠️ Có ${allOverdue.length} nhiệm vụ quá hạn cần can thiệp lãnh đạo.` : '✓ Xuất sắc! Không có nhiệm vụ quá hạn.'} Xu hướng KPI: ${orgCompletionRate >= 80 ? 'Tích cực ↗' : orgCompletionRate >= 60 ? 'Ổn định →' : 'Cần cải thiện ↘'}`,
          actionable: false,
          details: `Tổng: ${allTasks.length}\nHoàn thành: ${completedCount}\nĐang thực hiện: ${allActiveTasks.length}\nQuá hạn: ${allOverdue.length}\nKhẩn cấp: ${urgentCount}\nQuan trọng: ${importantCount}`,
        });
      }
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  } catch (error) {
    console.error("Dashboard suggestions error:", error);
    return [];
  }
}

export interface TaskReportInsights {
  summary: string;
  trends: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export async function generateTaskReportInsights(stats: {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  overdueTasks: number;
  completionRate: number;
  avgCompletionDays: number;
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
}): Promise<TaskReportInsights> {
  try {
    const prompt = `Bạn là chuyên gia phân tích quản lý công việc. Hãy phân tích báo cáo nhiệm vụ sau và đưa ra những thông tin hữu ích:

THỐNG KÊ:
- Tổng số nhiệm vụ: ${stats.totalTasks}
- Hoàn thành: ${stats.completedTasks} (${stats.completionRate.toFixed(1)}%)
- Đang thực hiện: ${stats.inProgressTasks}
- Chưa bắt đầu: ${stats.notStartedTasks}
- Quá hạn: ${stats.overdueTasks}
- Thời gian hoàn thành trung bình: ${stats.avgCompletionDays} ngày

PHÂN BỐ THEO TRẠNG THÁI:
${stats.tasksByStatus.map(s => `- ${s.status}: ${s.count}`).join('\n')}

PHÂN BỐ THEO ĐỘ ƯU TIÊN:
${stats.tasksByPriority.map(p => `- ${p.priority}: ${p.count}`).join('\n')}

Hãy phân tích và đưa ra:
1. summary: Tóm tắt ngắn gọn tình hình thực hiện (1-2 câu)
2. trends: Các xu hướng quan trọng (2-3 điểm)
3. strengths: Điểm mạnh (2-3 điểm)
4. weaknesses: Điểm yếu cần cải thiện (2-3 điểm)
5. recommendations: Đề xuất hành động cụ thể (3-4 điểm)

Trả về JSON format:
{
  "summary": "<tóm tắt>",
  "trends": ["<xu hướng 1>", "<xu hướng 2>"],
  "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>"],
  "weaknesses": ["<điểm yếu 1>", "<điểm yếu 2>"],
  "recommendations": ["<đề xuất 1>", "<đề xuất 2>", "<đề xuất 3>"]
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    
    return {
      summary: result.summary || "Không thể tạo tóm tắt",
      trends: result.trends || [],
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error("Generate task report insights error:", error);
    return {
      summary: "Không thể tạo phân tích AI",
      trends: [],
      strengths: [],
      weaknesses: [],
      recommendations: [],
    };
  }
}

export interface DuplicateTaskMatch {
  taskId: string;
  taskNumber: string;
  title: string;
  similarity: number;
  reason: string;
}

export async function detectDuplicateTasks(
  newTaskTitle: string,
  newTaskDescription: string | null,
  existingTasks: Task[]
): Promise<DuplicateTaskMatch[]> {
  try {
    if (existingTasks.length === 0) {
      return [];
    }

    const tasksInfo = existingTasks.map((t, i) => 
      `${i + 1}. [${t.taskNumber}] ${t.title}${t.description ? `\n   Mô tả: ${t.description}` : ""}`
    ).join('\n');

    const prompt = `Bạn là chuyên gia phân tích nhiệm vụ công việc. Hãy so sánh nhiệm vụ mới với danh sách nhiệm vụ hiện có để phát hiện trùng lắp hoặc tương tự.

NHIỆM VỤ MỚI:
Tiêu đề: ${newTaskTitle}
Mô tả: ${newTaskDescription || "Không có"}

DANH SÁCH NHIỆM VỤ HIỆN CÓ:
${tasksInfo}

Hãy xác định các nhiệm vụ tương tự với nhiệm vụ mới. Chỉ báo cáo những nhiệm vụ có độ tương đồng >= 60%.

Đánh giá dựa trên:
- Nội dung công việc
- Mục tiêu
- Phạm vi thực hiện
- Bối cảnh

Trả về JSON array các nhiệm vụ trùng lắp (rỗng nếu không có):
{
  "duplicates": [
    {
      "taskIndex": <index trong danh sách, bắt đầu từ 1>,
      "similarity": <số từ 0-100>,
      "reason": "<lý do ngắn gọn tại sao giống nhau>"
    }
  ]
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    const duplicates: DuplicateTaskMatch[] = [];

    if (result.duplicates && Array.isArray(result.duplicates)) {
      for (const dup of result.duplicates) {
        const taskIndex = dup.taskIndex - 1;
        if (taskIndex >= 0 && taskIndex < existingTasks.length) {
          const task = existingTasks[taskIndex];
          if (dup.similarity >= 60) {
            duplicates.push({
              taskId: task.id,
              taskNumber: task.taskNumber || "",
              title: task.title,
              similarity: dup.similarity / 100,
              reason: dup.reason || "Nội dung tương tự",
            });
          }
        }
      }
    }

    return duplicates;
  } catch (error) {
    console.error("Detect duplicate tasks error:", error);
    return [];
  }
}
