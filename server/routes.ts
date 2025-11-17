import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { authenticateUser, hashPassword } from "./auth";
import { requireAuth } from "./middleware/auth";
import { insertUserSchema } from "@shared/schema";
import * as schema from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { calculateUserKPI, calculateAllUsersKPI, calculateFilteredUsersKPI, preloadTaskActivity, hasActivityInPeriod } from "./kpi";
import { calculateCompletionScore, calculateMaxLeadershipScore, canUserEvaluateAssignment, getEvaluatorForAssignment } from "./evaluation";
import { sanitizeUser, sanitizeUsers } from "./utils";
import * as aiService from "./ai-service";
import { upload, getFilePath, deleteFile } from "./file-upload";
import { calculateTaskReportStats, type TaskReportFilters } from "./task-reports";
import { sendTestNotification, notifyNewTask, notifyNewComment, notifyDeadlineSoon, notifyTaskOverdue } from "./telegram-service";
import fs from "fs";

// Helper function to get role priority for sorting
// Lower number = higher priority (appears first in list)
function getRoleOrder(role: string): number {
  const roleOrder: { [key: string]: number } = {
    "Giám đốc": 1,
    "Phó Giám đốc": 2,
    "Trưởng phòng": 3,
    "Phó trưởng phòng": 4,
    "Chuyên viên": 5,
  };
  return roleOrder[role] || 999;
}

