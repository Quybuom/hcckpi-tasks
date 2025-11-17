import { db } from "../server/db";
import * as schema from "../shared/schema";
import { writeFileSync } from "fs";

async function exportDataToSQL() {
  try {
    console.log("🔄 Đang export dữ liệu từ Development database...\n");

    let sql = `-- ================================================
-- SCRIPT IMPORT DỮ LIỆU TEST VÀO PRODUCTION DATABASE
-- Tạo ngày: ${new Date().toLocaleString('vi-VN')}
-- ================================================
-- LƯU Ý: Script này sẽ XÓA tất cả dữ liệu cũ và import dữ liệu test
-- ================================================

-- Bước 1: Xóa dữ liệu cũ (nếu có)
DELETE FROM ai_alerts;
DELETE FROM files;
DELETE FROM task_evaluations;
DELETE FROM checklist_items;
DELETE FROM comments;
DELETE FROM progress_updates;
DELETE FROM task_assignments;
DELETE FROM tasks;
DELETE FROM users;
DELETE FROM departments;

-- Bước 2: Import dữ liệu mới

`;

    // 1. Export Departments
    console.log("📁 Export Departments...");
    const departments = await db.select().from(schema.departments);
    if (departments.length > 0) {
      sql += "\n-- DEPARTMENTS\n";
      for (const dept of departments) {
        sql += `INSERT INTO departments (id, name, code, assigned_deputy_director_id, is_deleted, deleted_at, deleted_by_id, created_at, updated_at) VALUES ('${dept.id}', '${escapeSql(dept.name)}', '${escapeSql(dept.code)}', ${dept.assignedDeputyDirectorId ? `'${dept.assignedDeputyDirectorId}'` : 'NULL'}, ${dept.isDeleted}, ${dept.deletedAt ? `'${formatTimestamp(dept.deletedAt)}'` : 'NULL'}, ${dept.deletedById ? `'${dept.deletedById}'` : 'NULL'}, '${formatTimestamp(dept.createdAt)}', '${formatTimestamp(dept.updatedAt)}');\n`;
      }
    }

    // 2. Export Users
    console.log("👥 Export Users...");
    const users = await db.select().from(schema.users);
    if (users.length > 0) {
      sql += "\n-- USERS\n";
      for (const user of users) {
        sql += `INSERT INTO users (id, username, password, full_name, role, department_id, telegram_id, group_telegram_chat_id, position, is_system_admin, notify_on_new_task, notify_on_deadline, notify_on_comment, notify_on_scheduled_ai_suggestions, notify_on_scheduled_ai_alerts, notify_on_scheduled_weekly_kpi, notify_on_scheduled_monthly_kpi, is_deleted, deleted_at, deleted_by_id, created_at, updated_at) VALUES ('${user.id}', '${escapeSql(user.username)}', '${escapeSql(user.password)}', '${escapeSql(user.fullName)}', '${escapeSql(user.role)}', ${user.departmentId ? `'${user.departmentId}'` : 'NULL'}, ${user.telegramId ? `'${escapeSql(user.telegramId)}'` : 'NULL'}, ${user.groupTelegramChatId ? `'${escapeSql(user.groupTelegramChatId)}'` : 'NULL'}, ${user.position ? `'${escapeSql(user.position)}'` : 'NULL'}, ${user.isSystemAdmin}, ${user.notifyOnNewTask}, ${user.notifyOnDeadline}, ${user.notifyOnComment}, ${user.notifyOnScheduledAISuggestions}, ${user.notifyOnScheduledAIAlerts}, ${user.notifyOnScheduledWeeklyKPI}, ${user.notifyOnScheduledMonthlyKPI}, ${user.isDeleted}, ${user.deletedAt ? `'${formatTimestamp(user.deletedAt)}'` : 'NULL'}, ${user.deletedById ? `'${user.deletedById}'` : 'NULL'}, '${formatTimestamp(user.createdAt)}', '${formatTimestamp(user.updatedAt)}');\n`;
      }
    }

    // 3. Export Tasks
    console.log("📋 Export Tasks...");
    const allTasks = await db.select().from(schema.tasks);
    if (allTasks.length > 0) {
      sql += "\n-- TASKS\n";
      sql += "-- Insert parent tasks trước (không có parent_task_id)\n";
      const parentTasks = allTasks.filter(t => !t.parentTaskId);
      for (const task of parentTasks) {
        sql += `INSERT INTO tasks (id, task_number, title, description, deadline, priority, status, progress, created_by_id, department_id, parent_task_id, completed_at, leadership_score, evaluated_by_id, evaluated_at, is_deleted, deleted_at, deleted_by_id, created_at, updated_at) VALUES ('${task.id}', ${task.taskNumber ? `'${escapeSql(task.taskNumber)}'` : 'NULL'}, '${escapeSql(task.title)}', ${task.description ? `'${escapeSql(task.description)}'` : 'NULL'}, '${formatTimestamp(task.deadline)}', '${task.priority}', '${task.status}', ${task.progress}, '${task.createdById}', ${task.departmentId ? `'${task.departmentId}'` : 'NULL'}, NULL, ${task.completedAt ? `'${formatTimestamp(task.completedAt)}'` : 'NULL'}, ${task.leadershipScore || 'NULL'}, ${task.evaluatedById ? `'${task.evaluatedById}'` : 'NULL'}, ${task.evaluatedAt ? `'${formatTimestamp(task.evaluatedAt)}'` : 'NULL'}, ${task.isDeleted}, ${task.deletedAt ? `'${formatTimestamp(task.deletedAt)}'` : 'NULL'}, ${task.deletedById ? `'${task.deletedById}'` : 'NULL'}, '${formatTimestamp(task.createdAt)}', '${formatTimestamp(task.updatedAt)}');\n`;
      }
      
      sql += "\n-- Insert subtasks sau (có parent_task_id)\n";
      const subTasks = allTasks.filter(t => t.parentTaskId);
      for (const task of subTasks) {
        sql += `INSERT INTO tasks (id, task_number, title, description, deadline, priority, status, progress, created_by_id, department_id, parent_task_id, completed_at, leadership_score, evaluated_by_id, evaluated_at, is_deleted, deleted_at, deleted_by_id, created_at, updated_at) VALUES ('${task.id}', ${task.taskNumber ? `'${escapeSql(task.taskNumber)}'` : 'NULL'}, '${escapeSql(task.title)}', ${task.description ? `'${escapeSql(task.description)}'` : 'NULL'}, '${formatTimestamp(task.deadline)}', '${task.priority}', '${task.status}', ${task.progress}, '${task.createdById}', ${task.departmentId ? `'${task.departmentId}'` : 'NULL'}, '${task.parentTaskId}', ${task.completedAt ? `'${formatTimestamp(task.completedAt)}'` : 'NULL'}, ${task.leadershipScore || 'NULL'}, ${task.evaluatedById ? `'${task.evaluatedById}'` : 'NULL'}, ${task.evaluatedAt ? `'${formatTimestamp(task.evaluatedAt)}'` : 'NULL'}, ${task.isDeleted}, ${task.deletedAt ? `'${formatTimestamp(task.deletedAt)}'` : 'NULL'}, ${task.deletedById ? `'${task.deletedById}'` : 'NULL'}, '${formatTimestamp(task.createdAt)}', '${formatTimestamp(task.updatedAt)}');\n`;
      }
    }

    // 4. Export Task Assignments
    console.log("👤 Export Task Assignments...");
    const assignments = await db.select().from(schema.taskAssignments);
    if (assignments.length > 0) {
      sql += "\n-- TASK ASSIGNMENTS\n";
      for (const assignment of assignments) {
        sql += `INSERT INTO task_assignments (id, task_id, user_id, role, collaboration_completed, created_at) VALUES ('${assignment.id}', '${assignment.taskId}', '${assignment.userId}', '${escapeSql(assignment.role)}', ${assignment.collaborationCompleted}, '${formatTimestamp(assignment.createdAt)}');\n`;
      }
    }

    // 5. Export Task Evaluations
    console.log("⭐ Export Task Evaluations...");
    const taskEvaluations = await db.select().from(schema.taskEvaluations);
    if (taskEvaluations.length > 0) {
      sql += "\n-- TASK EVALUATIONS\n";
      for (const evaluation of taskEvaluations) {
        sql += `INSERT INTO task_evaluations (id, task_id, assignment_id, evaluator_id, score, comments, evaluated_at) VALUES ('${evaluation.id}', '${evaluation.taskId}', '${evaluation.assignmentId}', '${evaluation.evaluatorId}', ${evaluation.score}, ${evaluation.comments ? `'${escapeSql(evaluation.comments)}'` : 'NULL'}, '${formatTimestamp(evaluation.evaluatedAt)}');\n`;
      }
    }

    // 6. Export Progress Updates
    console.log("📊 Export Progress Updates...");
    const progressUpdates = await db.select().from(schema.progressUpdates);
    if (progressUpdates.length > 0) {
      sql += "\n-- PROGRESS UPDATES\n";
      for (const update of progressUpdates) {
        sql += `INSERT INTO progress_updates (id, task_id, user_id, update_type, content, progress_percent, created_at) VALUES ('${update.id}', '${update.taskId}', '${update.userId}', '${escapeSql(update.updateType)}', ${update.content ? `'${escapeSql(update.content)}'` : 'NULL'}, ${update.progressPercent || 'NULL'}, '${formatTimestamp(update.createdAt)}');\n`;
      }
    }

    // 7. Export Comments
    console.log("💬 Export Comments...");
    const comments = await db.select().from(schema.comments);
    if (comments.length > 0) {
      sql += "\n-- COMMENTS\n";
      for (const comment of comments) {
        sql += `INSERT INTO comments (id, task_id, user_id, content, created_at) VALUES ('${comment.id}', '${comment.taskId}', '${comment.userId}', '${escapeSql(comment.content)}', '${formatTimestamp(comment.createdAt)}');\n`;
      }
    }

    // 8. Export Checklist Items
    console.log("✅ Export Checklist Items...");
    const checklistItems = await db.select().from(schema.checklistItems);
    if (checklistItems.length > 0) {
      sql += "\n-- CHECKLIST ITEMS\n";
      for (const item of checklistItems) {
        sql += `INSERT INTO checklist_items (id, task_id, title, completed, "order", created_at) VALUES ('${item.id}', '${item.taskId}', '${escapeSql(item.title)}', ${item.completed}, ${item.order}, '${formatTimestamp(item.createdAt)}');\n`;
      }
    }

    // 9. Export Files
    console.log("📎 Export Files...");
    const files = await db.select().from(schema.files);
    if (files.length > 0) {
      sql += "\n-- FILES\n";
      for (const file of files) {
        sql += `INSERT INTO files (id, task_id, user_id, filename, original_name, file_size, mime_type, uploaded_at) VALUES ('${file.id}', '${file.taskId}', '${file.userId}', '${escapeSql(file.filename)}', '${escapeSql(file.originalName)}', ${file.fileSize}, '${escapeSql(file.mimeType)}', '${formatTimestamp(file.uploadedAt)}');\n`;
      }
    }

    // 10. Export AI Alerts (if any)
    console.log("🤖 Export AI Alerts...");
    const aiAlerts = await db.select().from(schema.aiAlerts);
    if (aiAlerts.length > 0) {
      sql += "\n-- AI ALERTS\n";
      for (const alert of aiAlerts) {
        sql += `INSERT INTO ai_alerts (id, task_id, user_id, type, reason, suggestion, status, created_at) VALUES ('${alert.id}', '${alert.taskId}', '${alert.userId}', '${escapeSql(alert.type)}', '${escapeSql(alert.reason)}', ${alert.suggestion ? `'${escapeSql(alert.suggestion)}'` : 'NULL'}, '${alert.status}', '${formatTimestamp(alert.createdAt)}');\n`;
      }
    }

    sql += `\n-- ================================================
-- HOÀN THÀNH!
-- ================================================
-- Tổng số bản ghi:
-- - Departments: ${departments.length}
-- - Users: ${users.length}
-- - Tasks: ${allTasks.length}
-- - Task Assignments: ${assignments.length}
-- - Task Evaluations: ${taskEvaluations.length}
-- - Progress Updates: ${progressUpdates.length}
-- - Comments: ${comments.length}
-- - Checklist Items: ${checklistItems.length}
-- - Files: ${files.length}
-- - AI Alerts: ${aiAlerts.length}
-- ================================================
`;

    // Save to file (in root directory)
    const filename = '../production-data-import.sql';
    const displayFilename = 'production-data-import.sql';
    writeFileSync(filename, sql, 'utf-8');

    console.log("\n✅ EXPORT THÀNH CÔNG!");
    console.log("==========================================");
    console.log(`📄 File: ${displayFilename}`);
    console.log(`📊 Thống kê:`);
    console.log(`   - Departments: ${departments.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Tasks: ${allTasks.length}`);
    console.log(`   - Task Assignments: ${assignments.length}`);
    console.log(`   - Task Evaluations: ${taskEvaluations.length}`);
    console.log(`   - Progress Updates: ${progressUpdates.length}`);
    console.log(`   - Comments: ${comments.length}`);
    console.log(`   - Checklist Items: ${checklistItems.length}`);
    console.log(`   - Files: ${files.length}`);
    console.log(`   - AI Alerts: ${aiAlerts.length}`);
    console.log("==========================================");
    console.log("\n📋 HƯỚNG DẪN IMPORT VÀO PRODUCTION:");
    console.log("1. Mở Replit Database Console");
    console.log("2. Chuyển sang Production database");
    console.log("3. Vào My Data > SQL runner");
    console.log("4. Copy toàn bộ nội dung file production-data-import.sql");
    console.log("5. Paste vào SQL runner và click Run");
    console.log("\n⚠️  LƯU Ý: Script này sẽ XÓA tất cả dữ liệu hiện tại trong Production!");
    
  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    process.exit(0);
  }
}

// Escape single quotes in SQL strings
function escapeSql(str: string): string {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

// Format timestamp for PostgreSQL
function formatTimestamp(date: Date): string {
  return date.toISOString();
}

exportDataToSQL();
