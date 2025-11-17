import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, decimal, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  assignedDeputyDirectorId: varchar("assigned_deputy_director_id").references((): any => users.id),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id").references((): any => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
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
  deletedById: varchar("deleted_by_id").references((): any => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskNumber: text("task_number").unique(),
  title: text("title").notNull(),
  description: text("description"),
  deadline: timestamp("deadline").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull().default('Chưa bắt đầu'),
  progress: integer("progress").notNull().default(0),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  departmentId: varchar("department_id").references(() => departments.id),
  parentTaskId: varchar("parent_task_id").references((): any => tasks.id),
  completedAt: timestamp("completed_at"),
  leadershipScore: decimal("leadership_score", { precision: 3, scale: 1 }),
  evaluatedById: varchar("evaluated_by_id").references(() => users.id),
  evaluatedAt: timestamp("evaluated_at"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletedById: varchar("deleted_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  parentTaskIdIdx: index("parent_task_id_idx").on(table.parentTaskId),
}));

export const taskAssignments = pgTable("task_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: text("role").notNull(),
  collaborationCompleted: boolean("collaboration_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskEvaluations = pgTable("task_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  assignmentId: varchar("assignment_id").notNull().references(() => taskAssignments.id, { onDelete: "cascade" }),
  evaluatorId: varchar("evaluator_id").notNull().references(() => users.id),
  score: decimal("score", { precision: 3, scale: 1 }).notNull(),
  comments: text("comments"),
  evaluatedAt: timestamp("evaluated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueTaskAssignment: uniqueIndex("unique_task_assignment").on(table.taskId, table.assignmentId),
}));

export const progressUpdates = pgTable("progress_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  updateType: text("update_type").notNull(),
  content: text("content"),
  progressPercent: integer("progress_percent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const checklistItems = pgTable("checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const kpiScores = pgTable("kpi_scores", {
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
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export const aiAlerts = pgTable("ai_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  reason: text("reason").notNull(),
  suggestion: text("suggestion"),
  status: text("status").notNull().default('pending'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const telegramDeadlineNotifications = pgTable("telegram_deadline_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  milestone: text("milestone").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (table) => ({
  uniqueNotification: uniqueIndex("telegram_deadline_notifications_unique_idx").on(table.taskId, table.userId, table.milestone),
}));

export const taskSequences = pgTable("task_sequences", {
  year: integer("year").primaryKey(),
  lastSequence: integer("last_sequence").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const checklistTemplates = pgTable("checklist_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Partial unique index: only one template can have isDefault = true
  uniqueDefault: sql`CREATE UNIQUE INDEX IF NOT EXISTS unique_default_template ON ${table} (is_default) WHERE is_default = true`,
}));

export const checklistTemplateItems = pgTable("checklist_template_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => checklistTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  isDeleted: true,
  deletedAt: true,
  deletedById: true,
  createdAt: true,
  updatedAt: true,
});

export const userRoles = ["Giám đốc", "Phó Giám đốc", "Trưởng phòng", "Phó trưởng phòng", "Chuyên viên"] as const;
export type UserRole = typeof userRoles[number];

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  isDeleted: true,
  deletedAt: true,
  deletedById: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  role: z.enum(userRoles),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  taskNumber: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  leadershipScore: z.number().min(0).max(10).optional().nullable(),
});

export const insertTaskAssignmentSchema = createInsertSchema(taskAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertTaskEvaluationSchema = createInsertSchema(taskEvaluations).omit({
  id: true,
  evaluatedAt: true,
}).extend({
  score: z.number().min(0).max(10),
});

export const insertProgressUpdateSchema = createInsertSchema(progressUpdates).omit({
  id: true,
  createdAt: true,
});

export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadedAt: true,
});

export const insertKpiScoreSchema = createInsertSchema(kpiScores).omit({
  id: true,
  calculatedAt: true,
});

export const insertAiAlertSchema = createInsertSchema(aiAlerts).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertTelegramDeadlineNotificationSchema = createInsertSchema(telegramDeadlineNotifications).omit({
  id: true,
  sentAt: true,
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// User with joined department name (for storage layer)
export type UserWithDepartment = User & {
  departmentName: string | null;
};

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = z.infer<typeof insertTaskAssignmentSchema>;

export type TaskEvaluation = typeof taskEvaluations.$inferSelect;
export type InsertTaskEvaluation = z.infer<typeof insertTaskEvaluationSchema>;

export type ProgressUpdate = typeof progressUpdates.$inferSelect;
export type InsertProgressUpdate = z.infer<typeof insertProgressUpdateSchema>;

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type KpiScore = typeof kpiScores.$inferSelect;
export type InsertKpiScore = z.infer<typeof insertKpiScoreSchema>;

export type AiAlert = typeof aiAlerts.$inferSelect;
export type InsertAiAlert = z.infer<typeof insertAiAlertSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type TelegramDeadlineNotification = typeof telegramDeadlineNotifications.$inferSelect;
export type InsertTelegramDeadlineNotification = z.infer<typeof insertTelegramDeadlineNotificationSchema>;

export const insertChecklistTemplateSchema = createInsertSchema(checklistTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertChecklistTemplateItemSchema = createInsertSchema(checklistTemplateItems).omit({
  id: true,
  createdAt: true,
});

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;
export type InsertChecklistTemplate = z.infer<typeof insertChecklistTemplateSchema>;

export type ChecklistTemplateItem = typeof checklistTemplateItems.$inferSelect;
export type InsertChecklistTemplateItem = z.infer<typeof insertChecklistTemplateItemSchema>;