// Helper function to sort users by role hierarchy
// Directors appear first, then Deputy Directors, Department Heads, Deputy Heads, and Staff
function sortUsersByRole<T extends { role: string; fullName: string }>(users: T[]): T[] {
  return [...users].sort((a, b) => {
    const roleOrderDiff = getRoleOrder(a.role) - getRoleOrder(b.role);
    if (roleOrderDiff !== 0) return roleOrderDiff;
    // If same role, sort alphabetically by full name
    return a.fullName.localeCompare(b.fullName, 'vi');
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
      }
      
      const hashedPassword = await hashPassword(validatedData.password);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      req.session.userId = user.id;
      
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      res.json({ user: sanitizeUser(req.user) });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin" });
      }
      
      const user = await authenticateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" });
      }
      
      req.session.userId = user.id;
      
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Lỗi hệ thống" });
      }
      res.json({ message: "Đã đăng xuất" });
    });
  });

  // Profile & Telegram endpoints
  app.put("/api/profile/telegram", requireAuth, async (req, res) => {
    try {
      const validationSchema = z.object({
        telegramId: z.string().optional().default(""),
        groupTelegramChatId: z.string().optional().default(""),
        notifyOnNewTask: z.boolean().default(true),
        notifyOnDeadline: z.boolean().default(true),
        notifyOnComment: z.boolean().default(true),
        notifyOnScheduledAISuggestions: z.boolean().default(false),
        notifyOnScheduledAIAlerts: z.boolean().default(false),
        notifyOnScheduledWeeklyKPI: z.boolean().default(false),
        notifyOnScheduledMonthlyKPI: z.boolean().default(false),
      });

      const validated = validationSchema.parse(req.body);
      
      await storage.updateUserTelegramSettings(
        req.session.userId!,
        validated.telegramId?.trim() || null,
        validated.groupTelegramChatId?.trim() || null,
        validated.notifyOnNewTask,
        validated.notifyOnDeadline,
        validated.notifyOnComment,
        validated.notifyOnScheduledAISuggestions,
        validated.notifyOnScheduledAIAlerts,
        validated.notifyOnScheduledWeeklyKPI,
        validated.notifyOnScheduledMonthlyKPI
      );

      res.json({ message: "Cập nhật thành công" });
    } catch (error: any) {
      console.error("Update telegram settings error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/telegram/test", requireAuth, async (req, res) => {
    try {
      const { chatId } = req.body;
      
      if (!chatId || typeof chatId !== "string") {
        return res.status(400).json({ error: "Chat ID không hợp lệ" });
      }

      const success = await sendTestNotification(chatId.trim());
      
      if (success) {
        res.json({ message: "Đã gửi tin nhắn thử!" });
      } else {
        res.status(500).json({ error: "Không thể gửi tin nhắn. Kiểm tra lại Chat ID" });
      }
    } catch (error: any) {
      console.error("Send test telegram error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Check and send deadline notifications (can be called via cron or manually)
  app.post("/api/telegram/check-deadlines", requireAuth, async (req, res) => {
    try {
      // Only admins can trigger this
      if (!req.user || !["Giám đốc", "Phó Giám đốc"].includes(req.user.role)) {
        return res.status(403).json({ error: "Không có quyền thực hiện" });
      }

      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      // Get all incomplete tasks
      const tasks = await storage.getTasks({ 
        status: undefined,  // Get all statuses
        includeDeleted: false 
      });
      
      let notificationsSent = 0;
      let overdueSent = 0;
      
      for (const task of tasks) {
        const deadline = new Date(task.deadline);
        const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Skip completed tasks
        if (task.status === "Hoàn thành") continue;
        
        // Only notify at specific milestones to prevent spam
        // Notifications sent ONLY when deadline is exactly 3, 2, 1, or 0 days away
        const shouldNotify = daysUntilDeadline === 3 || daysUntilDeadline === 2 || daysUntilDeadline === 1 || daysUntilDeadline === 0;
        const isOverdue = deadline < now && task.status !== "Quá hạn";
        
        if (!shouldNotify && !isOverdue) continue;
        
        // Get task assignees
        const assignments = await storage.getTaskAssignments(task.id);
        
        for (const assignment of assignments) {
          const assignee = await storage.getUser(assignment.userId);
          if (!assignee) continue;
          
          // Skip if user has opted out of deadline notifications
          if (!assignee.notifyOnDeadline) continue;
          
          // Determine milestone for tracking
          const milestone = isOverdue ? "overdue" : `${daysUntilDeadline}d`;
          
          // Check if already sent this milestone notification
          const alreadySent = await db
            .select()
            .from(schema.telegramDeadlineNotifications)
            .where(sql`task_id = ${task.id} AND user_id = ${assignee.id} AND milestone = ${milestone}`)
            .limit(1);
          
          if (alreadySent.length > 0) {
            continue; // Already sent this notification
          }
          
          // Send overdue notifications (only on the day it becomes overdue)
          if (isOverdue) {
            try {
              await notifyTaskOverdue(task, assignee);
              // Only record if send was successful
              await db.insert(schema.telegramDeadlineNotifications).values({
                taskId: task.id,
                userId: assignee.id,
                milestone: "overdue",
              });
              overdueSent++;
            } catch (error) {
              console.error(`Failed to send overdue notification for task ${task.id} to user ${assignee.id}:`, error);
            }
          }
          // Send deadline soon notifications at specific milestones
          else if (shouldNotify) {
            try {
              await notifyDeadlineSoon(task, assignee, daysUntilDeadline);
              // Only record if send was successful
              await db.insert(schema.telegramDeadlineNotifications).values({
                taskId: task.id,
                userId: assignee.id,
                milestone: `${daysUntilDeadline}d`,
              });
              notificationsSent++;
            } catch (error) {
              console.error(`Failed to send deadline notification for task ${task.id} to user ${assignee.id}:`, error);
            }
          }
        }
      }
      
      res.json({ 
        message: "Đã kiểm tra deadlines", 
        deadlineSoonNotifications: notificationsSent,
        overdueNotifications: overdueSent
      });
    } catch (error: any) {
      console.error("Check deadlines error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Scheduled Group Notifications
  app.post("/api/telegram/scheduled/ai-suggestions", requireAuth, async (req, res) => {
    try {
      // Only admins can trigger this
      if (!req.user || !["Giám đốc", "Phó Giám đốc"].includes(req.user.role)) {
        return res.status(403).json({ error: "Không có quyền thực hiện" });
      }

      let sentToGroups = 0;
      let sentToIndividuals = 0;

      // Send to department groups
      const deptHeads = await storage.getUsers({ role: "Trưởng phòng" });
      const headsWithGroups = deptHeads.filter(h => h.groupTelegramChatId);

      for (const head of headsWithGroups) {
        const suggestions = await aiService.generateDashboardSuggestions(head.id, head.role);
        
        if (suggestions.length > 0 && head.groupTelegramChatId) {
          const { sendAISuggestionsToGroup } = await import("./telegram-service");
          const success = await sendAISuggestionsToGroup(head.groupTelegramChatId, suggestions);
          if (success) sentToGroups++;
        }
      }

      // Send to opted-in individuals
      const allUsers = await storage.getUsers({});
      const optedInUsers = allUsers.filter(u => u.notifyOnScheduledAISuggestions && u.telegramId);

      for (const user of optedInUsers) {
        const suggestions = await aiService.generateDashboardSuggestions(user.id, user.role);
        
        if (suggestions.length > 0) {
          const { sendAISuggestionsToGroup } = await import("./telegram-service");
          const success = await sendAISuggestionsToGroup(user.telegramId!, suggestions);
          if (success) sentToIndividuals++;
        }
      }

      res.json({ 
        message: `Đã gửi AI suggestions: ${sentToGroups} nhóm, ${sentToIndividuals} cá nhân`,
        sentToGroups,
        sentToIndividuals
      });
    } catch (error: any) {
      console.error("Send AI suggestions error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/telegram/scheduled/ai-alerts", requireAuth, async (req, res) => {
    try {
      // Only admins can trigger this
      if (!req.user || !["Giám đốc", "Phó Giám đốc"].includes(req.user.role)) {
        return res.status(403).json({ error: "Không có quyền thực hiện" });
      }

      let sentToGroups = 0;
      let sentToIndividuals = 0;

      // Send to department groups
      const deptHeads = await storage.getUsers({ role: "Trưởng phòng" });
      const headsWithGroups = deptHeads.filter(h => h.groupTelegramChatId);

      for (const head of headsWithGroups) {
        const tasks = await storage.getTasks({ 
          departmentId: head.departmentId || undefined,
          includeDeleted: false 
        });
        
        const alerts = [];
        for (const task of tasks) {
          const progressUpdates = await storage.getProgressUpdates(task.id);
          const riskAlerts = await aiService.detectTaskRisks(task, progressUpdates);
          for (const risk of riskAlerts) {
            alerts.push({
              taskTitle: task.title,
              severity: risk.severity,
              riskDescription: risk.reason
            });
          }
        }
        
        if (alerts.length > 0 && head.groupTelegramChatId) {
          const { sendAIAlertsToGroup } = await import("./telegram-service");
          const success = await sendAIAlertsToGroup(head.groupTelegramChatId, alerts);
          if (success) sentToGroups++;
        }
      }

      // Send to opted-in individuals
      const allUsers = await storage.getUsers({});
      const optedInUsers = allUsers.filter(u => u.notifyOnScheduledAIAlerts && u.telegramId);

      for (const user of optedInUsers) {
        const tasks = await storage.getTasks({ 
          userId: user.id,
          includeDeleted: false 
        });
        
        const alerts = [];
        for (const task of tasks) {
          const progressUpdates = await storage.getProgressUpdates(task.id);
          const riskAlerts = await aiService.detectTaskRisks(task, progressUpdates);
          for (const risk of riskAlerts) {
            alerts.push({
              taskTitle: task.title,
              severity: risk.severity,
              riskDescription: risk.reason
            });
          }
        }
        
        if (alerts.length > 0) {
          const { sendAIAlertsToGroup } = await import("./telegram-service");
          const success = await sendAIAlertsToGroup(user.telegramId!, alerts);
          if (success) sentToIndividuals++;
        }
      }

      res.json({ 
        message: `Đã gửi AI alerts: ${sentToGroups} nhóm, ${sentToIndividuals} cá nhân`,
        sentToGroups,
        sentToIndividuals
      });
    } catch (error: any) {
      console.error("Send AI alerts error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/telegram/scheduled/weekly-kpi", requireAuth, async (req, res) => {
    try {
      // Only admins can trigger this
      if (!req.user || !["Giám đốc", "Phó Giám đốc"].includes(req.user.role)) {
        return res.status(403).json({ error: "Không có quyền thực hiện" });
      }

      let sentToGroups = 0;
      let sentToIndividuals = 0;

      // Send to department groups
      const departments = await storage.getDepartments();
      const deptHeads = await storage.getUsers({ role: "Trưởng phòng" });

      for (const dept of departments) {
        const head = deptHeads.find(h => h.departmentId === dept.id && h.groupTelegramChatId);
        if (!head || !head.groupTelegramChatId) continue;

        const deptUsers = await storage.getUsers({ departmentId: dept.id });
        let totalKPI = 0;
        let count = 0;
        const performersWithScores = [];

        for (const user of deptUsers) {
          const now = new Date();
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - 7);
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(now);
          weekEnd.setHours(23, 59, 59, 999);
          
          const kpiData = await calculateUserKPI(user.id, weekStart, weekEnd);
          if (kpiData && kpiData.totalScore > 0) {
            totalKPI += kpiData.totalScore;
            count++;
            performersWithScores.push({ fullName: user.fullName, score: kpiData.totalScore });
          }
        }

        const weeklyKPI = count > 0 ? totalKPI / count : 0;
        performersWithScores.sort((a, b) => b.score - a.score);

        const { sendWeeklyKPIToGroup } = await import("./telegram-service");
        const success = await sendWeeklyKPIToGroup(
          head.groupTelegramChatId,
          dept.name,
          weeklyKPI,
          performersWithScores
        );
        if (success) sentToGroups++;
      }

      // Send to opted-in individuals
      const allUsers = await storage.getUsers({});
      const optedInUsers = allUsers.filter(u => u.notifyOnScheduledWeeklyKPI && u.telegramId);

      for (const user of optedInUsers) {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(now);
        weekEnd.setHours(23, 59, 59, 999);
        
        const kpiData = await calculateUserKPI(user.id, weekStart, weekEnd);
        if (kpiData && kpiData.totalScore > 0) {
          const { sendWeeklyKPIToGroup } = await import("./telegram-service");
          const deptName = user.departmentId ? 
            (await storage.getDepartment(user.departmentId))?.name || "Phòng ban" : 
            "Cá nhân";
          const success = await sendWeeklyKPIToGroup(
            user.telegramId!,
            deptName,
            kpiData.totalScore,
            [{ fullName: user.fullName, score: kpiData.totalScore }]
          );
          if (success) sentToIndividuals++;
        }
      }

      res.json({ 
        message: `Đã gửi KPI tuần: ${sentToGroups} nhóm, ${sentToIndividuals} cá nhân`,
        sentToGroups,
        sentToIndividuals
      });
    } catch (error: any) {
      console.error("Send weekly KPI error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/telegram/scheduled/monthly-kpi", requireAuth, async (req, res) => {
    try {
      // Only admins can trigger this
      if (!req.user || !["Giám đốc", "Phó Giám đốc"].includes(req.user.role)) {
        return res.status(403).json({ error: "Không có quyền thực hiện" });
      }

      let sentToGroups = 0;
      let sentToIndividuals = 0;

      // Send to department groups
      const departments = await storage.getDepartments();
      const deptHeads = await storage.getUsers({ role: "Trưởng phòng" });

      for (const dept of departments) {
        const head = deptHeads.find(h => h.departmentId === dept.id && h.groupTelegramChatId);
        if (!head || !head.groupTelegramChatId) continue;

        const tasks = await storage.getTasks({ 
          departmentId: dept.id,
          includeDeleted: false 
        });

        const summary = {
          completed: tasks.filter(t => t.status === "Hoàn thành").length,
          inProgress: tasks.filter(t => t.status === "Đang thực hiện").length,
          overdue: tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== "Hoàn thành").length
        };

        const deptUsers = await storage.getUsers({ departmentId: dept.id });
        let totalKPI = 0;
        let count = 0;

        for (const user of deptUsers) {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          
          const kpiData = await calculateUserKPI(user.id, monthStart, monthEnd);
          if (kpiData && kpiData.totalScore > 0) {
            totalKPI += kpiData.totalScore;
            count++;
          }
        }

        const monthlyKPI = count > 0 ? totalKPI / count : 0;

        const { sendMonthlyKPIToGroup } = await import("./telegram-service");
        const success = await sendMonthlyKPIToGroup(
          head.groupTelegramChatId,
          dept.name,
          monthlyKPI,
          summary
        );
        if (success) sentToGroups++;
      }

      // Send to opted-in individuals
      const allUsers = await storage.getUsers({});
      const optedInUsers = allUsers.filter(u => u.notifyOnScheduledMonthlyKPI && u.telegramId);

      for (const user of optedInUsers) {
        const tasks = await storage.getTasks({ 
          userId: user.id,
          includeDeleted: false 
        });

        const summary = {
          completed: tasks.filter(t => t.status === "Hoàn thành").length,
          inProgress: tasks.filter(t => t.status === "Đang thực hiện").length,
          overdue: tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== "Hoàn thành").length
        };

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        const kpiData = await calculateUserKPI(user.id, monthStart, monthEnd);
        if (kpiData && kpiData.totalScore > 0) {
          const { sendMonthlyKPIToGroup } = await import("./telegram-service");
          const deptName = user.departmentId ? 
            (await storage.getDepartment(user.departmentId))?.name || "Phòng ban" : 
            "Cá nhân";
          const success = await sendMonthlyKPIToGroup(
            user.telegramId!,
            deptName,
            kpiData.totalScore,
            summary
          );
          if (success) sentToIndividuals++;
        }
      }

      res.json({ 
        message: `Đã gửi KPI tháng: ${sentToGroups} nhóm, ${sentToIndividuals} cá nhân`,
        sentToGroups,
        sentToIndividuals
      });
    } catch (error: any) {
      console.error("Send monthly KPI error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });


  app.get("/api/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Get departments error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.put("/api/departments/:departmentId/deputy-director", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "Giám đốc") {
        return res.status(403).json({ error: "Chỉ Giám đốc mới có quyền gán Phó Giám đốc phụ trách" });
      }

      const { deputyDirectorId } = req.body;
      
      if (deputyDirectorId) {
        const deputy = await storage.getUser(deputyDirectorId);
        if (!deputy || deputy.role !== "Phó Giám đốc") {
          return res.status(400).json({ error: "Người được chọn phải là Phó Giám đốc" });
        }
      }

      const updated = await storage.updateDepartmentDeputyDirector(
        req.params.departmentId, 
        deputyDirectorId || null
      );
      
      res.json(updated);
    } catch (error) {
      console.error("Update department deputy director error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Department Management - Admin only (Giám đốc + Phó GĐ)
  app.post("/api/departments", requireAuth, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== "Giám đốc" && req.user.role !== "Phó Giám đốc")) {
        return res.status(403).json({ error: "Chỉ Giám đốc và Phó Giám đốc mới có quyền tạo phòng ban" });
      }

      const validatedData = schema.insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      res.json(department);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Create department error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.put("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== "Giám đốc" && req.user.role !== "Phó Giám đốc")) {
        return res.status(403).json({ error: "Chỉ Giám đốc và Phó Giám đốc mới có quyền cập nhật phòng ban" });
      }

      const validatedData = schema.insertDepartmentSchema.partial().parse(req.body);
      const updated = await storage.updateDepartment(req.params.id, validatedData);
      
      if (!updated) {
        return res.status(404).json({ error: "Không tìm thấy phòng ban" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Update department error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.delete("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== "Giám đốc" && req.user.role !== "Phó Giám đốc")) {
        return res.status(403).json({ error: "Chỉ Giám đốc và Phó Giám đốc mới có quyền xóa phòng ban" });
      }

      const deleted = await storage.deleteDepartment(req.params.id, req.user.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Không tìm thấy phòng ban" });
      }
      
      res.json({ message: "Đã xóa phòng ban thành công", department: deleted });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Không thể xóa")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Delete department error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // User Management - Admin only (Giám đốc + Phó GĐ)
  app.post("/api/users", requireAuth, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== "Giám đốc" && req.user.role !== "Phó Giám đốc")) {
        return res.status(403).json({ error: "Chỉ Giám đốc và Phó Giám đốc mới có quyền tạo cán bộ" });
      }

      const validatedData = insertUserSchema.parse(req.body);
      
      // Check username uniqueness (including soft-deleted users)
      const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.username, validatedData.username));
      if (existingUser) {
        if (existingUser.isDeleted) {
          return res.status(400).json({ error: "Tên đăng nhập đã tồn tại (cán bộ đã xóa). Vui lòng chọn tên khác hoặc khôi phục cán bộ cũ." });
        }
        return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Create user error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== "Giám đốc" && req.user.role !== "Phó Giám đốc")) {
        return res.status(403).json({ error: "Chỉ Giám đốc và Phó Giám đốc mới có quyền cập nhật cán bộ" });
      }

      const validatedData = insertUserSchema.partial().parse(req.body);
      
      // Check username uniqueness if username is being changed
      if (validatedData.username) {
        const [existingUser] = await db.select().from(schema.users).where(eq(schema.users.username, validatedData.username));
        if (existingUser && existingUser.id !== req.params.id) {
          if (existingUser.isDeleted) {
            return res.status(400).json({ error: "Tên đăng nhập đã tồn tại (cán bộ đã xóa). Vui lòng chọn tên khác." });
          }
          return res.status(400).json({ error: "Tên đăng nhập đã tồn tại" });
        }
      }
      
      // If password is being updated, hash it
      let updateData = { ...validatedData };
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }
      
      const updated = await storage.updateUser(req.params.id, updateData);
      
      if (!updated) {
        return res.status(404).json({ error: "Không tìm thấy cán bộ" });
      }
      
      res.json({ user: sanitizeUser(updated) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Update user error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== "Giám đốc" && req.user.role !== "Phó Giám đốc")) {
        return res.status(403).json({ error: "Chỉ Giám đốc và Phó Giám đốc mới có quyền xóa cán bộ" });
      }

      const deleted = await storage.deleteUser(req.params.id, req.user.id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Không tìm thấy cán bộ" });
      }
      
      res.json({ message: "Đã xóa cán bộ thành công", user: sanitizeUser(deleted) });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Không thể xóa")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { departmentId, role } = req.query;
      
      // SECURITY: Role-based access control for user listing
      const isDirector = req.user.role === "Giám đốc";
      const isDeputyDirector = req.user.role === "Phó Giám đốc";
      const isDeptHead = req.user.role === "Trưởng phòng";
      const isDeputyDeptHead = req.user.role === "Phó trưởng phòng";
      const isStaff = req.user.role === "Chuyên viên";
      
      const filters: any = {};
      
      // Leadership (Directors + Deputy Directors + Dept Heads) can list all users
      // This allows them to assign tasks across departments when creating tasks
      if (isDirector || isDeputyDirector || isDeptHead || isDeputyDeptHead) {
        if (departmentId) filters.departmentId = departmentId as string;
        // SECURITY: Validate role filter - only allow valid system roles
        if (role) {
          const validRoles = ["Giám đốc", "Phó Giám đốc", "Trưởng phòng", "Phó trưởng phòng", "Chuyên viên"];
          if (validRoles.includes(role as string)) {
            filters.role = role as string;
          }
        }
      }
      // Staff can list all users (to enable task creation across departments)
      // When departmentId is provided, they can only see their own department
      else if (isStaff) {
        if (departmentId) {
          if (departmentId !== req.user.departmentId) {
            return res.status(403).json({ error: "Bạn không có quyền xem danh sách người dùng của phòng ban khác" });
          }
          filters.departmentId = req.user.departmentId;
        }
        // When no departmentId: allow listing all users (for task assignment)
        // SECURITY: Reject role filter to prevent enumeration attacks
        if (role) {
          return res.status(403).json({ error: "Bạn không có quyền lọc theo vai trò" });
        }
      }
      
      const users = await storage.getUsers(filters);
      const sanitized = sanitizeUsers(users); // Returns Omit<UserWithDepartment, "password">[]
      const sorted = sortUsersByRole(sanitized); // Sort by role hierarchy
      res.json(sorted);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { departmentId, status, userId, year, month, assignmentRole, assignmentRoles, incompleteOnly } = req.query;
      
      // Role-based access control
      const isDirector = req.user.role === "Giám đốc";
      const isDeputyDirector = req.user.role === "Phó Giám đốc";
      const isDeptHead = req.user.role === "Trưởng phòng";
      const isStaff = req.user.role === "Chuyên viên";
      
      // SECURITY: Non-directors MUST provide departmentId to prevent unrestricted queries
      if (!isDirector && !isDeputyDirector) {
        if (!departmentId && !userId) {
          return res.status(400).json({ error: "departmentId hoặc userId là bắt buộc" });
        }
      }
      
      const filters: any = {};
      
      // Staff can ONLY see tasks they are assigned to or created
      if (isStaff) {
        // SECURITY: Staff cannot filter by other users or departments
        if (departmentId && departmentId !== req.user.departmentId) {
          return res.status(403).json({ error: "Bạn không có quyền xem nhiệm vụ của phòng ban khác" });
        }
        if (userId && userId !== req.user.id) {
          return res.status(403).json({ error: "Bạn chỉ có thể xem nhiệm vụ của mình" });
        }
        filters.userId = req.user.id;
      }
      // Department heads can see department tasks OR tasks they're assigned to
      else if (isDeptHead) {
        if (departmentId) {
          // SECURITY: Validate department head can only access their own department
          if (departmentId !== req.user.departmentId) {
            return res.status(403).json({ error: "Bạn không có quyền xem nhiệm vụ của phòng ban khác" });
          }
          filters.departmentId = departmentId as string;
        } else if (userId) {
          // SECURITY: Validate user belongs to department head's department
          const requestedUser = await storage.getUser(userId as string);
          if (!requestedUser || requestedUser.departmentId !== req.user.departmentId) {
            return res.status(403).json({ error: "Bạn không có quyền xem nhiệm vụ của người dùng này" });
          }
          filters.userId = userId as string;
        } else {
          // Default to own department tasks
          if (req.user.departmentId) {
            filters.departmentId = req.user.departmentId;
          } else {
            // Fallback to own tasks if no department
            filters.userId = req.user.id;
          }
        }
      }
      // Directors and Deputy Directors can see all tasks
      else if (isDirector || isDeputyDirector) {
        if (departmentId) filters.departmentId = departmentId as string;
        if (userId) filters.userId = userId as string;
      }
      
      if (status) filters.status = status as string;
      if (assignmentRole) filters.assignmentRole = assignmentRole as string;
      if (assignmentRoles) {
        // Parse comma-separated roles
        filters.assignmentRoles = (assignmentRoles as string).split(',');
      }
      if (incompleteOnly === 'true') filters.incompleteOnly = true;
      
      let tasks = await storage.getTasks(filters);
      
      if (year) {
        const yearNum = parseInt(year as string);
        if (!isNaN(yearNum)) {
          tasks = tasks.filter(task => {
            const dateToCheck = task.createdAt || task.deadline;
            const taskYear = new Date(dateToCheck).getFullYear();
            return taskYear === yearNum;
          });
        }
      }
      
      if (month) {
        const monthNum = parseInt(month as string);
        if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
          tasks = tasks.filter(task => {
            const dateToCheck = task.createdAt || task.deadline;
            const taskDate = new Date(dateToCheck);
            return taskDate.getMonth() + 1 === monthNum;
          });
        }
      }
      
      const tasksWithAssignments = await Promise.all(
        tasks.map(async (task) => {
          const assignments = await storage.getTaskAssignments(task.id);
          const assignees = await Promise.all(
            assignments.map(async (a) => {
              const user = await storage.getUser(a.userId);
              // Normalize assignmentRole to canonical Vietnamese strings
              const roleMap: Record<string, "Chủ trì" | "Phối hợp" | "Chỉ đạo"> = {
                "Chu tri": "Chủ trì",
                "Chủ trì": "Chủ trì",
                "Phoi hop": "Phối hợp",
                "Phối hợp": "Phối hợp",
                "Chi dao": "Chỉ đạo",
                "Chỉ đạo": "Chỉ đạo",
              };
              return user ? { 
                ...sanitizeUser(user), 
                userId: user.id, // Add userId field for Dashboard compatibility
                role: roleMap[a.role] || a.role,
                collaborationCompleted: a.collaborationCompleted 
              } : null;
            })
          );
          
          // Count subtasks for this task
          const subtasks = await storage.getSubtasks(task.id);
          const subtasksCount = subtasks.length;
          
          // Calculate average evaluation score for completed tasks
          let averageScore = null;
          if (task.status === "Hoàn thành") {
            const evaluations = await storage.getTaskEvaluations(task.id);
            if (evaluations.length > 0) {
              const totalScore = evaluations.reduce((sum, evaluation) => {
                return sum + parseFloat(evaluation.score);
              }, 0);
              averageScore = parseFloat((totalScore / evaluations.length).toFixed(1));
            }
          }
          
          return {
            ...task,
            assignments: assignees.filter(Boolean),
            averageScore,
            subtasksCount,
          };
        })
      );
      
      res.json(tasksWithAssignments);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Get deleted tasks (trash) - MUST come before /api/tasks/:id to avoid :id="trash" matching
  app.get("/api/tasks/trash", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const allTasks = await storage.getTasks({ includeDeleted: true });
      const deletedTasks = allTasks.filter(t => t.isDeleted);
      
      let userDeletedTasks = deletedTasks;
      if (req.user.role !== "Giám đốc" && req.user.role !== "Phó Giám đốc") {
        const assignments = await Promise.all(
          deletedTasks.map(task => storage.getTaskAssignments(task.id))
        );
        
        userDeletedTasks = deletedTasks.filter((task, index) => {
          const isCreator = task.createdById === req.user!.id;
          const isAssigned = assignments[index].some(a => a.userId === req.user!.id);
          return isCreator || isAssigned;
        });
      }
      
      const tasksWithData = await Promise.all(
        userDeletedTasks.map(async (task) => {
          const assignments = await storage.getTaskAssignments(task.id);
          const users = await Promise.all(assignments.map(a => storage.getUser(a.userId)));
          
          return {
            ...task,
            assignments: assignments.map((a, i) => ({
              ...a,
              ...(users[i] ? sanitizeUser(users[i]) : {}),
            })),
          };
        })
      );
      
      res.json(tasksWithData);
    } catch (error) {
      console.error("Get trash error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/tasks/evaluations", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Only leadership and department heads can evaluate
      const allowedRoles = ["Giám đốc", "Phó Giám đốc", "Trưởng phòng"];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: "Bạn không có quyền đánh giá nhiệm vụ" });
      }

      const view = req.query.view as string;

      // New assignment-level view
      if (view === "assignments") {
        const completedTasks = await storage.getTasks({ status: "Hoàn thành" });
        
        const assignmentsToEvaluate = [];
        
        for (const task of completedTasks) {
          const assignments = await storage.getTaskAssignments(task.id);
          
          for (const assignment of assignments) {
            const canEvaluate = await canUserEvaluateAssignment(
              req.user.id,
              task.id,
              assignment.id
            );
            
            if (canEvaluate) {
              const assignee = await storage.getUser(assignment.userId);
              const evaluation = await storage.getTaskEvaluation(task.id, assignment.id);
              
              assignmentsToEvaluate.push({
                task: {
                  id: task.id,
                  taskNumber: task.taskNumber,
                  title: task.title,
                  deadline: task.deadline,
                  priority: task.priority,
                },
                assignment: {
                  id: assignment.id,
                  role: assignment.role,
                  userId: assignment.userId,
                },
                assignee: assignee ? sanitizeUser(assignee) : null,
                evaluation: evaluation ? {
                  score: evaluation.score,
                  comments: evaluation.comments,
                  evaluatedAt: evaluation.evaluatedAt,
                } : null,
                isEvaluated: !!evaluation,
              });
            }
          }
        }
        
        return res.json(assignmentsToEvaluate);
      }

      // Legacy task-level view (backward compatible)
      const evaluationStatus = req.query.evaluationStatus as string || 'unevaluated';

      const tasks = await storage.getTasksForEvaluation(
        req.user.id, 
        req.user.role, 
        req.user.departmentId,
        evaluationStatus
      );

      const tasksWithAssignments = await Promise.all(
        tasks.map(async (task) => {
          const assignments = await storage.getTaskAssignments(task.id);
          const assignees = await Promise.all(
            assignments.map(async (a) => {
              const user = await storage.getUser(a.userId);
              const roleMap: Record<string, "Chủ trì" | "Phối hợp" | "Chỉ đạo"> = {
                "Chu tri": "Chủ trì",
                "Chủ trì": "Chủ trì",
                "Phoi hop": "Phối hợp",
                "Phối hợp": "Phối hợp",
                "Chi dao": "Chỉ đạo",
                "Chỉ đạo": "Chỉ đạo",
              };
              return user ? { 
                ...sanitizeUser(user), 
                assignmentRole: roleMap[a.role] || a.role,
                assignmentId: a.id,
                collaborationCompleted: a.collaborationCompleted
              } : null;
            })
          );

          return {
            ...task,
            assignments: assignees.filter(Boolean),
          };
        })
      );

      res.json(tasksWithAssignments);
    } catch (error) {
      console.error("Get evaluation tasks error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }
      
      const assignments = await storage.getTaskAssignments(task.id);
      const evaluations = await storage.getTaskEvaluations(task.id);
      
      const assignees = await Promise.all(
        assignments.map(async (a) => {
          const user = await storage.getUser(a.userId);
          // Normalize assignmentRole to canonical Vietnamese strings
          const roleMap: Record<string, "Chủ trì" | "Phối hợp" | "Chỉ đạo"> = {
            "Chu tri": "Chủ trì",
            "Chủ trì": "Chủ trì",
            "Phoi hop": "Phối hợp",
            "Phối hợp": "Phối hợp",
            "Chi dao": "Chỉ đạo",
            "Chỉ đạo": "Chỉ đạo",
          };
          
          // Find evaluation for this assignment (assignmentId = assignment.id)
          const evaluation = evaluations.find(e => e.assignmentId === a.id);
          
          return user ? { 
            ...sanitizeUser(user), 
            assignmentRole: roleMap[a.role] || a.role,
            assignmentId: a.id,
            collaborationCompleted: a.collaborationCompleted,
            evaluationScore: evaluation?.score ?? null,
            evaluationComments: evaluation?.comments ?? null,
            evaluatedBy: evaluation?.evaluatorId ?? null,
            evaluatedAt: evaluation?.evaluatedAt ?? null,
          } : null;
        })
      );
      
      // Fetch creator information
      const creator = await storage.getUser(task.createdById);
      
      res.json({
        ...task,
        assignments: assignees.filter(Boolean),
        createdBy: creator ? sanitizeUser(creator) : null,
      });
    } catch (error) {
      console.error("Get task error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Get subtasks of a task
  app.get("/api/tasks/:id/subtasks", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const parentTask = await storage.getTask(req.params.id);
      if (!parentTask) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }

      const subtasks = await storage.getSubtasks(req.params.id);
      res.json(subtasks);
    } catch (error) {
      console.error("Get subtasks error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Check for duplicate tasks using AI
  app.post("/api/tasks/check-duplicates", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { title, description } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Thiếu tiêu đề nhiệm vụ" });
      }

      // Get recent tasks in the same department (last 30 days, not completed)
      // SECURITY: Use only req.user's department, never trust client-supplied departmentId
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Apply same role-based filtering as other task endpoints
      const isLeadership = ["Giám đốc", "Phó Giám đốc"].includes(req.user.role);
      
      const recentTasks = await storage.getTasks({
        departmentId: isLeadership ? undefined : req.user.departmentId || undefined,
        includeDeleted: false,
      });

      // Filter to recent, incomplete tasks
      const candidateTasks = recentTasks.filter(task => 
        task.status !== "Hoàn thành" &&
        new Date(task.createdAt) >= thirtyDaysAgo
      );

      // Use AI to detect duplicates
      const duplicates = await aiService.detectDuplicateTasks(
        title,
        description || null,
        candidateTasks
      );

      res.json({ duplicates });
    } catch (error) {
      console.error("Check duplicates error:", error);
      // Don't fail if AI check fails, return empty array
      res.json({ duplicates: [] });
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (!["Giám đốc", "Phó Giám đốc", "Trưởng phòng", "Chuyên viên"].includes(req.user.role)) {
        return res.status(403).json({ error: "Bạn không có quyền tạo nhiệm vụ" });
      }
      
      const { title, description, deadline, priority, departmentId, assignments, templateId, parentTaskId } = req.body;
      
      if (!title || !deadline || !priority) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
      }

      // Validate parent task if provided
      if (parentTaskId) {
        const parentTask = await storage.getTask(parentTaskId);
        if (!parentTask) {
          return res.status(400).json({ error: "Nhiệm vụ cha không tồn tại" });
        }
        if (parentTask.isDeleted) {
          return res.status(400).json({ error: "Không thể tạo subtask cho nhiệm vụ đã bị xóa" });
        }
        
        // Validate deadline: subtask deadline must be <= parent deadline
        const subtaskDeadline = new Date(deadline);
        if (subtaskDeadline > parentTask.deadline) {
          return res.status(400).json({ error: "Deadline của nhiệm vụ con phải sớm hơn hoặc bằng nhiệm vụ cha" });
        }

        // Prevent nested subtasks (max depth = 1)
        if (parentTask.parentTaskId) {
          return res.status(400).json({ error: "Không thể tạo subtask của subtask (chỉ cho phép 1 cấp)" });
        }
      }
      
      const task = await storage.createTask({
        title,
        description,
        deadline: new Date(deadline),
        priority,
        departmentId: departmentId || req.user.departmentId,
        createdById: req.user.id,
        parentTaskId: parentTaskId || null,
      });
      
      if (assignments && Array.isArray(assignments)) {
        await Promise.all(
          assignments.map((a: { userId: string; role: string }) =>
            storage.createTaskAssignment({
              taskId: task.id,
              userId: a.userId,
              role: a.role,
            })
          )
        );

        // Send Telegram notifications to assigned users
        try {
          await Promise.all(
            assignments.map(async (a: { userId: string; role: string }) => {
              const assignee = await storage.getUser(a.userId);
              if (assignee && req.user) {
                await notifyNewTask(task, assignee, req.user, a.role as "Chủ trì" | "Phối hợp" | "Chỉ đạo");
              }
            })
          );
        } catch (notifyError) {
          // Don't fail task creation if notification fails
          console.error("Failed to send telegram notifications:", notifyError);
        }
      }
      
      if (templateId) {
        const templateItems = await storage.getChecklistTemplateItems(templateId);
        if (templateItems.length > 0) {
          await Promise.all(
            templateItems.map((item) =>
              storage.createChecklistItem({
                taskId: task.id,
                title: item.title,
                order: item.order,
              })
            )
          );
        }
      }

      // Update parent progress if this is a subtask
      if (parentTaskId) {
        await storage.updateParentProgress(task.id);
      }
      
      res.json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const task = await storage.getTask(req.params.id);
      
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }
      
      const { title, description, deadline, priority, status, progress } = req.body;
      
      // Check permission for status change to "Hoàn thành"
      if (status === "Hoàn thành") {
        const assignments = await storage.getTaskAssignments(req.params.id);
        const userAssignment = assignments.find(a => a.userId === req.user!.id);
        if (!userAssignment || (userAssignment.role !== "Chủ trì" && userAssignment.role !== "Chỉ đạo")) {
          return res.status(403).json({ error: "Chỉ người Chủ trì hoặc Chỉ đạo mới có thể kết thúc nhiệm vụ" });
        }
      }
      
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (deadline !== undefined) updates.deadline = new Date(deadline);
      if (priority !== undefined) updates.priority = priority;
      if (status !== undefined) {
        updates.status = status;
        // Sync progress with status for terminal states
        if (status === "Hoàn thành" && progress === undefined) {
          updates.progress = 100;
        }
      }
      if (progress !== undefined) updates.progress = progress;
      
      const updatedTask = await storage.updateTask(req.params.id, updates);
      
      // Update parent progress if this is a subtask and progress/status was updated
      if (updatedTask && updatedTask.parentTaskId && (progress !== undefined || status !== undefined)) {
        await storage.updateParentProgress(updatedTask.id);
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // DEPRECATED: Legacy task-level evaluation endpoint (DISABLED)
  // Replaced by per-assignment evaluation: PUT /api/tasks/:taskId/assignments/:assignmentId/evaluation
  // DO NOT RE-ENABLE - this endpoint is incompatible with the new per-assignment evaluation model
  /*
  app.patch("/api/tasks/:id/evaluation", requireAuth, async (req, res) => {
    return res.status(410).json({ 
      error: "Endpoint deprecated. Use per-assignment evaluation: PUT /api/tasks/:taskId/assignments/:assignmentId/evaluation" 
    });
  });
  */

  // Get evaluators for all assignments in a task (bulk lookup for permissions)
  app.get("/api/tasks/:taskId/assignment-evaluators", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const task = await storage.getTask(req.params.taskId);
      
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }

      // Authorization: Only task participants OR leadership can view evaluators
      const assignments = await storage.getTaskAssignments(task.id);
      const isParticipant = assignments.some(a => a.userId === req.user!.id);
      const isLeadership = ["Giám đốc", "Phó Giám đốc", "Trưởng phòng"].includes(req.user.role);
      
      if (!isParticipant && !isLeadership) {
        return res.status(403).json({ error: "Bạn không có quyền xem thông tin này" });
      }
      
      const evaluatorLookup = await Promise.all(
        assignments.map(async (assignment) => {
          const evaluator = await getEvaluatorForAssignment(task.id, assignment.id);
          
          return {
            assignmentId: assignment.id,
            evaluator: evaluator ? {
              id: evaluator.id,
              fullName: evaluator.fullName,
              role: evaluator.role,
            } : null,
          };
        })
      );
      
      res.json(evaluatorLookup);
    } catch (error) {
      console.error("Get assignment evaluators error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Get all evaluations for a task (assignment-level)
  app.get("/api/tasks/:taskId/evaluations", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const evaluations = await storage.getTaskEvaluations(req.params.taskId);
      
      const evaluationsWithUsers = await Promise.all(
        evaluations.map(async (evaluation) => {
          // Get assignment to find userId (evaluation.assignmentId is assignment.id, not userId!)
          const assignments = await storage.getTaskAssignments(req.params.taskId);
          const assignment = assignments.find(a => a.id === evaluation.assignmentId);
          const assignee = assignment ? await storage.getUser(assignment.userId) : null;
          const evaluator = await storage.getUser(evaluation.evaluatorId);
          
          return {
            ...evaluation,
            assignee: assignee ? sanitizeUser(assignee) : null,
            evaluator: evaluator ? sanitizeUser(evaluator) : null,
          };
        })
      );
      
      res.json(evaluationsWithUsers);
    } catch (error) {
      console.error("Get task evaluations error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Upsert assignment evaluation (per-assignment evaluation)
  app.put("/api/tasks/:taskId/assignments/:assignmentId/evaluation", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const task = await storage.getTask(req.params.taskId);
      
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }

      if (task.status !== "Hoàn thành") {
        return res.status(400).json({ error: "Chỉ có thể đánh giá nhiệm vụ đã hoàn thành" });
      }

      const { score, comments } = req.body;
      
      if (score === undefined || score === null) {
        return res.status(400).json({ error: "Thiếu điểm đánh giá" });
      }

      if (score < 0 || score > 10) {
        return res.status(400).json({ error: "Điểm đánh giá phải từ 0-10" });
      }

      const taskId = req.params.taskId;
      const assignmentId = req.params.assignmentId;
      const assignments = await storage.getTaskAssignments(taskId);
      const assignment = assignments.find(a => a.id === assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ error: "Không tìm thấy phân công" });
      }

      const canEvaluate = await canUserEvaluateAssignment(
        req.user.id,
        req.params.taskId,
        assignment.id  // FIX: Pass assignmentId, not userId!
      );

      if (!canEvaluate) {
        return res.status(403).json({ error: "Bạn không có quyền đánh giá phân công này" });
      }

      // Preserve existing comments if new comments is null/empty
      const existingEvaluation = await storage.getTaskEvaluation(req.params.taskId, assignment.id);
      const finalComments = (comments !== null && comments !== undefined && comments.trim() !== "") 
        ? comments.trim() 
        : (existingEvaluation?.comments || null);

      const evaluation = await storage.upsertTaskEvaluation({
        taskId: req.params.taskId,
        assignmentId: assignment.id,  // FIX: Schema changed to assignmentId
        evaluatorId: req.user.id,
        score,
        comments: finalComments,
      });
      
      res.json(evaluation);
    } catch (error) {
      console.error("Upsert evaluation error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Soft delete task (move to trash)
  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const task = await storage.getTask(req.params.id);
      
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }
      
      if (task.createdById !== req.user.id && !["Giám đốc", "Phó Giám đốc"].includes(req.user.role)) {
        return res.status(403).json({ error: "Bạn không có quyền xóa nhiệm vụ này" });
      }
      
      // Parent progress is now handled inside softDeleteTask (in transaction)
      const deletedTask = await storage.softDeleteTask(req.params.id, req.user.id);
      
      res.json({ message: "Đã chuyển nhiệm vụ vào thùng rác", task: deletedTask });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Restore task from trash
  app.post("/api/tasks/:id/restore", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const task = await storage.getTask(req.params.id);
      
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }
      
      if (!task.isDeleted) {
        return res.status(400).json({ error: "Nhiệm vụ chưa bị xóa" });
      }
      
      if (task.createdById !== req.user.id && !["Giám đốc", "Phó Giám đốc"].includes(req.user.role)) {
        return res.status(403).json({ error: "Bạn không có quyền khôi phục nhiệm vụ này" });
      }
      
      const restoredTask = await storage.restoreTask(req.params.id);
      res.json({ message: "Đã khôi phục nhiệm vụ", task: restoredTask });
    } catch (error) {
      console.error("Restore task error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/tasks/:id/assignments", requireAuth, async (req, res) => {
    try {
      const { userId, role } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
      }
      
      const assignment = await storage.createTaskAssignment({
        taskId: req.params.id,
        userId,
        role,
      });
      
      res.json(assignment);
    } catch (error) {
      console.error("Create assignment error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Update all task assignments (Option 1: only when Chưa bắt đầu OR no evaluations)
  app.put("/api/tasks/:id/assignments", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { assignments } = req.body;
      
      if (!assignments || !Array.isArray(assignments)) {
        return res.status(400).json({ error: "Danh sách người thực hiện không hợp lệ" });
      }

      // Get task
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }

      // Get task creator to check their role
      const taskCreator = await storage.getUser(task.createdById);
      if (!taskCreator) {
        return res.status(404).json({ error: "Không tìm thấy người tạo nhiệm vụ" });
      }

      // Authorization: 
      // 1. Task creator
      // 2. Leadership (Giám đốc, Phó Giám đốc)
      // 3. Department Head/Deputy (if task created by Deputy Director)
      const isCreator = task.createdById === req.user.id;
      const isLeadership = ["Giám đốc", "Phó Giám đốc"].includes(req.user.role);
      const isDepartmentHead = ["Trưởng phòng", "Phó Trưởng phòng"].includes(req.user.role);
      const creatorIsDeputyDirector = taskCreator.role === "Phó Giám đốc";
      
      // Allow Department Heads to edit if task was created by Deputy Director
      const canEdit = isCreator || isLeadership || (isDepartmentHead && creatorIsDeputyDirector);
      
      if (!canEdit) {
        return res.status(403).json({ error: "Bạn không có quyền sửa người thực hiện" });
      }

      // Check condition: Status "Chưa bắt đầu" OR no evaluations exist
      const evaluations = await storage.getTaskEvaluations(req.params.id);
      const hasEvaluations = evaluations.length > 0;
      const isNotStarted = task.status === "Chưa bắt đầu";
      
      if (!isNotStarted && hasEvaluations) {
        return res.status(400).json({ 
          error: "Không thể sửa người thực hiện khi nhiệm vụ đã có đánh giá. Chỉ có thể sửa khi nhiệm vụ chưa bắt đầu hoặc chưa có đánh giá." 
        });
      }

      // Validate: At least 1 Chủ trì
      const chuTriCount = assignments.filter(a => a.role === "Chủ trì").length;
      if (chuTriCount === 0) {
        return res.status(400).json({ error: "Phải có ít nhất 1 người Chủ trì" });
      }

      // Validate: All userIds exist
      const userIds = assignments.map(a => a.userId);
      const users = await Promise.all(userIds.map(id => storage.getUser(id)));
      const invalidUsers = users.filter(u => !u);
      if (invalidUsers.length > 0) {
        return res.status(400).json({ error: "Có người dùng không tồn tại trong danh sách" });
      }

      // Validate: No duplicate userIds
      const uniqueUserIds = new Set(userIds);
      if (uniqueUserIds.size !== userIds.length) {
        return res.status(400).json({ error: "Không được phân công trùng người" });
      }

      // Transaction: Delete old assignments and create new ones
      // Note: CASCADE delete will remove evaluations, but we already checked no evaluations exist
      const oldAssignments = await storage.getTaskAssignments(req.params.id);
      
      // Prepare change log message
      const oldUsers = await Promise.all(
        oldAssignments.map(a => storage.getUser(a.userId))
      );
      const newUsers = await Promise.all(
        assignments.map((a: { userId: string; role: string }) => storage.getUser(a.userId))
      );
      
      // Build change description
      const addedUsers = assignments.filter(
        (a: { userId: string; role: string }) => !oldAssignments.find(old => old.userId === a.userId)
      );
      const removedAssignments = oldAssignments.filter(
        old => !assignments.find((a: { userId: string; role: string }) => a.userId === old.userId)
      );
      
      let changeMessage = "";
      if (addedUsers.length > 0) {
        const addedNames = await Promise.all(
          addedUsers.map(async (a: { userId: string; role: string }) => {
            const u = await storage.getUser(a.userId);
            return `${u?.fullName} (${a.role})`;
          })
        );
        changeMessage += `Thêm: ${addedNames.join(", ")}`;
      }
      if (removedAssignments.length > 0) {
        const removedNames = await Promise.all(
          removedAssignments.map(async a => {
            const u = await storage.getUser(a.userId);
            return `${u?.fullName} (${a.role})`;
          })
        );
        if (changeMessage) changeMessage += "; ";
        changeMessage += `Xóa: ${removedNames.join(", ")}`;
      }
      
      // Delete old assignments
      await Promise.all(
        oldAssignments.map(a => storage.deleteTaskAssignment(a.id))
      );

      // Create new assignments
      const newAssignments = await Promise.all(
        assignments.map((a: { userId: string; role: string }) =>
          storage.createTaskAssignment({
            taskId: req.params.id,
            userId: a.userId,
            role: a.role,
          })
        )
      );

      // Log the change if there were actual changes
      if (changeMessage) {
        await storage.createProgressUpdate({
          taskId: req.params.id,
          userId: req.user.id,
          updateType: "assignment_changed",
          content: changeMessage,
        });
      }

      res.json({ 
        message: "Đã cập nhật người thực hiện", 
        assignments: newAssignments 
      });
    } catch (error) {
      console.error("Update assignments error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.patch("/api/tasks/:taskId/assignments/:assignmentId", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ error: "Thiếu thông tin vai trò" });
      }

      // Check if user has permission (task creator or leadership)
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }

      const isTaskCreator = task.createdById === req.user.id;
      const isLeadership = ["Giám đốc", "Phó Giám đốc"].includes(req.user.role);
      
      if (!isTaskCreator && !isLeadership) {
        return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa phân công" });
      }
      
      const updatedAssignment = await storage.updateTaskAssignmentRole(req.params.assignmentId, role);
      
      if (!updatedAssignment) {
        return res.status(404).json({ error: "Không tìm thấy phân công" });
      }
      
      res.json(updatedAssignment);
    } catch (error) {
      console.error("Update assignment role error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.delete("/api/tasks/:taskId/assignments/:assignmentId", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check if user has permission (task creator or leadership)
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }

      const isTaskCreator = task.createdById === req.user.id;
      const isLeadership = ["Giám đốc", "Phó Giám đốc"].includes(req.user.role);
      
      if (!isTaskCreator && !isLeadership) {
        return res.status(403).json({ error: "Bạn không có quyền xóa phân công" });
      }
      
      await storage.deleteTaskAssignment(req.params.assignmentId);
      
      res.json({ message: "Đã xóa phân công" });
    } catch (error) {
      console.error("Delete assignment error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.patch("/api/tasks/:taskId/assignments/:assignmentId/collaboration-complete", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const assignments = await storage.getTaskAssignments(req.params.taskId);
      const assignment = assignments.find(a => a.id === req.params.assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ error: "Không tìm thấy phân công" });
      }
      
      // Only the assigned user can mark collaboration complete
      if (assignment.userId !== req.user.id) {
        return res.status(403).json({ error: "Bạn không có quyền thực hiện hành động này" });
      }
      
      // Only "Phối hợp" role can use this feature
      if (assignment.role !== "Phối hợp") {
        return res.status(400).json({ error: "Chỉ người phối hợp mới có thể đánh dấu hoàn thành phối hợp" });
      }
      
      const { collaborationCompleted } = req.body;
      
      const updatedAssignment = await storage.updateTaskAssignmentCollaboration(
        req.params.assignmentId,
        collaborationCompleted
      );
      
      res.json(updatedAssignment);
    } catch (error) {
      console.error("Update collaboration complete error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/tasks/:id/progress", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { updateType, content, progressPercent } = req.body;
      
      if (!updateType) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
      }
      
      const update = await storage.createProgressUpdate({
        taskId: req.params.id,
        userId: req.user.id,
        updateType,
        content,
        progressPercent,
      });
      
      if (progressPercent !== undefined) {
        await storage.updateTask(req.params.id, { progress: progressPercent });
      }
      
      res.json(update);
    } catch (error) {
      console.error("Create progress update error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/tasks/:id/progress", requireAuth, async (req, res) => {
    try {
      const updates = await storage.getProgressUpdates(req.params.id);
      
      const updatesWithUsers = await Promise.all(
        updates.map(async (update) => {
          const user = await storage.getUser(update.userId);
          return {
            ...update,
            user: user ? { id: user.id, fullName: user.fullName } : null,
          };
        })
      );
      
      res.json(updatesWithUsers);
    } catch (error) {
      console.error("Get progress updates error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Template CRUD endpoints
  app.get("/api/templates/overview", requireAuth, async (req, res) => {
    try {
      const grouped = await storage.getTemplatesForUser(req.user!.id);
      res.json(grouped);
    } catch (error) {
      console.error("Get templates overview error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/templates/:id/items", requireAuth, async (req, res) => {
    try {
      const items = await storage.getChecklistTemplateItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Get template items error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/templates", requireAuth, async (req, res) => {
    try {
      const templateSchema = schema.insertChecklistTemplateSchema
        .omit({ isDefault: true }) // Remove isDefault - only set-default endpoint can modify
        .extend({
          items: z.array(schema.insertChecklistTemplateItemSchema.omit({ templateId: true })),
        });
      
      const validated = templateSchema.parse(req.body);
      const { items, ...templateData } = validated;

      // Force isDefault to false for new templates
      const template = await storage.createChecklistTemplate(
        { ...templateData, isDefault: false },
        req.user!.id
      );
      
      // Create items if provided
      let createdItems: any[] = [];
      if (items && items.length > 0) {
        createdItems = await storage.replaceTemplateItems(template.id, items, req.user!.id);
      }

      res.status(201).json({ template, items: createdItems });
    } catch (error: any) {
      console.error("Create template error:", error);
      if (error.message?.includes("Unauthorized")) {
        res.status(403).json({ error: error.message });
      } else if (error.name === "ZodError") {
        res.status(400).json({ error: "Dữ liệu không hợp lệ" });
      } else {
        res.status(500).json({ error: "Lỗi hệ thống" });
      }
    }
  });

  app.patch("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      // Remove isDefault from allowed fields - only set-default endpoint can modify
      const patchSchema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
      });
      
      const validated = patchSchema.parse(req.body);
      const updated = await storage.updateChecklistTemplate(req.params.id, validated, req.user!.id);
      
      res.json(updated);
    } catch (error: any) {
      console.error("Update template error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Không tìm thấy mẫu checklist" });
      } else if (error.message?.includes("Unauthorized")) {
        res.status(403).json({ error: error.message });
      } else if (error.name === "ZodError") {
        res.status(400).json({ error: "Dữ liệu không hợp lệ" });
      } else {
        res.status(500).json({ error: "Lỗi hệ thống" });
      }
    }
  });

  app.put("/api/templates/:id/items", requireAuth, async (req, res) => {
    try {
      const itemsSchema = z.array(
        z.object({
          title: z.string(),
          order: z.number(),
        })
      ).min(1);
      
      const validated = itemsSchema.parse(req.body);
      const items = await storage.replaceTemplateItems(req.params.id, validated, req.user!.id);
      
      res.json(items);
    } catch (error: any) {
      console.error("Replace template items error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Không tìm thấy mẫu checklist" });
      } else if (error.message?.includes("Unauthorized")) {
        res.status(403).json({ error: error.message });
      } else if (error.name === "ZodError") {
        res.status(400).json({ error: "Dữ liệu không hợp lệ" });
      } else {
        res.status(500).json({ error: "Lỗi hệ thống" });
      }
    }
  });

  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteChecklistTemplate(req.params.id, req.user!.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Delete template error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Không tìm thấy mẫu checklist" });
      } else if (error.message?.includes("Unauthorized")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Lỗi hệ thống" });
      }
    }
  });

  app.post("/api/templates/:id/clone", requireAuth, async (req, res) => {
    try {
      const cloned = await storage.cloneTemplate(req.params.id, req.user!.id);
      const items = await storage.getChecklistTemplateItems(cloned.id);
      
      res.status(201).json({ template: cloned, items });
    } catch (error: any) {
      console.error("Clone template error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Không tìm thấy mẫu checklist" });
      } else {
        res.status(500).json({ error: "Lỗi hệ thống" });
      }
    }
  });

  app.post("/api/templates/:id/set-default", requireAuth, async (req, res) => {
    try {
      // Check if user is leadership (Director or Deputy Director)
      if (req.user!.role !== "Giám đốc" && req.user!.role !== "Phó Giám đốc") {
        return res.status(403).json({ error: "Chỉ lãnh đạo mới có thể đặt mẫu mặc định" });
      }

      await storage.setDefaultTemplate(req.params.id);
      const updated = await storage.getChecklistTemplate(req.params.id);
      
      res.json(updated);
    } catch (error: any) {
      console.error("Set default template error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Không tìm thấy mẫu checklist" });
      } else {
        res.status(500).json({ error: "Lỗi hệ thống" });
      }
    }
  });

  app.get("/api/tasks/:id/checklist", requireAuth, async (req, res) => {
    try {
      const items = await storage.getChecklistItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Get checklist items error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/tasks/:id/checklist", requireAuth, async (req, res) => {
    try {
      const { title, order } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
      }
      
      const item = await storage.createChecklistItem({
        taskId: req.params.id,
        title,
        order: order || 0,
      });
      
      const allItems = await storage.getChecklistItems(req.params.id);
      const completedCount = allItems.filter(i => i.completed).length;
      const totalCount = allItems.length;
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      let status: string;
      if (progress === 0) {
        status = "Chưa bắt đầu";
      } else if (progress === 100) {
        status = "Hoàn thành";
      } else {
        status = "Đang thực hiện";
      }
      
      await storage.updateTask(req.params.id, { progress, status });
      
      const task = await storage.getTask(req.params.id);
      
      // If this is a parent task (has subtasks), recalculate based on subtasks
      const subtasks = await storage.getSubtasks(req.params.id);
      if (subtasks.length > 0) {
        await storage.recalculateTaskStatusFromSubtasks(req.params.id);
      }
      
      // Update parent progress if this is a subtask
      if (task && task.parentTaskId) {
        await storage.updateParentProgress(req.params.id);
      }
      
      res.json(item);
    } catch (error) {
      console.error("Create checklist item error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.patch("/api/tasks/:taskId/checklist/:itemId", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { completed, title } = req.body;
      
      // Authorization check for title updates: ONLY Chủ trì can edit titles
      if (title !== undefined) {
        const assignments = await storage.getTaskAssignments(req.params.taskId);
        const userAssignment = assignments.find(a => a.userId === req.user!.id);
        const isChuTri = userAssignment?.role === "Chủ trì";

        if (!isChuTri) {
          return res.status(403).json({ error: "Chỉ người Chủ trì mới có thể chỉnh sửa checklist" });
        }
      }
      
      const updates: any = {};
      if (completed !== undefined) updates.completed = completed;
      if (title !== undefined) updates.title = title;
      
      const item = await storage.updateChecklistItem(req.params.itemId, updates);
      
      const allItems = await storage.getChecklistItems(req.params.taskId);
      const completedCount = allItems.filter(i => i.completed).length;
      const totalCount = allItems.length;
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      let status: string;
      if (progress === 0) {
        status = "Chưa bắt đầu";
      } else if (progress === 100) {
        status = "Hoàn thành";
      } else {
        status = "Đang thực hiện";
      }
      
      await storage.updateTask(req.params.taskId, { progress, status });
      
      const task = await storage.getTask(req.params.taskId);
      
      // If this is a parent task (has subtasks), recalculate based on subtasks
      const subtasks = await storage.getSubtasks(req.params.taskId);
      if (subtasks.length > 0) {
        await storage.recalculateTaskStatusFromSubtasks(req.params.taskId);
      }
      
      // Update parent progress if this is a subtask
      if (task && task.parentTaskId) {
        await storage.updateParentProgress(req.params.taskId);
      }
      
      res.json(item);
    } catch (error) {
      console.error("Update checklist item error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.delete("/api/tasks/:taskId/checklist/:itemId", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Authorization check: ONLY Chủ trì can delete checklist items
      const assignments = await storage.getTaskAssignments(req.params.taskId);
      const userAssignment = assignments.find(a => a.userId === req.user!.id);
      const isChuTri = userAssignment?.role === "Chủ trì";

      if (!isChuTri) {
        return res.status(403).json({ error: "Chỉ người Chủ trì mới có thể xóa checklist" });
      }

      await storage.deleteChecklistItem(req.params.itemId);
      
      // Recalculate progress after deletion
      const allItems = await storage.getChecklistItems(req.params.taskId);
      const completedCount = allItems.filter(i => i.completed).length;
      const totalCount = allItems.length;
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      
      let status: string;
      if (progress === 0) {
        status = "Chưa bắt đầu";
      } else if (progress === 100) {
        status = "Hoàn thành";
      } else {
        status = "Đang thực hiện";
      }
      
      await storage.updateTask(req.params.taskId, { progress, status });
      
      const task = await storage.getTask(req.params.taskId);
      
      // If this is a parent task (has subtasks), recalculate based on subtasks
      const subtasks = await storage.getSubtasks(req.params.taskId);
      if (subtasks.length > 0) {
        await storage.recalculateTaskStatusFromSubtasks(req.params.taskId);
      }
      
      // Update parent progress if this is a subtask
      if (task && task.parentTaskId) {
        await storage.updateParentProgress(req.params.taskId);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete checklist item error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/tasks/:id/comments", requireAuth, async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.id);
      
      const commentsWithUsers = await Promise.all(
        comments.map(async (comment) => {
          const user = await storage.getUser(comment.userId);
          return {
            ...comment,
            user: user ? { id: user.id, fullName: user.fullName } : null,
          };
        })
      );
      
      res.json(commentsWithUsers);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/tasks/:id/comments", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Thiếu nội dung comment" });
      }
      
      const comment = await storage.createComment({
        taskId: req.params.id,
        userId: req.user.id,
        content,
      });

      // Send Telegram notifications to task assignees
      try {
        const task = await storage.getTask(req.params.id);
        if (task && req.user) {
          const assignments = await storage.getTaskAssignments(req.params.id);
          await Promise.all(
            assignments.map(async (assignment) => {
              const assignee = await storage.getUser(assignment.userId);
              if (assignee) {
                await notifyNewComment(task, assignee, req.user!, content);
              }
            })
          );
        }
      } catch (notifyError) {
        // Don't fail comment creation if notification fails
        console.error("Failed to send telegram notifications:", notifyError);
      }
      
      res.json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/kpi/user/:userId", requireAuth, async (req, res) => {
    try {
      const { periodStart, periodEnd } = req.query;
      
      const startDate = periodStart ? new Date(periodStart as string) : undefined;
      const endDate = periodEnd ? new Date(periodEnd as string) : undefined;
      
      const kpiData = await calculateUserKPI(req.params.userId, startDate, endDate);
      
      res.json(kpiData);
    } catch (error) {
      console.error("Get user KPI error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/kpi/department/:departmentId", requireAuth, async (req, res) => {
    try {
      const kpiData = await calculateAllUsersKPI(req.params.departmentId);
      
      // Calculate department average KPI
      const departmentAverageKPI = kpiData.length > 0
        ? parseFloat((kpiData.reduce((sum, user) => sum + user.kpi, 0) / kpiData.length).toFixed(1))
        : 0;
      
      res.json({
        users: kpiData,
        departmentAverageKPI,
        userCount: kpiData.length,
      });
    } catch (error) {
      console.error("Get department KPI error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/kpi/all", requireAuth, async (req, res) => {
    try {
      const kpiData = await calculateAllUsersKPI();
      
      res.json(kpiData);
    } catch (error) {
      console.error("Get all KPI error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/kpi/stats", requireAuth, async (req, res) => {
    try {
      const { year, month, departmentId } = req.query;
      
      // Get all tasks
      const allTasks = await storage.getTasks();
      const activeTasks = allTasks.filter(t => !t.isDeleted);
      
      // Get all task assignments to filter by department
      let filteredTasks = activeTasks;
      
      // Apply department filtering if specified
      if (departmentId && departmentId !== "all") {
        // Find all users in this department
        const usersInDept = await storage.getUsers({ departmentId: departmentId as string });
        const userIdsInDept = usersInDept.map(u => u.id);
        
        // Find tasks assigned to users in this department
        const deptAssignments = await storage.getTaskAssignmentsForUsers(userIdsInDept);
        const taskIdsInDept = new Set(deptAssignments.map(a => a.taskId));
        
        filteredTasks = filteredTasks.filter(t => taskIdsInDept.has(t.id));
      }
      
      // Apply time filtering based on task completion/activity dates
      // If month is selected without year, default to current year to avoid cross-year matches
      const currentYear = new Date().getFullYear();
      const effectiveYear = (year && year !== "all") ? parseInt(year as string) : 
                           (month && month !== "all") ? currentYear : null;
      
      // Apply year filter
      if (effectiveYear) {
        filteredTasks = filteredTasks.filter(t => {
          // Completed tasks: check completedAt year
          if (t.status === "Hoàn thành" && t.completedAt) {
            return new Date(t.completedAt).getFullYear() === effectiveYear;
          }
          
          // In-progress/not started: include if deadline is in this year
          // Activity filtering will be handled by periodStart/periodEnd in KPI calculation
          const deadlineYear = new Date(t.deadline).getFullYear();
          return deadlineYear === effectiveYear;
        });
      }
      
      // Apply month filter
      if (month && month !== "all") {
        const selectedMonth = parseInt(month as string);
        
        filteredTasks = filteredTasks.filter(t => {
          // Completed tasks: check completedAt month
          if (t.status === "Hoàn thành" && t.completedAt) {
            const completedDate = new Date(t.completedAt);
            return completedDate.getFullYear() === effectiveYear && 
                   completedDate.getMonth() + 1 === selectedMonth;
          }
          
          // In-progress/not started: include if deadline is in this month
          // Activity filtering will be handled by periodStart/periodEnd in KPI calculation
          const deadlineDate = new Date(t.deadline);
          return deadlineDate.getFullYear() === effectiveYear && 
                 deadlineDate.getMonth() + 1 === selectedMonth;
        });
      }
      
      // Calculate period bounds for quality filtering
      let periodStart: Date | undefined;
      let periodEnd: Date | undefined;
      
      if (effectiveYear) {
        if (month && month !== "all") {
          // Specific month and year
          const selectedMonth = parseInt(month as string);
          periodStart = new Date(effectiveYear, selectedMonth - 1, 1);
          periodEnd = new Date(effectiveYear, selectedMonth, 0, 23, 59, 59, 999); // Last millisecond of month
        } else {
          // Whole year
          periodStart = new Date(effectiveYear, 0, 1);
          periodEnd = new Date(effectiveYear, 11, 31, 23, 59, 59, 999);
        }
      }
      
      // CRITICAL OPTIMIZATION: Preload all activity ONCE before filtering
      const activityMap = await preloadTaskActivity(filteredTasks);
      
      // Activity-based filtering: Include overdue tasks with current-period activity
      if (periodStart || periodEnd) {
        filteredTasks = filteredTasks.filter(t => {
          // Completed tasks: already filtered by completedAt above
          if (t.status === "Hoàn thành") {
            return true;
          }
          
          // In-progress/not started with deadline in period: include
          const deadlineDate = new Date(t.deadline);
          const deadlineInPeriod = (!periodStart || deadlineDate >= periodStart) && 
                                   (!periodEnd || deadlineDate <= periodEnd);
          
          if (deadlineInPeriod) {
            return true;
          }
          
          // Overdue tasks (deadline outside period): check if they have activity in period
          const activity = activityMap.get(t.id);
          return hasActivityInPeriod(activity, periodStart, periodEnd);
        });
      }
      
      // Get all departments
      const departments = await storage.getDepartments();
      
      // Build department user map for efficient lookup
      const departmentUserMap = new Map<string, Set<string>>();
      for (const dept of departments) {
        const users = await storage.getUsers({ departmentId: dept.id });
        departmentUserMap.set(dept.id, new Set(users.map(u => u.id)));
      }
      
      // CRITICAL FIX: Group filtered tasks by department AFTER activity-based filtering
      // This ensures both overall KPI and department KPIs use the same filtered task set
      const tasksByDepartment = new Map<string, typeof filteredTasks>();
      for (const dept of departments) {
        tasksByDepartment.set(dept.id, []);
      }
      
      // Iterate filteredTasks (AFTER activity filter) and assign to departments
      for (const task of filteredTasks) {
        const assignments = await storage.getTaskAssignments(task.id);
        const deptSet = new Set<string>();
        
        // Check which departments this task belongs to
        for (const assignment of assignments) {
          for (const [deptId, userIds] of Array.from(departmentUserMap.entries())) {
            if (userIds.has(assignment.userId)) {
              deptSet.add(deptId);
            }
          }
        }
        
        // Add task to all relevant departments
        for (const deptId of Array.from(deptSet)) {
          tasksByDepartment.get(deptId)?.push(task);
        }
      }
      
      // Calculate KPI from filtered tasks with cached activity data
      const allUsersKpi = await calculateFilteredUsersKPI(filteredTasks, activityMap, periodStart, periodEnd);
      
      // Calculate completion stats from filtered tasks
      const completedTasks = filteredTasks.filter(t => t.status === "Hoàn thành");
      const completionRate = filteredTasks.length > 0
        ? parseFloat(((completedTasks.length / filteredTasks.length) * 100).toFixed(1))
        : 0;
      
      // Calculate overall stats from filtered data
      const avgKpi = allUsersKpi.length > 0
        ? parseFloat((allUsersKpi.reduce((sum: number, u) => sum + u.kpi, 0) / allUsersKpi.length).toFixed(1))
        : 0;
      
      // Calculate KPI for each department with cached activity data
      const kpiByDepartment = await Promise.all(
        departments.map(async (dept) => {
          const deptTasks = tasksByDepartment.get(dept.id) || [];
          const deptKpi = await calculateFilteredUsersKPI(deptTasks, activityMap, periodStart, periodEnd);
          const deptAvgKpi = deptKpi.length > 0
            ? parseFloat((deptKpi.reduce((sum: number, u) => sum + u.kpi, 0) / deptKpi.length).toFixed(1))
            : 0;
          
          return {
            departmentId: dept.id,
            departmentName: dept.name,
            departmentCode: dept.code,
            avgKpi: deptAvgKpi,
            userCount: deptKpi.length,
          };
        })
      );
      
      // Sort departments by avgKpi descending
      kpiByDepartment.sort((a, b) => b.avgKpi - a.avgKpi);
      
      // Top performers (top 10) from filtered data
      const topPerformers = allUsersKpi.slice(0, 10);
      
      // Monthly trend: Calculate from filtered tasks
      const monthlyTrend = [];
      const currentDate = new Date();
      
      // Determine the date range for monthly trend based on filters
      let trendStartDate: Date;
      let trendEndDate: Date;
      
      if (year && year !== "all") {
        // If year is selected, show all months in that year
        const selectedYear = parseInt(year as string);
        trendStartDate = new Date(selectedYear, 0, 1); // Jan 1
        trendEndDate = new Date(selectedYear, 11, 31); // Dec 31
      } else {
        // Show last 12 months
        trendStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);
        trendEndDate = currentDate;
      }
      
      // If specific month is selected, only show that month
      if (month && month !== "all") {
        const selectedMonth = parseInt(month as string);
        const selectedYear = year && year !== "all" ? parseInt(year as string) : currentDate.getFullYear();
        trendStartDate = new Date(selectedYear, selectedMonth - 1, 1);
        trendEndDate = new Date(selectedYear, selectedMonth, 0); // Last day of month
      }
      
      // Generate monthly data points
      const monthsDiff = (trendEndDate.getFullYear() - trendStartDate.getFullYear()) * 12 + 
                        (trendEndDate.getMonth() - trendStartDate.getMonth());
      const monthsToShow = Math.min(monthsDiff + 1, 12); // Max 12 months
      
      for (let i = 0; i < monthsToShow; i++) {
        const targetDate = new Date(trendStartDate.getFullYear(), trendStartDate.getMonth() + i, 1);
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth() + 1;
        const period = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
        
        // Filter tasks by completion/activity dates in this month
        const monthTasks = filteredTasks.filter(t => {
          // Completed tasks: use completedAt
          if (t.status === "Hoàn thành" && t.completedAt) {
            const completedDate = new Date(t.completedAt);
            return completedDate.getFullYear() === targetYear && 
                   completedDate.getMonth() + 1 === targetMonth;
          }
          
          // In-progress/not started: use createdAt
          const taskDate = new Date(t.createdAt);
          return taskDate.getFullYear() === targetYear && 
                 taskDate.getMonth() + 1 === targetMonth;
        });
        
        const monthCompleted = monthTasks.filter(t => t.status === "Hoàn thành");
        
        // Calculate completion rate as proxy for KPI (scale to 0-100)
        const monthCompletionRate = monthTasks.length > 0
          ? (monthCompleted.length / monthTasks.length) * 100
          : 0;
        
        monthlyTrend.push({
          month: period,
          avgKpi: parseFloat(monthCompletionRate.toFixed(1)),
        });
      }
      
      res.json({
        overallStats: {
          avgKpi,
          totalTasks: filteredTasks.length,
          completedTasks: completedTasks.length,
          completionRate,
          totalDepartments: departments.length,
          totalUsers: allUsersKpi.length,
        },
        kpiByDepartment,
        topPerformers,
        monthlyTrend,
      });
    } catch (error) {
      console.error("Get KPI stats error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/ai/evaluate-task/:taskId", requireAuth, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.taskId);
      
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }
      
      const progressUpdates = await storage.getProgressUpdates(req.params.taskId);
      const comments = await storage.getComments(req.params.taskId);
      
      const evaluation = await aiService.evaluateTaskQuality(task, progressUpdates, comments);
      
      res.json(evaluation);
    } catch (error) {
      console.error("AI evaluate task error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/ai/detect-risks/:taskId", requireAuth, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.taskId);
      
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }
      
      const progressUpdates = await storage.getProgressUpdates(req.params.taskId);
      const risks = await aiService.detectTaskRisks(task, progressUpdates);
      
      res.json(risks);
    } catch (error) {
      console.error("AI detect risks error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/ai/risks/me", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Get user's active task assignments
      const assignments = await storage.getUserTaskAssignments(userId);
      const tasks = await Promise.all(
        assignments.map(a => storage.getTask(a.taskId))
      );
      const activeTasks = tasks.filter(t => t && t.status !== "Hoàn thành" && !t.deletedAt);
      
      // Get risks for each task
      const risksWithTasks = await Promise.all(
        activeTasks.map(async (task) => {
          if (!task) return [];
          const progressUpdates = await storage.getProgressUpdates(task.id);
          const risks = await aiService.detectTaskRisks(task, progressUpdates);
          
          return risks.map(risk => ({
            ...risk,
            taskId: task.id,
            taskTitle: task.title,
            taskNumber: task.taskNumber,
          }));
        })
      );
      
      // Flatten and sort by severity
      const allRisks = risksWithTasks.flat();
      const severityOrder = { high: 0, medium: 1, low: 2 };
      allRisks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      
      res.json(allRisks);
    } catch (error) {
      console.error("AI risks/me error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/ai/suggest-reassignment/:userId", requireAuth, async (req, res) => {
    try {
      const suggestion = await aiService.suggestTaskReassignment(req.params.userId);
      
      res.json(suggestion);
    } catch (error) {
      console.error("AI suggest reassignment error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/ai/daily-summary/:userId", requireAuth, async (req, res) => {
    try {
      const summary = await aiService.generateDailyTaskSummary(req.params.userId);
      
      res.json({ summary });
    } catch (error) {
      console.error("AI daily summary error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/ai/scan-all-risks", requireAuth, async (req, res) => {
    try {
      const filters = req.query.departmentId 
        ? { departmentId: req.query.departmentId as string } 
        : {};
      
      const tasks = await storage.getTasks(filters);
      
      const allRisks = await Promise.all(
        tasks.map(async (task) => {
          const progressUpdates = await storage.getProgressUpdates(task.id);
          const risks = await aiService.detectTaskRisks(task, progressUpdates);
          
          if (risks.length > 0) {
            const assignments = await storage.getTaskAssignments(task.id);
            
            // Find người chủ trì (primary person responsible)
            const primaryAssignment = assignments.find(a => a.assignmentRole === "Chủ trì");
            
            // Get department leadership if task has department
            let departmentLeaders: any[] = [];
            if (task.departmentId) {
              const allUsers = await storage.getUsers();
              departmentLeaders = allUsers.filter(u => 
                u.departmentId === task.departmentId && 
                (u.role === "Trưởng phòng" || u.role === "Phó Trưởng phòng")
              );
            }
            
            // Create alerts for primary assignment and department leaders
            const usersToAlert = new Set<string>();
            if (primaryAssignment) {
              usersToAlert.add(primaryAssignment.userId);
            }
            departmentLeaders.forEach(leader => usersToAlert.add(leader.id));
            
            // Create one alert per risk type per task (no duplicates)
            for (const risk of risks) {
              // Check if alert already exists for this task+type combination
              const existingAlerts = await storage.getAiAlerts(undefined, "pending");
              const hasSameAlert = existingAlerts.some(alert => 
                alert.taskId === task.id && 
                alert.type === risk.type
              );
              
              if (!hasSameAlert) {
                // Create alerts for all relevant users
                for (const userId of usersToAlert) {
                  await storage.createAiAlert({
                    taskId: task.id,
                    userId: userId,
                    type: risk.type,
                    reason: risk.reason,
                    suggestion: risk.suggestion,
                    status: "pending",
                  });
                }
              }
            }
          }
          
          return { taskId: task.id, taskTitle: task.title, risks };
        })
      );
      
      const tasksWithRisks = allRisks.filter(r => r.risks.length > 0);
      
      res.json({
        scannedTasks: tasks.length,
        tasksWithRisks: tasksWithRisks.length,
        risks: tasksWithRisks,
      });
    } catch (error) {
      console.error("AI scan all risks error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/ai/dashboard-suggestions", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const dismissedTypes = req.query.dismissed 
        ? (req.query.dismissed as string).split(',').filter(Boolean)
        : [];

      const suggestions = await aiService.generateDashboardSuggestions(
        req.user.id,
        req.user.role,
        dismissedTypes
      );

      res.json(suggestions);
    } catch (error) {
      console.error("Dashboard suggestions error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Get AI alerts for current user with task details
  app.get("/api/ai-alerts", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const status = (req.query.status as string) || 'pending';
      
      let alerts: any[];
      
      // Role-based filtering
      if (req.user.role === "Giám đốc" || req.user.role === "Phó Giám đốc") {
        // Leadership sees ALL alerts
        alerts = await storage.getAiAlerts(undefined, status);
      } else if (req.user.role === "Trưởng phòng" || req.user.role === "Phó Trưởng phòng") {
        // Department leadership sees alerts for their department's tasks
        const allAlerts = await storage.getAiAlerts(undefined, status);
        const alertsWithDepts = await Promise.all(
          allAlerts.map(async (alert) => {
            const task = await storage.getTask(alert.taskId);
            return { ...alert, departmentId: task?.departmentId };
          })
        );
        alerts = alertsWithDepts.filter(a => a.departmentId === req.user!.departmentId);
      } else {
        // Staff sees only their own alerts
        alerts = await storage.getAiAlerts(req.user.id, status);
      }
      
      // Enrich alerts with task information
      const alertsWithTasks = await Promise.all(
        alerts.map(async (alert) => {
          const task = await storage.getTask(alert.taskId);
          return {
            ...alert,
            taskTitle: task?.title || "Unknown",
            taskNumber: task?.taskNumber || "Unknown",
          };
        })
      );

      res.json(alertsWithTasks);
    } catch (error) {
      console.error("Get AI alerts error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Get count of pending AI alerts for current user
  app.get("/api/ai-alerts/pending-count", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let count = 0;
      
      if (req.user.role === "Giám đốc" || req.user.role === "Phó Giám đốc") {
        // Leadership sees count of ALL alerts
        const allAlerts = await storage.getAiAlerts(undefined, 'pending');
        count = allAlerts.length;
      } else if (req.user.role === "Trưởng phòng" || req.user.role === "Phó Trưởng phòng") {
        // Department leadership sees count for their department's tasks
        const allAlerts = await storage.getAiAlerts(undefined, 'pending');
        const alertsWithDepts = await Promise.all(
          allAlerts.map(async (alert) => {
            const task = await storage.getTask(alert.taskId);
            return { ...alert, departmentId: task?.departmentId };
          })
        );
        const deptAlerts = alertsWithDepts.filter(a => a.departmentId === req.user!.departmentId);
        count = deptAlerts.length;
      } else {
        // Staff sees count of their own alerts
        const alerts = await storage.getAiAlerts(req.user.id, 'pending');
        count = alerts.length;
      }

      res.json({ count });
    } catch (error) {
      console.error("Get pending alerts count error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // Get count of new department tasks (status = "Chưa bắt đầu")
  app.get("/api/tasks/department/new-count", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Only for department heads and staff
      if (!req.user.departmentId) {
        return res.json({ count: 0 });
      }

      const tasks = await storage.getTasks({ 
        departmentId: req.user.departmentId,
        status: "Chưa bắt đầu"
      });

      res.json({ count: tasks.length });
    } catch (error) {
      console.error("Get new department tasks count error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/tasks/:id/files", requireAuth, upload.array("files", 5), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: "Không có file được upload" });
      }

      const uploadedFiles = await Promise.all(
        req.files.map(async (file) => {
          const fileRecord = await storage.createFile({
            taskId: req.params.id,
            userId: req.user!.id,
            filename: file.filename,
            originalName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
          });
          return fileRecord;
        })
      );

      res.json(uploadedFiles);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Lỗi upload file" });
    }
  });

  app.get("/api/tasks/:id/files", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }
      
      const assignments = await storage.getTaskAssignments(req.params.id);
      const isAssigned = assignments.some(a => a.userId === req.user!.id);
      const isLeader = ["Giám đốc", "Phó Giám đốc"].includes(req.user.role);
      const isDeptHead = req.user.role === "Trưởng phòng" && req.user.departmentId === task.departmentId;
      
      if (!isAssigned && !isLeader && !isDeptHead) {
        return res.status(403).json({ error: "Bạn không có quyền xem files của nhiệm vụ này" });
      }
      
      const files = await storage.getFiles(req.params.id);
      res.json(files);
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/files/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const targetFile = await storage.getFile(req.params.id);
      if (!targetFile) {
        return res.status(404).json({ error: "Không tìm thấy file" });
      }
      
      const task = await storage.getTask(targetFile.taskId);
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }
      
      const assignments = await storage.getTaskAssignments(task.id);
      const isAssigned = assignments.some(a => a.userId === req.user!.id);
      const isLeader = ["Giám đốc", "Phó Giám đốc"].includes(req.user.role);
      const isDeptHead = req.user.role === "Trưởng phòng" && req.user.departmentId === task.departmentId;
      
      if (!isAssigned && !isLeader && !isDeptHead) {
        return res.status(403).json({ error: "Bạn không có quyền xem file này" });
      }
      
      const filePath = getFilePath(targetFile.filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File không tồn tại trên hệ thống" });
      }
      
      const ext = targetFile.originalName.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
      };
      
      const contentType = mimeTypes[ext || ''] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Preview file error:", error);
      res.status(500).json({ error: "Lỗi xem file" });
    }
  });

  app.get("/api/files/:id/download", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const targetFile = await storage.getFile(req.params.id);
      if (!targetFile) {
        return res.status(404).json({ error: "Không tìm thấy file" });
      }
      
      const task = await storage.getTask(targetFile.taskId);
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }
      
      const assignments = await storage.getTaskAssignments(task.id);
      const isAssigned = assignments.some(a => a.userId === req.user!.id);
      const isLeader = ["Giám đốc", "Phó Giám đốc"].includes(req.user.role);
      const isDeptHead = req.user.role === "Trưởng phòng" && req.user.departmentId === task.departmentId;
      
      if (!isAssigned && !isLeader && !isDeptHead) {
        return res.status(403).json({ error: "Bạn không có quyền tải file này" });
      }
      
      const filePath = getFilePath(targetFile.filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File không tồn tại trên hệ thống" });
      }
      
      res.download(filePath, targetFile.originalName);
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).json({ error: "Lỗi tải file" });
    }
  });

  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const targetFile = await storage.getFile(req.params.id);
      if (!targetFile) {
        return res.status(404).json({ error: "Không tìm thấy file" });
      }
      
      const task = await storage.getTask(targetFile.taskId);
      if (!task) {
        return res.status(404).json({ error: "Không tìm thấy nhiệm vụ" });
      }
      
      const assignments = await storage.getTaskAssignments(task.id);
      const isAssigned = assignments.some(a => a.userId === req.user!.id);
      const isLeader = ["Giám đốc", "Phó Giám đốc"].includes(req.user.role);
      const isDeptHead = req.user.role === "Trưởng phòng" && req.user.departmentId === task.departmentId;
      
      if (!isAssigned && !isLeader && !isDeptHead) {
        return res.status(403).json({ error: "Bạn không có quyền xóa file này" });
      }
      
      if (targetFile.userId !== req.user.id && !isLeader && !isDeptHead) {
        return res.status(403).json({ error: "Chỉ người upload mới có thể xóa file này" });
      }
      
      deleteFile(targetFile.filename);
      
      await storage.deleteFile(req.params.id);
      
      res.json({ message: "Đã xóa file" });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ error: "Lỗi xóa file" });
    }
  });

  // ============= TASK REPORTS API =============
  
  app.get("/api/reports/tasks", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { timeRange, year, month, quarter, week, departmentId, status } = req.query;

      // Validate timeRange
      const validTimeRanges = ["week", "month", "quarter", "year"];
      if (!timeRange || !validTimeRanges.includes(timeRange as string)) {
        return res.status(400).json({ error: "Invalid time range" });
      }

      const filters: TaskReportFilters = {
        timeRange: timeRange as "week" | "month" | "quarter" | "year",
        year: year ? parseInt(year as string) : undefined,
        month: month ? parseInt(month as string) : undefined,
        quarter: quarter ? parseInt(quarter as string) : undefined,
        week: week ? parseInt(week as string) : undefined,
        departmentId: departmentId as string,
        status: status as string,
      };

      const stats = await calculateTaskReportStats(filters);

      res.json(stats);
    } catch (error) {
      console.error("Get task reports error:", error);
      res.status(500).json({ error: "Lỗi lấy báo cáo" });
    }
  });

  app.post("/api/reports/tasks/insights", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { stats } = req.body;
      
      if (!stats) {
        return res.status(400).json({ error: "Missing stats data" });
      }

      const insights = await aiService.generateTaskReportInsights(stats);

      res.json(insights);
    } catch (error) {
      console.error("Generate AI insights error:", error);
      res.status(500).json({ error: "Lỗi tạo phân tích AI" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
