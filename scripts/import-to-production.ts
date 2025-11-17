import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../shared/schema';

async function importToProduction() {
  console.log('🚀 BẮT ĐẦU IMPORT DỮ LIỆU VÀO PRODUCTION DATABASE');
  console.log('================================================\n');

  // Connect to Development database (source)
  const devConnectionString = process.env.DATABASE_URL!;
  const devClient = postgres(devConnectionString);
  const devDb = drizzle(devClient, { schema });

  // Connect to Production database (target)
  const prodConnectionString = process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;
  
  if (!prodConnectionString) {
    console.error('❌ Lỗi: Không tìm thấy DATABASE_URL_PROD');
    console.error('Vui lòng set biến môi trường DATABASE_URL_PROD');
    process.exit(1);
  }

  const prodClient = postgres(prodConnectionString);
  const prodDb = drizzle(prodClient, { schema });

  try {
    console.log('📊 Đang đếm số lượng dữ liệu từ Development...');
    
    // Count records in development
    const [departments, users, tasks, assignments, evaluations, checklistItems, aiAlerts] = await Promise.all([
      devDb.select().from(schema.departments),
      devDb.select().from(schema.users),
      devDb.select().from(schema.tasks),
      devDb.select().from(schema.taskAssignments),
      devDb.select().from(schema.taskEvaluations),
      devDb.select().from(schema.checklistItems),
      devDb.select().from(schema.aiAlerts),
    ]);

    console.log('\n📈 Tổng số bản ghi sẽ import:');
    console.log(`   - Departments: ${departments.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Tasks: ${tasks.length}`);
    console.log(`   - Task Assignments: ${assignments.length}`);
    console.log(`   - Task Evaluations: ${evaluations.length}`);
    console.log(`   - Checklist Items: ${checklistItems.length}`);
    console.log(`   - AI Alerts: ${aiAlerts.length}`);
    console.log('');

    // Execute migration in a transaction
    await prodDb.transaction(async (tx) => {
      console.log('🗑️  Bước 1: Xóa dữ liệu cũ trong Production...');
      
      // Truncate all tables (CASCADE to handle foreign keys)
      await tx.execute(sql`TRUNCATE ai_alerts, files, task_evaluations, checklist_items, comments, progress_updates, task_assignments, tasks, users, departments RESTART IDENTITY CASCADE`);
      
      console.log('✅ Đã xóa dữ liệu cũ\n');

      // Import data in correct order
      console.log('📥 Bước 2: Import dữ liệu mới...');
      
      if (departments.length > 0) {
        console.log(`   → Import ${departments.length} departments...`);
        await tx.insert(schema.departments).values(departments);
      }

      if (users.length > 0) {
        console.log(`   → Import ${users.length} users...`);
        await tx.insert(schema.users).values(users);
      }

      if (tasks.length > 0) {
        // Separate parent tasks and subtasks
        const parentTasks = tasks.filter(t => !t.parentTaskId);
        const subTasks = tasks.filter(t => t.parentTaskId);
        
        console.log(`   → Import ${parentTasks.length} parent tasks...`);
        if (parentTasks.length > 0) {
          await tx.insert(schema.tasks).values(parentTasks);
        }
        
        console.log(`   → Import ${subTasks.length} subtasks...`);
        if (subTasks.length > 0) {
          await tx.insert(schema.tasks).values(subTasks);
        }
      }

      if (assignments.length > 0) {
        console.log(`   → Import ${assignments.length} task assignments...`);
        await tx.insert(schema.taskAssignments).values(assignments);
      }

      if (evaluations.length > 0) {
        console.log(`   → Import ${evaluations.length} task evaluations...`);
        await tx.insert(schema.taskEvaluations).values(evaluations);
      }

      if (checklistItems.length > 0) {
        console.log(`   → Import ${checklistItems.length} checklist items...`);
        await tx.insert(schema.checklistItems).values(checklistItems);
      }

      if (aiAlerts.length > 0) {
        console.log(`   → Import ${aiAlerts.length} AI alerts...`);
        await tx.insert(schema.aiAlerts).values(aiAlerts);
      }

      console.log('\n✅ Hoàn thành import dữ liệu!');
    });

    // Verify counts in production
    console.log('\n🔍 Bước 3: Xác nhận dữ liệu trong Production...');
    const [prodDepts, prodUsers, prodTasks] = await Promise.all([
      prodDb.select().from(schema.departments),
      prodDb.select().from(schema.users),
      prodDb.select().from(schema.tasks),
    ]);

    console.log(`   - Departments: ${prodDepts.length} ✓`);
    console.log(`   - Users: ${prodUsers.length} ✓`);
    console.log(`   - Tasks: ${prodTasks.length} ✓`);

    console.log('\n🎉 IMPORT THÀNH CÔNG!');
    console.log('================================================');
    console.log('Production database đã sẵn sàng với dữ liệu test!');
    console.log('\n📝 Tài khoản đăng nhập:');
    console.log('   - Username: namnn842, Password: 123456 (Giám đốc)');
    console.log('   - Username: sysadmin, Password: Admin@2025 (System Admin)');
    console.log('================================================\n');

  } catch (error) {
    console.error('❌ LỖI KHI IMPORT:', error);
    throw error;
  } finally {
    await devClient.end();
    await prodClient.end();
  }
}

// Run the import
importToProduction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Import thất bại:', error);
    process.exit(1);
  });
