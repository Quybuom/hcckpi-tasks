var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/telegram-service.ts
var telegram_service_exports = {};
__export(telegram_service_exports, {
  notifyDeadlineSoon: () => notifyDeadlineSoon,
  notifyNewComment: () => notifyNewComment,
  notifyNewTask: () => notifyNewTask,
  notifyTaskOverdue: () => notifyTaskOverdue,
  sendAIAlertsToGroup: () => sendAIAlertsToGroup,
  sendAISuggestionsToGroup: () => sendAISuggestionsToGroup,
  sendMonthlyKPIToGroup: () => sendMonthlyKPIToGroup,
  sendTestNotification: () => sendTestNotification,
  sendWeeklyKPIToGroup: () => sendWeeklyKPIToGroup
});
async function sendTelegramMessage(chatId, message) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("Telegram Bot Token not configured");
    return false;
  }
  if (!chatId) {
    return false;
  }
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML"
    };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json();
      console.error("Telegram API error:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return false;
  }
}
async function notifyNewTask(task, assignee, creator, assignmentRole) {
  if (!assignee.telegramId || !assignee.notifyOnNewTask) {
    return;
  }
  const roleEmoji = {
    "Ch\u1EE7 tr\xEC": "\u{1F3AF}",
    "Ph\u1ED1i h\u1EE3p": "\u{1F91D}",
    "Ch\u1EC9 \u0111\u1EA1o": "\u{1F454}"
  };
  const priorityEmoji = {
    "Kh\u1EA9n c\u1EA5p": "\u{1F534}",
    "Quan tr\u1ECDng": "\u{1F7E1}",
    "B\xECnh th\u01B0\u1EDDng": "\u{1F7E2}"
  };
  const message = `
\u{1F514} <b>Nhi\u1EC7m v\u1EE5 m\u1EDBi!</b>

\u{1F4CB} <b>${task.title}</b>
${task.description ? `\u{1F4DD} ${task.description.substring(0, 100)}${task.description.length > 100 ? "..." : ""}` : ""}

${roleEmoji[assignmentRole]} Vai tr\xF2: <b>${assignmentRole}</b>
\u{1F464} Ng\u01B0\u1EDDi giao: ${creator.fullName}
\u{1F4C5} Deadline: ${new Date(task.deadline).toLocaleDateString("vi-VN")}
${priorityEmoji[task.priority]} \u01AFu ti\xEAn: ${task.priority}

\u{1F449} <a href="${APP_URL}/tasks/${task.id}">Xem chi ti\u1EBFt</a>
  `.trim();
  await sendTelegramMessage(assignee.telegramId, message);
}
async function notifyDeadlineSoon(task, assignee, daysRemaining) {
  if (!assignee.telegramId || !assignee.notifyOnDeadline) {
    return;
  }
  const urgencyEmoji = daysRemaining <= 1 ? "\u{1F6A8}" : "\u23F0";
  const dayText = daysRemaining === 0 ? "H\xD4M NAY" : daysRemaining === 1 ? "1 NG\xC0Y" : `${daysRemaining} NG\xC0Y`;
  const message = `
${urgencyEmoji} <b>Deadline s\u1EAFp \u0111\u1EBFn!</b>

\u{1F4CB} <b>${task.title}</b>
\u23F3 C\xF2n l\u1EA1i: <b>${dayText}</b>
\u{1F4CA} Ti\u1EBFn \u0111\u1ED9 hi\u1EC7n t\u1EA1i: ${task.progress}%
\u{1F4C5} Deadline: ${new Date(task.deadline).toLocaleDateString("vi-VN")}

${task.progress < 50 && daysRemaining <= 1 ? "\u26A0\uFE0F Ti\u1EBFn \u0111\u1ED9 ch\u1EADm, c\u1EA7n \u0111\u1EA9y nhanh!" : ""}

\u{1F449} <a href="${APP_URL}/tasks/${task.id}">C\u1EADp nh\u1EADt ngay</a>
  `.trim();
  await sendTelegramMessage(assignee.telegramId, message);
}
async function notifyNewComment(task, assignee, commenter, commentContent) {
  if (!assignee.telegramId || !assignee.notifyOnComment) {
    return;
  }
  if (assignee.id === commenter.id) {
    return;
  }
  const truncatedComment = commentContent.length > 100 ? commentContent.substring(0, 100) + "..." : commentContent;
  const message = `
\u{1F4AC} <b>B\xECnh lu\u1EADn m\u1EDBi!</b>

\u{1F4CB} Task: <b>${task.title}</b>
\u{1F464} ${commenter.fullName} \u0111\xE3 b\xECnh lu\u1EADn:
"${truncatedComment}"

\u{1F449} <a href="${APP_URL}/tasks/${task.id}">Xem & Tr\u1EA3 l\u1EDDi</a>
  `.trim();
  await sendTelegramMessage(assignee.telegramId, message);
}
async function notifyTaskOverdue(task, assignee) {
  if (!assignee.telegramId || !assignee.notifyOnDeadline) {
    return;
  }
  const message = `
\u{1F534} <b>TASK QU\xC1 H\u1EA0N!</b>

\u{1F4CB} <b>${task.title}</b>
\u{1F4C5} Deadline: ${new Date(task.deadline).toLocaleDateString("vi-VN")}
\u{1F4CA} Ti\u1EBFn \u0111\u1ED9: ${task.progress}%
\u26A0\uFE0F Tr\u1EA1ng th\xE1i: <b>Qu\xE1 h\u1EA1n</b>

Vui l\xF2ng c\u1EADp nh\u1EADt ti\u1EBFn \u0111\u1ED9 ho\u1EB7c b\xE1o c\xE1o l\xFD do ch\u1EADm tr\u1EC5.

\u{1F449} <a href="${APP_URL}/tasks/${task.id}">X\u1EED l\xFD ngay</a>
  `.trim();
  await sendTelegramMessage(assignee.telegramId, message);
}
async function sendTestNotification(chatId) {
  const message = `
\u2705 <b>K\u1EBFt n\u1ED1i th\xE0nh c\xF4ng!</b>

B\u1EA1n \u0111\xE3 c\u1EA5u h\xECnh Telegram notifications th\xE0nh c\xF4ng.

T\u1EEB gi\u1EDD b\u1EA1n s\u1EBD nh\u1EADn th\xF4ng b\xE1o khi:
\u{1F514} C\xF3 task m\u1EDBi \u0111\u01B0\u1EE3c giao
\u23F0 Deadline s\u1EAFp \u0111\u1EBFn
\u{1F4AC} C\xF3 ng\u01B0\u1EDDi b\xECnh lu\u1EADn v\xE0o task

TT PVHCC B\u1EAFc Ninh
  `.trim();
  return await sendTelegramMessage(chatId, message);
}
async function sendAISuggestionsToGroup(groupChatId, suggestions) {
  if (!groupChatId || suggestions.length === 0) {
    return false;
  }
  const suggestionText = suggestions.slice(0, 5).map((s, i) => `${i + 1}. ${s.suggestion}`).join("\n");
  const message = `
\u{1F916} <b>\u0110\u1EC0 XU\u1EA4T T\u1EEA AI - S\xE1ng ${(/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")}</b>

${suggestionText}

\u{1F4CA} Xem chi ti\u1EBFt t\u1EA1i Dashboard
  `.trim();
  return await sendTelegramMessage(groupChatId, message);
}
async function sendAIAlertsToGroup(groupChatId, alerts) {
  if (!groupChatId || alerts.length === 0) {
    return false;
  }
  const highRiskAlerts = alerts.filter((a) => a.severity === "high");
  const mediumRiskAlerts = alerts.filter((a) => a.severity === "medium");
  const alertText = [];
  if (highRiskAlerts.length > 0) {
    alertText.push(`\u{1F534} <b>R\u1EE6I RO CAO (${highRiskAlerts.length})</b>`);
    highRiskAlerts.slice(0, 3).forEach((a) => {
      alertText.push(`\u2022 ${a.taskTitle}: ${a.riskDescription}`);
    });
  }
  if (mediumRiskAlerts.length > 0) {
    alertText.push(`
\u{1F7E1} <b>R\u1EE6I RO TRUNG B\xCCNH (${mediumRiskAlerts.length})</b>`);
    mediumRiskAlerts.slice(0, 3).forEach((a) => {
      alertText.push(`\u2022 ${a.taskTitle}`);
    });
  }
  const message = `
\u26A0\uFE0F <b>C\u1EA2NH B\xC1O R\u1EE6I RO AI - ${(/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")}</b>

${alertText.join("\n")}

\u{1F449} Xem chi ti\u1EBFt t\u1EA1i trang AI Alerts
  `.trim();
  return await sendTelegramMessage(groupChatId, message);
}
async function sendWeeklyKPIToGroup(groupChatId, departmentName, weeklyKPI, topPerformers) {
  if (!groupChatId) {
    return false;
  }
  const performersText = topPerformers.slice(0, 5).map((p, i) => `${i + 1}. ${p.fullName}: ${p.score.toFixed(1)} \u0111i\u1EC3m`).join("\n");
  const message = `
\u{1F4CA} <b>B\xC1O C\xC1O KPI TU\u1EA6N - ${departmentName}</b>

\u{1F4C5} Tu\u1EA7n: ${(/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")}
\u2B50 \u0110i\u1EC3m KPI trung b\xECnh: <b>${weeklyKPI.toFixed(1)}</b>

\u{1F3C6} <b>Top 5 xu\u1EA5t s\u1EAFc:</b>
${performersText}

\u{1F449} Xem chi ti\u1EBFt t\u1EA1i Dashboard
  `.trim();
  return await sendTelegramMessage(groupChatId, message);
}
async function sendMonthlyKPIToGroup(groupChatId, departmentName, monthlyKPI, summary) {
  if (!groupChatId) {
    return false;
  }
  const message = `
\u{1F4C8} <b>B\xC1O C\xC1O KPI TH\xC1NG - ${departmentName}</b>

\u{1F4C5} Th\xE1ng: ${(/* @__PURE__ */ new Date()).getMonth() + 1}/${(/* @__PURE__ */ new Date()).getFullYear()}
\u2B50 \u0110i\u1EC3m KPI trung b\xECnh: <b>${monthlyKPI.toFixed(1)}</b>

\u{1F4CB} T\u1ED5ng k\u1EBFt:
\u2022 Ho\xE0n th\xE0nh: ${summary.completed} task
\u2022 \u0110ang th\u1EF1c hi\u1EC7n: ${summary.inProgress} task
\u2022 Qu\xE1 h\u1EA1n: ${summary.overdue} task

\u{1F449} Xem b\xE1o c\xE1o chi ti\u1EBFt t\u1EA1i Dashboard
  `.trim();
  return await sendTelegramMessage(groupChatId, message);
}
var TELEGRAM_BOT_TOKEN, APP_URL;
var init_telegram_service = __esm({
  "server/telegram-service.ts"() {
    "use strict";
    TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
    APP_URL = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : "http://localhost:5000";
  }
});

// server/index.ts
import express2 from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// server/routes.ts
import { createServer } from "http";

// server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  aiAlerts: () => aiAlerts,
  checklistItems: () => checklistItems,
  checklistTemplateItems: () => checklistTemplateItems,
  checklistTemplates: () => checklistTemplates,
  comments: () => comments,
  departments: () => departments,
  files: () => files,
  insertAiAlertSchema: () => insertAiAlertSchema,
  insertChecklistItemSchema: () => insertChecklistItemSchema,
  insertChecklistTemplateItemSchema: () => insertChecklistTemplateItemSchema,
  insertChecklistTemplateSchema: () => insertChecklistTemplateSchema,
  insertCommentSchema: () => insertCommentSchema,
  insertDepartmentSchema: () => insertDepartmentSchema,
  insertFileSchema: () => insertFileSchema,
  insertKpiScoreSchema: () => insertKpiScoreSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertProgressUpdateSchema: () => insertProgressUpdateSchema,
  insertTaskAssignmentSchema: () => insertTaskAssignmentSchema,
  insertTaskEvaluationSchema: () => insertTaskEvaluationSchema,
  insertTaskSchema: () => insertTaskSchema,
  insertTelegramDeadlineNotificationSchema: () => insertTelegramDeadlineNotificationSchema,
  insertUserSchema: () => insertUserSchema,
  kpiScores: () => kpiScores,
  notifications: () => notifications,
  progressUpdates: () => progressUpdates,
  taskAssignments: () => taskAssignments,
  taskEvaluations: () => taskEvaluations,
  taskSequences: () => taskSequences,
  tasks: () => tasks,
  telegramDeadlineNotifications: () => telegramDeadlineNotifications,
  userRoles: () => userRoles,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  assignedDeputyDirectorId: varchar("assigned_deputy_director_id").references(() => users.id),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  departmentId: varchar("department_id").references(() => departments.id),
  telegramId: text("telegram_id"),
  groupTelegramChatId: text("group_telegram_chat_id"),
  position: text("position"),
  isSystemAdmin: boolean("is_system_admin").notNull().default(false),
  notifyOnNewTask: boolean("notify_on_new_task").notNull().default(true),
  notifyOnDeadline: boolean("notify_on_deadline").notNull().default(true),
  notifyOnComment: boolean("notify_on_comment").notNull().default(true),
  notifyOnScheduledAISuggestions: boolean("notify_on_scheduled_ai_suggestions").notNull().default(false),
  notifyOnScheduledAIAlerts: boolean("notify_on_scheduled_ai_alerts").notNull().default(false),
  notifyOnScheduledWeeklyKPI: boolean("notify_on_scheduled_weekly_kpi").notNull().default(false),
  notifyOnScheduledMonthlyKPI: boolean("notify_on_scheduled_monthly_kpi").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskNumber: text("task_number").unique(),
  title: text("title").notNull(),
  description: text("description"),
  deadline: timestamp("deadline").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull().default("Ch\u01B0a b\u1EAFt \u0111\u1EA7u"),
  progress: integer("progress").notNull().default(0),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  departmentId: varchar("department_id").references(() => departments.id),
  parentTaskId: varchar("parent_task_id").references(() => tasks.id),
  completedAt: timestamp("completed_at"),
  leadershipScore: decimal("leadership_score", { precision: 3, scale: 1 }),
  evaluatedById: varchar("evaluated_by_id").references(() => users.id),
  evaluatedAt: timestamp("evaluated_at"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => ({
  parentTaskIdIdx: index("parent_task_id_idx").on(table.parentTaskId)
}));
var taskAssignments = pgTable("task_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  collaborationCompleted: boolean("collaboration_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var taskEvaluations = pgTable("task_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  assignmentId: varchar("assignment_id").notNull().references(() => taskAssignments.id, { onDelete: "cascade" }),
  evaluatorId: varchar("evaluator_id").notNull().references(() => users.id),
  score: decimal("score", { precision: 3, scale: 1 }).notNull(),
  comments: text("comments"),
  evaluatedAt: timestamp("evaluated_at").defaultNow().notNull()
}, (table) => ({
  uniqueTaskAssignment: uniqueIndex("unique_task_assignment").on(table.taskId, table.assignmentId)
}));
var progressUpdates = pgTable("progress_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  updateType: text("update_type").notNull(),
  content: text("content"),
  progressPercent: integer("progress_percent"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var checklistItems = pgTable("checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
});
var kpiScores = pgTable("kpi_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  completionScore: decimal("completion_score", { precision: 5, scale: 2 }).notNull(),
  qualityScore: decimal("quality_score", { precision: 5, scale: 2 }).notNull(),
  totalScore: decimal("total_score", { precision: 5, scale: 2 }).notNull(),
  roleMultiplier: decimal("role_multiplier", { precision: 3, scale: 2 }).notNull(),
  priorityMultiplier: decimal("priority_multiplier", { precision: 3, scale: 2 }).notNull(),
  finalScore: decimal("final_score", { precision: 5, scale: 2 }).notNull(),
  period: text("period").notNull(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull()
});
var aiAlerts = pgTable("ai_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  reason: text("reason").notNull(),
  suggestion: text("suggestion"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var telegramDeadlineNotifications = pgTable("telegram_deadline_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  milestone: text("milestone").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull()
}, (table) => ({
  uniqueNotification: uniqueIndex("telegram_deadline_notifications_unique_idx").on(table.taskId, table.userId, table.milestone)
}));
var taskSequences = pgTable("task_sequences", {
  year: integer("year").primaryKey(),
  lastSequence: integer("last_sequence").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => ({
  // Partial unique index: only one template can have isDefault = true
  uniqueDefault: sql`CREATE UNIQUE INDEX IF NOT EXISTS unique_default_template ON ${table} (is_default) WHERE is_default = true`
}));
var checklistTemplateItems = pgTable("checklist_template_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => checklistTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  isDeleted: true,
  deletedAt: true,
  deletedById: true,
  createdAt: true,
  updatedAt: true
});
var userRoles = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c", "Tr\u01B0\u1EDFng ph\xF2ng", "Ph\xF3 tr\u01B0\u1EDFng ph\xF2ng", "Chuy\xEAn vi\xEAn"];
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isDeleted: true,
  deletedAt: true,
  deletedById: true,
  createdAt: true,
  updatedAt: true
}).extend({
  role: z.enum(userRoles)
});
var insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  taskNumber: true,
  createdAt: true,
  updatedAt: true
}).extend({
  leadershipScore: z.number().min(0).max(10).optional().nullable()
});
var insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({
  id: true,
  createdAt: true
});
var insertTaskEvaluationSchema = createInsertSchema(taskEvaluations).omit({
  id: true,
  evaluatedAt: true
}).extend({
  score: z.number().min(0).max(10)
});
var insertProgressUpdateSchema = createInsertSchema(progressUpdates).omit({
  id: true,
  createdAt: true
});
var insertChecklistItemSchema = createInsertSchema(checklistItems).omit({
  id: true,
  createdAt: true
});
var insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true
});
var insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadedAt: true
});
var insertKpiScoreSchema = createInsertSchema(kpiScores).omit({
  id: true,
  calculatedAt: true
});
var insertAiAlertSchema = createInsertSchema(aiAlerts).omit({
  id: true,
  createdAt: true
});
var insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});
var insertTelegramDeadlineNotificationSchema = createInsertSchema(telegramDeadlineNotifications).omit({
  id: true,
  sentAt: true
});
var insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({
  id: true,
  createdAt: true
});
var insertChecklistTemplateItemSchema = createInsertSchema(checklistTemplateItems).omit({
  id: true,
  createdAt: true
});

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}
var connection = postgres(process.env.DATABASE_URL);
var db = drizzle(connection, { schema: schema_exports });

