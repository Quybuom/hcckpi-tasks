import { storage } from "./storage";
import { hashPassword } from "./auth";
import { db } from "./db";
import * as schema from "@shared/schema";

async function seed() {
  try {
    console.log("🌱 Bắt đầu seed dữ liệu...");

    console.log("🗑️  Xóa dữ liệu cũ...");
    // Clear ALL foreign key references first to avoid constraint violations
    await db.update(schema.departments).set({ 
      assignedDeputyDirectorId: null,
      deletedById: null,
    });
    await db.update(schema.users).set({ 
      departmentId: null,
      deletedById: null,
    });
    await db.update(schema.tasks).set({
      deletedById: null,
    });
    
    // Delete in proper order (child tables first)
    await db.delete(schema.notifications);
    await db.delete(schema.aiAlerts);
    await db.delete(schema.kpiScores);
    await db.delete(schema.files);
    await db.delete(schema.comments);
    await db.delete(schema.checklistItems);
    await db.delete(schema.progressUpdates);
    await db.delete(schema.taskEvaluations);
    await db.delete(schema.taskAssignments);
    await db.delete(schema.tasks);
    await db.delete(schema.taskSequences);
    await db.delete(schema.users);
    await db.delete(schema.departments);
    console.log("✅ Đã xóa dữ liệu cũ");

    console.log("📁 Tạo 4 phòng ban...");
    const departments = await Promise.all([
      storage.createDepartment({ name: "Phòng Tổ chức - Hành chính", code: "TCHC" }),
      storage.createDepartment({ name: "Phòng Kế hoạch - Tài chính", code: "KHTC" }),
      storage.createDepartment({ name: "Phòng Nghiệp vụ 1", code: "NV1" }),
      storage.createDepartment({ name: "Phòng Nghiệp vụ 2", code: "NV2" }),
    ]);
    
    console.log(`✅ Đã tạo ${departments.length} phòng ban`);

    console.log("👤 Tạo 36 tài khoản người dùng thực tế...");
    const hashedPassword = await hashPassword("123456");
    
    // 1. Giám đốc
    const namnn842 = await storage.createUser({
      username: "namnn842",
      password: hashedPassword,
      fullName: "Nguyễn Ngọc Nam",
      role: "Giám đốc",
      departmentId: null,
      position: "Giám đốc",
    });
    
    // 2-8. Phó Giám đốc (7 người)
    const duannv656 = await storage.createUser({
      username: "duannv656",
      password: hashedPassword,
      fullName: "Nguyễn Văn Duẩn",
      role: "Phó Giám đốc",
      departmentId: null,
      position: "Phó Giám đốc",
    });
    
    const quyenttt001 = await storage.createUser({
      username: "quyenttt001",
      password: hashedPassword,
      fullName: "Tôn Thị Thiện Quyên",
      role: "Phó Giám đốc",
      departmentId: null,
      position: "Phó Giám đốc",
    });
    
    const lamnd004 = await storage.createUser({
      username: "lamnd004",
      password: hashedPassword,
      fullName: "Nguyễn Đăng Lâm",
      role: "Phó Giám đốc",
      departmentId: null,
      position: "Phó Giám đốc",
    });
    
    const doanhpv604 = await storage.createUser({
      username: "doanhpv604",
      password: hashedPassword,
      fullName: "Phan Văn Doanh",
      role: "Phó Giám đốc",
      departmentId: null,
      position: "Phó Giám đốc",
    });
    
    const ninhvt705 = await storage.createUser({
      username: "ninhvt705",
      password: hashedPassword,
      fullName: "Vũ Trần Ninh",
      role: "Phó Giám đốc",
      departmentId: null,
      position: "Phó Giám đốc",
    });
    
    const quynq837 = await storage.createUser({
      username: "quynq837",
      password: hashedPassword,
      fullName: "Nguyễn Quang Quý",
      role: "Phó Giám đốc",
      departmentId: null,
      position: "Phó Giám đốc",
    });
    
    const nhungnth781 = await storage.createUser({
      username: "nhungnth781",
      password: hashedPassword,
      fullName: "Ngô Thị Hồng Nhung",
      role: "Phó Giám đốc",
      departmentId: null,
      position: "Phó Giám đốc",
    });
    
    // 9-36. Chuyên viên (28 người) - Phân đều vào 4 phòng ban (7 người/phòng)
    // Phòng TCHC (7 người)
    await storage.createUser({
      username: "tungln303",
      password: hashedPassword,
      fullName: "Liểu Ngọc Tùng",
      role: "Chuyên viên",
      departmentId: departments[0].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "hoadp355",
      password: hashedPassword,
      fullName: "Đào Phương Hoa",
      role: "Chuyên viên",
      departmentId: departments[0].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "nghiatq781",
      password: hashedPassword,
      fullName: "Trần Quang Nghĩa",
      role: "Chuyên viên",
      departmentId: departments[0].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "maipq756",
      password: hashedPassword,
      fullName: "Phạm Quỳnh Mai",
      role: "Chuyên viên",
      departmentId: departments[0].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "hangttt879",
      password: hashedPassword,
      fullName: "Tạ Thị Thu Hằng",
      role: "Chuyên viên",
      departmentId: departments[0].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "hiepdg733",
      password: hashedPassword,
      fullName: "Đặng Gia Hiệp",
      role: "Chuyên viên",
      departmentId: departments[0].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "khanhdd744",
      password: hashedPassword,
      fullName: "Đỗ Đình Khanh",
      role: "Chuyên viên",
      departmentId: departments[0].id,
      position: "Chuyên viên",
    });
    
    // Phòng KHTC (7 người)
    await storage.createUser({
      username: "lamnn283",
      password: hashedPassword,
      fullName: "Ngô Ngọc Lâm",
      role: "Chuyên viên",
      departmentId: departments[1].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "hieunt545",
      password: hashedPassword,
      fullName: "Nguyễn Trung Hiếu",
      role: "Chuyên viên",
      departmentId: departments[1].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "lamhv242",
      password: hashedPassword,
      fullName: "Hoàng Văn Lâm",
      role: "Chuyên viên",
      departmentId: departments[1].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "hant864",
      password: hashedPassword,
      fullName: "Nguyễn Thị Hà",
      role: "Chuyên viên",
      departmentId: departments[1].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "sontt316",
      password: hashedPassword,
      fullName: "Tạ Thái Sơn",
      role: "Chuyên viên",
      departmentId: departments[1].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "thinhnx466",
      password: hashedPassword,
      fullName: "Ngô Xuân Thịnh",
      role: "Chuyên viên",
      departmentId: departments[1].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "thoantk349",
      password: hashedPassword,
      fullName: "Nguyễn Thị Kim Thoa",
      role: "Chuyên viên",
      departmentId: departments[1].id,
      position: "Chuyên viên",
    });
    
    // Phòng NV1 (7 người)
    await storage.createUser({
      username: "hanhdth910",
      password: hashedPassword,
      fullName: "Đàm Thị Hiếu Hạnh",
      role: "Chuyên viên",
      departmentId: departments[2].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "dieunt035",
      password: hashedPassword,
      fullName: "Nguyễn Thị Diệu",
      role: "Chuyên viên",
      departmentId: departments[2].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "giangnq801",
      password: hashedPassword,
      fullName: "Nguyễn Quang Giang",
      role: "Chuyên viên",
      departmentId: departments[2].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "chungnm362",
      password: hashedPassword,
      fullName: "Nguyễn Mậu Chung",
      role: "Chuyên viên",
      departmentId: departments[2].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "tranghth203",
      password: hashedPassword,
      fullName: "Hoàng Thị Huyền Trang",
      role: "Chuyên viên",
      departmentId: departments[2].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "anhntn344",
      password: hashedPassword,
      fullName: "Nguyễn Thị Ngọc Anh",
      role: "Chuyên viên",
      departmentId: departments[2].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "hoangdh444",
      password: hashedPassword,
      fullName: "Đặng Huy Hoàng",
      role: "Chuyên viên",
      departmentId: departments[2].id,
      position: "Chuyên viên",
    });
    
    // Phòng NV2 (7 người)
    await storage.createUser({
      username: "minhpa963",
      password: hashedPassword,
      fullName: "Phạm Anh Minh",
      role: "Chuyên viên",
      departmentId: departments[3].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "loict416",
      password: hashedPassword,
      fullName: "Chu Thị Lợi",
      role: "Chuyên viên",
      departmentId: departments[3].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "longnn468",
      password: hashedPassword,
      fullName: "Nguyễn Ngọc Long",
      role: "Chuyên viên",
      departmentId: departments[3].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "linhntk606",
      password: hashedPassword,
      fullName: "Nguyễn Thị Khánh Linh",
      role: "Chuyên viên",
      departmentId: departments[3].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "anhph817",
      password: hashedPassword,
      fullName: "Phan Hoàng Anh",
      role: "Chuyên viên",
      departmentId: departments[3].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "thend043",
      password: hashedPassword,
      fullName: "Nguyễn Đình Thế",
      role: "Chuyên viên",
      departmentId: departments[3].id,
      position: "Chuyên viên",
    });
    
    await storage.createUser({
      username: "huongnt331",
      password: hashedPassword,
      fullName: "Nguyễn Thu Hương",
      role: "Chuyên viên",
      departmentId: departments[3].id,
      position: "Chuyên viên",
    });
    
    console.log(`✅ Đã tạo 36 users (1 Giám đốc, 7 Phó Giám đốc, 28 Chuyên viên)`);

    console.log("📝 Tạo nhiệm vụ mẫu...");
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const task1 = await storage.createTask({
      title: "Xây dựng kế hoạch công tác năm 2025",
      description: "Lập kế hoạch chi tiết cho các hoạt động trong năm 2025, bao gồm kế hoạch tài chính và nhân sự",
      deadline: nextMonth,
      priority: "Quan trọng",
      departmentId: departments[1].id,
      createdById: namnn842.id,
    });
    
    await storage.createTaskAssignment({
      taskId: task1.id,
      userId: duannv656.id,
      role: "Chỉ đạo",
    });
    
    console.log(`✅ Đã tạo 1 nhiệm vụ mẫu`);

    console.log("✨ Seed dữ liệu hoàn tất!");
    console.log("\n📋 Thông tin đăng nhập:");
    console.log("- Giám đốc: namnn842 / 123456");
    console.log("- Phó Giám đốc: duannv656, quyenttt001, lamnd004, doanhpv604, ninhvt705, quynq837, nhungnth781 / 123456");
    console.log("- Chuyên viên: tungln303, hoadp355, nghiatq781... (và các tài khoản khác) / 123456");
    console.log("\nTất cả 36 tài khoản đều có mật khẩu: 123456");
    
  } catch (error) {
    console.error("❌ Lỗi khi seed dữ liệu:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("🎉 Seed hoàn tất!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seed thất bại:", error);
    process.exit(1);
  });
