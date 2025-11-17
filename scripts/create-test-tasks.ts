import { db } from "../server/db";
import { tasks, taskAssignments } from "../shared/schema";
import { sql } from "drizzle-orm";

interface Department {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
  role: string;
  department_id: string;
}

const departments: Department[] = [
  { id: "feea9c9d-3625-44db-8266-60d3626882d1", name: "Phòng Hành chính - Tổng hợp" },
  { id: "fe3ac6f0-c7b5-425a-b7fe-175d88c6bfda", name: "Phòng Kiểm soát thủ tục hành chính" },
  { id: "9c7b4c9f-5724-4063-8577-d113bc24a8f9", name: "Phòng Tiếp nhận và Trả kết quả giải quyết TTHC" },
  { id: "dda4e1f8-cd63-4dfc-9fa4-c50dee67241f", name: "Phòng Ứng dụng CNTT và hỗ trợ nghiệp vụ" },
];

const departmentUsers: Record<string, User[]> = {
  "feea9c9d-3625-44db-8266-60d3626882d1": [
    { id: "3b6b2457-85c9-4429-8491-02b217c404ab", full_name: "Đặng Huy Hoàng", role: "Trưởng phòng", department_id: "feea9c9d-3625-44db-8266-60d3626882d1" },
    { id: "f873f37f-3255-4c83-8e80-42570fc8db27", full_name: "Đặng Gia Hiệp", role: "Chuyên viên", department_id: "feea9c9d-3625-44db-8266-60d3626882d1" },
    { id: "48d9bbf3-60a5-4a57-a1b5-778815680d98", full_name: "Trần Quang Nghĩa", role: "Chuyên viên", department_id: "feea9c9d-3625-44db-8266-60d3626882d1" },
  ],
  "fe3ac6f0-c7b5-425a-b7fe-175d88c6bfda": [
    { id: "d6940620-d4b5-4e86-942d-b10a86fe82a6", full_name: "Nguyễn Thị Kim Thoa", role: "Trưởng phòng", department_id: "fe3ac6f0-c7b5-425a-b7fe-175d88c6bfda" },
    { id: "d137709e-5408-41c5-980e-29e6ce5e16a4", full_name: "Nguyễn Thị Diệu", role: "Chuyên viên", department_id: "fe3ac6f0-c7b5-425a-b7fe-175d88c6bfda" },
    { id: "fb0bf2de-2296-494c-bd31-77ca951ca9f9", full_name: "Đàm Thị Hiếu Hạnh", role: "Chuyên viên", department_id: "fe3ac6f0-c7b5-425a-b7fe-175d88c6bfda" },
  ],
  "9c7b4c9f-5724-4063-8577-d113bc24a8f9": [
    { id: "86e6ed19-b3e9-432b-853c-c440508d08a7", full_name: "Liểu Ngọc Tùng", role: "Trưởng phòng", department_id: "9c7b4c9f-5724-4063-8577-d113bc24a8f9" },
    { id: "e85cbace-2e0d-457f-86ad-fc7d49f4edb5", full_name: "Hoàng Văn Lâm", role: "Chuyên viên", department_id: "9c7b4c9f-5724-4063-8577-d113bc24a8f9" },
    { id: "87a686bc-96ac-4d35-a48a-6c36941c6c02", full_name: "Nguyễn Trung Hiếu", role: "Chuyên viên", department_id: "9c7b4c9f-5724-4063-8577-d113bc24a8f9" },
  ],
  "dda4e1f8-cd63-4dfc-9fa4-c50dee67241f": [
    { id: "668ee7c6-3dda-4258-a628-73b6ef990fc7", full_name: "Phạm Anh Minh", role: "Trưởng phòng", department_id: "dda4e1f8-cd63-4dfc-9fa4-c50dee67241f" },
    { id: "bf460f43-0ad9-4e58-8d30-facb712da775", full_name: "Chu Thị Lợi", role: "Phó trưởng phòng", department_id: "dda4e1f8-cd63-4dfc-9fa4-c50dee67241f" },
    { id: "1f890646-c5a4-41c3-b607-2ce85e0d1b05", full_name: "Nguyễn Thị Ngọc Anh", role: "Chuyên viên", department_id: "dda4e1f8-cd63-4dfc-9fa4-c50dee67241f" },
  ],
};

const taskTemplates = [
  {
    title: "Cập nhật quy trình xử lý hồ sơ",
    description: "Rà soát và cập nhật quy trình xử lý hồ sơ theo quy định mới",
    priority: "Quan trọng" as const,
    daysFromNow: 15,
  },
  {
    title: "Kiểm tra và bảo trì hệ thống",
    description: "Thực hiện kiểm tra định kỳ và bảo trì hệ thống thông tin",
    priority: "Bình thường" as const,
    daysFromNow: 20,
  },
  {
    title: "Báo cáo tháng",
    description: "Tổng hợp số liệu và lập báo cáo kết quả hoạt động tháng",
    priority: "Khẩn cấp" as const,
    daysFromNow: 5,
  },
];

async function createTestTasks() {
  console.log("🚀 Bắt đầu tạo nhiệm vụ test cho các phòng ban...\n");
  
  let totalCreated = 0;
  
  for (const dept of departments) {
    console.log(`\n📁 ${dept.name}`);
    const users = departmentUsers[dept.id];
    
    if (!users || users.length === 0) {
      console.log("  ⚠️ Không có users, bỏ qua");
      continue;
    }
    
    const deptHead = users.find(u => u.role === "Trưởng phòng") || users[0];
    const staff = users.filter(u => u.role === "Chuyên viên");
    
    for (const template of taskTemplates) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + template.daysFromNow);
      deadline.setHours(23, 59, 59, 999);
      
      try {
        // Create task
        const [task] = await db.insert(tasks).values({
          title: `${template.title} - ${dept.name}`,
          description: template.description,
          deadline,
          priority: template.priority,
          status: "Chưa bắt đầu",
          progress: 0,
          departmentId: dept.id,
          createdById: deptHead.id,
        }).returning();
        
        // Assign department head as "Chủ trì"
        await db.insert(taskAssignments).values({
          taskId: task.id,
          userId: deptHead.id,
          role: "Chủ trì",
        });
        
        // Assign 1-2 staff as "Phối hợp"
        const assignedStaff = staff.slice(0, Math.min(2, staff.length));
        for (const staffMember of assignedStaff) {
          await db.insert(taskAssignments).values({
            taskId: task.id,
            userId: staffMember.id,
            role: "Phối hợp",
          });
        }
        
        totalCreated++;
        console.log(`  ✅ ${task.taskNumber}: ${template.title}`);
        console.log(`     - Chủ trì: ${deptHead.full_name}`);
        console.log(`     - Phối hợp: ${assignedStaff.map(s => s.full_name).join(", ")}`);
        console.log(`     - Ưu tiên: ${template.priority}, Deadline: ${deadline.toLocaleDateString("vi-VN")}`);
        
      } catch (error) {
        console.error(`  ❌ Lỗi khi tạo: ${template.title}`, error);
      }
    }
  }
  
  console.log(`\n\n✨ Hoàn thành! Đã tạo ${totalCreated} nhiệm vụ test.`);
}

createTestTasks()
  .then(() => {
    console.log("\n✅ Script hoàn thành!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Lỗi:", error);
    process.exit(1);
  });
