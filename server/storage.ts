import { db } from "./db";
import { eq, and, desc, sql, inArray, ne, not } from "drizzle-orm";
import * as schema from "@shared/schema";
import type {
  User,
  UserWithDepartment,
  InsertUser,
  Department,
  InsertDepartment,
  Task,
  InsertTask,
  TaskAssignment,
  InsertTaskAssignment,
  ProgressUpdate,
  InsertProgressUpdate,
  ChecklistItem,
  InsertChecklistItem,
  Comment,
  InsertComment,
  File,
  InsertFile,
  KpiScore,
  InsertKpiScore,
  AiAlert,
  InsertAiAlert,
  Notification,
  InsertNotification,
  ChecklistTemplate,
  InsertChecklistTemplate,
  ChecklistTemplateItem,
  InsertChecklistTemplateItem,
  TaskEvaluation,
  InsertTaskEvaluation,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(filters?: { departmentId?: string; role?: string }): Promise<UserWithDepartment[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserTelegramSettings(userId: string, telegramId: string | null, groupTelegramChatId: string | null, notifyOnNewTask: boolean, notifyOnDeadline: boolean, notifyOnComment: boolean, notifyOnScheduledAISuggestions: boolean, notifyOnScheduledAIAlerts: boolean, notifyOnScheduledWeeklyKPI: boolean, notifyOnScheduledMonthlyKPI: boolean): Promise<void>;
  deleteUser(id: string, deletedById: string): Promise<User | undefined>;
  
  getDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, department: Partial<InsertDepartment>): Promise<Department | undefined>;
  deleteDepartment(id: string, deletedById: string): Promise<Department | undefined>;
  
  getTasks(filters?: { 
    userId?: string; 
    departmentId?: string; 
    status?: string; 
    assignmentRole?: string;
    assignmentRoles?: string[];
    incompleteOnly?: boolean;
    includeDeleted?: boolean;
  }): Promise<Task[]>;
  getTasksForEvaluation(userId: string, userRole: string, userDepartmentId: string | null, evaluationStatus?: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  getSubtasks(parentTaskId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  updateTaskLeadershipScore(id: string, score: number, evaluatedById: string): Promise<Task | undefined>;
  softDeleteTask(id: string, deletedById: string): Promise<Task | undefined>;
  restoreTask(id: string): Promise<Task | undefined>;
  permanentlyDeleteTask(id: string): Promise<void>;
  
  getTaskAssignments(taskId: string): Promise<TaskAssignment[]>;
  getTaskAssignmentsForUsers(userIds: string[]): Promise<TaskAssignment[]>;
  getUserTaskAssignments(userId: string): Promise<TaskAssignment[]>;
  createTaskAssignment(assignment: InsertTaskAssignment): Promise<TaskAssignment>;
  updateTaskAssignmentCollaboration(assignmentId: string, collaborationCompleted: boolean): Promise<TaskAssignment | undefined>;
  updateTaskAssignmentRole(assignmentId: string, role: string): Promise<TaskAssignment | undefined>;
  deleteTaskAssignment(assignmentId: string): Promise<void>;
  
  getProgressUpdates(taskId: string): Promise<ProgressUpdate[]>;
  createProgressUpdate(update: InsertProgressUpdate): Promise<ProgressUpdate>;
  
  getChecklistItems(taskId: string): Promise<ChecklistItem[]>;
  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  updateChecklistItem(id: string, item: Partial<InsertChecklistItem>): Promise<ChecklistItem | undefined>;
  deleteChecklistItem(id: string): Promise<void>;
  
  getComments(taskId: string): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  getFile(id: string): Promise<File | undefined>;
  getFiles(taskId: string): Promise<File[]>;
  getTaskFiles(taskId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  deleteFile(id: string): Promise<void>;
  
  getKpiScores(userId: string, period?: string): Promise<KpiScore[]>;
  createKpiScore(score: InsertKpiScore): Promise<KpiScore>;
  
  getAiAlerts(userId?: string, status?: string): Promise<AiAlert[]>;
  createAiAlert(alert: InsertAiAlert): Promise<AiAlert>;
  updateAiAlert(id: string, alert: Partial<InsertAiAlert>): Promise<AiAlert | undefined>;
  
  getNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  
  getChecklistTemplates(): Promise<ChecklistTemplate[]>;
  getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined>;
  getChecklistTemplateItems(templateId: string): Promise<ChecklistTemplateItem[]>;
  
  getTaskEvaluation(taskId: string, assignmentId: string): Promise<TaskEvaluation | undefined>;
  getTaskEvaluations(taskId: string): Promise<TaskEvaluation[]>;
  getUserTaskEvaluations(userId: string): Promise<TaskEvaluation[]>;
  upsertTaskEvaluation(evaluation: InsertTaskEvaluation): Promise<TaskEvaluation>;
  
  updateDepartmentDeputyDirector(departmentId: string, deputyDirectorId: string | null): Promise<Department | undefined>;
  syncTaskLeadershipScore(taskId: string): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(and(
        eq(schema.users.id, id),
        eq(schema.users.isDeleted, false)
      ));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(schema.users)
      .where(and(
        eq(schema.users.username, username),
        eq(schema.users.isDeleted, false)
      ));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(schema.users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();
    return updated;
  }

  async updateUserTelegramSettings(
    userId: string, 
    telegramId: string | null,
    groupTelegramChatId: string | null,
    notifyOnNewTask: boolean, 
    notifyOnDeadline: boolean, 
    notifyOnComment: boolean,
    notifyOnScheduledAISuggestions: boolean,
    notifyOnScheduledAIAlerts: boolean,
    notifyOnScheduledWeeklyKPI: boolean,
    notifyOnScheduledMonthlyKPI: boolean
  ): Promise<void> {
    await db
      .update(schema.users)
      .set({
        telegramId,
        groupTelegramChatId,
        notifyOnNewTask,
        notifyOnDeadline,
        notifyOnComment,
        notifyOnScheduledAISuggestions,
        notifyOnScheduledAIAlerts,
        notifyOnScheduledWeeklyKPI,
        notifyOnScheduledMonthlyKPI,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
  }

  async deleteUser(id: string, deletedById: string): Promise<User | undefined> {
    // Check if user has active task assignments
    const assignments = await db
      .select()
      .from(schema.taskAssignments)
      .where(eq(schema.taskAssignments.userId, id))
      .limit(1);
    
    if (assignments.length > 0) {
      throw new Error("Không thể xóa cán bộ vì còn nhiệm vụ được giao. Vui lòng chuyển giao nhiệm vụ trước.");
    }
    
    const [deleted] = await db
      .update(schema.users)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      })
      .where(eq(schema.users.id, id))
      .returning();
    return deleted;
  }

  async getUsers(filters?: { departmentId?: string; role?: string }): Promise<UserWithDepartment[]> {
    const conditions = [];
    
    if (filters?.departmentId) {
      conditions.push(eq(schema.users.departmentId, filters.departmentId));
    }
    if (filters?.role) {
      conditions.push(eq(schema.users.role, filters.role));
    }
    
    // Filter out soft-deleted users by default
    conditions.push(eq(schema.users.isDeleted, false));
    
    // Filter out system admin users (hidden)
    conditions.push(eq(schema.users.isSystemAdmin, false));
    
    // LEFT JOIN with departments to include department name
    const query = db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        password: schema.users.password,
        fullName: schema.users.fullName,
        role: schema.users.role,
        departmentId: schema.users.departmentId,
        telegramId: schema.users.telegramId,
        groupTelegramChatId: schema.users.groupTelegramChatId,
        notifyOnNewTask: schema.users.notifyOnNewTask,
        notifyOnDeadline: schema.users.notifyOnDeadline,
        notifyOnComment: schema.users.notifyOnComment,
        notifyOnScheduledAISuggestions: schema.users.notifyOnScheduledAISuggestions,
        notifyOnScheduledAIAlerts: schema.users.notifyOnScheduledAIAlerts,
        notifyOnScheduledWeeklyKPI: schema.users.notifyOnScheduledWeeklyKPI,
        notifyOnScheduledMonthlyKPI: schema.users.notifyOnScheduledMonthlyKPI,
        position: schema.users.position,
        isSystemAdmin: schema.users.isSystemAdmin,
        isDeleted: schema.users.isDeleted,
        deletedAt: schema.users.deletedAt,
        deletedById: schema.users.deletedById,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
        departmentName: schema.departments.name,
      })
      .from(schema.users)
      .leftJoin(schema.departments, eq(schema.users.departmentId, schema.departments.id));
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }

  async getDepartments(): Promise<Department[]> {
    return await db.select().from(schema.departments).where(eq(schema.departments.isDeleted, false));
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const [department] = await db.select().from(schema.departments).where(eq(schema.departments.id, id));
    return department;
  }

  async createDepartment(department: InsertDepartment): Promise<Department> {
    const [result] = await db.insert(schema.departments).values(department).returning();
    return result;
  }

  async updateDepartment(id: string, updateData: Partial<InsertDepartment>): Promise<Department | undefined> {
    const [updated] = await db
      .update(schema.departments)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(schema.departments.id, id))
      .returning();
    return updated;
  }

  async deleteDepartment(id: string, deletedById: string): Promise<Department | undefined> {
    // Check if department has active users
    const users = await db
      .select()
      .from(schema.users)
      .where(and(
        eq(schema.users.departmentId, id),
        eq(schema.users.isDeleted, false)
      ))
      .limit(1);
    
    if (users.length > 0) {
      throw new Error("Không thể xóa phòng ban vì còn cán bộ thuộc phòng. Vui lòng chuyển cán bộ sang phòng khác trước.");
    }
    
    const [deleted] = await db
      .update(schema.departments)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedById,
      })
      .where(eq(schema.departments.id, id))
      .returning();
    return deleted;
  }

  async getTasks(filters?: { 
    userId?: string; 
    departmentId?: string; 
    status?: string; 
    assignmentRole?: string;
    assignmentRoles?: string[];
    incompleteOnly?: boolean;
    includeDeleted?: boolean;
  }): Promise<Task[]> {
    const conditions = [];
    
    // Filter out deleted tasks by default
    if (!filters?.includeDeleted) {
      conditions.push(eq(schema.tasks.isDeleted, false));
    }
    
    if (filters?.departmentId) {
      conditions.push(eq(schema.tasks.departmentId, filters.departmentId));
    }
    if (filters?.status) {
      conditions.push(eq(schema.tasks.status, filters.status));
    }
    if (filters?.incompleteOnly) {
      conditions.push(ne(schema.tasks.status, "Hoàn thành"));
    }
    
    const tasks = conditions.length > 0
      ? await db.select().from(schema.tasks).where(and(...conditions)).orderBy(desc(schema.tasks.createdAt))
      : await db.select().from(schema.tasks).orderBy(desc(schema.tasks.createdAt));
    
    if (filters?.userId) {
      const taskIds = tasks.map(t => t.id);
      if (taskIds.length === 0) return [];
      
      const assignmentConditions = [
        eq(schema.taskAssignments.userId, filters.userId),
        inArray(schema.taskAssignments.taskId, taskIds)
      ];
      
      // Support either single role or multiple roles
      if (filters.assignmentRoles && filters.assignmentRoles.length > 0) {
        assignmentConditions.push(inArray(schema.taskAssignments.role, filters.assignmentRoles));
      } else if (filters.assignmentRole) {
        assignmentConditions.push(eq(schema.taskAssignments.role, filters.assignmentRole));
      }
      
      const assignments = await db.select()
        .from(schema.taskAssignments)
        .where(and(...assignmentConditions));
      
      const assignedTaskIds = new Set(assignments.map(a => a.taskId));
      return tasks.filter(t => assignedTaskIds.has(t.id));
    }
    
    return tasks;
  }

  async getTasksForEvaluation(userId: string, userRole: string, userDepartmentId: string | null, evaluationStatus: string = 'unevaluated'): Promise<Task[]> {
    // Role normalization map to handle variants (with/without accents, case-insensitive)
    const normalizeRole = (role: string): "Chủ trì" | "Phối hợp" | "Chỉ đạo" | null => {
      const normalized = role.trim().toLowerCase();
      
      // Map all possible variants (lowercase for matching)
      const roleMap: Record<string, "Chủ trì" | "Phối hợp" | "Chỉ đạo"> = {
        "chu tri": "Chủ trì",
        "chủ trì": "Chủ trì",
        "chu trì": "Chủ trì",
        "phoi hop": "Phối hợp",
        "phối hợp": "Phối hợp",
        "phoi hợp": "Phối hợp",
        "phối hop": "Phối hợp",
        "chi dao": "Chỉ đạo",
        "chỉ đạo": "Chỉ đạo",
        "chi đạo": "Chỉ đạo",
        "chỉ dao": "Chỉ đạo",
      };
      
      return roleMap[normalized] || null;
    };

    // Normalize evaluationStatus to acceptable values
    const normalizedStatus = ['evaluated', 'unevaluated', 'all'].includes(evaluationStatus) 
      ? evaluationStatus 
      : 'unevaluated';

    // Build base query conditions
    const conditions = [
      eq(schema.tasks.isDeleted, false),
      eq(schema.tasks.status, "Hoàn thành")
    ];

    // Add leadershipScore filter based on evaluationStatus
    // Note: leadershipScore is a numeric column, only check NULL (no empty string comparison)
    if (normalizedStatus === 'evaluated') {
      conditions.push(sql`${schema.tasks.leadershipScore} IS NOT NULL`);
    } else if (normalizedStatus === 'unevaluated') {
      conditions.push(sql`${schema.tasks.leadershipScore} IS NULL`);
    }
    // If 'all', no leadershipScore filter

    // Get all tasks matching the evaluation status
    const tasksNeedingEval = await db.select()
      .from(schema.tasks)
      .where(and(...conditions))
      .orderBy(desc(schema.tasks.createdAt));

    if (tasksNeedingEval.length === 0) return [];

    const taskIds = tasksNeedingEval.map(t => t.id);

    // Leadership (Giám đốc, Phó Giám đốc): tasks where they are "Chỉ đạo"
    if (userRole === "Giám đốc" || userRole === "Phó Giám đốc") {
      const allAssignments = await db.select()
        .from(schema.taskAssignments)
        .where(and(
          eq(schema.taskAssignments.userId, userId),
          inArray(schema.taskAssignments.taskId, taskIds)
        ));

      // Normalize and filter for "Chỉ đạo" role
      const assignedTaskIds = new Set(
        allAssignments
          .filter(a => normalizeRole(a.role) === "Chỉ đạo")
          .map(a => a.taskId)
      );
      
      return tasksNeedingEval.filter(t => assignedTaskIds.has(t.id));
    }

    // Trưởng phòng: tasks of their department staff WITHOUT central leadership direction
    if (userRole === "Trưởng phòng" && userDepartmentId) {
      // Get all assignments for these tasks
      const allAssignments = await db.select()
        .from(schema.taskAssignments)
        .where(inArray(schema.taskAssignments.taskId, taskIds));

      // Normalize roles and get tasks that have "Chỉ đạo" (tasks WITH central leadership)
      const tasksWithLeadership = new Set(
        allAssignments
          .filter(a => normalizeRole(a.role) === "Chỉ đạo")
          .map(a => a.taskId)
      );

      // Get "Chủ trì" assignments (normalized)
      const chuTriAssignments = allAssignments.filter(a => normalizeRole(a.role) === "Chủ trì");
      
      if (chuTriAssignments.length === 0) return [];

      // Get user IDs of Chủ trì
      const chuTriUserIds = chuTriAssignments.map(a => a.userId);
      
      // Get users in the department head's department
      const deptUsers = await db.select()
        .from(schema.users)
        .where(and(
          eq(schema.users.departmentId, userDepartmentId),
          inArray(schema.users.id, chuTriUserIds)
        ));

      const deptUserIds = new Set(deptUsers.map(u => u.id));

      // Filter tasks: Chủ trì is in department AND no "Chỉ đạo" leadership
      const eligibleTaskIds = new Set(
        chuTriAssignments
          .filter(a => deptUserIds.has(a.userId) && !tasksWithLeadership.has(a.taskId))
          .map(a => a.taskId)
      );

      return tasksNeedingEval.filter(t => eligibleTaskIds.has(t.id));
    }

    return [];
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id));
    return task;
  }

  async getSubtasks(parentTaskId: string): Promise<Task[]> {
    return await db.select()
      .from(schema.tasks)
      .where(and(
        eq(schema.tasks.parentTaskId, parentTaskId),
        eq(schema.tasks.isDeleted, false)
      ))
      .orderBy(schema.tasks.createdAt);
  }

  async updateParentProgress(subtaskId: string): Promise<void> {
    // Get the subtask to find its parent
    const subtask = await this.getTask(subtaskId);
    if (!subtask || !subtask.parentTaskId) {
      return; // No parent to update
    }

    await this.recalculateTaskStatusFromSubtasks(subtask.parentTaskId);
  }

  // Recalculate task status and progress based on its subtasks
  // Used for parent tasks that have subtasks
  async recalculateTaskStatusFromSubtasks(taskId: string): Promise<void> {
    // Get all subtasks of this task
    const subtasks = await this.getSubtasks(taskId);
    
    // If no subtasks, nothing to recalculate
    if (subtasks.length === 0) {
      return;
    }
    
    // Calculate average progress from subtasks
    const totalProgress = subtasks.reduce((sum, task) => sum + task.progress, 0);
    const averageProgress = Math.round(totalProgress / subtasks.length);

    // Check if all subtasks are completed
    const allSubtasksCompleted = subtasks.every(t => t.status === "Hoàn thành");

    // Determine parent status based on subtasks
    let parentStatus: string;
    let parentProgress = averageProgress;

    if (allSubtasksCompleted) {
      // All subtasks completed -> Parent is completed
      parentStatus = "Hoàn thành";
      parentProgress = 100;
    } else if (subtasks.some(t => t.status === "Đang thực hiện")) {
      // At least one subtask in progress -> Parent is in progress
      parentStatus = "Đang thực hiện";
    } else if (subtasks.every(t => t.status === "Chưa bắt đầu")) {
      // All subtasks not started -> Parent not started
      parentStatus = "Chưa bắt đầu";
      parentProgress = 0;
    } else {
      // Mixed statuses -> Parent is in progress
      parentStatus = "Đang thực hiện";
    }

    // Update parent task progress and status
    await db.update(schema.tasks)
      .set({ 
        progress: parentProgress,
        status: parentStatus,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, taskId));
  }

  async createTask(task: InsertTask): Promise<Task> {
    return await db.transaction(async (tx) => {
      const currentYear = new Date().getFullYear();
      const yearSuffix = currentYear.toString().slice(-2);

      await tx
        .insert(schema.taskSequences)
        .values({
          year: currentYear,
          lastSequence: 0,
          updatedAt: new Date(),
        })
        .onConflictDoNothing();

      const [sequence] = await tx
        .select()
        .from(schema.taskSequences)
        .where(eq(schema.taskSequences.year, currentYear))
        .for('update');

      if (!sequence) {
        throw new Error(`Failed to acquire sequence lock for year ${currentYear}`);
      }

      const nextSequence = sequence.lastSequence + 1;

      const [updated] = await tx
        .update(schema.taskSequences)
        .set({
          lastSequence: nextSequence,
          updatedAt: new Date(),
        })
        .where(eq(schema.taskSequences.year, currentYear))
        .returning();

      if (!updated) {
        throw new Error(`Failed to update sequence for year ${currentYear}`);
      }

      const taskNumber = `#${yearSuffix}-${nextSequence.toString().padStart(3, '0')}`;

      const taskData: any = {
        ...task,
        taskNumber,
      };

      if (task.leadershipScore !== undefined && task.leadershipScore !== null) {
        taskData.leadershipScore = task.leadershipScore.toString();
      }

      const [insertedTask] = await tx
        .insert(schema.tasks)
        .values(taskData)
        .returning();

      return insertedTask;
    });
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined> {
    const updateData: any = {
      ...task,
      updatedAt: new Date(),
    };

    if (task.leadershipScore !== undefined && task.leadershipScore !== null) {
      updateData.leadershipScore = task.leadershipScore.toString();
    }

    const [result] = await db.update(schema.tasks)
      .set(updateData)
      .where(eq(schema.tasks.id, id))
      .returning();
    return result;
  }

  async updateTaskLeadershipScore(id: string, score: number, evaluatedById: string): Promise<Task | undefined> {
    const updateData: any = {
      leadershipScore: score.toString(),
      evaluatedById: evaluatedById,
      evaluatedAt: new Date(),
      updatedAt: new Date(),
    };
    
    const [result] = await db.update(schema.tasks)
      .set(updateData)
      .where(eq(schema.tasks.id, id))
      .returning();
    
    return result;
  }

  async softDeleteTask(id: string, deletedById: string): Promise<Task | undefined> {
    return await db.transaction(async (tx) => {
      // Get the task being deleted to check if it has a parent
      const [taskToDelete] = await tx.select().from(schema.tasks).where(eq(schema.tasks.id, id));
      const parentTaskId = taskToDelete?.parentTaskId;

      // If this is a subtask, recalculate parent progress BEFORE deletion
      if (parentTaskId) {
        // Get all ACTIVE subtasks EXCEPT the one being deleted
        const remainingSubtasks = await tx.select()
          .from(schema.tasks)
          .where(and(
            eq(schema.tasks.parentTaskId, parentTaskId),
            eq(schema.tasks.isDeleted, false),
            not(eq(schema.tasks.id, id))
          ));

        // Calculate average progress from remaining subtasks
        const totalProgress = remainingSubtasks.reduce((sum, t) => sum + t.progress, 0);
        const averageProgress = remainingSubtasks.length > 0 
          ? Math.round(totalProgress / remainingSubtasks.length) 
          : 0;

        // Update parent progress
        await tx.update(schema.tasks)
          .set({ progress: averageProgress, updatedAt: new Date() })
          .where(eq(schema.tasks.id, parentTaskId));
      }

      // Set subtasks' parentTaskId to null (make them independent)
      await tx.update(schema.tasks)
        .set({ parentTaskId: null, updatedAt: new Date() })
        .where(eq(schema.tasks.parentTaskId, id));

      // Soft delete the task
      const [result] = await tx.update(schema.tasks)
        .set({ 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedById,
          updatedAt: new Date(),
        })
        .where(eq(schema.tasks.id, id))
        .returning();
      
      return result;
    });
  }

  async restoreTask(id: string): Promise<Task | undefined> {
    const [result] = await db.update(schema.tasks)
      .set({ 
        isDeleted: false, 
        deletedAt: null,
        deletedById: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, id))
      .returning();
    return result;
  }

  async permanentlyDeleteTask(id: string): Promise<void> {
    await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
  }

  async getTaskAssignments(taskId: string): Promise<TaskAssignment[]> {
    return await db.select().from(schema.taskAssignments).where(eq(schema.taskAssignments.taskId, taskId));
  }

  async getTaskAssignmentsForUsers(userIds: string[]): Promise<TaskAssignment[]> {
    if (userIds.length === 0) {
      return [];
    }
    return await db.select().from(schema.taskAssignments).where(inArray(schema.taskAssignments.userId, userIds));
  }

  async getUserTaskAssignments(userId: string): Promise<TaskAssignment[]> {
    return await db.select().from(schema.taskAssignments).where(eq(schema.taskAssignments.userId, userId));
  }

  async createTaskAssignment(assignment: InsertTaskAssignment): Promise<TaskAssignment> {
    const [result] = await db.insert(schema.taskAssignments).values(assignment).returning();
    return result;
  }

  async updateTaskAssignmentCollaboration(assignmentId: string, collaborationCompleted: boolean): Promise<TaskAssignment | undefined> {
    const [result] = await db.update(schema.taskAssignments)
      .set({ collaborationCompleted })
      .where(eq(schema.taskAssignments.id, assignmentId))
      .returning();
    return result;
  }

  async updateTaskAssignmentRole(assignmentId: string, role: string): Promise<TaskAssignment | undefined> {
    const [result] = await db.update(schema.taskAssignments)
      .set({ role })
      .where(eq(schema.taskAssignments.id, assignmentId))
      .returning();
    return result;
  }

  async deleteTaskAssignment(assignmentId: string): Promise<void> {
    await db.delete(schema.taskAssignments)
      .where(eq(schema.taskAssignments.id, assignmentId));
  }

  async getProgressUpdates(taskId: string): Promise<ProgressUpdate[]> {
    return await db.select()
      .from(schema.progressUpdates)
      .where(eq(schema.progressUpdates.taskId, taskId))
      .orderBy(desc(schema.progressUpdates.createdAt));
  }

  async createProgressUpdate(update: InsertProgressUpdate): Promise<ProgressUpdate> {
    const [result] = await db.insert(schema.progressUpdates).values(update).returning();
    return result;
  }

  async getChecklistItems(taskId: string): Promise<ChecklistItem[]> {
    return await db.select()
      .from(schema.checklistItems)
      .where(eq(schema.checklistItems.taskId, taskId))
      .orderBy(schema.checklistItems.order);
  }

  async createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem> {
    const [result] = await db.insert(schema.checklistItems).values(item).returning();
    return result;
  }

  async updateChecklistItem(id: string, item: Partial<InsertChecklistItem>): Promise<ChecklistItem | undefined> {
    const [result] = await db.update(schema.checklistItems)
      .set(item)
      .where(eq(schema.checklistItems.id, id))
      .returning();
    return result;
  }

  async deleteChecklistItem(id: string): Promise<void> {
    await db.delete(schema.checklistItems)
      .where(eq(schema.checklistItems.id, id));
  }

  async getComments(taskId: string): Promise<Comment[]> {
    return await db.select()
      .from(schema.comments)
      .where(eq(schema.comments.taskId, taskId))
      .orderBy(desc(schema.comments.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [result] = await db.insert(schema.comments).values(comment).returning();
    return result;
  }

  async getFile(id: string): Promise<File | undefined> {
    const [file] = await db.select()
      .from(schema.files)
      .where(eq(schema.files.id, id));
    return file;
  }

  async getFiles(taskId: string): Promise<File[]> {
    return await db.select()
      .from(schema.files)
      .where(eq(schema.files.taskId, taskId))
      .orderBy(desc(schema.files.uploadedAt));
  }

  async getTaskFiles(taskId: string): Promise<File[]> {
    return this.getFiles(taskId);
  }

  async createFile(file: InsertFile): Promise<File> {
    const [result] = await db.insert(schema.files).values(file).returning();
    return result;
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(schema.files).where(eq(schema.files.id, id));
  }

  async getKpiScores(userId: string, period?: string): Promise<KpiScore[]> {
    const conditions = [eq(schema.kpiScores.userId, userId)];
    
    if (period) {
      conditions.push(eq(schema.kpiScores.period, period));
    }
    
    return await db.select()
      .from(schema.kpiScores)
      .where(and(...conditions))
      .orderBy(desc(schema.kpiScores.calculatedAt));
  }

  async createKpiScore(score: InsertKpiScore): Promise<KpiScore> {
    const [result] = await db.insert(schema.kpiScores).values(score).returning();
    return result;
  }

  async getAiAlerts(userId?: string, status?: string): Promise<AiAlert[]> {
    const conditions = [];
    if (userId) {
      conditions.push(eq(schema.aiAlerts.userId, userId));
    }
    if (status) {
      conditions.push(eq(schema.aiAlerts.status, status));
    }
    
    return conditions.length > 0
      ? await db.select().from(schema.aiAlerts).where(and(...conditions)).orderBy(desc(schema.aiAlerts.createdAt))
      : await db.select().from(schema.aiAlerts).orderBy(desc(schema.aiAlerts.createdAt));
  }

  async createAiAlert(alert: InsertAiAlert): Promise<AiAlert> {
    const [result] = await db.insert(schema.aiAlerts).values(alert).returning();
    return result;
  }

  async updateAiAlert(id: string, alert: Partial<InsertAiAlert>): Promise<AiAlert | undefined> {
    const [result] = await db.update(schema.aiAlerts)
      .set(alert)
      .where(eq(schema.aiAlerts.id, id))
      .returning();
    return result;
  }

  async getNotifications(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    const conditions = [eq(schema.notifications.userId, userId)];
    
    if (unreadOnly) {
      conditions.push(eq(schema.notifications.read, false));
    }
    
    return await db.select()
      .from(schema.notifications)
      .where(and(...conditions))
      .orderBy(desc(schema.notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(schema.notifications).values(notification).returning();
    return result;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db.update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.id, id));
  }

  async getChecklistTemplates(): Promise<ChecklistTemplate[]> {
    return await db.select().from(schema.checklistTemplates);
  }

  async getChecklistTemplate(id: string): Promise<ChecklistTemplate | undefined> {
    const [template] = await db.select().from(schema.checklistTemplates).where(eq(schema.checklistTemplates.id, id));
    return template;
  }

  async getChecklistTemplateItems(templateId: string): Promise<ChecklistTemplateItem[]> {
    return await db.select()
      .from(schema.checklistTemplateItems)
      .where(eq(schema.checklistTemplateItems.templateId, templateId))
      .orderBy(schema.checklistTemplateItems.order);
  }

  async getTemplatesForUser(currentUserId: string): Promise<{
    default: ChecklistTemplate | null;
    personal: ChecklistTemplate[];
    system: ChecklistTemplate[];
  }> {
    const allTemplates = await db.select().from(schema.checklistTemplates);
    
    return {
      default: allTemplates.find(t => t.isDefault) || null,
      personal: allTemplates.filter(t => t.createdById === currentUserId),
      system: allTemplates.filter(t => t.createdById === null && !t.isDefault),
    };
  }

  async createChecklistTemplate(data: InsertChecklistTemplate, currentUserId: string): Promise<ChecklistTemplate> {
    const [template] = await db.insert(schema.checklistTemplates)
      .values({ ...data, createdById: currentUserId })
      .returning();
    
    return template;
  }

  async updateChecklistTemplate(id: string, patch: Partial<InsertChecklistTemplate>, currentUserId: string): Promise<ChecklistTemplate> {
    // Check ownership
    const existing = await this.getChecklistTemplate(id);
    if (!existing) {
      throw new Error("Template not found");
    }
    if (existing.createdById !== currentUserId) {
      throw new Error("Unauthorized: You can only edit your own templates");
    }

    const [updated] = await db.update(schema.checklistTemplates)
      .set(patch)
      .where(eq(schema.checklistTemplates.id, id))
      .returning();

    return updated;
  }

  async deleteChecklistTemplate(id: string, currentUserId: string): Promise<void> {
    // Check ownership
    const existing = await this.getChecklistTemplate(id);
    if (!existing) {
      throw new Error("Template not found");
    }
    if (existing.createdById !== currentUserId) {
      throw new Error("Unauthorized: You can only delete your own templates");
    }

    await db.delete(schema.checklistTemplates)
      .where(eq(schema.checklistTemplates.id, id));
  }

  async setDefaultTemplate(templateId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Unset all defaults
      await tx.update(schema.checklistTemplates)
        .set({ isDefault: false })
        .where(eq(schema.checklistTemplates.isDefault, true));
      
      // Set new default
      await tx.update(schema.checklistTemplates)
        .set({ isDefault: true })
        .where(eq(schema.checklistTemplates.id, templateId));
    });
  }

  async cloneTemplate(templateId: string, currentUserId: string): Promise<ChecklistTemplate> {
    return await db.transaction(async (tx) => {
      // Get original template
      const [original] = await tx.select()
        .from(schema.checklistTemplates)
        .where(eq(schema.checklistTemplates.id, templateId));
      
      if (!original) {
        throw new Error("Template not found");
      }

      // Create cloned template (force personal ownership, not default)
      const [cloned] = await tx.insert(schema.checklistTemplates)
        .values({
          name: `${original.name} (Bản sao)`,
          description: original.description,
          category: original.category,
          createdById: currentUserId,
          isDefault: false,
        })
        .returning();

      // Get original items
      const originalItems = await tx.select()
        .from(schema.checklistTemplateItems)
        .where(eq(schema.checklistTemplateItems.templateId, templateId))
        .orderBy(schema.checklistTemplateItems.order);

      // Clone items
      if (originalItems.length > 0) {
        await tx.insert(schema.checklistTemplateItems)
          .values(originalItems.map(item => ({
            templateId: cloned.id,
            title: item.title,
            order: item.order,
          })));
      }

      return cloned;
    });
  }

  async replaceTemplateItems(templateId: string, items: Array<{ title: string; order: number }>, currentUserId: string): Promise<ChecklistTemplateItem[]> {
    // Check ownership
    const template = await this.getChecklistTemplate(templateId);
    if (!template) {
      throw new Error("Template not found");
    }
    if (template.createdById !== currentUserId) {
      throw new Error("Unauthorized: You can only edit your own templates");
    }

    return await db.transaction(async (tx) => {
      // Delete existing items
      await tx.delete(schema.checklistTemplateItems)
        .where(eq(schema.checklistTemplateItems.templateId, templateId));

      // Insert new items
      if (items.length > 0) {
        return await tx.insert(schema.checklistTemplateItems)
          .values(items.map(item => ({ ...item, templateId })))
          .returning();
      }
      
      return [];
    });
  }

  async getTaskEvaluation(taskId: string, assignmentId: string): Promise<TaskEvaluation | undefined> {
    const [evaluation] = await db.select()
      .from(schema.taskEvaluations)
      .where(and(
        eq(schema.taskEvaluations.taskId, taskId),
        eq(schema.taskEvaluations.assignmentId, assignmentId)
      ));
    return evaluation;
  }

  async getTaskEvaluations(taskId: string): Promise<TaskEvaluation[]> {
    return await db.select()
      .from(schema.taskEvaluations)
      .where(eq(schema.taskEvaluations.taskId, taskId));
  }

  async getUserTaskEvaluations(userId: string): Promise<TaskEvaluation[]> {
    // JOIN with task_assignments to get evaluations for user's assignments
    return await db.select({
      id: schema.taskEvaluations.id,
      taskId: schema.taskEvaluations.taskId,
      assignmentId: schema.taskEvaluations.assignmentId,
      evaluatorId: schema.taskEvaluations.evaluatorId,
      score: schema.taskEvaluations.score,
      comments: schema.taskEvaluations.comments,
      evaluatedAt: schema.taskEvaluations.evaluatedAt,
    })
      .from(schema.taskEvaluations)
      .innerJoin(
        schema.taskAssignments,
        eq(schema.taskEvaluations.assignmentId, schema.taskAssignments.id)
      )
      .where(eq(schema.taskAssignments.userId, userId));
  }

  async upsertTaskEvaluation(evaluation: InsertTaskEvaluation): Promise<TaskEvaluation> {
    const existing = await this.getTaskEvaluation(evaluation.taskId, evaluation.assignmentId);
    
    let result: TaskEvaluation;
    if (existing) {
      const [updated] = await db.update(schema.taskEvaluations)
        .set({
          score: evaluation.score.toString(),
          evaluatorId: evaluation.evaluatorId,
          comments: evaluation.comments || null,
          evaluatedAt: new Date(),
        })
        .where(and(
          eq(schema.taskEvaluations.taskId, evaluation.taskId),
          eq(schema.taskEvaluations.assignmentId, evaluation.assignmentId)
        ))
        .returning();
      result = updated;
    } else {
      const [created] = await db.insert(schema.taskEvaluations)
        .values({
          ...evaluation,
          score: evaluation.score.toString(),
          comments: evaluation.comments || null,
        })
        .returning();
      result = created;
    }
    
    // Auto-sync leadership score to tasks table for backward compatibility
    await this.syncTaskLeadershipScore(evaluation.taskId);
    
    return result;
  }

  async updateDepartmentDeputyDirector(departmentId: string, deputyDirectorId: string | null): Promise<Department | undefined> {
    const [updated] = await db.update(schema.departments)
      .set({ assignedDeputyDirectorId: deputyDirectorId })
      .where(eq(schema.departments.id, departmentId))
      .returning();
    return updated;
  }

  async syncTaskLeadershipScore(taskId: string): Promise<void> {
    const assignments = await this.getTaskAssignments(taskId);
    const chuTriAssignment = assignments.find(a => a.role === "Chủ trì");
    
    if (chuTriAssignment) {
      // Use assignment.id, not userId!
      const evaluation = await this.getTaskEvaluation(taskId, chuTriAssignment.id);
      
      if (evaluation) {
        await db.update(schema.tasks)
          .set({
            leadershipScore: evaluation.score,
            evaluatedById: evaluation.evaluatorId,
            evaluatedAt: evaluation.evaluatedAt,
            updatedAt: new Date(),
          })
          .where(eq(schema.tasks.id, taskId));
      }
    }
  }
}

export const storage = new DbStorage();