// server/storage.ts
import { eq, and, desc, sql as sql2, inArray, ne, not } from "drizzle-orm";
var DbStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(and(
      eq(users.id, id),
      eq(users.isDeleted, false)
    ));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(and(
      eq(users.username, username),
      eq(users.isDeleted, false)
    ));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id, updateData) {
    const [updated] = await db.update(users).set({
      ...updateData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, id)).returning();
    return updated;
  }
  async updateUserTelegramSettings(userId, telegramId, groupTelegramChatId, notifyOnNewTask, notifyOnDeadline, notifyOnComment, notifyOnScheduledAISuggestions, notifyOnScheduledAIAlerts, notifyOnScheduledWeeklyKPI, notifyOnScheduledMonthlyKPI) {
    await db.update(users).set({
      telegramId,
      groupTelegramChatId,
      notifyOnNewTask,
      notifyOnDeadline,
      notifyOnComment,
      notifyOnScheduledAISuggestions,
      notifyOnScheduledAIAlerts,
      notifyOnScheduledWeeklyKPI,
      notifyOnScheduledMonthlyKPI,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
  }
  async deleteUser(id, deletedById) {
    const assignments = await db.select().from(taskAssignments).where(eq(taskAssignments.userId, id)).limit(1);
    if (assignments.length > 0) {
      throw new Error("Kh\xF4ng th\u1EC3 x\xF3a c\xE1n b\u1ED9 v\xEC c\xF2n nhi\u1EC7m v\u1EE5 \u0111\u01B0\u1EE3c giao. Vui l\xF2ng chuy\u1EC3n giao nhi\u1EC7m v\u1EE5 tr\u01B0\u1EDBc.");
    }
    const [deleted] = await db.update(users).set({
      isDeleted: true,
      deletedAt: /* @__PURE__ */ new Date(),
      deletedById
    }).where(eq(users.id, id)).returning();
    return deleted;
  }
  async getUsers(filters) {
    const conditions = [];
    if (filters?.departmentId) {
      conditions.push(eq(users.departmentId, filters.departmentId));
    }
    if (filters?.role) {
      conditions.push(eq(users.role, filters.role));
    }
    conditions.push(eq(users.isDeleted, false));
    conditions.push(eq(users.isSystemAdmin, false));
    const query = db.select({
      id: users.id,
      username: users.username,
      password: users.password,
      fullName: users.fullName,
      role: users.role,
      departmentId: users.departmentId,
      telegramId: users.telegramId,
      groupTelegramChatId: users.groupTelegramChatId,
      notifyOnNewTask: users.notifyOnNewTask,
      notifyOnDeadline: users.notifyOnDeadline,
      notifyOnComment: users.notifyOnComment,
      notifyOnScheduledAISuggestions: users.notifyOnScheduledAISuggestions,
      notifyOnScheduledAIAlerts: users.notifyOnScheduledAIAlerts,
      notifyOnScheduledWeeklyKPI: users.notifyOnScheduledWeeklyKPI,
      notifyOnScheduledMonthlyKPI: users.notifyOnScheduledMonthlyKPI,
      position: users.position,
      isSystemAdmin: users.isSystemAdmin,
      isDeleted: users.isDeleted,
      deletedAt: users.deletedAt,
      deletedById: users.deletedById,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      departmentName: departments.name
    }).from(users).leftJoin(departments, eq(users.departmentId, departments.id));
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }
  async getDepartments() {
    return await db.select().from(departments).where(eq(departments.isDeleted, false));
  }
  async getDepartment(id) {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department;
  }
  async createDepartment(department) {
    const [result] = await db.insert(departments).values(department).returning();
    return result;
  }
  async updateDepartment(id, updateData) {
    const [updated] = await db.update(departments).set({
      ...updateData,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(departments.id, id)).returning();
    return updated;
  }
  async deleteDepartment(id, deletedById) {
    const users2 = await db.select().from(users).where(and(
      eq(users.departmentId, id),
      eq(users.isDeleted, false)
    )).limit(1);
    if (users2.length > 0) {
      throw new Error("Kh\xF4ng th\u1EC3 x\xF3a ph\xF2ng ban v\xEC c\xF2n c\xE1n b\u1ED9 thu\u1ED9c ph\xF2ng. Vui l\xF2ng chuy\u1EC3n c\xE1n b\u1ED9 sang ph\xF2ng kh\xE1c tr\u01B0\u1EDBc.");
    }
    const [deleted] = await db.update(departments).set({
      isDeleted: true,
      deletedAt: /* @__PURE__ */ new Date(),
      deletedById
    }).where(eq(departments.id, id)).returning();
    return deleted;
  }
  async getTasks(filters) {
    const conditions = [];
    if (!filters?.includeDeleted) {
      conditions.push(eq(tasks.isDeleted, false));
    }
    if (filters?.departmentId) {
      conditions.push(eq(tasks.departmentId, filters.departmentId));
    }
    if (filters?.status) {
      conditions.push(eq(tasks.status, filters.status));
    }
    if (filters?.incompleteOnly) {
      conditions.push(ne(tasks.status, "Ho\xE0n th\xE0nh"));
    }
    const tasks2 = conditions.length > 0 ? await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt)) : await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    if (filters?.userId) {
      const taskIds = tasks2.map((t) => t.id);
      if (taskIds.length === 0) return [];
      const assignmentConditions = [
        eq(taskAssignments.userId, filters.userId),
        inArray(taskAssignments.taskId, taskIds)
      ];
      if (filters.assignmentRoles && filters.assignmentRoles.length > 0) {
        assignmentConditions.push(inArray(taskAssignments.role, filters.assignmentRoles));
      } else if (filters.assignmentRole) {
        assignmentConditions.push(eq(taskAssignments.role, filters.assignmentRole));
      }
      const assignments = await db.select().from(taskAssignments).where(and(...assignmentConditions));
      const assignedTaskIds = new Set(assignments.map((a) => a.taskId));
      return tasks2.filter((t) => assignedTaskIds.has(t.id));
    }
    return tasks2;
  }
  async getTasksForEvaluation(userId, userRole, userDepartmentId, evaluationStatus = "unevaluated") {
    const normalizeRole = (role) => {
      const normalized = role.trim().toLowerCase();
      const roleMap = {
        "chu tri": "Ch\u1EE7 tr\xEC",
        "ch\u1EE7 tr\xEC": "Ch\u1EE7 tr\xEC",
        "chu tr\xEC": "Ch\u1EE7 tr\xEC",
        "phoi hop": "Ph\u1ED1i h\u1EE3p",
        "ph\u1ED1i h\u1EE3p": "Ph\u1ED1i h\u1EE3p",
        "phoi h\u1EE3p": "Ph\u1ED1i h\u1EE3p",
        "ph\u1ED1i hop": "Ph\u1ED1i h\u1EE3p",
        "chi dao": "Ch\u1EC9 \u0111\u1EA1o",
        "ch\u1EC9 \u0111\u1EA1o": "Ch\u1EC9 \u0111\u1EA1o",
        "chi \u0111\u1EA1o": "Ch\u1EC9 \u0111\u1EA1o",
        "ch\u1EC9 dao": "Ch\u1EC9 \u0111\u1EA1o"
      };
      return roleMap[normalized] || null;
    };
    const normalizedStatus = ["evaluated", "unevaluated", "all"].includes(evaluationStatus) ? evaluationStatus : "unevaluated";
    const conditions = [
      eq(tasks.isDeleted, false),
      eq(tasks.status, "Ho\xE0n th\xE0nh")
    ];
    if (normalizedStatus === "evaluated") {
      conditions.push(sql2`${tasks.leadershipScore} IS NOT NULL`);
    } else if (normalizedStatus === "unevaluated") {
      conditions.push(sql2`${tasks.leadershipScore} IS NULL`);
    }
    const tasksNeedingEval = await db.select().from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));
    if (tasksNeedingEval.length === 0) return [];
    const taskIds = tasksNeedingEval.map((t) => t.id);
    if (userRole === "Gi\xE1m \u0111\u1ED1c" || userRole === "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
      const allAssignments = await db.select().from(taskAssignments).where(and(
        eq(taskAssignments.userId, userId),
        inArray(taskAssignments.taskId, taskIds)
      ));
      const assignedTaskIds = new Set(
        allAssignments.filter((a) => normalizeRole(a.role) === "Ch\u1EC9 \u0111\u1EA1o").map((a) => a.taskId)
      );
      return tasksNeedingEval.filter((t) => assignedTaskIds.has(t.id));
    }
    if (userRole === "Tr\u01B0\u1EDFng ph\xF2ng" && userDepartmentId) {
      const allAssignments = await db.select().from(taskAssignments).where(inArray(taskAssignments.taskId, taskIds));
      const tasksWithLeadership = new Set(
        allAssignments.filter((a) => normalizeRole(a.role) === "Ch\u1EC9 \u0111\u1EA1o").map((a) => a.taskId)
      );
      const chuTriAssignments = allAssignments.filter((a) => normalizeRole(a.role) === "Ch\u1EE7 tr\xEC");
      if (chuTriAssignments.length === 0) return [];
      const chuTriUserIds = chuTriAssignments.map((a) => a.userId);
      const deptUsers = await db.select().from(users).where(and(
        eq(users.departmentId, userDepartmentId),
        inArray(users.id, chuTriUserIds)
      ));
      const deptUserIds = new Set(deptUsers.map((u) => u.id));
      const eligibleTaskIds = new Set(
        chuTriAssignments.filter((a) => deptUserIds.has(a.userId) && !tasksWithLeadership.has(a.taskId)).map((a) => a.taskId)
      );
      return tasksNeedingEval.filter((t) => eligibleTaskIds.has(t.id));
    }
    return [];
  }
  async getTask(id) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }
  async getSubtasks(parentTaskId) {
    return await db.select().from(tasks).where(and(
      eq(tasks.parentTaskId, parentTaskId),
      eq(tasks.isDeleted, false)
    )).orderBy(tasks.createdAt);
  }
  async updateParentProgress(subtaskId) {
    const subtask = await this.getTask(subtaskId);
    if (!subtask || !subtask.parentTaskId) {
      return;
    }
    await this.recalculateTaskStatusFromSubtasks(subtask.parentTaskId);
  }
  // Recalculate task status and progress based on its subtasks
  // Used for parent tasks that have subtasks
  async recalculateTaskStatusFromSubtasks(taskId) {
    const subtasks = await this.getSubtasks(taskId);
    if (subtasks.length === 0) {
      return;
    }
    const totalProgress = subtasks.reduce((sum, task) => sum + task.progress, 0);
    const averageProgress = Math.round(totalProgress / subtasks.length);
    const allSubtasksCompleted = subtasks.every((t) => t.status === "Ho\xE0n th\xE0nh");
    let parentStatus;
    let parentProgress = averageProgress;
    if (allSubtasksCompleted) {
      parentStatus = "Ho\xE0n th\xE0nh";
      parentProgress = 100;
    } else if (subtasks.some((t) => t.status === "\u0110ang th\u1EF1c hi\u1EC7n")) {
      parentStatus = "\u0110ang th\u1EF1c hi\u1EC7n";
    } else if (subtasks.every((t) => t.status === "Ch\u01B0a b\u1EAFt \u0111\u1EA7u")) {
      parentStatus = "Ch\u01B0a b\u1EAFt \u0111\u1EA7u";
      parentProgress = 0;
    } else {
      parentStatus = "\u0110ang th\u1EF1c hi\u1EC7n";
    }
    await db.update(tasks).set({
      progress: parentProgress,
      status: parentStatus,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(tasks.id, taskId));
  }
  async createTask(task) {
    return await db.transaction(async (tx) => {
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const yearSuffix = currentYear.toString().slice(-2);
      await tx.insert(taskSequences).values({
        year: currentYear,
        lastSequence: 0,
        updatedAt: /* @__PURE__ */ new Date()
      }).onConflictDoNothing();
      const [sequence] = await tx.select().from(taskSequences).where(eq(taskSequences.year, currentYear)).for("update");
      if (!sequence) {
        throw new Error(`Failed to acquire sequence lock for year ${currentYear}`);
      }
      const nextSequence = sequence.lastSequence + 1;
      const [updated] = await tx.update(taskSequences).set({
        lastSequence: nextSequence,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(taskSequences.year, currentYear)).returning();
      if (!updated) {
        throw new Error(`Failed to update sequence for year ${currentYear}`);
      }
      const taskNumber = `#${yearSuffix}-${nextSequence.toString().padStart(3, "0")}`;
      const taskData = {
        ...task,
        taskNumber
      };
      if (task.leadershipScore !== void 0 && task.leadershipScore !== null) {
        taskData.leadershipScore = task.leadershipScore.toString();
      }
      const [insertedTask] = await tx.insert(tasks).values(taskData).returning();
      return insertedTask;
    });
  }
  async updateTask(id, task) {
    const updateData = {
      ...task,
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (task.leadershipScore !== void 0 && task.leadershipScore !== null) {
      updateData.leadershipScore = task.leadershipScore.toString();
    }
    const [result] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return result;
  }
  async updateTaskLeadershipScore(id, score, evaluatedById) {
    const updateData = {
      leadershipScore: score.toString(),
      evaluatedById,
      evaluatedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const [result] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return result;
  }
  async softDeleteTask(id, deletedById) {
    return await db.transaction(async (tx) => {
      const [taskToDelete] = await tx.select().from(tasks).where(eq(tasks.id, id));
      const parentTaskId = taskToDelete?.parentTaskId;
      if (parentTaskId) {
        const remainingSubtasks = await tx.select().from(tasks).where(and(
          eq(tasks.parentTaskId, parentTaskId),
          eq(tasks.isDeleted, false),
          not(eq(tasks.id, id))
        ));
        const totalProgress = remainingSubtasks.reduce((sum, t) => sum + t.progress, 0);
        const averageProgress = remainingSubtasks.length > 0 ? Math.round(totalProgress / remainingSubtasks.length) : 0;
        await tx.update(tasks).set({ progress: averageProgress, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tasks.id, parentTaskId));
      }
      await tx.update(tasks).set({ parentTaskId: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tasks.parentTaskId, id));
      const [result] = await tx.update(tasks).set({
        isDeleted: true,
        deletedAt: /* @__PURE__ */ new Date(),
        deletedById,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(tasks.id, id)).returning();
      return result;
    });
  }
  async restoreTask(id) {
    const [result] = await db.update(tasks).set({
      isDeleted: false,
      deletedAt: null,
      deletedById: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(tasks.id, id)).returning();
    return result;
  }
  async permanentlyDeleteTask(id) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }
  async getTaskAssignments(taskId) {
    return await db.select().from(taskAssignments).where(eq(taskAssignments.taskId, taskId));
  }
  async getTaskAssignmentsForUsers(userIds) {
    if (userIds.length === 0) {
      return [];
    }
    return await db.select().from(taskAssignments).where(inArray(taskAssignments.userId, userIds));
  }
  async getUserTaskAssignments(userId) {
    return await db.select().from(taskAssignments).where(eq(taskAssignments.userId, userId));
  }
  async createTaskAssignment(assignment) {
    const [result] = await db.insert(taskAssignments).values(assignment).returning();
    return result;
  }
  async updateTaskAssignmentCollaboration(assignmentId, collaborationCompleted) {
    const [result] = await db.update(taskAssignments).set({ collaborationCompleted }).where(eq(taskAssignments.id, assignmentId)).returning();
    return result;
  }
  async updateTaskAssignmentRole(assignmentId, role) {
    const [result] = await db.update(taskAssignments).set({ role }).where(eq(taskAssignments.id, assignmentId)).returning();
    return result;
  }
  async deleteTaskAssignment(assignmentId) {
    await db.delete(taskAssignments).where(eq(taskAssignments.id, assignmentId));
  }
  async getProgressUpdates(taskId) {
    return await db.select().from(progressUpdates).where(eq(progressUpdates.taskId, taskId)).orderBy(desc(progressUpdates.createdAt));
  }
  async createProgressUpdate(update) {
    const [result] = await db.insert(progressUpdates).values(update).returning();
    return result;
  }
  async getChecklistItems(taskId) {
    return await db.select().from(checklistItems).where(eq(checklistItems.taskId, taskId)).orderBy(checklistItems.order);
  }
  async createChecklistItem(item) {
    const [result] = await db.insert(checklistItems).values(item).returning();
    return result;
  }
  async updateChecklistItem(id, item) {
    const [result] = await db.update(checklistItems).set(item).where(eq(checklistItems.id, id)).returning();
    return result;
  }
  async deleteChecklistItem(id) {
    await db.delete(checklistItems).where(eq(checklistItems.id, id));
  }
  async getComments(taskId) {
    return await db.select().from(comments).where(eq(comments.taskId, taskId)).orderBy(desc(comments.createdAt));
  }
  async createComment(comment) {
    const [result] = await db.insert(comments).values(comment).returning();
    return result;
  }
  async getFile(id) {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }
  async getFiles(taskId) {
    return await db.select().from(files).where(eq(files.taskId, taskId)).orderBy(desc(files.uploadedAt));
  }
  async getTaskFiles(taskId) {
    return this.getFiles(taskId);
  }
  async createFile(file) {
    const [result] = await db.insert(files).values(file).returning();
    return result;
  }
  async deleteFile(id) {
    await db.delete(files).where(eq(files.id, id));
  }
  async getKpiScores(userId, period) {
    const conditions = [eq(kpiScores.userId, userId)];
    if (period) {
      conditions.push(eq(kpiScores.period, period));
    }
    return await db.select().from(kpiScores).where(and(...conditions)).orderBy(desc(kpiScores.calculatedAt));
  }
  async createKpiScore(score) {
    const [result] = await db.insert(kpiScores).values(score).returning();
    return result;
  }
  async getAiAlerts(userId, status) {
    const conditions = [];
    if (userId) {
      conditions.push(eq(aiAlerts.userId, userId));
    }
    if (status) {
      conditions.push(eq(aiAlerts.status, status));
    }
    return conditions.length > 0 ? await db.select().from(aiAlerts).where(and(...conditions)).orderBy(desc(aiAlerts.createdAt)) : await db.select().from(aiAlerts).orderBy(desc(aiAlerts.createdAt));
  }
  async createAiAlert(alert) {
    const [result] = await db.insert(aiAlerts).values(alert).returning();
    return result;
  }
  async updateAiAlert(id, alert) {
    const [result] = await db.update(aiAlerts).set(alert).where(eq(aiAlerts.id, id)).returning();
    return result;
  }
  async getNotifications(userId, unreadOnly) {
    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }
    return await db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt));
  }
  async createNotification(notification) {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }
  async markNotificationAsRead(id) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }
  async getChecklistTemplates() {
    return await db.select().from(checklistTemplates);
  }
  async getChecklistTemplate(id) {
    const [template] = await db.select().from(checklistTemplates).where(eq(checklistTemplates.id, id));
    return template;
  }
  async getChecklistTemplateItems(templateId) {
    return await db.select().from(checklistTemplateItems).where(eq(checklistTemplateItems.templateId, templateId)).orderBy(checklistTemplateItems.order);
  }
  async getTemplatesForUser(currentUserId) {
    const allTemplates = await db.select().from(checklistTemplates);
    return {
      default: allTemplates.find((t) => t.isDefault) || null,
      personal: allTemplates.filter((t) => t.createdById === currentUserId),
      system: allTemplates.filter((t) => t.createdById === null && !t.isDefault)
    };
  }
  async createChecklistTemplate(data, currentUserId) {
    const [template] = await db.insert(checklistTemplates).values({ ...data, createdById: currentUserId }).returning();
    return template;
  }
  async updateChecklistTemplate(id, patch, currentUserId) {
    const existing = await this.getChecklistTemplate(id);
    if (!existing) {
      throw new Error("Template not found");
    }
    if (existing.createdById !== currentUserId) {
      throw new Error("Unauthorized: You can only edit your own templates");
    }
    const [updated] = await db.update(checklistTemplates).set(patch).where(eq(checklistTemplates.id, id)).returning();
    return updated;
  }
  async deleteChecklistTemplate(id, currentUserId) {
    const existing = await this.getChecklistTemplate(id);
    if (!existing) {
      throw new Error("Template not found");
    }
    if (existing.createdById !== currentUserId) {
      throw new Error("Unauthorized: You can only delete your own templates");
    }
    await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));
  }
  async setDefaultTemplate(templateId) {
    await db.transaction(async (tx) => {
      await tx.update(checklistTemplates).set({ isDefault: false }).where(eq(checklistTemplates.isDefault, true));
      await tx.update(checklistTemplates).set({ isDefault: true }).where(eq(checklistTemplates.id, templateId));
    });
  }
  async cloneTemplate(templateId, currentUserId) {
    return await db.transaction(async (tx) => {
      const [original] = await tx.select().from(checklistTemplates).where(eq(checklistTemplates.id, templateId));
      if (!original) {
        throw new Error("Template not found");
      }
      const [cloned] = await tx.insert(checklistTemplates).values({
        name: `${original.name} (B\u1EA3n sao)`,
        description: original.description,
        category: original.category,
        createdById: currentUserId,
        isDefault: false
      }).returning();
      const originalItems = await tx.select().from(checklistTemplateItems).where(eq(checklistTemplateItems.templateId, templateId)).orderBy(checklistTemplateItems.order);
      if (originalItems.length > 0) {
        await tx.insert(checklistTemplateItems).values(originalItems.map((item) => ({
          templateId: cloned.id,
          title: item.title,
          order: item.order
        })));
      }
      return cloned;
    });
  }
  async replaceTemplateItems(templateId, items, currentUserId) {
    const template = await this.getChecklistTemplate(templateId);
    if (!template) {
      throw new Error("Template not found");
    }
    if (template.createdById !== currentUserId) {
      throw new Error("Unauthorized: You can only edit your own templates");
    }
    return await db.transaction(async (tx) => {
      await tx.delete(checklistTemplateItems).where(eq(checklistTemplateItems.templateId, templateId));
      if (items.length > 0) {
        return await tx.insert(checklistTemplateItems).values(items.map((item) => ({ ...item, templateId }))).returning();
      }
      return [];
    });
  }
  async getTaskEvaluation(taskId, assignmentId) {
    const [evaluation] = await db.select().from(taskEvaluations).where(and(
      eq(taskEvaluations.taskId, taskId),
      eq(taskEvaluations.assignmentId, assignmentId)
    ));
    return evaluation;
  }
  async getTaskEvaluations(taskId) {
    return await db.select().from(taskEvaluations).where(eq(taskEvaluations.taskId, taskId));
  }
  async getUserTaskEvaluations(userId) {
    return await db.select({
      id: taskEvaluations.id,
      taskId: taskEvaluations.taskId,
      assignmentId: taskEvaluations.assignmentId,
      evaluatorId: taskEvaluations.evaluatorId,
      score: taskEvaluations.score,
      comments: taskEvaluations.comments,
      evaluatedAt: taskEvaluations.evaluatedAt
    }).from(taskEvaluations).innerJoin(
      taskAssignments,
      eq(taskEvaluations.assignmentId, taskAssignments.id)
    ).where(eq(taskAssignments.userId, userId));
  }
  async upsertTaskEvaluation(evaluation) {
    const existing = await this.getTaskEvaluation(evaluation.taskId, evaluation.assignmentId);
    let result;
    if (existing) {
      const [updated] = await db.update(taskEvaluations).set({
        score: evaluation.score.toString(),
        evaluatorId: evaluation.evaluatorId,
        comments: evaluation.comments || null,
        evaluatedAt: /* @__PURE__ */ new Date()
      }).where(and(
        eq(taskEvaluations.taskId, evaluation.taskId),
        eq(taskEvaluations.assignmentId, evaluation.assignmentId)
      )).returning();
      result = updated;
    } else {
      const [created] = await db.insert(taskEvaluations).values({
        ...evaluation,
        score: evaluation.score.toString(),
        comments: evaluation.comments || null
      }).returning();
      result = created;
    }
    await this.syncTaskLeadershipScore(evaluation.taskId);
    return result;
  }
  async updateDepartmentDeputyDirector(departmentId, deputyDirectorId) {
    const [updated] = await db.update(departments).set({ assignedDeputyDirectorId: deputyDirectorId }).where(eq(departments.id, departmentId)).returning();
    return updated;
  }
  async syncTaskLeadershipScore(taskId) {
    const assignments = await this.getTaskAssignments(taskId);
    const chuTriAssignment = assignments.find((a) => a.role === "Ch\u1EE7 tr\xEC");
    if (chuTriAssignment) {
      const evaluation = await this.getTaskEvaluation(taskId, chuTriAssignment.id);
      if (evaluation) {
        await db.update(tasks).set({
          leadershipScore: evaluation.score,
          evaluatedById: evaluation.evaluatorId,
          evaluatedAt: evaluation.evaluatedAt,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(tasks.id, taskId));
      }
    }
  }
};
var storage = new DbStorage();

// server/routes.ts
import { eq as eq2, sql as sql3 } from "drizzle-orm";

// server/auth.ts
import bcrypt from "bcrypt";
var SALT_ROUNDS = 10;
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
async function authenticateUser(username, password) {
  const user = await storage.getUserByUsername(username);
  if (!user) {
    return null;
  }
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }
  return user;
}

// server/middleware/auth.ts
import "express-session";
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
function attachUser(storage3) {
  return async (req, res, next) => {
    if (req.session && req.session.userId) {
      try {
        const user = await storage3.getUser(req.session.userId);
        if (user) {
          req.user = user;
        } else {
          req.session.destroy((err) => {
            if (err) console.error("Error destroying stale session:", err);
          });
        }
      } catch (error) {
        console.error("Error attaching user:", error);
      }
    }
    next();
  };
}

// server/routes.ts
import { z as z2 } from "zod";
import { fromZodError } from "zod-validation-error";

