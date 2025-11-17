import { db } from "../server/db";
import { checklistTemplates, departments, users, tasks } from "../shared/schema";
import { sql } from "drizzle-orm";
/**
 * Script to diagnose production database issues
 * Checks for:
 * 1. Checklist templates (default and system)
 * 2. Task numbering sequence
 * 3. Departments
 * 4. Users
 * 
 * Usage:
 *   DATABASE_URL_PROD=<your_production_db_url> tsx scripts/diagnose-production.ts
 */

async function diagnoseProduction() {
  console.log("🔍 Diagnosing production database...\n");

  const targetDbUrl = process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;
  
  if (!targetDbUrl) {
    console.error("❌ Error: DATABASE_URL_PROD or DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log(`📦 Target database: ${targetDbUrl.substring(0, 30)}...\n`);

  try {
    // 1. Check checklist templates
    console.log("1️⃣  Checking Checklist Templates:");
    console.log("   " + "=".repeat(50));
    
    const templates = await db.select().from(checklistTemplates);
    console.log(`   Total templates: ${templates.length}`);
    
    if (templates.length === 0) {
      console.log("   ❌ NO TEMPLATES FOUND - This explains why dropdown is empty!");
      console.log("   💡 Solution: Run 'tsx scripts/seed-default-templates.ts'");
    } else {
      const defaultTemplate = templates.find(t => t.isDefault);
      const systemTemplates = templates.filter(t => t.createdById === null);
      const userTemplates = templates.filter(t => t.createdById !== null);
      
      console.log(`   - Default template: ${defaultTemplate ? '✅ ' + defaultTemplate.name : '❌ None'}`);
      console.log(`   - System templates: ${systemTemplates.length}`);
      console.log(`   - User templates: ${userTemplates.length}`);
      
      if (!defaultTemplate) {
        console.log("   ⚠️  No default template set - Users won't see pre-selected template");
      }
      
      if (templates.length > 0) {
        console.log("\n   Template list:");
        templates.forEach((t, i) => {
          const badge = t.isDefault ? "[DEFAULT]" : t.createdById === null ? "[SYSTEM]" : "[USER]";
          console.log(`   ${i + 1}. ${badge} ${t.name} (Category: ${t.category})`);
        });
      }
    }

    // 2. Check task numbering sequence
    console.log("\n2️⃣  Checking Task Numbering Sequence:");
    console.log("   " + "=".repeat(50));
    
    try {
      const result = await db.execute<{ last_value: number; is_called: boolean }>(sql`
        SELECT last_value, is_called 
        FROM task_number_seq
      `);
      
      if (result.length > 0) {
        const row = result[0];
        console.log(`   ✅ Sequence exists`);
        console.log(`   - Last value: ${row.last_value}`);
        console.log(`   - Is called: ${row.is_called}`);
        console.log(`   - Next task number: #${new Date().getFullYear().toString().slice(-2)}-${String(row.last_value + 1).padStart(3, '0')}`);
      }
    } catch (seqError: any) {
      if (seqError.message?.includes("does not exist")) {
        console.log("   ❌ SEQUENCE DOES NOT EXIST - Tasks cannot be created!");
        console.log("   💡 Solution: Run the following SQL:");
        console.log("      CREATE SEQUENCE IF NOT EXISTS task_number_seq START WITH 1;");
      } else {
        console.log(`   ⚠️  Error checking sequence: ${seqError.message}`);
      }
    }

    // 3. Check departments
    console.log("\n3️⃣  Checking Departments:");
    console.log("   " + "=".repeat(50));
    
    const depts = await db.select().from(departments);
    console.log(`   Total departments: ${depts.length}`);
    
    if (depts.length === 0) {
      console.log("   ❌ NO DEPARTMENTS FOUND - Users cannot create tasks!");
      console.log("   💡 Solution: Create departments via admin panel or import data");
    } else {
      console.log("\n   Department list:");
      depts.forEach((d, i) => {
        console.log(`   ${i + 1}. ${d.name} (Code: ${d.code})`);
      });
    }

    // 4. Check users
    console.log("\n4️⃣  Checking Users:");
    console.log("   " + "=".repeat(50));
    
    const allUsers = await db.select().from(users);
    console.log(`   Total users: ${allUsers.length}`);
    
    if (allUsers.length === 0) {
      console.log("   ❌ NO USERS FOUND - Cannot login!");
      console.log("   💡 Solution: Import users via 'tsx scripts/import-to-production.ts'");
    } else {
      const usersByRole = allUsers.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log("\n   Users by role:");
      Object.entries(usersByRole).forEach(([role, count]) => {
        console.log(`   - ${role}: ${count}`);
      });
      
      const systemAdmin = allUsers.find(u => u.isSystemAdmin);
      if (systemAdmin) {
        console.log(`\n   ✅ System admin exists: ${systemAdmin.username}`);
      } else {
        console.log("\n   ⚠️  No system admin found");
      }
    }

    // 5. Check tasks
    console.log("\n5️⃣  Checking Tasks:");
    console.log("   " + "=".repeat(50));
    
    const allTasks = await db.select().from(tasks);
    const activeTasks = allTasks.filter(t => !t.isDeleted);
    console.log(`   Total tasks: ${allTasks.length} (Active: ${activeTasks.length}, Deleted: ${allTasks.length - activeTasks.length})`);
    
    if (activeTasks.length > 0) {
      const tasksByStatus = activeTasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log("\n   Tasks by status:");
      Object.entries(tasksByStatus).forEach(([status, count]) => {
        console.log(`   - ${status}: ${count}`);
      });
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📋 DIAGNOSIS SUMMARY");
    console.log("=".repeat(60));
    
    const issues: string[] = [];
    
    if (templates.length === 0) {
      issues.push("❌ No checklist templates - run 'tsx scripts/seed-default-templates.ts'");
    }
    
    if (depts.length === 0) {
      issues.push("❌ No departments - import data or create via admin panel");
    }
    
    if (allUsers.length === 0) {
      issues.push("❌ No users - run 'tsx scripts/import-to-production.ts'");
    }
    
    if (issues.length === 0) {
      console.log("✅ All checks passed! Database appears healthy.");
    } else {
      console.log("⚠️  Issues found:");
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
    }

  } catch (error) {
    console.error("\n❌ Error during diagnosis:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

diagnoseProduction();
