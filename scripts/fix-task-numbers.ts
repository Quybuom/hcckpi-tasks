import { db } from "../server/db";
import { tasks, taskSequences } from "../shared/schema";
import { eq, isNull } from "drizzle-orm";

async function fixTaskNumbers() {
  console.log("🔧 Đang cập nhật task numbers cho các nhiệm vụ...\n");
  
  // Get all tasks without task numbers
  const tasksWithoutNumbers = await db
    .select()
    .from(tasks)
    .where(isNull(tasks.taskNumber));
  
  if (tasksWithoutNumbers.length === 0) {
    console.log("✅ Tất cả tasks đều đã có task numbers!");
    return;
  }
  
  console.log(`📋 Tìm thấy ${tasksWithoutNumbers.length} tasks cần cập nhật\n`);
  
  const currentYear = new Date().getFullYear();
  const yearSuffix = currentYear.toString().slice(-2);
  
  // Get current sequence
  let [sequence] = await db
    .select()
    .from(taskSequences)
    .where(eq(taskSequences.year, currentYear));
  
  if (!sequence) {
    // Create sequence if not exists
    [sequence] = await db
      .insert(taskSequences)
      .values({
        year: currentYear,
        lastSequence: 0,
        updatedAt: new Date(),
      })
      .returning();
  }
  
  let nextSequence = sequence.lastSequence;
  
  // Update each task
  for (const task of tasksWithoutNumbers) {
    nextSequence++;
    const taskNumber = `#${yearSuffix}-${nextSequence.toString().padStart(3, '0')}`;
    
    await db
      .update(tasks)
      .set({ taskNumber })
      .where(eq(tasks.id, task.id));
    
    console.log(`✅ ${taskNumber}: ${task.title}`);
  }
  
  // Update sequence
  await db
    .update(taskSequences)
    .set({
      lastSequence: nextSequence,
      updatedAt: new Date(),
    })
    .where(eq(taskSequences.year, currentYear));
  
  console.log(`\n✨ Hoàn thành! Đã cập nhật ${tasksWithoutNumbers.length} task numbers.`);
  console.log(`📊 Sequence hiện tại: ${nextSequence}`);
}

fixTaskNumbers()
  .then(() => {
    console.log("\n✅ Script hoàn thành!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Lỗi:", error);
    process.exit(1);
  });