// server/kpi.ts
var ROLE_COEFFICIENTS = {
  "Ch\u1EE7 tr\xEC": 1,
  "Ph\u1ED1i h\u1EE3p": 0.3
};
var PRIORITY_WEIGHTS = {
  "Kh\u1EA9n c\u1EA5p": 3,
  "Quan tr\u1ECDng": 2,
  "B\xECnh th\u01B0\u1EDDng": 1
};
async function preloadTaskActivity(tasks2) {
  const activityMap = /* @__PURE__ */ new Map();
  await Promise.all(
    tasks2.map(async (task) => {
      const [progressUpdates2, comments2, files2, assignments] = await Promise.all([
        storage.getProgressUpdates(task.id),
        storage.getComments(task.id),
        storage.getTaskFiles(task.id),
        storage.getTaskAssignments(task.id)
      ]);
      const evaluations = /* @__PURE__ */ new Map();
      await Promise.all(
        assignments.map(async (assignment) => {
          const evaluation = await storage.getTaskEvaluation(task.id, assignment.id);
          if (evaluation) {
            evaluations.set(assignment.id, evaluation);
          }
        })
      );
      activityMap.set(task.id, {
        progressUpdates: progressUpdates2,
        comments: comments2,
        files: files2,
        evaluations
      });
    })
  );
  return activityMap;
}
function hasActivityInPeriod(activity, periodStart, periodEnd) {
  if (!activity || !periodStart && !periodEnd) {
    return false;
  }
  const hasProgressInPeriod = activity.progressUpdates.some((u) => {
    const date = new Date(u.createdAt);
    if (periodStart && date < periodStart) return false;
    if (periodEnd && date > periodEnd) return false;
    return true;
  });
  if (hasProgressInPeriod) return true;
  const hasCommentsInPeriod = activity.comments.some((c) => {
    const date = new Date(c.createdAt);
    if (periodStart && date < periodStart) return false;
    if (periodEnd && date > periodEnd) return false;
    return true;
  });
  if (hasCommentsInPeriod) return true;
  const hasFilesInPeriod = activity.files.some((f) => {
    const date = new Date(f.uploadedAt);
    if (periodStart && date < periodStart) return false;
    if (periodEnd && date > periodEnd) return false;
    return true;
  });
  if (hasFilesInPeriod) return true;
  for (const evaluation of Array.from(activity.evaluations.values())) {
    const date = new Date(evaluation.evaluatedAt);
    if (periodStart && date < periodStart) continue;
    if (periodEnd && date > periodEnd) continue;
    return true;
  }
  return false;
}
function calculateCompletionScore(task) {
  const now = /* @__PURE__ */ new Date();
  const deadline = new Date(task.deadline);
  const daysDiff = Math.floor((now.getTime() - deadline.getTime()) / (1e3 * 60 * 60 * 24));
  if (task.status === "Ho\xE0n th\xE0nh") {
    if (task.completedAt) {
      const completedAt = new Date(task.completedAt);
      const completionDaysDiff = Math.floor((completedAt.getTime() - deadline.getTime()) / (1e3 * 60 * 60 * 24));
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
  if (task.status === "\u0110ang th\u1EF1c hi\u1EC7n") {
    if (daysDiff > 0) {
      return 0;
    }
    return 50 + (task.progress || 0) * 0.5;
  }
  if (task.status === "Ch\u01B0a b\u1EAFt \u0111\u1EA7u") {
    if (daysDiff > 0) {
      return 0;
    }
    return 30;
  }
  return 0;
}
function calculateMaxLeadershipScore(completionScore) {
  if (completionScore >= 110) {
    return 10;
  }
  if (completionScore >= 100) {
    return 8;
  }
  if (completionScore >= 90) {
    return 6;
  }
  if (completionScore >= 80) {
    return 4;
  }
  if (completionScore > 0) {
    return 2;
  }
  return 1;
}
async function calculateQualityScore(task, assignmentId, activityCache, periodStart, periodEnd) {
  let baseScore = 0;
  const filteredProgressUpdates = periodStart || periodEnd ? activityCache.progressUpdates.filter((u) => {
    const updateDate = new Date(u.createdAt);
    if (periodStart && updateDate < periodStart) return false;
    if (periodEnd && updateDate > periodEnd) return false;
    return true;
  }) : activityCache.progressUpdates;
  const updateDates = filteredProgressUpdates.map((u) => new Date(u.createdAt));
  if (updateDates.length >= 3) {
    const weeklyUpdates = updateDates.filter((date) => {
      const now = /* @__PURE__ */ new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
      return date >= weekAgo;
    });
    if (weeklyUpdates.length >= 2) {
      baseScore += 10;
    }
  }
  const detailedUpdates = filteredProgressUpdates.filter(
    (u) => u.content && u.content.length > 50
  );
  const filteredComments = periodStart || periodEnd ? activityCache.comments.filter((c) => {
    const commentDate = new Date(c.createdAt);
    if (periodStart && commentDate < periodStart) return false;
    if (periodEnd && commentDate > periodEnd) return false;
    return true;
  }) : activityCache.comments;
  const filteredFiles = periodStart || periodEnd ? activityCache.files.filter((f) => {
    const fileDate = new Date(f.uploadedAt);
    if (periodStart && fileDate < periodStart) return false;
    if (periodEnd && fileDate > periodEnd) return false;
    return true;
  }) : activityCache.files;
  if (detailedUpdates.length > 0 || filteredFiles.length > 0) {
    baseScore += 10;
  }
  if (filteredComments.length >= 3) {
    baseScore += 10;
  }
  baseScore = Math.min(baseScore, 30);
  const evaluation = activityCache.evaluations.get(assignmentId);
  let rawLeadershipScore = 0;
  if (evaluation) {
    const evalDate = new Date(evaluation.evaluatedAt);
    const isInPeriod = (!periodStart || evalDate >= periodStart) && (!periodEnd || evalDate <= periodEnd);
    if (isInPeriod || !periodStart && !periodEnd) {
      rawLeadershipScore = Number(evaluation.score);
    }
  }
  const completionScore = calculateCompletionScore(task);
  const maxLeadershipScore = calculateMaxLeadershipScore(completionScore);
  const cappedLeadershipScore = Math.min(rawLeadershipScore, maxLeadershipScore);
  const leadershipContribution = cappedLeadershipScore / 10 * 70;
  return baseScore + leadershipContribution;
}
async function calculateTaskScore(task, assignment, activityCache, periodStart, periodEnd) {
  const completionScore = calculateCompletionScore(task);
  const qualityScore = await calculateQualityScore(
    task,
    assignment.id,
    activityCache,
    periodStart,
    periodEnd
  );
  const taskScore = completionScore * 0.7 + qualityScore * 0.3;
  const roleCoefficient = ROLE_COEFFICIENTS[assignment.role] || 1;
  const priorityWeight = PRIORITY_WEIGHTS[task.priority] || 1;
  const roleWeightedScore = taskScore * roleCoefficient;
  return {
    taskId: task.id,
    completionScore,
    qualityScore,
    taskScore,
    roleCoefficient,
    priorityWeight,
    roleWeightedScore
  };
}
async function calculateUserKPI(userId, periodStart, periodEnd) {
  const assignments = await storage.getUserTaskAssignments(userId);
  const tasks2 = [];
  for (const assignment of assignments) {
    const task = await storage.getTask(assignment.taskId);
    if (task && !task.isDeleted) {
      tasks2.push(task);
    }
  }
  const activityMap = await preloadTaskActivity(tasks2);
  const taskScores = [];
  let weightedSum = 0;
  let totalWeights = 0;
  for (const assignment of assignments) {
    const task = tasks2.find((t) => t.id === assignment.taskId);
    if (!task) continue;
    if (periodStart || periodEnd) {
      if (task.status === "Ho\xE0n th\xE0nh" && task.completedAt) {
        const completedDate = new Date(task.completedAt);
        if (periodStart && completedDate < periodStart) continue;
        if (periodEnd && completedDate > periodEnd) continue;
      } else {
        const deadlineDate = new Date(task.deadline);
        const deadlineInPeriod = (!periodStart || deadlineDate >= periodStart) && (!periodEnd || deadlineDate <= periodEnd);
        if (!deadlineInPeriod) {
          const activity2 = activityMap.get(task.id);
          if (!hasActivityInPeriod(activity2, periodStart, periodEnd)) {
            continue;
          }
        }
      }
    }
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
    taskScores
  };
}
async function calculateAllUsersKPI(departmentId) {
  const users2 = await storage.getUsers(departmentId ? { departmentId } : {});
  const results = await Promise.all(
    users2.map(async (user) => {
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
        taskCount: kpiData.taskCount
      };
    })
  );
  return results.sort((a, b) => b.kpi - a.kpi);
}
async function calculateFilteredUsersKPI(filteredTasks, activityMap, periodStart, periodEnd) {
  if (filteredTasks.length === 0) {
    return [];
  }
  const allAssignments = [];
  for (const task of filteredTasks) {
    const assignments = await storage.getTaskAssignments(task.id);
    allAssignments.push(...assignments);
  }
  const assignmentsByUser = /* @__PURE__ */ new Map();
  for (const assignment of allAssignments) {
    if (!assignmentsByUser.has(assignment.userId)) {
      assignmentsByUser.set(assignment.userId, []);
    }
    assignmentsByUser.get(assignment.userId).push(assignment);
  }
  const results = await Promise.all(
    Array.from(assignmentsByUser.entries()).map(async ([userId, assignments]) => {
      const user = await storage.getUser(userId);
      if (!user) {
        return null;
      }
      const taskScores = [];
      let weightedSum = 0;
      let totalWeights = 0;
      for (const assignment of assignments) {
        const task = filteredTasks.find((t) => t.id === assignment.taskId);
        if (!task) continue;
        const activity = activityMap.get(task.id);
        if (!activity) continue;
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
        taskCount
      };
    })
  );
  return results.filter((r) => r !== null).sort((a, b) => b.kpi - a.kpi);
}

// server/evaluation.ts
async function getEvaluatorForAssignment(taskId, assignmentId) {
  const assignments = await storage.getTaskAssignments(taskId);
  const currentAssignment = assignments.find((a) => a.id === assignmentId);
  if (!currentAssignment) {
    throw new Error("Assignment not found");
  }
  if (currentAssignment.role === "Ph\u1ED1i h\u1EE3p") {
    const chuTri = assignments.find((a) => a.role === "Ch\u1EE7 tr\xEC");
    if (chuTri) {
      const chuTriUser = await storage.getUser(chuTri.userId);
      return chuTriUser || null;
    }
    return null;
  }
  const supervisor = assignments.find((a) => a.role === "Ch\u1EC9 \u0111\u1EA1o");
  if (supervisor) {
    if (supervisor.userId !== currentAssignment.userId) {
      const supervisorUser = await storage.getUser(supervisor.userId);
      return supervisorUser || null;
    }
  }
  if (currentAssignment.role === "Ch\u1EE7 tr\xEC" || currentAssignment.role === "Ch\u1EC9 \u0111\u1EA1o") {
    const assignee = await storage.getUser(currentAssignment.userId);
    if (!assignee) return null;
    if (assignee.role === "Chuy\xEAn vi\xEAn") {
      if (!assignee.departmentId) return null;
      const deptUsers = await storage.getUsers({
        departmentId: assignee.departmentId,
        role: "Tr\u01B0\u1EDFng ph\xF2ng"
      });
      return deptUsers[0] || null;
    }
    if (assignee.role === "Tr\u01B0\u1EDFng ph\xF2ng") {
      if (!assignee.departmentId) return null;
      const department = await storage.getDepartment(assignee.departmentId);
      if (department?.assignedDeputyDirectorId) {
        const deputyDirector = await storage.getUser(department.assignedDeputyDirectorId);
        if (deputyDirector) return deputyDirector;
      }
      const deputies = await storage.getUsers({ role: "Ph\xF3 Gi\xE1m \u0111\u1ED1c" });
      if (deputies.length > 0) return deputies[0];
      const directors = await storage.getUsers({ role: "Gi\xE1m \u0111\u1ED1c" });
      return directors[0] || null;
    }
    if (assignee.role === "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
      const directors = await storage.getUsers({ role: "Gi\xE1m \u0111\u1ED1c" });
      return directors[0] || null;
    }
    if (assignee.role === "Gi\xE1m \u0111\u1ED1c") {
      return null;
    }
  }
  return null;
}
async function canUserEvaluateAssignment(userId, taskId, assignmentId) {
  const evaluator = await getEvaluatorForAssignment(taskId, assignmentId);
  return evaluator?.id === userId;
}

// server/utils.ts
function sanitizeUser(user) {
  const { password, ...sanitized } = user;
  return sanitized;
}
function sanitizeUsers(users2) {
  return users2.map(sanitizeUser);
}

// server/ai-service.ts
import Groq from "groq-sdk";
var groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
async function evaluateTaskQuality(task, progressUpdates2, comments2) {
  try {
    const prompt = `B\u1EA1n l\xE0 chuy\xEAn gia \u0111\xE1nh gi\xE1 hi\u1EC7u su\u1EA5t c\xF4ng vi\u1EC7c. H\xE3y \u0111\xE1nh gi\xE1 ch\u1EA5t l\u01B0\u1EE3ng th\u1EF1c hi\u1EC7n nhi\u1EC7m v\u1EE5 d\u1EF1a tr\xEAn th\xF4ng tin sau:

Nhi\u1EC7m v\u1EE5: ${task.title}
M\xF4 t\u1EA3: ${task.description || "Kh\xF4ng c\xF3"}
Ti\u1EBFn \u0111\u1ED9 hi\u1EC7n t\u1EA1i: ${task.progress}%
Tr\u1EA1ng th\xE1i: ${task.status}
Deadline: ${task.deadline}

S\u1ED1 l\u01B0\u1EE3ng c\u1EADp nh\u1EADt ti\u1EBFn \u0111\u1ED9: ${progressUpdates2.length}
N\u1ED9i dung c\u1EADp nh\u1EADt g\u1EA7n nh\u1EA5t: ${progressUpdates2[0]?.content || "Ch\u01B0a c\xF3 c\u1EADp nh\u1EADt"}

S\u1ED1 l\u01B0\u1EE3ng trao \u0111\u1ED5i: ${comments2.length}

H\xE3y \u0111\xE1nh gi\xE1 ch\u1EA5t l\u01B0\u1EE3ng th\u1EF1c hi\u1EC7n t\u1EEB 0-100 \u0111i\u1EC3m v\xE0 \u0111\u01B0a ra:
1. \u0110i\u1EC3m s\u1ED1 ch\u1EA5t l\u01B0\u1EE3ng (0-100)
2. L\xFD do \u0111\xE1nh gi\xE1
3. G\u1EE3i \xFD c\u1EA3i thi\u1EC7n (t\u1ED1i \u0111a 3 \u0111i\u1EC3m)

Tr\u1EA3 v\u1EC1 JSON theo format:
{
  "score": <s\u1ED1>,
  "reasoning": "<l\xFD do>",
  "suggestions": ["<g\u1EE3i \xFD 1>", "<g\u1EE3i \xFD 2>", "<g\u1EE3i \xFD 3>"]
}`;
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1e3
    });
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      score: result.score || 70,
      reasoning: result.reasoning || "\u0110\xE1nh gi\xE1 t\u1EF1 \u0111\u1ED9ng",
      suggestions: result.suggestions || []
    };
  } catch (error) {
    console.error("AI evaluation error:", error);
    return {
      score: 70,
      reasoning: "Kh\xF4ng th\u1EC3 \u0111\xE1nh gi\xE1 t\u1EF1 \u0111\u1ED9ng",
      suggestions: []
    };
  }
}
async function detectTaskRisks(task, progressUpdates2) {
  const alerts = [];
  const now = /* @__PURE__ */ new Date();
  const deadline = new Date(task.deadline);
  const daysUntilDeadline = Math.floor((deadline.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
  if (task.status !== "Ho\xE0n th\xE0nh") {
    if (daysUntilDeadline < 0) {
      alerts.push({
        type: "deadline_risk",
        severity: "high",
        reason: `Nhi\u1EC7m v\u1EE5 \u0111\xE3 qu\xE1 h\u1EA1n ${Math.abs(daysUntilDeadline)} ng\xE0y v\xE0 ch\u1EC9 ho\xE0n th\xE0nh ${task.progress}%`,
        suggestion: "C\u1EA7n kh\u1EA9n tr\u01B0\u01A1ng ho\xE0n th\xE0nh ho\u1EB7c b\xE1o c\xE1o l\xFD do ch\u1EADm tr\u1EC5"
      });
    } else if (daysUntilDeadline <= 2 && task.progress < 50) {
      alerts.push({
        type: "deadline_risk",
        severity: "high",
        reason: `Nhi\u1EC7m v\u1EE5 c\xF2n ${daysUntilDeadline} ng\xE0y \u0111\u1EBFn h\u1EA1n nh\u01B0ng m\u1EDBi ho\xE0n th\xE0nh ${task.progress}%`,
        suggestion: "N\xEAn t\u0103ng c\u01B0\u1EDDng nh\xE2n l\u1EF1c ho\u1EB7c \u0111i\u1EC1u ch\u1EC9nh deadline ngay l\u1EADp t\u1EE9c"
      });
    } else if (daysUntilDeadline <= 5 && task.progress < 70) {
      alerts.push({
        type: "deadline_risk",
        severity: "high",
        reason: `Nhi\u1EC7m v\u1EE5 c\xF2n ${daysUntilDeadline} ng\xE0y \u0111\u1EBFn h\u1EA1n nh\u01B0ng m\u1EDBi ho\xE0n th\xE0nh ${task.progress}%`,
        suggestion: "C\u1EA7n \u0111\u1EA9y nhanh ti\u1EBFn \u0111\u1ED9 \u0111\u1EC3 \u0111\u1EA3m b\u1EA3o ho\xE0n th\xE0nh \u0111\xFAng h\u1EA1n"
      });
    } else if (daysUntilDeadline <= 7 && task.progress < 50) {
      alerts.push({
        type: "deadline_risk",
        severity: "medium",
        reason: `Nhi\u1EC7m v\u1EE5 c\xF2n ${daysUntilDeadline} ng\xE0y \u0111\u1EBFn h\u1EA1n nh\u01B0ng m\u1EDBi ho\xE0n th\xE0nh ${task.progress}%`,
        suggestion: "C\u1EA7n theo d\xF5i s\xE1t ti\u1EBFn \u0111\u1ED9 v\xE0 xem x\xE9t t\u0103ng ngu\u1ED3n l\u1EF1c"
      });
    }
  }
  return alerts.slice(0, 1);
}
async function suggestTaskReassignment(userId) {
  try {
    const assignments = await storage.getUserTaskAssignments(userId);
    const activeTasks = await Promise.all(
      assignments.map((a) => storage.getTask(a.taskId))
    );
    const activeTasksCount = activeTasks.filter(
      (t) => t && t.status !== "Ho\xE0n th\xE0nh"
    ).length;
    if (activeTasksCount <= 5) {
      return {
        shouldReassign: false,
        reason: `Ng\u01B0\u1EDDi d\xF9ng c\xF3 ${activeTasksCount} nhi\u1EC7m v\u1EE5 \u0111ang th\u1EF1c hi\u1EC7n, ch\u01B0a qu\xE1 t\u1EA3i`,
        suggestion: "",
        recommendedUsers: []
      };
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return {
        shouldReassign: false,
        reason: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng",
        suggestion: "",
        recommendedUsers: []
      };
    }
    const sameDeptUsers = await storage.getUsers({ departmentId: user.departmentId || void 0 });
    const userWorkloads = await Promise.all(
      sameDeptUsers.filter((u) => u.id !== userId && (u.role === "Chuy\xEAn vi\xEAn" || u.role === "Ph\xF3 tr\u01B0\u1EDFng ph\xF2ng")).map(async (u) => {
        const userAssignments = await storage.getUserTaskAssignments(u.id);
        const userTasks = await Promise.all(
          userAssignments.map((a) => storage.getTask(a.taskId))
        );
        const activeCount = userTasks.filter((t) => t && t.status !== "Ho\xE0n th\xE0nh").length;
        return { userId: u.id, fullName: u.fullName, activeTasksCount: activeCount };
      })
    );
    const availableUsers = userWorkloads.filter((w) => w.activeTasksCount < 5).sort((a, b) => a.activeTasksCount - b.activeTasksCount).slice(0, 3);
    if (availableUsers.length > 0) {
      return {
        shouldReassign: true,
        reason: `Ng\u01B0\u1EDDi d\xF9ng ${user.fullName} c\xF3 ${activeTasksCount} nhi\u1EC7m v\u1EE5 \u0111ang th\u1EF1c hi\u1EC7n (qu\xE1 t\u1EA3i)`,
        suggestion: `N\xEAn ph\xE2n c\xF4ng l\u1EA1i m\u1ED9t s\u1ED1 nhi\u1EC7m v\u1EE5 cho nh\u1EEFng ng\u01B0\u1EDDi c\xF3 kh\u1ED1i l\u01B0\u1EE3ng c\xF4ng vi\u1EC7c th\u1EA5p h\u01A1n`,
        recommendedUsers: availableUsers.map((u) => u.userId)
      };
    }
    return {
      shouldReassign: true,
      reason: `Ng\u01B0\u1EDDi d\xF9ng ${user.fullName} c\xF3 ${activeTasksCount} nhi\u1EC7m v\u1EE5 (qu\xE1 t\u1EA3i) nh\u01B0ng to\xE0n b\u1ED9 ph\xF2ng ban \u0111ang b\u1EADn`,
      suggestion: "N\xEAn c\xE2n nh\u1EAFc tuy\u1EC3n th\xEAm nh\xE2n s\u1EF1 ho\u1EB7c \u0111i\u1EC1u ch\u1EC9nh deadline c\xE1c nhi\u1EC7m v\u1EE5",
      recommendedUsers: []
    };
  } catch (error) {
    console.error("Task reassignment suggestion error:", error);
    return {
      shouldReassign: false,
      reason: "L\u1ED7i khi ph\xE2n t\xEDch",
      suggestion: "",
      recommendedUsers: []
    };
  }
}
async function generateDailyTaskSummary(userId) {
  try {
    const assignments = await storage.getUserTaskAssignments(userId);
    const tasks2 = await Promise.all(
      assignments.map((a) => storage.getTask(a.taskId))
    );
    const activeTasks = tasks2.filter((t) => t && t.status !== "Ho\xE0n th\xE0nh");
    const nearDeadlineTasks = activeTasks.filter((t) => {
      if (!t) return false;
      const deadline = new Date(t.deadline);
      const now = /* @__PURE__ */ new Date();
      const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      return daysUntil <= 3;
    });
    const summary = `\u{1F4CA} T\u1ED5ng h\u1EE3p c\xF4ng vi\u1EC7c ng\xE0y ${(/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")}

\u{1F539} T\u1ED5ng s\u1ED1 nhi\u1EC7m v\u1EE5 \u0111ang th\u1EF1c hi\u1EC7n: ${activeTasks.length}
\u{1F539} Nhi\u1EC7m v\u1EE5 s\u1EAFp \u0111\u1EBFn h\u1EA1n (\u22643 ng\xE0y): ${nearDeadlineTasks.length}

${nearDeadlineTasks.length > 0 ? `\u26A0\uFE0F C\u1EA6N \u01AFU TI\xCAN:
${nearDeadlineTasks.map((t) => {
      if (!t) return "";
      const deadline = new Date(t.deadline);
      const now = /* @__PURE__ */ new Date();
      const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      return `  \u2022 ${t.title} - Ti\u1EBFn \u0111\u1ED9: ${t.progress}% - C\xF2n ${daysUntil} ng\xE0y`;
    }).join("\n")}` : "\u2705 Kh\xF4ng c\xF3 nhi\u1EC7m v\u1EE5 s\u1EAFp \u0111\u1EBFn h\u1EA1n"}`;
    return summary;
  } catch (error) {
    console.error("Daily summary error:", error);
    return "Kh\xF4ng th\u1EC3 t\u1EA1o t\u1ED5ng h\u1EE3p";
  }
}
async function generateDashboardSuggestions(userId, role, dismissedTypes = []) {
  try {
    const suggestions = [];
    const user = await storage.getUser(userId);
    if (!user) return suggestions;
    const assignments = await storage.getUserTaskAssignments(userId);
    const tasks2 = await Promise.all(
      assignments.map((a) => storage.getTask(a.taskId))
    );
    const activeTasks = tasks2.filter((t) => t && t.status !== "Ho\xE0n th\xE0nh");
    const now = /* @__PURE__ */ new Date();
    const nearDeadlineTasks = activeTasks.filter((t) => {
      if (!t) return false;
      const deadline = new Date(t.deadline);
      const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
      return daysUntil <= 3 && daysUntil >= 0;
    });
    const overdueTask = activeTasks.filter((t) => {
      if (!t) return false;
      const deadline = new Date(t.deadline);
      return deadline < now;
    });
    if (role === "Chuy\xEAn vi\xEAn" || role === "Ph\xF3 tr\u01B0\u1EDFng ph\xF2ng") {
      const leadTasks = assignments.filter((a) => a.role === "Ch\u1EE7 tr\xEC").length;
      const supportTasks = assignments.filter((a) => a.role === "Ph\u1ED1i h\u1EE3p").length;
      if (!dismissedTypes.includes("deadline_warning") && nearDeadlineTasks.length > 0) {
        const urgentTask = nearDeadlineTasks[0];
        const daysLeft = Math.floor((new Date(urgentTask.deadline).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
        const userAssignment = assignments.find((a) => a.taskId === urgentTask.id);
        const roleLabel = userAssignment?.role === "Ch\u1EE7 tr\xEC" ? "(Ch\u1EE7 tr\xEC)" : "(Ph\u1ED1i h\u1EE3p)";
        suggestions.push({
          id: "deadline_warning",
          type: "deadline_warning",
          priority: "high",
          title: `"${urgentTask.title}" ${roleLabel} c\xF2n ${daysLeft} ng\xE0y`,
          content: `Nhi\u1EC7m v\u1EE5 "${urgentTask.title}" b\u1EA1n \u0111ang ${userAssignment?.role} s\u1EBD \u0111\u1EBFn h\u1EA1n trong ${daysLeft} ng\xE0y. Ti\u1EBFn \u0111\u1ED9 hi\u1EC7n t\u1EA1i: ${urgentTask.progress}%. ${nearDeadlineTasks.length > 1 ? `C\xF2n ${nearDeadlineTasks.length - 1} nhi\u1EC7m v\u1EE5 kh\xE1c c\u0169ng s\u1EAFp \u0111\u1EBFn h\u1EA1n.` : ""}`,
          actionable: true,
          details: nearDeadlineTasks.map((t) => {
            const userA = assignments.find((a) => a.taskId === t.id);
            return `\u2022 ${t.title} [${userA?.role}] - ${t.progress}% (C\xF2n ${Math.floor((new Date(t.deadline).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24))} ng\xE0y)`;
          }).join("\n")
        });
      }
      if (!dismissedTypes.includes("overdue_alert") && overdueTask.length > 0) {
        const mostOverdueTask = overdueTask.sort(
          (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        )[0];
        const daysOverdue = Math.abs(Math.floor((new Date(mostOverdueTask.deadline).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)));
        const userAssignment = assignments.find((a) => a.taskId === mostOverdueTask.id);
        suggestions.push({
          id: "overdue_alert",
          type: "overdue_alert",
          priority: "high",
          title: `"${mostOverdueTask.title}" qu\xE1 h\u1EA1n ${daysOverdue} ng\xE0y`,
          content: `Nhi\u1EC7m v\u1EE5 "${mostOverdueTask.title}" (${userAssignment?.role}) \u0111\xE3 qu\xE1 h\u1EA1n ${daysOverdue} ng\xE0y. ${mostOverdueTask.priority === "Kh\u1EA9n c\u1EA5p" ? "\u0110\xE2y l\xE0 nhi\u1EC7m v\u1EE5 KH\u1EA8N C\u1EA4P - c\u1EA7n x\u1EED l\xFD ngay!" : "H\xE3y c\u1EADp nh\u1EADt ti\u1EBFn \u0111\u1ED9 v\xE0 b\xE1o c\xE1o tr\u01B0\u1EDFng ph\xF2ng."} ${overdueTask.length > 1 ? `B\u1EA1n c\xF2n ${overdueTask.length - 1} nhi\u1EC7m v\u1EE5 qu\xE1 h\u1EA1n kh\xE1c.` : ""}`,
          actionable: true,
          details: overdueTask.map((t) => {
            const userA = assignments.find((a) => a.taskId === t.id);
            return `\u2022 ${t.title} [${userA?.role}] - ${t.priority} (Qu\xE1 h\u1EA1n ${Math.abs(Math.floor((new Date(t.deadline).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)))} ng\xE0y)`;
          }).join("\n")
        });
      }
      const lowProgressTasks = activeTasks.filter((t) => {
        if (!t) return false;
        const deadline = new Date(t.deadline);
        const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
        return t.progress < 30 && daysUntil <= 5 && daysUntil > 0;
      });
      if (!dismissedTypes.includes("progress_slow") && lowProgressTasks.length > 0) {
        const criticalTask = lowProgressTasks.find((t) => t.priority === "Kh\u1EA9n c\u1EA5p") || lowProgressTasks[0];
        const userAssignment = assignments.find((a) => a.taskId === criticalTask.id);
        suggestions.push({
          id: "progress_slow",
          type: "progress_slow",
          priority: "medium",
          title: `"${criticalTask.title}" ti\u1EBFn \u0111\u1ED9 ${criticalTask.progress}% - ch\u1EADm`,
          content: `Nhi\u1EC7m v\u1EE5 "${criticalTask.title}" (${userAssignment?.role}) ch\u1EC9 \u0111\u1EA1t ${criticalTask.progress}% ti\u1EBFn \u0111\u1ED9 nh\u01B0ng s\u1EAFp \u0111\u1EBFn h\u1EA1n. ${userAssignment?.role === "Ch\u1EE7 tr\xEC" ? "B\u1EA1n l\xE0 ng\u01B0\u1EDDi ch\u1EE7 tr\xEC - c\u1EA7n \u0111\u1EA9y nhanh ti\u1EBFn \u0111\u1ED9 ho\u1EB7c b\xE1o c\xE1o kh\xF3 kh\u0103n." : "H\xE3y ph\u1ED1i h\u1EE3p t\xEDch c\u1EF1c v\u1EDBi ng\u01B0\u1EDDi ch\u1EE7 tr\xEC."}`,
          actionable: true,
          details: lowProgressTasks.map((t) => {
            const userA = assignments.find((a) => a.taskId === t.id);
            return `\u2022 ${t.title} [${userA?.role}] - ${t.progress}% - ${t.priority}`;
          }).join("\n")
        });
      }
      if (!dismissedTypes.includes("kpi_improvement") && leadTasks + supportTasks > 0) {
        const completedCount = tasks2.filter((t) => t && t.status === "Ho\xE0n th\xE0nh").length;
        const completionRate = Math.round(completedCount / (leadTasks + supportTasks) * 100);
        suggestions.push({
          id: "kpi_improvement",
          type: "kpi_improvement",
          priority: "low",
          title: `${user.fullName}: ${leadTasks} nhi\u1EC7m v\u1EE5 Ch\u1EE7 tr\xEC, ${supportTasks} Ph\u1ED1i h\u1EE3p`,
          content: `B\u1EA1n \u0111ang c\xF3 ${leadTasks} nhi\u1EC7m v\u1EE5 Ch\u1EE7 tr\xEC (KPI x1.0) v\xE0 ${supportTasks} nhi\u1EC7m v\u1EE5 Ph\u1ED1i h\u1EE3p (KPI x0.3). T\u1EF7 l\u1EC7 ho\xE0n th\xE0nh: ${completionRate}%. M\u1EB9o: \u01AFu ti\xEAn nhi\u1EC7m v\u1EE5 Ch\u1EE7 tr\xEC + Kh\u1EA9n c\u1EA5p \u0111\u1EC3 t\u1ED1i \u0111a h\xF3a KPI.`,
          actionable: false
        });
      }
    }
    if (role === "Tr\u01B0\u1EDFng ph\xF2ng") {
      const deptTasks = await storage.getTasks({ departmentId: user.departmentId });
      const deptActiveTasks = deptTasks.filter((t) => t.status !== "Ho\xE0n th\xE0nh");
      const deptOverdue = deptTasks.filter((t) => {
        const deadline = new Date(t.deadline);
        return deadline < now && t.status !== "Ho\xE0n th\xE0nh";
      });
      if (!dismissedTypes.includes("dept_overdue") && deptOverdue.length > 0) {
        const urgentOverdue = deptOverdue.find((t) => t.priority === "Kh\u1EA9n c\u1EA5p");
        const targetTask = urgentOverdue || deptOverdue[0];
        const daysOverdue = Math.abs(Math.floor((new Date(targetTask.deadline).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)));
        const taskAssignments2 = await storage.getTaskAssignments(targetTask.id);
        const assigneeNames = await Promise.all(
          taskAssignments2.map(async (a) => {
            const u = await storage.getUser(a.userId);
            return u ? `${u.fullName} (${a.role})` : "Unknown";
          })
        );
        suggestions.push({
          id: "dept_overdue",
          type: "dept_overdue",
          priority: "high",
          title: `"${targetTask.title}" qu\xE1 h\u1EA1n ${daysOverdue} ng\xE0y`,
          content: `Nhi\u1EC7m v\u1EE5 "${targetTask.title}" ${targetTask.priority === "Kh\u1EA9n c\u1EA5p" ? "(KH\u1EA8N C\u1EA4P) " : ""}\u0111\xE3 qu\xE1 h\u1EA1n ${daysOverdue} ng\xE0y. Ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n: ${assigneeNames.join(", ")}. ${deptOverdue.length > 1 ? `Ph\xF2ng c\xF2n ${deptOverdue.length - 1} nhi\u1EC7m v\u1EE5 qu\xE1 h\u1EA1n kh\xE1c.` : ""} H\xE3y h\u1ECDp v\u1EDBi team \u0111\u1EC3 x\u1EED l\xFD.`,
          actionable: true,
          details: deptOverdue.slice(0, 5).map((t) => `\u2022 ${t.title} - ${t.priority} (Qu\xE1 h\u1EA1n ${Math.abs(Math.floor((new Date(t.deadline).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)))} ng\xE0y)`).join("\n")
        });
      }
      const completionRate = deptTasks.length > 0 ? Math.round(deptTasks.filter((t) => t.status === "Ho\xE0n th\xE0nh").length / deptTasks.length * 100) : 0;
      if (!dismissedTypes.includes("dept_performance") && completionRate < 70 && deptTasks.length > 0) {
        const completedCount = deptTasks.filter((t) => t.status === "Ho\xE0n th\xE0nh").length;
        const inProgressCount = deptTasks.filter((t) => t.status === "\u0110ang th\u1EF1c hi\u1EC7n").length;
        const dept = user.departmentId ? await storage.getDepartment(user.departmentId) : null;
        suggestions.push({
          id: "dept_performance",
          type: "dept_performance",
          priority: "medium",
          title: `Ph\xF2ng ${dept?.name || "c\u1EE7a b\u1EA1n"}: ${completionRate}% ho\xE0n th\xE0nh`,
          content: `Hi\u1EC7u su\u1EA5t ph\xF2ng \u0111ang \u1EDF m\u1EE9c ${completionRate}% (${completedCount}/${deptTasks.length} nhi\u1EC7m v\u1EE5). C\xF3 ${inProgressCount} nhi\u1EC7m v\u1EE5 \u0111ang th\u1EF1c hi\u1EC7n, ${deptOverdue.length} qu\xE1 h\u1EA1n. \u0110\u1EC1 xu\u1EA5t: H\u1ECDp team \u0111\u1EC3 t\xE1i ph\xE2n c\xF4ng workload v\xE0 h\u1ED7 tr\u1EE3 nh\u1EEFng ng\u01B0\u1EDDi \u0111ang qu\xE1 t\u1EA3i.`,
          actionable: true
        });
      }
    }
    if (role === "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
      const directiveTasks = activeTasks.filter((t) => {
        const assignment = assignments.find((a) => a.taskId === t?.id);
        return assignment && assignment.role === "Ch\u1EC9 \u0111\u1EA1o";
      });
      const directiveOverdue = directiveTasks.filter((t) => {
        if (!t) return false;
        const deadline = new Date(t.deadline);
        return deadline < now;
      });
      const directiveNearDeadline = directiveTasks.filter((t) => {
        if (!t) return false;
        const deadline = new Date(t.deadline);
        const daysUntil = Math.floor((deadline.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
        return daysUntil <= 3 && daysUntil >= 0;
      });
      if (!dismissedTypes.includes("directive_overdue") && directiveOverdue.length > 0) {
        const urgentTask = directiveOverdue.find((t) => t.priority === "Kh\u1EA9n c\u1EA5p") || directiveOverdue[0];
        const daysOverdue = Math.abs(Math.floor((new Date(urgentTask.deadline).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)));
        suggestions.push({
          id: "directive_overdue",
          type: "directive_overdue",
          priority: "high",
          title: `Nhi\u1EC7m v\u1EE5 Ch\u1EC9 \u0111\u1EA1o qu\xE1 h\u1EA1n: "${urgentTask.title}"`,
          content: `Nhi\u1EC7m v\u1EE5 "${urgentTask.title}" b\u1EA1n \u0111ang Ch\u1EC9 \u0111\u1EA1o \u0111\xE3 qu\xE1 h\u1EA1n ${daysOverdue} ng\xE0y. ${urgentTask.priority === "Kh\u1EA9n c\u1EA5p" ? "\u0110\xE2y l\xE0 nhi\u1EC7m v\u1EE5 KH\u1EA8N C\u1EA4P - " : ""}Ti\u1EBFn \u0111\u1ED9 hi\u1EC7n t\u1EA1i: ${urgentTask.progress}%. ${directiveOverdue.length > 1 ? `B\u1EA1n c\xF2n ${directiveOverdue.length - 1} nhi\u1EC7m v\u1EE5 Ch\u1EC9 \u0111\u1EA1o qu\xE1 h\u1EA1n kh\xE1c.` : ""} \u0110\u1EC1 xu\u1EA5t: H\u1ECDp v\u1EDBi ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n \u0111\u1EC3 \u0111\xF4n \u0111\u1ED1c.`,
          actionable: true,
          details: directiveOverdue.map((t) => `\u2022 ${t.title} - ${t.priority} - ${t.progress}% (Qu\xE1 h\u1EA1n ${Math.abs(Math.floor((new Date(t.deadline).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)))} ng\xE0y)`).join("\n")
        });
      }
      if (!dismissedTypes.includes("directive_supervision") && directiveTasks.length > 0) {
        const lowProgressTasks = directiveTasks.filter((t) => t && t.progress < 50);
        const completedDirective = tasks2.filter((t) => {
          const assignment = assignments.find((a) => a.taskId === t?.id);
          return t && t.status === "Ho\xE0n th\xE0nh" && assignment && assignment.role === "Ch\u1EC9 \u0111\u1EA1o";
        }).length;
        suggestions.push({
          id: "directive_supervision",
          type: "directive_supervision",
          priority: "medium",
          title: `Gi\xE1m s\xE1t: ${directiveTasks.length} nhi\u1EC7m v\u1EE5 Ch\u1EC9 \u0111\u1EA1o (${completedDirective} ho\xE0n th\xE0nh)`,
          content: `B\u1EA1n \u0111ang Ch\u1EC9 \u0111\u1EA1o ${directiveTasks.length} nhi\u1EC7m v\u1EE5, \u0111\xE3 ho\xE0n th\xE0nh ${completedDirective}. ${lowProgressTasks.length > 0 ? `C\xF3 ${lowProgressTasks.length} nhi\u1EC7m v\u1EE5 ti\u1EBFn \u0111\u1ED9 < 50% c\u1EA7n theo d\xF5i s\xE1t.` : "C\xE1c nhi\u1EC7m v\u1EE5 \u0111ang ti\u1EBFn tri\u1EC3n t\u1ED1t."} ${directiveNearDeadline.length > 0 ? `\u26A0\uFE0F ${directiveNearDeadline.length} nhi\u1EC7m v\u1EE5 s\u1EAFp \u0111\u1EBFn h\u1EA1n trong 3 ng\xE0y.` : ""}`,
          actionable: lowProgressTasks.length > 0,
          details: lowProgressTasks.length > 0 ? lowProgressTasks.slice(0, 5).map((t) => `\u2022 ${t.title} - ${t.progress}% - ${t.priority}`).join("\n") : "T\u1EA5t c\u1EA3 nhi\u1EC7m v\u1EE5 \u0111ang ti\u1EBFn tri\u1EC3n theo k\u1EBF ho\u1EA1ch."
        });
      }
    }
    if (role === "Gi\xE1m \u0111\u1ED1c") {
      const allTasks = await storage.getTasks({});
      const allActiveTasks = allTasks.filter((t) => t.status !== "Ho\xE0n th\xE0nh");
      const allOverdue = allTasks.filter((t) => {
        const deadline = new Date(t.deadline);
        return deadline < now && t.status !== "Ho\xE0n th\xE0nh";
      });
      if (!dismissedTypes.includes("org_overdue") && allOverdue.length > 0) {
        const overdueByDept = {};
        for (const task of allOverdue) {
          if (task.departmentId) {
            const dept = await storage.getDepartment(task.departmentId);
            const deptName = dept?.name || "Kh\xF4ng r\xF5";
            overdueByDept[deptName] = (overdueByDept[deptName] || 0) + 1;
          } else {
            overdueByDept["Kh\xF4ng ph\xF2ng ban"] = (overdueByDept["Kh\xF4ng ph\xF2ng ban"] || 0) + 1;
          }
        }
        const deptSummary = Object.entries(overdueByDept).sort(([, a], [, b]) => b - a).slice(0, 3).map(([dept, count]) => `${dept}: ${count}`).join(", ");
        const urgentOverdue = allOverdue.filter((t) => t.priority === "Kh\u1EA9n c\u1EA5p").length;
        suggestions.push({
          id: "org_overdue",
          type: "org_overdue",
          priority: "high",
          title: `To\xE0n c\u01A1 quan: ${allOverdue.length} nhi\u1EC7m v\u1EE5 qu\xE1 h\u1EA1n (${urgentOverdue} kh\u1EA9n c\u1EA5p)`,
          content: `C\u1EA3 c\u01A1 quan c\xF3 ${allOverdue.length} nhi\u1EC7m v\u1EE5 qu\xE1 h\u1EA1n, trong \u0111\xF3 ${urgentOverdue} nhi\u1EC7m v\u1EE5 KH\u1EA8N C\u1EA4P. Top \u0111\u01A1n v\u1ECB: ${deptSummary}. \u0110\u1EC1 xu\u1EA5t chi\u1EBFn l\u01B0\u1EE3c: H\u1ECDp kh\u1EA9n v\u1EDBi tr\u01B0\u1EDFng ph\xF2ng c\xE1c \u0111\u01A1n v\u1ECB tr\u1ECDng \u0111i\u1EC3m \u0111\u1EC3 x\u1EED l\xFD v\xE0 t\xE1i c\u1EA5u tr\xFAc quy tr\xECnh.`,
          actionable: true,
          details: allOverdue.slice(0, 10).map((t) => `\u2022 ${t.title} - ${t.priority} (Qu\xE1 h\u1EA1n ${Math.abs(Math.floor((new Date(t.deadline).getTime() - now.getTime()) / (1e3 * 60 * 60 * 24)))} ng\xE0y)`).join("\n")
        });
      }
      const orgCompletionRate = allTasks.length > 0 ? Math.round(allTasks.filter((t) => t.status === "Ho\xE0n th\xE0nh").length / allTasks.length * 100) : 0;
      if (!dismissedTypes.includes("org_progress") && allTasks.length > 0) {
        const completedCount = allTasks.filter((t) => t.status === "Ho\xE0n th\xE0nh").length;
        const urgentCount = allActiveTasks.filter((t) => t.priority === "Kh\u1EA9n c\u1EA5p").length;
        const importantCount = allActiveTasks.filter((t) => t.priority === "Quan tr\u1ECDng").length;
        suggestions.push({
          id: "org_progress",
          type: "org_progress",
          priority: "medium",
          title: `Hi\u1EC7u su\u1EA5t t\u1ED5 ch\u1EE9c: ${orgCompletionRate}% (${completedCount}/${allTasks.length})`,
          content: `To\xE0n c\u01A1 quan \u0111\u1EA1t ${orgCompletionRate}% t\u1EF7 l\u1EC7 ho\xE0n th\xE0nh v\u1EDBi ${allActiveTasks.length} nhi\u1EC7m v\u1EE5 \u0111ang tri\u1EC3n khai. \u01AFu ti\xEAn: ${urgentCount} Kh\u1EA9n c\u1EA5p, ${importantCount} Quan tr\u1ECDng. ${allOverdue.length > 0 ? `\u26A0\uFE0F C\xF3 ${allOverdue.length} nhi\u1EC7m v\u1EE5 qu\xE1 h\u1EA1n c\u1EA7n can thi\u1EC7p l\xE3nh \u0111\u1EA1o.` : "\u2713 Xu\u1EA5t s\u1EAFc! Kh\xF4ng c\xF3 nhi\u1EC7m v\u1EE5 qu\xE1 h\u1EA1n."} Xu h\u01B0\u1EDBng KPI: ${orgCompletionRate >= 80 ? "T\xEDch c\u1EF1c \u2197" : orgCompletionRate >= 60 ? "\u1ED4n \u0111\u1ECBnh \u2192" : "C\u1EA7n c\u1EA3i thi\u1EC7n \u2198"}`,
          actionable: false,
          details: `T\u1ED5ng: ${allTasks.length}
Ho\xE0n th\xE0nh: ${completedCount}
\u0110ang th\u1EF1c hi\u1EC7n: ${allActiveTasks.length}
Qu\xE1 h\u1EA1n: ${allOverdue.length}
Kh\u1EA9n c\u1EA5p: ${urgentCount}
Quan tr\u1ECDng: ${importantCount}`
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
async function generateTaskReportInsights(stats) {
  try {
    const prompt = `B\u1EA1n l\xE0 chuy\xEAn gia ph\xE2n t\xEDch qu\u1EA3n l\xFD c\xF4ng vi\u1EC7c. H\xE3y ph\xE2n t\xEDch b\xE1o c\xE1o nhi\u1EC7m v\u1EE5 sau v\xE0 \u0111\u01B0a ra nh\u1EEFng th\xF4ng tin h\u1EEFu \xEDch:

TH\u1ED0NG K\xCA:
- T\u1ED5ng s\u1ED1 nhi\u1EC7m v\u1EE5: ${stats.totalTasks}
- Ho\xE0n th\xE0nh: ${stats.completedTasks} (${stats.completionRate.toFixed(1)}%)
- \u0110ang th\u1EF1c hi\u1EC7n: ${stats.inProgressTasks}
- Ch\u01B0a b\u1EAFt \u0111\u1EA7u: ${stats.notStartedTasks}
- Qu\xE1 h\u1EA1n: ${stats.overdueTasks}
- Th\u1EDDi gian ho\xE0n th\xE0nh trung b\xECnh: ${stats.avgCompletionDays} ng\xE0y

PH\xC2N B\u1ED0 THEO TR\u1EA0NG TH\xC1I:
${stats.tasksByStatus.map((s) => `- ${s.status}: ${s.count}`).join("\n")}

PH\xC2N B\u1ED0 THEO \u0110\u1ED8 \u01AFU TI\xCAN:
${stats.tasksByPriority.map((p) => `- ${p.priority}: ${p.count}`).join("\n")}

H\xE3y ph\xE2n t\xEDch v\xE0 \u0111\u01B0a ra:
1. summary: T\xF3m t\u1EAFt ng\u1EAFn g\u1ECDn t\xECnh h\xECnh th\u1EF1c hi\u1EC7n (1-2 c\xE2u)
2. trends: C\xE1c xu h\u01B0\u1EDBng quan tr\u1ECDng (2-3 \u0111i\u1EC3m)
3. strengths: \u0110i\u1EC3m m\u1EA1nh (2-3 \u0111i\u1EC3m)
4. weaknesses: \u0110i\u1EC3m y\u1EBFu c\u1EA7n c\u1EA3i thi\u1EC7n (2-3 \u0111i\u1EC3m)
5. recommendations: \u0110\u1EC1 xu\u1EA5t h\xE0nh \u0111\u1ED9ng c\u1EE5 th\u1EC3 (3-4 \u0111i\u1EC3m)

Tr\u1EA3 v\u1EC1 JSON format:
{
  "summary": "<t\xF3m t\u1EAFt>",
  "trends": ["<xu h\u01B0\u1EDBng 1>", "<xu h\u01B0\u1EDBng 2>"],
  "strengths": ["<\u0111i\u1EC3m m\u1EA1nh 1>", "<\u0111i\u1EC3m m\u1EA1nh 2>"],
  "weaknesses": ["<\u0111i\u1EC3m y\u1EBFu 1>", "<\u0111i\u1EC3m y\u1EBFu 2>"],
  "recommendations": ["<\u0111\u1EC1 xu\u1EA5t 1>", "<\u0111\u1EC1 xu\u1EA5t 2>", "<\u0111\u1EC1 xu\u1EA5t 3>"]
}`;
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1500
    });
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      summary: result.summary || "Kh\xF4ng th\u1EC3 t\u1EA1o t\xF3m t\u1EAFt",
      trends: result.trends || [],
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      recommendations: result.recommendations || []
    };
  } catch (error) {
    console.error("Generate task report insights error:", error);
    return {
      summary: "Kh\xF4ng th\u1EC3 t\u1EA1o ph\xE2n t\xEDch AI",
      trends: [],
      strengths: [],
      weaknesses: [],
      recommendations: []
    };
  }
}
async function detectDuplicateTasks(newTaskTitle, newTaskDescription, existingTasks) {
  try {
    if (existingTasks.length === 0) {
      return [];
    }
    const tasksInfo = existingTasks.map(
      (t, i) => `${i + 1}. [${t.taskNumber}] ${t.title}${t.description ? `
   M\xF4 t\u1EA3: ${t.description}` : ""}`
    ).join("\n");
    const prompt = `B\u1EA1n l\xE0 chuy\xEAn gia ph\xE2n t\xEDch nhi\u1EC7m v\u1EE5 c\xF4ng vi\u1EC7c. H\xE3y so s\xE1nh nhi\u1EC7m v\u1EE5 m\u1EDBi v\u1EDBi danh s\xE1ch nhi\u1EC7m v\u1EE5 hi\u1EC7n c\xF3 \u0111\u1EC3 ph\xE1t hi\u1EC7n tr\xF9ng l\u1EAFp ho\u1EB7c t\u01B0\u01A1ng t\u1EF1.

NHI\u1EC6M V\u1EE4 M\u1EDAI:
Ti\xEAu \u0111\u1EC1: ${newTaskTitle}
M\xF4 t\u1EA3: ${newTaskDescription || "Kh\xF4ng c\xF3"}

DANH S\xC1CH NHI\u1EC6M V\u1EE4 HI\u1EC6N C\xD3:
${tasksInfo}

H\xE3y x\xE1c \u0111\u1ECBnh c\xE1c nhi\u1EC7m v\u1EE5 t\u01B0\u01A1ng t\u1EF1 v\u1EDBi nhi\u1EC7m v\u1EE5 m\u1EDBi. Ch\u1EC9 b\xE1o c\xE1o nh\u1EEFng nhi\u1EC7m v\u1EE5 c\xF3 \u0111\u1ED9 t\u01B0\u01A1ng \u0111\u1ED3ng >= 60%.

\u0110\xE1nh gi\xE1 d\u1EF1a tr\xEAn:
- N\u1ED9i dung c\xF4ng vi\u1EC7c
- M\u1EE5c ti\xEAu
- Ph\u1EA1m vi th\u1EF1c hi\u1EC7n
- B\u1ED1i c\u1EA3nh

Tr\u1EA3 v\u1EC1 JSON array c\xE1c nhi\u1EC7m v\u1EE5 tr\xF9ng l\u1EAFp (r\u1ED7ng n\u1EBFu kh\xF4ng c\xF3):
{
  "duplicates": [
    {
      "taskIndex": <index trong danh s\xE1ch, b\u1EAFt \u0111\u1EA7u t\u1EEB 1>,
      "similarity": <s\u1ED1 t\u1EEB 0-100>,
      "reason": "<l\xFD do ng\u1EAFn g\u1ECDn t\u1EA1i sao gi\u1ED1ng nhau>"
    }
  ]
}`;
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1e3
    });
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    const duplicates = [];
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
              reason: dup.reason || "N\u1ED9i dung t\u01B0\u01A1ng t\u1EF1"
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

// server/file-upload.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
var uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
var storage2 = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  }
});
var fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain"
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3"));
  }
};
var upload = multer({
  storage: storage2,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});
function getFilePath(filename) {
  return path.join(uploadDir, filename);
}
function deleteFile(filename) {
  const filePath = getFilePath(filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// server/task-reports.ts
function getDateRange(filters) {
  const now = /* @__PURE__ */ new Date();
  let startDate;
  let endDate = /* @__PURE__ */ new Date();
  if (filters.timeRange === "week") {
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
    const year = filters.year || now.getFullYear();
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59, 999);
  }
  return { startDate, endDate };
}
function getCurrentWeek(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 864e5;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
function getCurrentQuarter(date) {
  return Math.floor(date.getMonth() / 3) + 1;
}
function getStartOfWeek(year, week) {
  const firstDayOfYear = new Date(year, 0, 1);
  const daysToAdd = (week - 1) * 7 - firstDayOfYear.getDay();
  return new Date(year, 0, 1 + daysToAdd);
}
function getEndOfWeek(year, week) {
  const startOfWeek = getStartOfWeek(year, week);
  return new Date(startOfWeek.getTime() + 6 * 864e5 + 86399999);
}
function filterTasksByDateRange(tasks2, startDate, endDate) {
  return tasks2.filter((task) => {
    const deadline = new Date(task.deadline);
    const completedAt = task.completedAt ? new Date(task.completedAt) : null;
    const createdAt = new Date(task.createdAt);
    return deadline >= startDate && deadline <= endDate || completedAt && completedAt >= startDate && completedAt <= endDate || createdAt >= startDate && createdAt <= endDate;
  });
}
async function calculateTaskReportStats(filters) {
  const { startDate, endDate } = getDateRange(filters);
  let allTasks = await storage.getTasks({
    status: filters.status
  });
  if (filters.departmentId && filters.departmentId !== "all") {
    const usersInDept = await storage.getUsers({ departmentId: filters.departmentId });
    const userIdsInDept = usersInDept.map((u) => u.id);
    let taskIdsAssignedToDept = /* @__PURE__ */ new Set();
    if (userIdsInDept.length > 0) {
      const deptAssignments = await storage.getTaskAssignmentsForUsers(userIdsInDept);
      taskIdsAssignedToDept = new Set(deptAssignments.map((a) => a.taskId));
    }
    allTasks = allTasks.filter(
      (t) => t.departmentId === filters.departmentId || taskIdsAssignedToDept.has(t.id)
    );
  }
  const tasks2 = filterTasksByDateRange(allTasks, startDate, endDate);
  const now = /* @__PURE__ */ new Date();
  const totalTasks = tasks2.length;
  const completedTasks = tasks2.filter((t) => t.status === "Ho\xE0n th\xE0nh").length;
  const inProgressTasks = tasks2.filter((t) => t.status === "\u0110ang th\u1EF1c hi\u1EC7n").length;
  const notStartedTasks = tasks2.filter((t) => t.status === "Ch\u01B0a b\u1EAFt \u0111\u1EA7u").length;
  const overdueTasks = tasks2.filter(
    (t) => new Date(t.deadline) < now && t.status !== "Ho\xE0n th\xE0nh"
  ).length;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks * 100 : 0;
  const completedTasksWithDates = tasks2.filter(
    (t) => t.status === "Ho\xE0n th\xE0nh" && t.completedAt
  );
  let avgCompletionDays = 0;
  if (completedTasksWithDates.length > 0) {
    const totalDays = completedTasksWithDates.reduce((sum, task) => {
      const created = new Date(task.createdAt);
      const completed = new Date(task.completedAt);
      const days = Math.ceil((completed.getTime() - created.getTime()) / (1e3 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    avgCompletionDays = Math.round(totalDays / completedTasksWithDates.length);
  }
  const statusCounts = /* @__PURE__ */ new Map();
  tasks2.forEach((task) => {
    statusCounts.set(task.status, (statusCounts.get(task.status) || 0) + 1);
  });
  const tasksByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({
    status,
    count
  }));
  const priorityCounts = /* @__PURE__ */ new Map();
  tasks2.forEach((task) => {
    priorityCounts.set(task.priority, (priorityCounts.get(task.priority) || 0) + 1);
  });
  const tasksByPriority = Array.from(priorityCounts.entries()).map(([priority, count]) => ({
    priority,
    count
  }));
  const departments2 = await storage.getDepartments();
  const deptCounts = /* @__PURE__ */ new Map();
  tasks2.forEach((task) => {
    if (task.departmentId) {
      deptCounts.set(task.departmentId, (deptCounts.get(task.departmentId) || 0) + 1);
    }
  });
  const tasksByDepartment = Array.from(deptCounts.entries()).map(([departmentId, count]) => {
    const dept = departments2.find((d) => d.id === departmentId);
    return {
      departmentId,
      departmentName: dept?.name || "Kh\xF4ng x\xE1c \u0111\u1ECBnh",
      count
    };
  });
  const timelineData = generateTimelineData(tasks2, startDate, endDate);
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
    timelineData
  };
}
function generateTimelineData(tasks2, startDate, endDate) {
  const dayMap = /* @__PURE__ */ new Map();
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split("T")[0];
    dayMap.set(dateKey, { completed: 0, created: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  tasks2.forEach((task) => {
    const createdDate = new Date(task.createdAt).toISOString().split("T")[0];
    if (dayMap.has(createdDate)) {
      dayMap.get(createdDate).created++;
    }
    if (task.completedAt) {
      const completedDate = new Date(task.completedAt).toISOString().split("T")[0];
      if (dayMap.has(completedDate)) {
        dayMap.get(completedDate).completed++;
      }
    }
  });
  return Array.from(dayMap.entries()).map(([date, data]) => ({
    date,
    ...data
  })).sort((a, b) => a.date.localeCompare(b.date));
}

// server/routes.ts
init_telegram_service();
import fs2 from "fs";
function getRoleOrder(role) {
  const roleOrder = {
    "Gi\xE1m \u0111\u1ED1c": 1,
    "Ph\xF3 Gi\xE1m \u0111\u1ED1c": 2,
    "Tr\u01B0\u1EDFng ph\xF2ng": 3,
    "Ph\xF3 tr\u01B0\u1EDFng ph\xF2ng": 4,
    "Chuy\xEAn vi\xEAn": 5
  };
  return roleOrder[role] || 999;
}
function sortUsersByRole(users2) {
  return [...users2].sort((a, b) => {
    const roleOrderDiff = getRoleOrder(a.role) - getRoleOrder(b.role);
    if (roleOrderDiff !== 0) return roleOrderDiff;
    return a.fullName.localeCompare(b.fullName, "vi");
  });
}
async function registerRoutes(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ error: "T\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 t\u1ED3n t\u1EA1i" });
      }
      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });
      req.session.userId = user.id;
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      res.json({ user: sanitizeUser(req.user) });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 th\xF4ng tin" });
      }
      const user = await authenticateUser(username, password);
      if (!user) {
        return res.status(401).json({ error: "T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng \u0111\xFAng" });
      }
      req.session.userId = user.id;
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
      }
      res.json({ message: "\u0110\xE3 \u0111\u0103ng xu\u1EA5t" });
    });
  });
  app2.put("/api/profile/telegram", requireAuth, async (req, res) => {
    try {
      const validationSchema = z2.object({
        telegramId: z2.string().optional().default(""),
        groupTelegramChatId: z2.string().optional().default(""),
        notifyOnNewTask: z2.boolean().default(true),
        notifyOnDeadline: z2.boolean().default(true),
        notifyOnComment: z2.boolean().default(true),
        notifyOnScheduledAISuggestions: z2.boolean().default(false),
        notifyOnScheduledAIAlerts: z2.boolean().default(false),
        notifyOnScheduledWeeklyKPI: z2.boolean().default(false),
        notifyOnScheduledMonthlyKPI: z2.boolean().default(false)
      });
      const validated = validationSchema.parse(req.body);
      await storage.updateUserTelegramSettings(
        req.session.userId,
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
      res.json({ message: "C\u1EADp nh\u1EADt th\xE0nh c\xF4ng" });
    } catch (error) {
      console.error("Update telegram settings error:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/telegram/test", requireAuth, async (req, res) => {
    try {
      const { chatId } = req.body;
      if (!chatId || typeof chatId !== "string") {
        return res.status(400).json({ error: "Chat ID kh\xF4ng h\u1EE3p l\u1EC7" });
      }
      const success = await sendTestNotification(chatId.trim());
      if (success) {
        res.json({ message: "\u0110\xE3 g\u1EEDi tin nh\u1EAFn th\u1EED!" });
      } else {
        res.status(500).json({ error: "Kh\xF4ng th\u1EC3 g\u1EEDi tin nh\u1EAFn. Ki\u1EC3m tra l\u1EA1i Chat ID" });
      }
    } catch (error) {
      console.error("Send test telegram error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/telegram/check-deadlines", requireAuth, async (req, res) => {
    try {
      if (!req.user || !["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role)) {
        return res.status(403).json({ error: "Kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n" });
      }
      const now = /* @__PURE__ */ new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1e3);
      const tasks2 = await storage.getTasks({
        status: void 0,
        // Get all statuses
        includeDeleted: false
      });
      let notificationsSent = 0;
      let overdueSent = 0;
      for (const task of tasks2) {
        const deadline = new Date(task.deadline);
        const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1e3 * 60 * 60 * 24));
        if (task.status === "Ho\xE0n th\xE0nh") continue;
        const shouldNotify = daysUntilDeadline === 3 || daysUntilDeadline === 2 || daysUntilDeadline === 1 || daysUntilDeadline === 0;
        const isOverdue = deadline < now && task.status !== "Qu\xE1 h\u1EA1n";
        if (!shouldNotify && !isOverdue) continue;
        const assignments = await storage.getTaskAssignments(task.id);
        for (const assignment of assignments) {
          const assignee = await storage.getUser(assignment.userId);
          if (!assignee) continue;
          if (!assignee.notifyOnDeadline) continue;
          const milestone = isOverdue ? "overdue" : `${daysUntilDeadline}d`;
          const alreadySent = await db.select().from(telegramDeadlineNotifications).where(sql3`task_id = ${task.id} AND user_id = ${assignee.id} AND milestone = ${milestone}`).limit(1);
          if (alreadySent.length > 0) {
            continue;
          }
          if (isOverdue) {
            try {
              await notifyTaskOverdue(task, assignee);
              await db.insert(telegramDeadlineNotifications).values({
                taskId: task.id,
                userId: assignee.id,
                milestone: "overdue"
              });
              overdueSent++;
            } catch (error) {
              console.error(`Failed to send overdue notification for task ${task.id} to user ${assignee.id}:`, error);
            }
          } else if (shouldNotify) {
            try {
              await notifyDeadlineSoon(task, assignee, daysUntilDeadline);
              await db.insert(telegramDeadlineNotifications).values({
                taskId: task.id,
                userId: assignee.id,
                milestone: `${daysUntilDeadline}d`
              });
              notificationsSent++;
            } catch (error) {
              console.error(`Failed to send deadline notification for task ${task.id} to user ${assignee.id}:`, error);
            }
          }
        }
      }
      res.json({
        message: "\u0110\xE3 ki\u1EC3m tra deadlines",
        deadlineSoonNotifications: notificationsSent,
        overdueNotifications: overdueSent
      });
    } catch (error) {
      console.error("Check deadlines error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/telegram/scheduled/ai-suggestions", requireAuth, async (req, res) => {
    try {
      if (!req.user || !["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role)) {
        return res.status(403).json({ error: "Kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n" });
      }
      let sentToGroups = 0;
      let sentToIndividuals = 0;
      const deptHeads = await storage.getUsers({ role: "Tr\u01B0\u1EDFng ph\xF2ng" });
      const headsWithGroups = deptHeads.filter((h) => h.groupTelegramChatId);
      for (const head of headsWithGroups) {
        const suggestions = await generateDashboardSuggestions(head.id, head.role);
        if (suggestions.length > 0 && head.groupTelegramChatId) {
          const { sendAISuggestionsToGroup: sendAISuggestionsToGroup2 } = await Promise.resolve().then(() => (init_telegram_service(), telegram_service_exports));
          const success = await sendAISuggestionsToGroup2(head.groupTelegramChatId, suggestions);
          if (success) sentToGroups++;
        }
      }
      const allUsers = await storage.getUsers({});
      const optedInUsers = allUsers.filter((u) => u.notifyOnScheduledAISuggestions && u.telegramId);
      for (const user of optedInUsers) {
        const suggestions = await generateDashboardSuggestions(user.id, user.role);
        if (suggestions.length > 0) {
          const { sendAISuggestionsToGroup: sendAISuggestionsToGroup2 } = await Promise.resolve().then(() => (init_telegram_service(), telegram_service_exports));
          const success = await sendAISuggestionsToGroup2(user.telegramId, suggestions);
          if (success) sentToIndividuals++;
        }
      }
      res.json({
        message: `\u0110\xE3 g\u1EEDi AI suggestions: ${sentToGroups} nh\xF3m, ${sentToIndividuals} c\xE1 nh\xE2n`,
        sentToGroups,
        sentToIndividuals
      });
    } catch (error) {
      console.error("Send AI suggestions error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/telegram/scheduled/ai-alerts", requireAuth, async (req, res) => {
    try {
      if (!req.user || !["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role)) {
        return res.status(403).json({ error: "Kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n" });
      }
      let sentToGroups = 0;
      let sentToIndividuals = 0;
      const deptHeads = await storage.getUsers({ role: "Tr\u01B0\u1EDFng ph\xF2ng" });
      const headsWithGroups = deptHeads.filter((h) => h.groupTelegramChatId);
      for (const head of headsWithGroups) {
        const tasks2 = await storage.getTasks({
          departmentId: head.departmentId || void 0,
          includeDeleted: false
        });
        const alerts = [];
        for (const task of tasks2) {
          const progressUpdates2 = await storage.getProgressUpdates(task.id);
          const riskAlerts = await detectTaskRisks(task, progressUpdates2);
          for (const risk of riskAlerts) {
            alerts.push({
              taskTitle: task.title,
              severity: risk.severity,
              riskDescription: risk.reason
            });
          }
        }
        if (alerts.length > 0 && head.groupTelegramChatId) {
          const { sendAIAlertsToGroup: sendAIAlertsToGroup2 } = await Promise.resolve().then(() => (init_telegram_service(), telegram_service_exports));
          const success = await sendAIAlertsToGroup2(head.groupTelegramChatId, alerts);
          if (success) sentToGroups++;
        }
      }
      const allUsers = await storage.getUsers({});
      const optedInUsers = allUsers.filter((u) => u.notifyOnScheduledAIAlerts && u.telegramId);
      for (const user of optedInUsers) {
        const tasks2 = await storage.getTasks({
          userId: user.id,
          includeDeleted: false
        });
        const alerts = [];
        for (const task of tasks2) {
          const progressUpdates2 = await storage.getProgressUpdates(task.id);
          const riskAlerts = await detectTaskRisks(task, progressUpdates2);
          for (const risk of riskAlerts) {
            alerts.push({
              taskTitle: task.title,
              severity: risk.severity,
              riskDescription: risk.reason
            });
          }
        }
        if (alerts.length > 0) {
          const { sendAIAlertsToGroup: sendAIAlertsToGroup2 } = await Promise.resolve().then(() => (init_telegram_service(), telegram_service_exports));
          const success = await sendAIAlertsToGroup2(user.telegramId, alerts);
          if (success) sentToIndividuals++;
        }
      }
      res.json({
        message: `\u0110\xE3 g\u1EEDi AI alerts: ${sentToGroups} nh\xF3m, ${sentToIndividuals} c\xE1 nh\xE2n`,
        sentToGroups,
        sentToIndividuals
      });
    } catch (error) {
      console.error("Send AI alerts error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/telegram/scheduled/weekly-kpi", requireAuth, async (req, res) => {
    try {
      if (!req.user || !["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role)) {
        return res.status(403).json({ error: "Kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n" });
      }
      let sentToGroups = 0;
      let sentToIndividuals = 0;
      const departments2 = await storage.getDepartments();
      const deptHeads = await storage.getUsers({ role: "Tr\u01B0\u1EDFng ph\xF2ng" });
      for (const dept of departments2) {
        const head = deptHeads.find((h) => h.departmentId === dept.id && h.groupTelegramChatId);
        if (!head || !head.groupTelegramChatId) continue;
        const deptUsers = await storage.getUsers({ departmentId: dept.id });
        let totalKPI = 0;
        let count = 0;
        const performersWithScores = [];
        for (const user of deptUsers) {
          const now = /* @__PURE__ */ new Date();
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
        const { sendWeeklyKPIToGroup: sendWeeklyKPIToGroup2 } = await Promise.resolve().then(() => (init_telegram_service(), telegram_service_exports));
        const success = await sendWeeklyKPIToGroup2(
          head.groupTelegramChatId,
          dept.name,
          weeklyKPI,
          performersWithScores
        );
        if (success) sentToGroups++;
      }
      const allUsers = await storage.getUsers({});
      const optedInUsers = allUsers.filter((u) => u.notifyOnScheduledWeeklyKPI && u.telegramId);
      for (const user of optedInUsers) {
        const now = /* @__PURE__ */ new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(now);
        weekEnd.setHours(23, 59, 59, 999);
        const kpiData = await calculateUserKPI(user.id, weekStart, weekEnd);
        if (kpiData && kpiData.totalScore > 0) {
          const { sendWeeklyKPIToGroup: sendWeeklyKPIToGroup2 } = await Promise.resolve().then(() => (init_telegram_service(), telegram_service_exports));
          const deptName = user.departmentId ? (await storage.getDepartment(user.departmentId))?.name || "Ph\xF2ng ban" : "C\xE1 nh\xE2n";
          const success = await sendWeeklyKPIToGroup2(
            user.telegramId,
            deptName,
            kpiData.totalScore,
            [{ fullName: user.fullName, score: kpiData.totalScore }]
          );
          if (success) sentToIndividuals++;
        }
      }
      res.json({
        message: `\u0110\xE3 g\u1EEDi KPI tu\u1EA7n: ${sentToGroups} nh\xF3m, ${sentToIndividuals} c\xE1 nh\xE2n`,
        sentToGroups,
        sentToIndividuals
      });
    } catch (error) {
      console.error("Send weekly KPI error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/telegram/scheduled/monthly-kpi", requireAuth, async (req, res) => {
    try {
      if (!req.user || !["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role)) {
        return res.status(403).json({ error: "Kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n" });
      }
      let sentToGroups = 0;
      let sentToIndividuals = 0;
      const departments2 = await storage.getDepartments();
      const deptHeads = await storage.getUsers({ role: "Tr\u01B0\u1EDFng ph\xF2ng" });
      for (const dept of departments2) {
        const head = deptHeads.find((h) => h.departmentId === dept.id && h.groupTelegramChatId);
        if (!head || !head.groupTelegramChatId) continue;
        const tasks2 = await storage.getTasks({
          departmentId: dept.id,
          includeDeleted: false
        });
        const summary = {
          completed: tasks2.filter((t) => t.status === "Ho\xE0n th\xE0nh").length,
          inProgress: tasks2.filter((t) => t.status === "\u0110ang th\u1EF1c hi\u1EC7n").length,
          overdue: tasks2.filter((t) => new Date(t.deadline) < /* @__PURE__ */ new Date() && t.status !== "Ho\xE0n th\xE0nh").length
        };
        const deptUsers = await storage.getUsers({ departmentId: dept.id });
        let totalKPI = 0;
        let count = 0;
        for (const user of deptUsers) {
          const now = /* @__PURE__ */ new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          const kpiData = await calculateUserKPI(user.id, monthStart, monthEnd);
          if (kpiData && kpiData.totalScore > 0) {
            totalKPI += kpiData.totalScore;
            count++;
          }
        }
        const monthlyKPI = count > 0 ? totalKPI / count : 0;
        const { sendMonthlyKPIToGroup: sendMonthlyKPIToGroup2 } = await Promise.resolve().then(() => (init_telegram_service(), telegram_service_exports));
        const success = await sendMonthlyKPIToGroup2(
          head.groupTelegramChatId,
          dept.name,
          monthlyKPI,
          summary
        );
        if (success) sentToGroups++;
      }
      const allUsers = await storage.getUsers({});
      const optedInUsers = allUsers.filter((u) => u.notifyOnScheduledMonthlyKPI && u.telegramId);
      for (const user of optedInUsers) {
        const tasks2 = await storage.getTasks({
          userId: user.id,
          includeDeleted: false
        });
        const summary = {
          completed: tasks2.filter((t) => t.status === "Ho\xE0n th\xE0nh").length,
          inProgress: tasks2.filter((t) => t.status === "\u0110ang th\u1EF1c hi\u1EC7n").length,
          overdue: tasks2.filter((t) => new Date(t.deadline) < /* @__PURE__ */ new Date() && t.status !== "Ho\xE0n th\xE0nh").length
        };
        const now = /* @__PURE__ */ new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const kpiData = await calculateUserKPI(user.id, monthStart, monthEnd);
        if (kpiData && kpiData.totalScore > 0) {
          const { sendMonthlyKPIToGroup: sendMonthlyKPIToGroup2 } = await Promise.resolve().then(() => (init_telegram_service(), telegram_service_exports));
          const deptName = user.departmentId ? (await storage.getDepartment(user.departmentId))?.name || "Ph\xF2ng ban" : "C\xE1 nh\xE2n";
          const success = await sendMonthlyKPIToGroup2(
            user.telegramId,
            deptName,
            kpiData.totalScore,
            summary
          );
          if (success) sentToIndividuals++;
        }
      }
      res.json({
        message: `\u0110\xE3 g\u1EEDi KPI th\xE1ng: ${sentToGroups} nh\xF3m, ${sentToIndividuals} c\xE1 nh\xE2n`,
        sentToGroups,
        sentToIndividuals
      });
    } catch (error) {
      console.error("Send monthly KPI error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/departments", requireAuth, async (req, res) => {
    try {
      const departments2 = await storage.getDepartments();
      res.json(departments2);
    } catch (error) {
      console.error("Get departments error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.put("/api/departments/:departmentId/deputy-director", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "Gi\xE1m \u0111\u1ED1c") {
        return res.status(403).json({ error: "Ch\u1EC9 Gi\xE1m \u0111\u1ED1c m\u1EDBi c\xF3 quy\u1EC1n g\xE1n Ph\xF3 Gi\xE1m \u0111\u1ED1c ph\u1EE5 tr\xE1ch" });
      }
      const { deputyDirectorId } = req.body;
      if (deputyDirectorId) {
        const deputy = await storage.getUser(deputyDirectorId);
        if (!deputy || deputy.role !== "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
          return res.status(400).json({ error: "Ng\u01B0\u1EDDi \u0111\u01B0\u1EE3c ch\u1ECDn ph\u1EA3i l\xE0 Ph\xF3 Gi\xE1m \u0111\u1ED1c" });
        }
      }
      const updated = await storage.updateDepartmentDeputyDirector(
        req.params.departmentId,
        deputyDirectorId || null
      );
      res.json(updated);
    } catch (error) {
      console.error("Update department deputy director error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/departments", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "Gi\xE1m \u0111\u1ED1c" && req.user.role !== "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
        return res.status(403).json({ error: "Ch\u1EC9 Gi\xE1m \u0111\u1ED1c v\xE0 Ph\xF3 Gi\xE1m \u0111\u1ED1c m\u1EDBi c\xF3 quy\u1EC1n t\u1EA1o ph\xF2ng ban" });
      }
      const validatedData = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(validatedData);
      res.json(department);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Create department error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.put("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "Gi\xE1m \u0111\u1ED1c" && req.user.role !== "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
        return res.status(403).json({ error: "Ch\u1EC9 Gi\xE1m \u0111\u1ED1c v\xE0 Ph\xF3 Gi\xE1m \u0111\u1ED1c m\u1EDBi c\xF3 quy\u1EC1n c\u1EADp nh\u1EADt ph\xF2ng ban" });
      }
      const validatedData = insertDepartmentSchema.partial().parse(req.body);
      const updated = await storage.updateDepartment(req.params.id, validatedData);
      if (!updated) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng ban" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Update department error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.delete("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "Gi\xE1m \u0111\u1ED1c" && req.user.role !== "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
        return res.status(403).json({ error: "Ch\u1EC9 Gi\xE1m \u0111\u1ED1c v\xE0 Ph\xF3 Gi\xE1m \u0111\u1ED1c m\u1EDBi c\xF3 quy\u1EC1n x\xF3a ph\xF2ng ban" });
      }
      const deleted = await storage.deleteDepartment(req.params.id, req.user.id);
      if (!deleted) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y ph\xF2ng ban" });
      }
      res.json({ message: "\u0110\xE3 x\xF3a ph\xF2ng ban th\xE0nh c\xF4ng", department: deleted });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Kh\xF4ng th\u1EC3 x\xF3a")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Delete department error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/users", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "Gi\xE1m \u0111\u1ED1c" && req.user.role !== "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
        return res.status(403).json({ error: "Ch\u1EC9 Gi\xE1m \u0111\u1ED1c v\xE0 Ph\xF3 Gi\xE1m \u0111\u1ED1c m\u1EDBi c\xF3 quy\u1EC1n t\u1EA1o c\xE1n b\u1ED9" });
      }
      const validatedData = insertUserSchema.parse(req.body);
      const [existingUser] = await db.select().from(users).where(eq2(users.username, validatedData.username));
      if (existingUser) {
        if (existingUser.isDeleted) {
          return res.status(400).json({ error: "T\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 t\u1ED3n t\u1EA1i (c\xE1n b\u1ED9 \u0111\xE3 x\xF3a). Vui l\xF2ng ch\u1ECDn t\xEAn kh\xE1c ho\u1EB7c kh\xF4i ph\u1EE5c c\xE1n b\u1ED9 c\u0169." });
        }
        return res.status(400).json({ error: "T\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 t\u1ED3n t\u1EA1i" });
      }
      const hashedPassword = await hashPassword(validatedData.password);
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });
      res.json({ user: sanitizeUser(user) });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Create user error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "Gi\xE1m \u0111\u1ED1c" && req.user.role !== "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
        return res.status(403).json({ error: "Ch\u1EC9 Gi\xE1m \u0111\u1ED1c v\xE0 Ph\xF3 Gi\xE1m \u0111\u1ED1c m\u1EDBi c\xF3 quy\u1EC1n c\u1EADp nh\u1EADt c\xE1n b\u1ED9" });
      }
      const validatedData = insertUserSchema.partial().parse(req.body);
      if (validatedData.username) {
        const [existingUser] = await db.select().from(users).where(eq2(users.username, validatedData.username));
        if (existingUser && existingUser.id !== req.params.id) {
          if (existingUser.isDeleted) {
            return res.status(400).json({ error: "T\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 t\u1ED3n t\u1EA1i (c\xE1n b\u1ED9 \u0111\xE3 x\xF3a). Vui l\xF2ng ch\u1ECDn t\xEAn kh\xE1c." });
          }
          return res.status(400).json({ error: "T\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 t\u1ED3n t\u1EA1i" });
        }
      }
      let updateData = { ...validatedData };
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }
      const updated = await storage.updateUser(req.params.id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y c\xE1n b\u1ED9" });
      }
      res.json({ user: sanitizeUser(updated) });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: fromZodError(error).message });
      }
      console.error("Update user error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.delete("/api/users/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user || req.user.role !== "Gi\xE1m \u0111\u1ED1c" && req.user.role !== "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
        return res.status(403).json({ error: "Ch\u1EC9 Gi\xE1m \u0111\u1ED1c v\xE0 Ph\xF3 Gi\xE1m \u0111\u1ED1c m\u1EDBi c\xF3 quy\u1EC1n x\xF3a c\xE1n b\u1ED9" });
      }
      const deleted = await storage.deleteUser(req.params.id, req.user.id);
      if (!deleted) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y c\xE1n b\u1ED9" });
      }
      res.json({ message: "\u0110\xE3 x\xF3a c\xE1n b\u1ED9 th\xE0nh c\xF4ng", user: sanitizeUser(deleted) });
    } catch (error) {
      if (error instanceof Error && error.message.includes("Kh\xF4ng th\u1EC3 x\xF3a")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Delete user error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/users", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { departmentId, role } = req.query;
      const isDirector = req.user.role === "Gi\xE1m \u0111\u1ED1c";
      const isDeputyDirector = req.user.role === "Ph\xF3 Gi\xE1m \u0111\u1ED1c";
      const isDeptHead = req.user.role === "Tr\u01B0\u1EDFng ph\xF2ng";
      const isDeputyDeptHead = req.user.role === "Ph\xF3 tr\u01B0\u1EDFng ph\xF2ng";
      const isStaff = req.user.role === "Chuy\xEAn vi\xEAn";
      const filters = {};
      if (isDirector || isDeputyDirector || isDeptHead || isDeputyDeptHead) {
        if (departmentId) filters.departmentId = departmentId;
        if (role) {
          const validRoles = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c", "Tr\u01B0\u1EDFng ph\xF2ng", "Ph\xF3 tr\u01B0\u1EDFng ph\xF2ng", "Chuy\xEAn vi\xEAn"];
          if (validRoles.includes(role)) {
            filters.role = role;
          }
        }
      } else if (isStaff) {
        if (departmentId) {
          if (departmentId !== req.user.departmentId) {
            return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem danh s\xE1ch ng\u01B0\u1EDDi d\xF9ng c\u1EE7a ph\xF2ng ban kh\xE1c" });
          }
          filters.departmentId = req.user.departmentId;
        }
        if (role) {
          return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n l\u1ECDc theo vai tr\xF2" });
        }
      }
      const users2 = await storage.getUsers(filters);
      const sanitized = sanitizeUsers(users2);
      const sorted = sortUsersByRole(sanitized);
      res.json(sorted);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { departmentId, status, userId, year, month, assignmentRole, assignmentRoles, incompleteOnly } = req.query;
      const isDirector = req.user.role === "Gi\xE1m \u0111\u1ED1c";
      const isDeputyDirector = req.user.role === "Ph\xF3 Gi\xE1m \u0111\u1ED1c";
      const isDeptHead = req.user.role === "Tr\u01B0\u1EDFng ph\xF2ng";
      const isStaff = req.user.role === "Chuy\xEAn vi\xEAn";
      if (!isDirector && !isDeputyDirector) {
        if (!departmentId && !userId) {
          return res.status(400).json({ error: "departmentId ho\u1EB7c userId l\xE0 b\u1EAFt bu\u1ED9c" });
        }
      }
      const filters = {};
      if (isStaff) {
        if (departmentId && departmentId !== req.user.departmentId) {
          return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem nhi\u1EC7m v\u1EE5 c\u1EE7a ph\xF2ng ban kh\xE1c" });
        }
        if (userId && userId !== req.user.id) {
          return res.status(403).json({ error: "B\u1EA1n ch\u1EC9 c\xF3 th\u1EC3 xem nhi\u1EC7m v\u1EE5 c\u1EE7a m\xECnh" });
        }
        filters.userId = req.user.id;
      } else if (isDeptHead) {
        if (departmentId) {
          if (departmentId !== req.user.departmentId) {
            return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem nhi\u1EC7m v\u1EE5 c\u1EE7a ph\xF2ng ban kh\xE1c" });
          }
          filters.departmentId = departmentId;
        } else if (userId) {
          const requestedUser = await storage.getUser(userId);
          if (!requestedUser || requestedUser.departmentId !== req.user.departmentId) {
            return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem nhi\u1EC7m v\u1EE5 c\u1EE7a ng\u01B0\u1EDDi d\xF9ng n\xE0y" });
          }
          filters.userId = userId;
        } else {
          if (req.user.departmentId) {
            filters.departmentId = req.user.departmentId;
          } else {
            filters.userId = req.user.id;
          }
        }
      } else if (isDirector || isDeputyDirector) {
        if (departmentId) filters.departmentId = departmentId;
        if (userId) filters.userId = userId;
      }
      if (status) filters.status = status;
      if (assignmentRole) filters.assignmentRole = assignmentRole;
      if (assignmentRoles) {
        filters.assignmentRoles = assignmentRoles.split(",");
      }
      if (incompleteOnly === "true") filters.incompleteOnly = true;
      let tasks2 = await storage.getTasks(filters);
      if (year) {
        const yearNum = parseInt(year);
        if (!isNaN(yearNum)) {
          tasks2 = tasks2.filter((task) => {
            const dateToCheck = task.createdAt || task.deadline;
            const taskYear = new Date(dateToCheck).getFullYear();
            return taskYear === yearNum;
          });
        }
      }
      if (month) {
        const monthNum = parseInt(month);
        if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
          tasks2 = tasks2.filter((task) => {
            const dateToCheck = task.createdAt || task.deadline;
            const taskDate = new Date(dateToCheck);
            return taskDate.getMonth() + 1 === monthNum;
          });
        }
      }
      const tasksWithAssignments = await Promise.all(
        tasks2.map(async (task) => {
          const assignments = await storage.getTaskAssignments(task.id);
          const assignees = await Promise.all(
            assignments.map(async (a) => {
              const user = await storage.getUser(a.userId);
              const roleMap = {
                "Chu tri": "Ch\u1EE7 tr\xEC",
                "Ch\u1EE7 tr\xEC": "Ch\u1EE7 tr\xEC",
                "Phoi hop": "Ph\u1ED1i h\u1EE3p",
                "Ph\u1ED1i h\u1EE3p": "Ph\u1ED1i h\u1EE3p",
                "Chi dao": "Ch\u1EC9 \u0111\u1EA1o",
                "Ch\u1EC9 \u0111\u1EA1o": "Ch\u1EC9 \u0111\u1EA1o"
              };
              return user ? {
                ...sanitizeUser(user),
                userId: user.id,
                // Add userId field for Dashboard compatibility
                role: roleMap[a.role] || a.role,
                collaborationCompleted: a.collaborationCompleted
              } : null;
            })
          );
          const subtasks = await storage.getSubtasks(task.id);
          const subtasksCount = subtasks.length;
          let averageScore = null;
          if (task.status === "Ho\xE0n th\xE0nh") {
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
            subtasksCount
          };
        })
      );
      res.json(tasksWithAssignments);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/tasks/trash", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const allTasks = await storage.getTasks({ includeDeleted: true });
      const deletedTasks = allTasks.filter((t) => t.isDeleted);
      let userDeletedTasks = deletedTasks;
      if (req.user.role !== "Gi\xE1m \u0111\u1ED1c" && req.user.role !== "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
        const assignments = await Promise.all(
          deletedTasks.map((task) => storage.getTaskAssignments(task.id))
        );
        userDeletedTasks = deletedTasks.filter((task, index2) => {
          const isCreator = task.createdById === req.user.id;
          const isAssigned = assignments[index2].some((a) => a.userId === req.user.id);
          return isCreator || isAssigned;
        });
      }
      const tasksWithData = await Promise.all(
        userDeletedTasks.map(async (task) => {
          const assignments = await storage.getTaskAssignments(task.id);
          const users2 = await Promise.all(assignments.map((a) => storage.getUser(a.userId)));
          return {
            ...task,
            assignments: assignments.map((a, i) => ({
              ...a,
              ...users2[i] ? sanitizeUser(users2[i]) : {}
            }))
          };
        })
      );
      res.json(tasksWithData);
    } catch (error) {
      console.error("Get trash error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/tasks/evaluations", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const allowedRoles = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c", "Tr\u01B0\u1EDFng ph\xF2ng"];
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n \u0111\xE1nh gi\xE1 nhi\u1EC7m v\u1EE5" });
      }
      const view = req.query.view;
      if (view === "assignments") {
        const completedTasks = await storage.getTasks({ status: "Ho\xE0n th\xE0nh" });
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
                  priority: task.priority
                },
                assignment: {
                  id: assignment.id,
                  role: assignment.role,
                  userId: assignment.userId
                },
                assignee: assignee ? sanitizeUser(assignee) : null,
                evaluation: evaluation ? {
                  score: evaluation.score,
                  comments: evaluation.comments,
                  evaluatedAt: evaluation.evaluatedAt
                } : null,
                isEvaluated: !!evaluation
              });
            }
          }
        }
        return res.json(assignmentsToEvaluate);
      }
      const evaluationStatus = req.query.evaluationStatus || "unevaluated";
      const tasks2 = await storage.getTasksForEvaluation(
        req.user.id,
        req.user.role,
        req.user.departmentId,
        evaluationStatus
      );
      const tasksWithAssignments = await Promise.all(
        tasks2.map(async (task) => {
          const assignments = await storage.getTaskAssignments(task.id);
          const assignees = await Promise.all(
            assignments.map(async (a) => {
              const user = await storage.getUser(a.userId);
              const roleMap = {
                "Chu tri": "Ch\u1EE7 tr\xEC",
                "Ch\u1EE7 tr\xEC": "Ch\u1EE7 tr\xEC",
                "Phoi hop": "Ph\u1ED1i h\u1EE3p",
                "Ph\u1ED1i h\u1EE3p": "Ph\u1ED1i h\u1EE3p",
                "Chi dao": "Ch\u1EC9 \u0111\u1EA1o",
                "Ch\u1EC9 \u0111\u1EA1o": "Ch\u1EC9 \u0111\u1EA1o"
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
            assignments: assignees.filter(Boolean)
          };
        })
      );
      res.json(tasksWithAssignments);
    } catch (error) {
      console.error("Get evaluation tasks error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const assignments = await storage.getTaskAssignments(task.id);
      const evaluations = await storage.getTaskEvaluations(task.id);
      const assignees = await Promise.all(
        assignments.map(async (a) => {
          const user = await storage.getUser(a.userId);
          const roleMap = {
            "Chu tri": "Ch\u1EE7 tr\xEC",
            "Ch\u1EE7 tr\xEC": "Ch\u1EE7 tr\xEC",
            "Phoi hop": "Ph\u1ED1i h\u1EE3p",
            "Ph\u1ED1i h\u1EE3p": "Ph\u1ED1i h\u1EE3p",
            "Chi dao": "Ch\u1EC9 \u0111\u1EA1o",
            "Ch\u1EC9 \u0111\u1EA1o": "Ch\u1EC9 \u0111\u1EA1o"
          };
          const evaluation = evaluations.find((e) => e.assignmentId === a.id);
          return user ? {
            ...sanitizeUser(user),
            assignmentRole: roleMap[a.role] || a.role,
            assignmentId: a.id,
            collaborationCompleted: a.collaborationCompleted,
            evaluationScore: evaluation?.score ?? null,
            evaluationComments: evaluation?.comments ?? null,
            evaluatedBy: evaluation?.evaluatorId ?? null,
            evaluatedAt: evaluation?.evaluatedAt ?? null
          } : null;
        })
      );
      const creator = await storage.getUser(task.createdById);
      res.json({
        ...task,
        assignments: assignees.filter(Boolean),
        createdBy: creator ? sanitizeUser(creator) : null
      });
    } catch (error) {
      console.error("Get task error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/tasks/:id/subtasks", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const parentTask = await storage.getTask(req.params.id);
      if (!parentTask) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const subtasks = await storage.getSubtasks(req.params.id);
      res.json(subtasks);
    } catch (error) {
      console.error("Get subtasks error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/tasks/check-duplicates", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Thi\u1EBFu ti\xEAu \u0111\u1EC1 nhi\u1EC7m v\u1EE5" });
      }
      const thirtyDaysAgo = /* @__PURE__ */ new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isLeadership = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role);
      const recentTasks = await storage.getTasks({
        departmentId: isLeadership ? void 0 : req.user.departmentId || void 0,
        includeDeleted: false
      });
      const candidateTasks = recentTasks.filter(
        (task) => task.status !== "Ho\xE0n th\xE0nh" && new Date(task.createdAt) >= thirtyDaysAgo
      );
      const duplicates = await detectDuplicateTasks(
        title,
        description || null,
        candidateTasks
      );
      res.json({ duplicates });
    } catch (error) {
      console.error("Check duplicates error:", error);
      res.json({ duplicates: [] });
    }
  });
  app2.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (!["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c", "Tr\u01B0\u1EDFng ph\xF2ng", "Chuy\xEAn vi\xEAn"].includes(req.user.role)) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n t\u1EA1o nhi\u1EC7m v\u1EE5" });
      }
      const { title, description, deadline, priority, departmentId, assignments, templateId, parentTaskId } = req.body;
      if (!title || !deadline || !priority) {
        return res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin b\u1EAFt bu\u1ED9c" });
      }
      if (parentTaskId) {
        const parentTask = await storage.getTask(parentTaskId);
        if (!parentTask) {
          return res.status(400).json({ error: "Nhi\u1EC7m v\u1EE5 cha kh\xF4ng t\u1ED3n t\u1EA1i" });
        }
        if (parentTask.isDeleted) {
          return res.status(400).json({ error: "Kh\xF4ng th\u1EC3 t\u1EA1o subtask cho nhi\u1EC7m v\u1EE5 \u0111\xE3 b\u1ECB x\xF3a" });
        }
        const subtaskDeadline = new Date(deadline);
        if (subtaskDeadline > parentTask.deadline) {
          return res.status(400).json({ error: "Deadline c\u1EE7a nhi\u1EC7m v\u1EE5 con ph\u1EA3i s\u1EDBm h\u01A1n ho\u1EB7c b\u1EB1ng nhi\u1EC7m v\u1EE5 cha" });
        }
        if (parentTask.parentTaskId) {
          return res.status(400).json({ error: "Kh\xF4ng th\u1EC3 t\u1EA1o subtask c\u1EE7a subtask (ch\u1EC9 cho ph\xE9p 1 c\u1EA5p)" });
        }
      }
      const task = await storage.createTask({
        title,
        description,
        deadline: new Date(deadline),
        priority,
        departmentId: departmentId || req.user.departmentId,
        createdById: req.user.id,
        parentTaskId: parentTaskId || null
      });
      if (assignments && Array.isArray(assignments)) {
        await Promise.all(
          assignments.map(
            (a) => storage.createTaskAssignment({
              taskId: task.id,
              userId: a.userId,
              role: a.role
            })
          )
        );
        try {
          await Promise.all(
            assignments.map(async (a) => {
              const assignee = await storage.getUser(a.userId);
              if (assignee && req.user) {
                await notifyNewTask(task, assignee, req.user, a.role);
              }
            })
          );
        } catch (notifyError) {
          console.error("Failed to send telegram notifications:", notifyError);
        }
      }
      if (templateId) {
        const templateItems = await storage.getChecklistTemplateItems(templateId);
        if (templateItems.length > 0) {
          await Promise.all(
            templateItems.map(
              (item) => storage.createChecklistItem({
                taskId: task.id,
                title: item.title,
                order: item.order
              })
            )
          );
        }
      }
      if (parentTaskId) {
        await storage.updateParentProgress(task.id);
      }
      res.json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.patch("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const { title, description, deadline, priority, status, progress } = req.body;
      if (status === "Ho\xE0n th\xE0nh") {
        const assignments = await storage.getTaskAssignments(req.params.id);
        const userAssignment = assignments.find((a) => a.userId === req.user.id);
        if (!userAssignment || userAssignment.role !== "Ch\u1EE7 tr\xEC" && userAssignment.role !== "Ch\u1EC9 \u0111\u1EA1o") {
          return res.status(403).json({ error: "Ch\u1EC9 ng\u01B0\u1EDDi Ch\u1EE7 tr\xEC ho\u1EB7c Ch\u1EC9 \u0111\u1EA1o m\u1EDBi c\xF3 th\u1EC3 k\u1EBFt th\xFAc nhi\u1EC7m v\u1EE5" });
        }
      }
      const updates = {};
      if (title !== void 0) updates.title = title;
      if (description !== void 0) updates.description = description;
      if (deadline !== void 0) updates.deadline = new Date(deadline);
      if (priority !== void 0) updates.priority = priority;
      if (status !== void 0) {
        updates.status = status;
        if (status === "Ho\xE0n th\xE0nh" && progress === void 0) {
          updates.progress = 100;
        }
      }
      if (progress !== void 0) updates.progress = progress;
      const updatedTask = await storage.updateTask(req.params.id, updates);
      if (updatedTask && updatedTask.parentTaskId && (progress !== void 0 || status !== void 0)) {
        await storage.updateParentProgress(updatedTask.id);
      }
      res.json(updatedTask);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/tasks/:taskId/assignment-evaluators", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const assignments = await storage.getTaskAssignments(task.id);
      const isParticipant = assignments.some((a) => a.userId === req.user.id);
      const isLeadership = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c", "Tr\u01B0\u1EDFng ph\xF2ng"].includes(req.user.role);
      if (!isParticipant && !isLeadership) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem th\xF4ng tin n\xE0y" });
      }
      const evaluatorLookup = await Promise.all(
        assignments.map(async (assignment) => {
          const evaluator = await getEvaluatorForAssignment(task.id, assignment.id);
          return {
            assignmentId: assignment.id,
            evaluator: evaluator ? {
              id: evaluator.id,
              fullName: evaluator.fullName,
              role: evaluator.role
            } : null
          };
        })
      );
      res.json(evaluatorLookup);
    } catch (error) {
      console.error("Get assignment evaluators error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/tasks/:taskId/evaluations", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const evaluations = await storage.getTaskEvaluations(req.params.taskId);
      const evaluationsWithUsers = await Promise.all(
        evaluations.map(async (evaluation) => {
          const assignments = await storage.getTaskAssignments(req.params.taskId);
          const assignment = assignments.find((a) => a.id === evaluation.assignmentId);
          const assignee = assignment ? await storage.getUser(assignment.userId) : null;
          const evaluator = await storage.getUser(evaluation.evaluatorId);
          return {
            ...evaluation,
            assignee: assignee ? sanitizeUser(assignee) : null,
            evaluator: evaluator ? sanitizeUser(evaluator) : null
          };
        })
      );
      res.json(evaluationsWithUsers);
    } catch (error) {
      console.error("Get task evaluations error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.put("/api/tasks/:taskId/assignments/:assignmentId/evaluation", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      if (task.status !== "Ho\xE0n th\xE0nh") {
        return res.status(400).json({ error: "Ch\u1EC9 c\xF3 th\u1EC3 \u0111\xE1nh gi\xE1 nhi\u1EC7m v\u1EE5 \u0111\xE3 ho\xE0n th\xE0nh" });
      }
      const { score, comments: comments2 } = req.body;
      if (score === void 0 || score === null) {
        return res.status(400).json({ error: "Thi\u1EBFu \u0111i\u1EC3m \u0111\xE1nh gi\xE1" });
      }
      if (score < 0 || score > 10) {
        return res.status(400).json({ error: "\u0110i\u1EC3m \u0111\xE1nh gi\xE1 ph\u1EA3i t\u1EEB 0-10" });
      }
      const taskId = req.params.taskId;
      const assignmentId = req.params.assignmentId;
      const assignments = await storage.getTaskAssignments(taskId);
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y ph\xE2n c\xF4ng" });
      }
      const canEvaluate = await canUserEvaluateAssignment(
        req.user.id,
        req.params.taskId,
        assignment.id
        // FIX: Pass assignmentId, not userId!
      );
      if (!canEvaluate) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n \u0111\xE1nh gi\xE1 ph\xE2n c\xF4ng n\xE0y" });
      }
      const existingEvaluation = await storage.getTaskEvaluation(req.params.taskId, assignment.id);
      const finalComments = comments2 !== null && comments2 !== void 0 && comments2.trim() !== "" ? comments2.trim() : existingEvaluation?.comments || null;
      const evaluation = await storage.upsertTaskEvaluation({
        taskId: req.params.taskId,
        assignmentId: assignment.id,
        // FIX: Schema changed to assignmentId
        evaluatorId: req.user.id,
        score,
        comments: finalComments
      });
      res.json(evaluation);
    } catch (error) {
      console.error("Upsert evaluation error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      if (task.createdById !== req.user.id && !["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role)) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n x\xF3a nhi\u1EC7m v\u1EE5 n\xE0y" });
      }
      const deletedTask = await storage.softDeleteTask(req.params.id, req.user.id);
      res.json({ message: "\u0110\xE3 chuy\u1EC3n nhi\u1EC7m v\u1EE5 v\xE0o th\xF9ng r\xE1c", task: deletedTask });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/tasks/:id/restore", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      if (!task.isDeleted) {
        return res.status(400).json({ error: "Nhi\u1EC7m v\u1EE5 ch\u01B0a b\u1ECB x\xF3a" });
      }
      if (task.createdById !== req.user.id && !["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role)) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n kh\xF4i ph\u1EE5c nhi\u1EC7m v\u1EE5 n\xE0y" });
      }
      const restoredTask = await storage.restoreTask(req.params.id);
      res.json({ message: "\u0110\xE3 kh\xF4i ph\u1EE5c nhi\u1EC7m v\u1EE5", task: restoredTask });
    } catch (error) {
      console.error("Restore task error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/tasks/:id/assignments", requireAuth, async (req, res) => {
    try {
      const { userId, role } = req.body;
      if (!userId || !role) {
        return res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin b\u1EAFt bu\u1ED9c" });
      }
      const assignment = await storage.createTaskAssignment({
        taskId: req.params.id,
        userId,
        role
      });
      res.json(assignment);
    } catch (error) {
      console.error("Create assignment error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.put("/api/tasks/:id/assignments", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { assignments } = req.body;
      if (!assignments || !Array.isArray(assignments)) {
        return res.status(400).json({ error: "Danh s\xE1ch ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n kh\xF4ng h\u1EE3p l\u1EC7" });
      }
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const taskCreator = await storage.getUser(task.createdById);
      if (!taskCreator) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi t\u1EA1o nhi\u1EC7m v\u1EE5" });
      }
      const isCreator = task.createdById === req.user.id;
      const isLeadership = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role);
      const isDepartmentHead = ["Tr\u01B0\u1EDFng ph\xF2ng", "Ph\xF3 Tr\u01B0\u1EDFng ph\xF2ng"].includes(req.user.role);
      const creatorIsDeputyDirector = taskCreator.role === "Ph\xF3 Gi\xE1m \u0111\u1ED1c";
      const canEdit = isCreator || isLeadership || isDepartmentHead && creatorIsDeputyDirector;
      if (!canEdit) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n s\u1EEDa ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n" });
      }
      const evaluations = await storage.getTaskEvaluations(req.params.id);
      const hasEvaluations = evaluations.length > 0;
      const isNotStarted = task.status === "Ch\u01B0a b\u1EAFt \u0111\u1EA7u";
      if (!isNotStarted && hasEvaluations) {
        return res.status(400).json({
          error: "Kh\xF4ng th\u1EC3 s\u1EEDa ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n khi nhi\u1EC7m v\u1EE5 \u0111\xE3 c\xF3 \u0111\xE1nh gi\xE1. Ch\u1EC9 c\xF3 th\u1EC3 s\u1EEDa khi nhi\u1EC7m v\u1EE5 ch\u01B0a b\u1EAFt \u0111\u1EA7u ho\u1EB7c ch\u01B0a c\xF3 \u0111\xE1nh gi\xE1."
        });
      }
      const chuTriCount = assignments.filter((a) => a.role === "Ch\u1EE7 tr\xEC").length;
      if (chuTriCount === 0) {
        return res.status(400).json({ error: "Ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 1 ng\u01B0\u1EDDi Ch\u1EE7 tr\xEC" });
      }
      const userIds = assignments.map((a) => a.userId);
      const users2 = await Promise.all(userIds.map((id) => storage.getUser(id)));
      const invalidUsers = users2.filter((u) => !u);
      if (invalidUsers.length > 0) {
        return res.status(400).json({ error: "C\xF3 ng\u01B0\u1EDDi d\xF9ng kh\xF4ng t\u1ED3n t\u1EA1i trong danh s\xE1ch" });
      }
      const uniqueUserIds = new Set(userIds);
      if (uniqueUserIds.size !== userIds.length) {
        return res.status(400).json({ error: "Kh\xF4ng \u0111\u01B0\u1EE3c ph\xE2n c\xF4ng tr\xF9ng ng\u01B0\u1EDDi" });
      }
      const oldAssignments = await storage.getTaskAssignments(req.params.id);
      const oldUsers = await Promise.all(
        oldAssignments.map((a) => storage.getUser(a.userId))
      );
      const newUsers = await Promise.all(
        assignments.map((a) => storage.getUser(a.userId))
      );
      const addedUsers = assignments.filter(
        (a) => !oldAssignments.find((old) => old.userId === a.userId)
      );
      const removedAssignments = oldAssignments.filter(
        (old) => !assignments.find((a) => a.userId === old.userId)
      );
      let changeMessage = "";
      if (addedUsers.length > 0) {
        const addedNames = await Promise.all(
          addedUsers.map(async (a) => {
            const u = await storage.getUser(a.userId);
            return `${u?.fullName} (${a.role})`;
          })
        );
        changeMessage += `Th\xEAm: ${addedNames.join(", ")}`;
      }
      if (removedAssignments.length > 0) {
        const removedNames = await Promise.all(
          removedAssignments.map(async (a) => {
            const u = await storage.getUser(a.userId);
            return `${u?.fullName} (${a.role})`;
          })
        );
        if (changeMessage) changeMessage += "; ";
        changeMessage += `X\xF3a: ${removedNames.join(", ")}`;
      }
      await Promise.all(
        oldAssignments.map((a) => storage.deleteTaskAssignment(a.id))
      );
      const newAssignments = await Promise.all(
        assignments.map(
          (a) => storage.createTaskAssignment({
            taskId: req.params.id,
            userId: a.userId,
            role: a.role
          })
        )
      );
      if (changeMessage) {
        await storage.createProgressUpdate({
          taskId: req.params.id,
          userId: req.user.id,
          updateType: "assignment_changed",
          content: changeMessage
        });
      }
      res.json({
        message: "\u0110\xE3 c\u1EADp nh\u1EADt ng\u01B0\u1EDDi th\u1EF1c hi\u1EC7n",
        assignments: newAssignments
      });
    } catch (error) {
      console.error("Update assignments error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.patch("/api/tasks/:taskId/assignments/:assignmentId", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { role } = req.body;
      if (!role) {
        return res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin vai tr\xF2" });
      }
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const isTaskCreator = task.createdById === req.user.id;
      const isLeadership = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role);
      if (!isTaskCreator && !isLeadership) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n ch\u1EC9nh s\u1EEDa ph\xE2n c\xF4ng" });
      }
      const updatedAssignment = await storage.updateTaskAssignmentRole(req.params.assignmentId, role);
      if (!updatedAssignment) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y ph\xE2n c\xF4ng" });
      }
      res.json(updatedAssignment);
    } catch (error) {
      console.error("Update assignment role error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.delete("/api/tasks/:taskId/assignments/:assignmentId", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const isTaskCreator = task.createdById === req.user.id;
      const isLeadership = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role);
      if (!isTaskCreator && !isLeadership) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n x\xF3a ph\xE2n c\xF4ng" });
      }
      await storage.deleteTaskAssignment(req.params.assignmentId);
      res.json({ message: "\u0110\xE3 x\xF3a ph\xE2n c\xF4ng" });
    } catch (error) {
      console.error("Delete assignment error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.patch("/api/tasks/:taskId/assignments/:assignmentId/collaboration-complete", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const assignments = await storage.getTaskAssignments(req.params.taskId);
      const assignment = assignments.find((a) => a.id === req.params.assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y ph\xE2n c\xF4ng" });
      }
      if (assignment.userId !== req.user.id) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n h\xE0nh \u0111\u1ED9ng n\xE0y" });
      }
      if (assignment.role !== "Ph\u1ED1i h\u1EE3p") {
        return res.status(400).json({ error: "Ch\u1EC9 ng\u01B0\u1EDDi ph\u1ED1i h\u1EE3p m\u1EDBi c\xF3 th\u1EC3 \u0111\xE1nh d\u1EA5u ho\xE0n th\xE0nh ph\u1ED1i h\u1EE3p" });
      }
      const { collaborationCompleted } = req.body;
      const updatedAssignment = await storage.updateTaskAssignmentCollaboration(
        req.params.assignmentId,
        collaborationCompleted
      );
      res.json(updatedAssignment);
    } catch (error) {
      console.error("Update collaboration complete error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/tasks/:id/progress", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { updateType, content, progressPercent } = req.body;
      if (!updateType) {
        return res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin b\u1EAFt bu\u1ED9c" });
      }
      const update = await storage.createProgressUpdate({
        taskId: req.params.id,
        userId: req.user.id,
        updateType,
        content,
        progressPercent
      });
      if (progressPercent !== void 0) {
        await storage.updateTask(req.params.id, { progress: progressPercent });
      }
      res.json(update);
    } catch (error) {
      console.error("Create progress update error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/tasks/:id/progress", requireAuth, async (req, res) => {
    try {
      const updates = await storage.getProgressUpdates(req.params.id);
      const updatesWithUsers = await Promise.all(
        updates.map(async (update) => {
          const user = await storage.getUser(update.userId);
          return {
            ...update,
            user: user ? { id: user.id, fullName: user.fullName } : null
          };
        })
      );
      res.json(updatesWithUsers);
    } catch (error) {
      console.error("Get progress updates error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/templates/overview", requireAuth, async (req, res) => {
    try {
      const grouped = await storage.getTemplatesForUser(req.user.id);
      res.json(grouped);
    } catch (error) {
      console.error("Get templates overview error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getChecklistTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/templates/:id/items", requireAuth, async (req, res) => {
    try {
      const items = await storage.getChecklistTemplateItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Get template items error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/templates", requireAuth, async (req, res) => {
    try {
      const templateSchema = insertChecklistTemplateSchema.omit({ isDefault: true }).extend({
        items: z2.array(insertChecklistTemplateItemSchema.omit({ templateId: true }))
      });
      const validated = templateSchema.parse(req.body);
      const { items, ...templateData } = validated;
      const template = await storage.createChecklistTemplate(
        { ...templateData, isDefault: false },
        req.user.id
      );
      let createdItems = [];
      if (items && items.length > 0) {
        createdItems = await storage.replaceTemplateItems(template.id, items, req.user.id);
      }
      res.status(201).json({ template, items: createdItems });
    } catch (error) {
      console.error("Create template error:", error);
      if (error.message?.includes("Unauthorized")) {
        res.status(403).json({ error: error.message });
      } else if (error.name === "ZodError") {
        res.status(400).json({ error: "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7" });
      } else {
        res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
      }
    }
  });
  app2.patch("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const patchSchema = z2.object({
        name: z2.string().optional(),
        description: z2.string().optional(),
        category: z2.string().optional()
      });
      const validated = patchSchema.parse(req.body);
      const updated = await storage.updateChecklistTemplate(req.params.id, validated, req.user.id);
      res.json(updated);
    } catch (error) {
      console.error("Update template error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y m\u1EABu checklist" });
      } else if (error.message?.includes("Unauthorized")) {
        res.status(403).json({ error: error.message });
      } else if (error.name === "ZodError") {
        res.status(400).json({ error: "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7" });
      } else {
        res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
      }
    }
  });
  app2.put("/api/templates/:id/items", requireAuth, async (req, res) => {
    try {
      const itemsSchema = z2.array(
        z2.object({
          title: z2.string(),
          order: z2.number()
        })
      ).min(1);
      const validated = itemsSchema.parse(req.body);
      const items = await storage.replaceTemplateItems(req.params.id, validated, req.user.id);
      res.json(items);
    } catch (error) {
      console.error("Replace template items error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y m\u1EABu checklist" });
      } else if (error.message?.includes("Unauthorized")) {
        res.status(403).json({ error: error.message });
      } else if (error.name === "ZodError") {
        res.status(400).json({ error: "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7" });
      } else {
        res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
      }
    }
  });
  app2.delete("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteChecklistTemplate(req.params.id, req.user.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete template error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y m\u1EABu checklist" });
      } else if (error.message?.includes("Unauthorized")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
      }
    }
  });
  app2.post("/api/templates/:id/clone", requireAuth, async (req, res) => {
    try {
      const cloned = await storage.cloneTemplate(req.params.id, req.user.id);
      const items = await storage.getChecklistTemplateItems(cloned.id);
      res.status(201).json({ template: cloned, items });
    } catch (error) {
      console.error("Clone template error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y m\u1EABu checklist" });
      } else {
        res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
      }
    }
  });
  app2.post("/api/templates/:id/set-default", requireAuth, async (req, res) => {
    try {
      if (req.user.role !== "Gi\xE1m \u0111\u1ED1c" && req.user.role !== "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
        return res.status(403).json({ error: "Ch\u1EC9 l\xE3nh \u0111\u1EA1o m\u1EDBi c\xF3 th\u1EC3 \u0111\u1EB7t m\u1EABu m\u1EB7c \u0111\u1ECBnh" });
      }
      await storage.setDefaultTemplate(req.params.id);
      const updated = await storage.getChecklistTemplate(req.params.id);
      res.json(updated);
    } catch (error) {
      console.error("Set default template error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y m\u1EABu checklist" });
      } else {
        res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
      }
    }
  });
  app2.get("/api/tasks/:id/checklist", requireAuth, async (req, res) => {
    try {
      const items = await storage.getChecklistItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Get checklist items error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/tasks/:id/checklist", requireAuth, async (req, res) => {
    try {
      const { title, order } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin b\u1EAFt bu\u1ED9c" });
      }
      const item = await storage.createChecklistItem({
        taskId: req.params.id,
        title,
        order: order || 0
      });
      const allItems = await storage.getChecklistItems(req.params.id);
      const completedCount = allItems.filter((i) => i.completed).length;
      const totalCount = allItems.length;
      const progress = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
      let status;
      if (progress === 0) {
        status = "Ch\u01B0a b\u1EAFt \u0111\u1EA7u";
      } else if (progress === 100) {
        status = "Ho\xE0n th\xE0nh";
      } else {
        status = "\u0110ang th\u1EF1c hi\u1EC7n";
      }
      await storage.updateTask(req.params.id, { progress, status });
      const task = await storage.getTask(req.params.id);
      const subtasks = await storage.getSubtasks(req.params.id);
      if (subtasks.length > 0) {
        await storage.recalculateTaskStatusFromSubtasks(req.params.id);
      }
      if (task && task.parentTaskId) {
        await storage.updateParentProgress(req.params.id);
      }
      res.json(item);
    } catch (error) {
      console.error("Create checklist item error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.patch("/api/tasks/:taskId/checklist/:itemId", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { completed, title } = req.body;
      if (title !== void 0) {
        const assignments = await storage.getTaskAssignments(req.params.taskId);
        const userAssignment = assignments.find((a) => a.userId === req.user.id);
        const isChuTri = userAssignment?.role === "Ch\u1EE7 tr\xEC";
        if (!isChuTri) {
          return res.status(403).json({ error: "Ch\u1EC9 ng\u01B0\u1EDDi Ch\u1EE7 tr\xEC m\u1EDBi c\xF3 th\u1EC3 ch\u1EC9nh s\u1EEDa checklist" });
        }
      }
      const updates = {};
      if (completed !== void 0) updates.completed = completed;
      if (title !== void 0) updates.title = title;
      const item = await storage.updateChecklistItem(req.params.itemId, updates);
      const allItems = await storage.getChecklistItems(req.params.taskId);
      const completedCount = allItems.filter((i) => i.completed).length;
      const totalCount = allItems.length;
      const progress = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
      let status;
      if (progress === 0) {
        status = "Ch\u01B0a b\u1EAFt \u0111\u1EA7u";
      } else if (progress === 100) {
        status = "Ho\xE0n th\xE0nh";
      } else {
        status = "\u0110ang th\u1EF1c hi\u1EC7n";
      }
      await storage.updateTask(req.params.taskId, { progress, status });
      const task = await storage.getTask(req.params.taskId);
      const subtasks = await storage.getSubtasks(req.params.taskId);
      if (subtasks.length > 0) {
        await storage.recalculateTaskStatusFromSubtasks(req.params.taskId);
      }
      if (task && task.parentTaskId) {
        await storage.updateParentProgress(req.params.taskId);
      }
      res.json(item);
    } catch (error) {
      console.error("Update checklist item error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.delete("/api/tasks/:taskId/checklist/:itemId", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const assignments = await storage.getTaskAssignments(req.params.taskId);
      const userAssignment = assignments.find((a) => a.userId === req.user.id);
      const isChuTri = userAssignment?.role === "Ch\u1EE7 tr\xEC";
      if (!isChuTri) {
        return res.status(403).json({ error: "Ch\u1EC9 ng\u01B0\u1EDDi Ch\u1EE7 tr\xEC m\u1EDBi c\xF3 th\u1EC3 x\xF3a checklist" });
      }
      await storage.deleteChecklistItem(req.params.itemId);
      const allItems = await storage.getChecklistItems(req.params.taskId);
      const completedCount = allItems.filter((i) => i.completed).length;
      const totalCount = allItems.length;
      const progress = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
      let status;
      if (progress === 0) {
        status = "Ch\u01B0a b\u1EAFt \u0111\u1EA7u";
      } else if (progress === 100) {
        status = "Ho\xE0n th\xE0nh";
      } else {
        status = "\u0110ang th\u1EF1c hi\u1EC7n";
      }
      await storage.updateTask(req.params.taskId, { progress, status });
      const task = await storage.getTask(req.params.taskId);
      const subtasks = await storage.getSubtasks(req.params.taskId);
      if (subtasks.length > 0) {
        await storage.recalculateTaskStatusFromSubtasks(req.params.taskId);
      }
      if (task && task.parentTaskId) {
        await storage.updateParentProgress(req.params.taskId);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete checklist item error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/tasks/:id/comments", requireAuth, async (req, res) => {
    try {
      const comments2 = await storage.getComments(req.params.id);
      const commentsWithUsers = await Promise.all(
        comments2.map(async (comment) => {
          const user = await storage.getUser(comment.userId);
          return {
            ...comment,
            user: user ? { id: user.id, fullName: user.fullName } : null
          };
        })
      );
      res.json(commentsWithUsers);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/tasks/:id/comments", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Thi\u1EBFu n\u1ED9i dung comment" });
      }
      const comment = await storage.createComment({
        taskId: req.params.id,
        userId: req.user.id,
        content
      });
      try {
        const task = await storage.getTask(req.params.id);
        if (task && req.user) {
          const assignments = await storage.getTaskAssignments(req.params.id);
          await Promise.all(
            assignments.map(async (assignment) => {
              const assignee = await storage.getUser(assignment.userId);
              if (assignee) {
                await notifyNewComment(task, assignee, req.user, content);
              }
            })
          );
        }
      } catch (notifyError) {
        console.error("Failed to send telegram notifications:", notifyError);
      }
      res.json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/kpi/user/:userId", requireAuth, async (req, res) => {
    try {
      const { periodStart, periodEnd } = req.query;
      const startDate = periodStart ? new Date(periodStart) : void 0;
      const endDate = periodEnd ? new Date(periodEnd) : void 0;
      const kpiData = await calculateUserKPI(req.params.userId, startDate, endDate);
      res.json(kpiData);
    } catch (error) {
      console.error("Get user KPI error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/kpi/department/:departmentId", requireAuth, async (req, res) => {
    try {
      const kpiData = await calculateAllUsersKPI(req.params.departmentId);
      const departmentAverageKPI = kpiData.length > 0 ? parseFloat((kpiData.reduce((sum, user) => sum + user.kpi, 0) / kpiData.length).toFixed(1)) : 0;
      res.json({
        users: kpiData,
        departmentAverageKPI,
        userCount: kpiData.length
      });
    } catch (error) {
      console.error("Get department KPI error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/kpi/all", requireAuth, async (req, res) => {
    try {
      const kpiData = await calculateAllUsersKPI();
      res.json(kpiData);
    } catch (error) {
      console.error("Get all KPI error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/kpi/stats", requireAuth, async (req, res) => {
    try {
      const { year, month, departmentId } = req.query;
      const allTasks = await storage.getTasks();
      const activeTasks = allTasks.filter((t) => !t.isDeleted);
      let filteredTasks = activeTasks;
      if (departmentId && departmentId !== "all") {
        const usersInDept = await storage.getUsers({ departmentId });
        const userIdsInDept = usersInDept.map((u) => u.id);
        const deptAssignments = await storage.getTaskAssignmentsForUsers(userIdsInDept);
        const taskIdsInDept = new Set(deptAssignments.map((a) => a.taskId));
        filteredTasks = filteredTasks.filter((t) => taskIdsInDept.has(t.id));
      }
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const effectiveYear = year && year !== "all" ? parseInt(year) : month && month !== "all" ? currentYear : null;
      if (effectiveYear) {
        filteredTasks = filteredTasks.filter((t) => {
          if (t.status === "Ho\xE0n th\xE0nh" && t.completedAt) {
            return new Date(t.completedAt).getFullYear() === effectiveYear;
          }
          const deadlineYear = new Date(t.deadline).getFullYear();
          return deadlineYear === effectiveYear;
        });
      }
      if (month && month !== "all") {
        const selectedMonth = parseInt(month);
        filteredTasks = filteredTasks.filter((t) => {
          if (t.status === "Ho\xE0n th\xE0nh" && t.completedAt) {
            const completedDate = new Date(t.completedAt);
            return completedDate.getFullYear() === effectiveYear && completedDate.getMonth() + 1 === selectedMonth;
          }
          const deadlineDate = new Date(t.deadline);
          return deadlineDate.getFullYear() === effectiveYear && deadlineDate.getMonth() + 1 === selectedMonth;
        });
      }
      let periodStart;
      let periodEnd;
      if (effectiveYear) {
        if (month && month !== "all") {
          const selectedMonth = parseInt(month);
          periodStart = new Date(effectiveYear, selectedMonth - 1, 1);
          periodEnd = new Date(effectiveYear, selectedMonth, 0, 23, 59, 59, 999);
        } else {
          periodStart = new Date(effectiveYear, 0, 1);
          periodEnd = new Date(effectiveYear, 11, 31, 23, 59, 59, 999);
        }
      }
      const activityMap = await preloadTaskActivity(filteredTasks);
      if (periodStart || periodEnd) {
        filteredTasks = filteredTasks.filter((t) => {
          if (t.status === "Ho\xE0n th\xE0nh") {
            return true;
          }
          const deadlineDate = new Date(t.deadline);
          const deadlineInPeriod = (!periodStart || deadlineDate >= periodStart) && (!periodEnd || deadlineDate <= periodEnd);
          if (deadlineInPeriod) {
            return true;
          }
          const activity = activityMap.get(t.id);
          return hasActivityInPeriod(activity, periodStart, periodEnd);
        });
      }
      const departments2 = await storage.getDepartments();
      const departmentUserMap = /* @__PURE__ */ new Map();
      for (const dept of departments2) {
        const users2 = await storage.getUsers({ departmentId: dept.id });
        departmentUserMap.set(dept.id, new Set(users2.map((u) => u.id)));
      }
      const tasksByDepartment = /* @__PURE__ */ new Map();
      for (const dept of departments2) {
        tasksByDepartment.set(dept.id, []);
      }
      for (const task of filteredTasks) {
        const assignments = await storage.getTaskAssignments(task.id);
        const deptSet = /* @__PURE__ */ new Set();
        for (const assignment of assignments) {
          for (const [deptId, userIds] of Array.from(departmentUserMap.entries())) {
            if (userIds.has(assignment.userId)) {
              deptSet.add(deptId);
            }
          }
        }
        for (const deptId of Array.from(deptSet)) {
          tasksByDepartment.get(deptId)?.push(task);
        }
      }
      const allUsersKpi = await calculateFilteredUsersKPI(filteredTasks, activityMap, periodStart, periodEnd);
      const completedTasks = filteredTasks.filter((t) => t.status === "Ho\xE0n th\xE0nh");
      const completionRate = filteredTasks.length > 0 ? parseFloat((completedTasks.length / filteredTasks.length * 100).toFixed(1)) : 0;
      const avgKpi = allUsersKpi.length > 0 ? parseFloat((allUsersKpi.reduce((sum, u) => sum + u.kpi, 0) / allUsersKpi.length).toFixed(1)) : 0;
      const kpiByDepartment = await Promise.all(
        departments2.map(async (dept) => {
          const deptTasks = tasksByDepartment.get(dept.id) || [];
          const deptKpi = await calculateFilteredUsersKPI(deptTasks, activityMap, periodStart, periodEnd);
          const deptAvgKpi = deptKpi.length > 0 ? parseFloat((deptKpi.reduce((sum, u) => sum + u.kpi, 0) / deptKpi.length).toFixed(1)) : 0;
          return {
            departmentId: dept.id,
            departmentName: dept.name,
            departmentCode: dept.code,
            avgKpi: deptAvgKpi,
            userCount: deptKpi.length
          };
        })
      );
      kpiByDepartment.sort((a, b) => b.avgKpi - a.avgKpi);
      const topPerformers = allUsersKpi.slice(0, 10);
      const monthlyTrend = [];
      const currentDate = /* @__PURE__ */ new Date();
      let trendStartDate;
      let trendEndDate;
      if (year && year !== "all") {
        const selectedYear = parseInt(year);
        trendStartDate = new Date(selectedYear, 0, 1);
        trendEndDate = new Date(selectedYear, 11, 31);
      } else {
        trendStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);
        trendEndDate = currentDate;
      }
      if (month && month !== "all") {
        const selectedMonth = parseInt(month);
        const selectedYear = year && year !== "all" ? parseInt(year) : currentDate.getFullYear();
        trendStartDate = new Date(selectedYear, selectedMonth - 1, 1);
        trendEndDate = new Date(selectedYear, selectedMonth, 0);
      }
      const monthsDiff = (trendEndDate.getFullYear() - trendStartDate.getFullYear()) * 12 + (trendEndDate.getMonth() - trendStartDate.getMonth());
      const monthsToShow = Math.min(monthsDiff + 1, 12);
      for (let i = 0; i < monthsToShow; i++) {
        const targetDate = new Date(trendStartDate.getFullYear(), trendStartDate.getMonth() + i, 1);
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth() + 1;
        const period = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
        const monthTasks = filteredTasks.filter((t) => {
          if (t.status === "Ho\xE0n th\xE0nh" && t.completedAt) {
            const completedDate = new Date(t.completedAt);
            return completedDate.getFullYear() === targetYear && completedDate.getMonth() + 1 === targetMonth;
          }
          const taskDate = new Date(t.createdAt);
          return taskDate.getFullYear() === targetYear && taskDate.getMonth() + 1 === targetMonth;
        });
        const monthCompleted = monthTasks.filter((t) => t.status === "Ho\xE0n th\xE0nh");
        const monthCompletionRate = monthTasks.length > 0 ? monthCompleted.length / monthTasks.length * 100 : 0;
        monthlyTrend.push({
          month: period,
          avgKpi: parseFloat(monthCompletionRate.toFixed(1))
        });
      }
      res.json({
        overallStats: {
          avgKpi,
          totalTasks: filteredTasks.length,
          completedTasks: completedTasks.length,
          completionRate,
          totalDepartments: departments2.length,
          totalUsers: allUsersKpi.length
        },
        kpiByDepartment,
        topPerformers,
        monthlyTrend
      });
    } catch (error) {
      console.error("Get KPI stats error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/ai/evaluate-task/:taskId", requireAuth, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const progressUpdates2 = await storage.getProgressUpdates(req.params.taskId);
      const comments2 = await storage.getComments(req.params.taskId);
      const evaluation = await evaluateTaskQuality(task, progressUpdates2, comments2);
      res.json(evaluation);
    } catch (error) {
      console.error("AI evaluate task error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/ai/detect-risks/:taskId", requireAuth, async (req, res) => {
    try {
      const task = await storage.getTask(req.params.taskId);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const progressUpdates2 = await storage.getProgressUpdates(req.params.taskId);
      const risks = await detectTaskRisks(task, progressUpdates2);
      res.json(risks);
    } catch (error) {
      console.error("AI detect risks error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/ai/risks/me", requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const assignments = await storage.getUserTaskAssignments(userId);
      const tasks2 = await Promise.all(
        assignments.map((a) => storage.getTask(a.taskId))
      );
      const activeTasks = tasks2.filter((t) => t && t.status !== "Ho\xE0n th\xE0nh" && !t.deletedAt);
      const risksWithTasks = await Promise.all(
        activeTasks.map(async (task) => {
          if (!task) return [];
          const progressUpdates2 = await storage.getProgressUpdates(task.id);
          const risks = await detectTaskRisks(task, progressUpdates2);
          return risks.map((risk) => ({
            ...risk,
            taskId: task.id,
            taskTitle: task.title,
            taskNumber: task.taskNumber
          }));
        })
      );
      const allRisks = risksWithTasks.flat();
      const severityOrder = { high: 0, medium: 1, low: 2 };
      allRisks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      res.json(allRisks);
    } catch (error) {
      console.error("AI risks/me error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/ai/suggest-reassignment/:userId", requireAuth, async (req, res) => {
    try {
      const suggestion = await suggestTaskReassignment(req.params.userId);
      res.json(suggestion);
    } catch (error) {
      console.error("AI suggest reassignment error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/ai/daily-summary/:userId", requireAuth, async (req, res) => {
    try {
      const summary = await generateDailyTaskSummary(req.params.userId);
      res.json({ summary });
    } catch (error) {
      console.error("AI daily summary error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/ai/scan-all-risks", requireAuth, async (req, res) => {
    try {
      const filters = req.query.departmentId ? { departmentId: req.query.departmentId } : {};
      const tasks2 = await storage.getTasks(filters);
      const allRisks = await Promise.all(
        tasks2.map(async (task) => {
          const progressUpdates2 = await storage.getProgressUpdates(task.id);
          const risks = await detectTaskRisks(task, progressUpdates2);
          if (risks.length > 0) {
            const assignments = await storage.getTaskAssignments(task.id);
            const primaryAssignment = assignments.find((a) => a.assignmentRole === "Ch\u1EE7 tr\xEC");
            let departmentLeaders = [];
            if (task.departmentId) {
              const allUsers = await storage.getUsers();
              departmentLeaders = allUsers.filter(
                (u) => u.departmentId === task.departmentId && (u.role === "Tr\u01B0\u1EDFng ph\xF2ng" || u.role === "Ph\xF3 Tr\u01B0\u1EDFng ph\xF2ng")
              );
            }
            const usersToAlert = /* @__PURE__ */ new Set();
            if (primaryAssignment) {
              usersToAlert.add(primaryAssignment.userId);
            }
            departmentLeaders.forEach((leader) => usersToAlert.add(leader.id));
            for (const risk of risks) {
              const existingAlerts = await storage.getAiAlerts(void 0, "pending");
              const hasSameAlert = existingAlerts.some(
                (alert) => alert.taskId === task.id && alert.type === risk.type
              );
              if (!hasSameAlert) {
                for (const userId of usersToAlert) {
                  await storage.createAiAlert({
                    taskId: task.id,
                    userId,
                    type: risk.type,
                    reason: risk.reason,
                    suggestion: risk.suggestion,
                    status: "pending"
                  });
                }
              }
            }
          }
          return { taskId: task.id, taskTitle: task.title, risks };
        })
      );
      const tasksWithRisks = allRisks.filter((r) => r.risks.length > 0);
      res.json({
        scannedTasks: tasks2.length,
        tasksWithRisks: tasksWithRisks.length,
        risks: tasksWithRisks
      });
    } catch (error) {
      console.error("AI scan all risks error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/ai/dashboard-suggestions", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const dismissedTypes = req.query.dismissed ? req.query.dismissed.split(",").filter(Boolean) : [];
      const suggestions = await generateDashboardSuggestions(
        req.user.id,
        req.user.role,
        dismissedTypes
      );
      res.json(suggestions);
    } catch (error) {
      console.error("Dashboard suggestions error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/ai-alerts", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const status = req.query.status || "pending";
      let alerts;
      if (req.user.role === "Gi\xE1m \u0111\u1ED1c" || req.user.role === "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
        alerts = await storage.getAiAlerts(void 0, status);
      } else if (req.user.role === "Tr\u01B0\u1EDFng ph\xF2ng" || req.user.role === "Ph\xF3 Tr\u01B0\u1EDFng ph\xF2ng") {
        const allAlerts = await storage.getAiAlerts(void 0, status);
        const alertsWithDepts = await Promise.all(
          allAlerts.map(async (alert) => {
            const task = await storage.getTask(alert.taskId);
            return { ...alert, departmentId: task?.departmentId };
          })
        );
        alerts = alertsWithDepts.filter((a) => a.departmentId === req.user.departmentId);
      } else {
        alerts = await storage.getAiAlerts(req.user.id, status);
      }
      const alertsWithTasks = await Promise.all(
        alerts.map(async (alert) => {
          const task = await storage.getTask(alert.taskId);
          return {
            ...alert,
            taskTitle: task?.title || "Unknown",
            taskNumber: task?.taskNumber || "Unknown"
          };
        })
      );
      res.json(alertsWithTasks);
    } catch (error) {
      console.error("Get AI alerts error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/ai-alerts/pending-count", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      let count = 0;
      if (req.user.role === "Gi\xE1m \u0111\u1ED1c" || req.user.role === "Ph\xF3 Gi\xE1m \u0111\u1ED1c") {
        const allAlerts = await storage.getAiAlerts(void 0, "pending");
        count = allAlerts.length;
      } else if (req.user.role === "Tr\u01B0\u1EDFng ph\xF2ng" || req.user.role === "Ph\xF3 Tr\u01B0\u1EDFng ph\xF2ng") {
        const allAlerts = await storage.getAiAlerts(void 0, "pending");
        const alertsWithDepts = await Promise.all(
          allAlerts.map(async (alert) => {
            const task = await storage.getTask(alert.taskId);
            return { ...alert, departmentId: task?.departmentId };
          })
        );
        const deptAlerts = alertsWithDepts.filter((a) => a.departmentId === req.user.departmentId);
        count = deptAlerts.length;
      } else {
        const alerts = await storage.getAiAlerts(req.user.id, "pending");
        count = alerts.length;
      }
      res.json({ count });
    } catch (error) {
      console.error("Get pending alerts count error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/tasks/department/new-count", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (!req.user.departmentId) {
        return res.json({ count: 0 });
      }
      const tasks2 = await storage.getTasks({
        departmentId: req.user.departmentId,
        status: "Ch\u01B0a b\u1EAFt \u0111\u1EA7u"
      });
      res.json({ count: tasks2.length });
    } catch (error) {
      console.error("Get new department tasks count error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.post("/api/tasks/:id/files", requireAuth, upload.array("files", 5), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: "Kh\xF4ng c\xF3 file \u0111\u01B0\u1EE3c upload" });
      }
      const uploadedFiles = await Promise.all(
        req.files.map(async (file) => {
          const fileRecord = await storage.createFile({
            taskId: req.params.id,
            userId: req.user.id,
            filename: file.filename,
            originalName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype
          });
          return fileRecord;
        })
      );
      res.json(uploadedFiles);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "L\u1ED7i upload file" });
    }
  });
  app2.get("/api/tasks/:id/files", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const assignments = await storage.getTaskAssignments(req.params.id);
      const isAssigned = assignments.some((a) => a.userId === req.user.id);
      const isLeader = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role);
      const isDeptHead = req.user.role === "Tr\u01B0\u1EDFng ph\xF2ng" && req.user.departmentId === task.departmentId;
      if (!isAssigned && !isLeader && !isDeptHead) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem files c\u1EE7a nhi\u1EC7m v\u1EE5 n\xE0y" });
      }
      const files2 = await storage.getFiles(req.params.id);
      res.json(files2);
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({ error: "L\u1ED7i h\u1EC7 th\u1ED1ng" });
    }
  });
  app2.get("/api/files/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const targetFile = await storage.getFile(req.params.id);
      if (!targetFile) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y file" });
      }
      const task = await storage.getTask(targetFile.taskId);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const assignments = await storage.getTaskAssignments(task.id);
      const isAssigned = assignments.some((a) => a.userId === req.user.id);
      const isLeader = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role);
      const isDeptHead = req.user.role === "Tr\u01B0\u1EDFng ph\xF2ng" && req.user.departmentId === task.departmentId;
      if (!isAssigned && !isLeader && !isDeptHead) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n xem file n\xE0y" });
      }
      const filePath = getFilePath(targetFile.filename);
      if (!fs2.existsSync(filePath)) {
        return res.status(404).json({ error: "File kh\xF4ng t\u1ED3n t\u1EA1i tr\xEAn h\u1EC7 th\u1ED1ng" });
      }
      const ext = targetFile.originalName.split(".").pop()?.toLowerCase();
      const mimeTypes = {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
        "svg": "image/svg+xml"
      };
      const contentType = mimeTypes[ext || ""] || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.sendFile(filePath);
    } catch (error) {
      console.error("Preview file error:", error);
      res.status(500).json({ error: "L\u1ED7i xem file" });
    }
  });
  app2.get("/api/files/:id/download", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const targetFile = await storage.getFile(req.params.id);
      if (!targetFile) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y file" });
      }
      const task = await storage.getTask(targetFile.taskId);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const assignments = await storage.getTaskAssignments(task.id);
      const isAssigned = assignments.some((a) => a.userId === req.user.id);
      const isLeader = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role);
      const isDeptHead = req.user.role === "Tr\u01B0\u1EDFng ph\xF2ng" && req.user.departmentId === task.departmentId;
      if (!isAssigned && !isLeader && !isDeptHead) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n t\u1EA3i file n\xE0y" });
      }
      const filePath = getFilePath(targetFile.filename);
      if (!fs2.existsSync(filePath)) {
        return res.status(404).json({ error: "File kh\xF4ng t\u1ED3n t\u1EA1i tr\xEAn h\u1EC7 th\u1ED1ng" });
      }
      res.download(filePath, targetFile.originalName);
    } catch (error) {
      console.error("Download file error:", error);
      res.status(500).json({ error: "L\u1ED7i t\u1EA3i file" });
    }
  });
  app2.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const targetFile = await storage.getFile(req.params.id);
      if (!targetFile) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y file" });
      }
      const task = await storage.getTask(targetFile.taskId);
      if (!task) {
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y nhi\u1EC7m v\u1EE5" });
      }
      const assignments = await storage.getTaskAssignments(task.id);
      const isAssigned = assignments.some((a) => a.userId === req.user.id);
      const isLeader = ["Gi\xE1m \u0111\u1ED1c", "Ph\xF3 Gi\xE1m \u0111\u1ED1c"].includes(req.user.role);
      const isDeptHead = req.user.role === "Tr\u01B0\u1EDFng ph\xF2ng" && req.user.departmentId === task.departmentId;
      if (!isAssigned && !isLeader && !isDeptHead) {
        return res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n x\xF3a file n\xE0y" });
      }
      if (targetFile.userId !== req.user.id && !isLeader && !isDeptHead) {
        return res.status(403).json({ error: "Ch\u1EC9 ng\u01B0\u1EDDi upload m\u1EDBi c\xF3 th\u1EC3 x\xF3a file n\xE0y" });
      }
      deleteFile(targetFile.filename);
      await storage.deleteFile(req.params.id);
      res.json({ message: "\u0110\xE3 x\xF3a file" });
    } catch (error) {
      console.error("Delete file error:", error);
      res.status(500).json({ error: "L\u1ED7i x\xF3a file" });
    }
  });
  app2.get("/api/reports/tasks", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { timeRange, year, month, quarter, week, departmentId, status } = req.query;
      const validTimeRanges = ["week", "month", "quarter", "year"];
      if (!timeRange || !validTimeRanges.includes(timeRange)) {
        return res.status(400).json({ error: "Invalid time range" });
      }
      const filters = {
        timeRange,
        year: year ? parseInt(year) : void 0,
        month: month ? parseInt(month) : void 0,
        quarter: quarter ? parseInt(quarter) : void 0,
        week: week ? parseInt(week) : void 0,
        departmentId,
        status
      };
      const stats = await calculateTaskReportStats(filters);
      res.json(stats);
    } catch (error) {
      console.error("Get task reports error:", error);
      res.status(500).json({ error: "L\u1ED7i l\u1EA5y b\xE1o c\xE1o" });
    }
  });
  app2.post("/api/reports/tasks/insights", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { stats } = req.body;
      if (!stats) {
        return res.status(400).json({ error: "Missing stats data" });
      }
      const insights = await generateTaskReportInsights(stats);
      res.json(insights);
    } catch (error) {
      console.error("Generate AI insights error:", error);
      res.status(500).json({ error: "L\u1ED7i t\u1EA1o ph\xE2n t\xEDch AI" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.set("trust proxy", 1);
var PgStore = connectPgSimple(session);
var sessionConfig = {
  secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1e3,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax"
  }
};
if (process.env.NODE_ENV === "production") {
  sessionConfig.store = new PgStore({
    conString: process.env.DATABASE_URL,
    tableName: "user_sessions",
    createTableIfMissing: true
  });
}
app.use(session(sessionConfig));
app.use(attachUser(storage));
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
