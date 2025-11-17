import { db } from "../server/db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function createSystemAdmin() {
  try {
    const username = "sysadmin";
    const password = "Admin@2025"; // Mật khẩu mạnh
    const fullName = "System Administrator";
    
    // Check if system admin already exists
    const existingAdmin = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);
    
    if (existingAdmin.length > 0) {
      console.log("❌ System admin đã tồn tại!");
      console.log("Username:", username);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create system admin
    const [admin] = await db
      .insert(schema.users)
      .values({
        username,
        password: hashedPassword,
        fullName,
        role: "Giám đốc", // Quyền cao nhất
        isSystemAdmin: true, // Đánh dấu là system admin (ẩn)
        departmentId: null, // Không thuộc phòng ban nào
        notifyOnNewTask: false,
        notifyOnDeadline: false,
        notifyOnComment: false,
      })
      .returning();
    
    console.log("\n✅ TẠO TÀI KHOẢN SYSTEM ADMIN THÀNH CÔNG!");
    console.log("==========================================");
    console.log("Username:", username);
    console.log("Password:", password);
    console.log("Họ tên:", fullName);
    console.log("Vai trò:", "Director (Quyền cao nhất)");
    console.log("Phòng ban: Không thuộc phòng ban nào");
    console.log("Ẩn khỏi danh sách: Có");
    console.log("==========================================");
    console.log("\n⚠️  LƯU Ý QUAN TRỌNG:");
    console.log("1. Tài khoản này KHÔNG HIỂN THỊ trong danh sách người dùng");
    console.log("2. Có quyền hạn như Giám đốc (xem tất cả, quản lý tất cả)");
    console.log("3. Không thuộc phòng ban nào");
    console.log("4. Chỉ dùng để quản trị hệ thống");
    console.log("5. VUI LÒNG LƯU MẬT KHẨU AN TOÀN!");
    console.log("\nID:", admin.id);
    
  } catch (error) {
    console.error("❌ Lỗi khi tạo system admin:", error);
  } finally {
    process.exit(0);
  }
}

createSystemAdmin();
