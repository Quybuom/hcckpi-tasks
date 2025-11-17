import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { tasks } from "../shared/schema";

/**
 * Script to create task_number_seq sequence in production database
 * Automatically calculates the starting value based on existing tasks
 * 
 * Usage:
 *   DATABASE_URL_PROD=<your_production_db_url> tsx scripts/create-task-sequence.ts
 */

async function createTaskSequence() {
  console.log("🔧 Creating task_number_seq sequence...\n");

  const targetDbUrl = process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;
  
  if (!targetDbUrl) {
    console.error("❌ Error: DATABASE_URL_PROD or DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log(`📦 Target database: ${targetDbUrl.substring(0, 30)}...\n`);

  try {
    // 1. Check if sequence already exists
    console.log("1️⃣  Checking if sequence exists...");
    try {
      const result = await db.execute<{ last_value: number }>(sql`
        SELECT last_value FROM task_number_seq
      `);
      
      if (result.length > 0) {
        console.log(`   ✅ Sequence already exists with last_value: ${result[0].last_value}`);
        console.log("   ℹ️  No action needed. Sequence is ready to use.");
        process.exit(0);
      }
    } catch (error: any) {
      if (error.message?.includes("does not exist")) {
        console.log("   ℹ️  Sequence does not exist. Will create it.");
      } else {
        throw error;
      }
    }

    // 2. Get the highest task number from existing tasks
    console.log("\n2️⃣  Analyzing existing tasks...");
    const allTasks = await db.select().from(tasks);
    console.log(`   Found ${allTasks.length} tasks in database`);

    // Extract task numbers and find the highest
    let maxTaskNumber = 0;
    const currentYear = new Date().getFullYear().toString().slice(-2);
    
    for (const task of allTasks) {
      if (task.taskNumber) {
        // Format: #25-001, #25-002, etc.
        const match = task.taskNumber.match(/#(\d{2})-(\d{3})/);
        if (match) {
          const year = match[1];
          const number = parseInt(match[2], 10);
          
          // Only consider tasks from current year
          if (year === currentYear) {
            maxTaskNumber = Math.max(maxTaskNumber, number);
          }
        }
      }
    }

    const startValue = maxTaskNumber + 1;
    console.log(`   📊 Highest task number for ${currentYear}: ${maxTaskNumber}`);
    console.log(`   🎯 Sequence will start at: ${startValue}`);
    console.log(`   → Next task will be: #${currentYear}-${String(startValue).padStart(3, '0')}`);

    // 3. Create the sequence
    console.log("\n3️⃣  Creating sequence...");
    await db.execute(sql`
      CREATE SEQUENCE IF NOT EXISTS task_number_seq START WITH ${sql.raw(startValue.toString())}
    `);
    
    console.log("   ✅ Sequence created successfully!");

    // 4. Verify the sequence
    console.log("\n4️⃣  Verifying sequence...");
    const verifyResult = await db.execute<{ last_value: number; is_called: boolean }>(sql`
      SELECT last_value, is_called FROM task_number_seq
    `);
    
    if (verifyResult.length > 0) {
      const { last_value, is_called } = verifyResult[0];
      console.log(`   ✅ Verification successful!`);
      console.log(`   - Current value: ${last_value}`);
      console.log(`   - Is called: ${is_called}`);
      console.log(`   - Next task number: #${currentYear}-${String(last_value + (is_called ? 1 : 0)).padStart(3, '0')}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 SUCCESS! Task sequence is ready!");
    console.log("=".repeat(60));
    console.log("\n💡 You can now create tasks on production without errors.");
    console.log("   Try creating a new task at: https://hcckpi-tasks.replit.app/\n");

  } catch (error) {
    console.error("\n❌ Error creating sequence:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

createTaskSequence();
