import { db } from "../server/db";
import { checklistTemplates, checklistTemplateItems } from "../shared/schema";
import { sql } from "drizzle-orm";

/**
 * Script to seed default checklist templates into production database
 * This script should be run only once when setting up a new production environment
 * 
 * Usage:
 *   DATABASE_URL_PROD=<your_production_db_url> tsx scripts/seed-default-templates.ts
 */

async function seedDefaultTemplates() {
  console.log("🌱 Starting to seed default checklist templates...");

  const targetDbUrl = process.env.DATABASE_URL_PROD || process.env.DATABASE_URL;
  
  if (!targetDbUrl) {
    console.error("❌ Error: DATABASE_URL_PROD or DATABASE_URL environment variable is required");
    process.exit(1);
  }

  console.log(`📦 Target database: ${targetDbUrl.substring(0, 30)}...`);

  try {
    // Check if templates already exist
    const existingTemplates = await db.select().from(checklistTemplates);
    
    if (existingTemplates.length > 0) {
      console.log(`⚠️  Warning: Found ${existingTemplates.length} existing templates in database`);
      console.log("   This script will NOT overwrite existing templates.");
      console.log("   If you want to reset templates, delete them manually first.");
      
      const response = await new Promise<string>((resolve) => {
        process.stdout.write("   Continue anyway? (y/N): ");
        process.stdin.once("data", (data) => {
          resolve(data.toString().trim().toLowerCase());
        });
      });

      if (response !== "y" && response !== "yes") {
        console.log("❌ Operation cancelled by user");
        process.exit(0);
      }
    }

    // Define default templates
    const defaultTemplatesData = [
      {
        name: "Nhiệm vụ hành chính cơ bản",
        description: "Mẫu checklist cho các nhiệm vụ hành chính thường gặp",
        category: "Hành chính",
        isDefault: true,
        createdById: null, // System template
        items: [
          { title: "Thu thập thông tin và tài liệu cần thiết", order: 1 },
          { title: "Soạn thảo văn bản/báo cáo", order: 2 },
          { title: "Kiểm tra và rà soát nội dung", order: 3 },
          { title: "Trình lãnh đạo phê duyệt", order: 4 },
          { title: "Hoàn thiện và ban hành", order: 5 },
        ],
      },
      {
        name: "Tổ chức sự kiện",
        description: "Mẫu checklist cho việc tổ chức hội nghị, hội thảo",
        category: "Sự kiện",
        isDefault: false,
        createdById: null,
        items: [
          { title: "Lập kế hoạch chi tiết và dự toán kinh phí", order: 1 },
          { title: "Chuẩn bị địa điểm và trang thiết bị", order: 2 },
          { title: "Gửi thư mời và xác nhận khách mời", order: 3 },
          { title: "Chuẩn bị tài liệu, tờ rơi, phần quà", order: 4 },
          { title: "Tổ chức sự kiện", order: 5 },
          { title: "Tổng kết và báo cáo kết quả", order: 6 },
        ],
      },
      {
        name: "Kiểm tra và giám sát",
        description: "Mẫu checklist cho công tác kiểm tra, giám sát",
        category: "Kiểm tra",
        isDefault: false,
        createdById: null,
        items: [
          { title: "Xây dựng kế hoạch kiểm tra", order: 1 },
          { title: "Chuẩn bị nội dung và tiêu chí kiểm tra", order: 2 },
          { title: "Thông báo lịch kiểm tra cho đơn vị", order: 3 },
          { title: "Tiến hành kiểm tra thực địa", order: 4 },
          { title: "Lập biên bản và báo cáo kết quả", order: 5 },
          { title: "Đề xuất giải pháp khắc phục (nếu có)", order: 6 },
        ],
      },
      {
        name: "Giải quyết hồ sơ công dân",
        description: "Mẫu checklist cho việc tiếp nhận và giải quyết thủ tục hành chính",
        category: "Thủ tục hành chính",
        isDefault: false,
        createdById: null,
        items: [
          { title: "Tiếp nhận và kiểm tra tính hợp lệ của hồ sơ", order: 1 },
          { title: "Nhập thông tin vào hệ thống", order: 2 },
          { title: "Xử lý và giải quyết hồ sơ", order: 3 },
          { title: "Kiểm tra và ký duyệt kết quả", order: 4 },
          { title: "Trả kết quả cho công dân", order: 5 },
        ],
      },
      {
        name: "Đào tạo và bồi dưỡng",
        description: "Mẫu checklist cho tổ chức lớp đào tạo, bồi dưỡng cán bộ",
        category: "Đào tạo",
        isDefault: false,
        createdById: null,
        items: [
          { title: "Xác định nhu cầu và đối tượng đào tạo", order: 1 },
          { title: "Lựa chọn đơn vị/giảng viên đào tạo", order: 2 },
          { title: "Chuẩn bị chương trình và tài liệu đào tạo", order: 3 },
          { title: "Tổ chức lớp đào tạo", order: 4 },
          { title: "Đánh giá kết quả và cấp chứng chỉ", order: 5 },
          { title: "Báo cáo và lưu trữ hồ sơ", order: 6 },
        ],
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const templateData of defaultTemplatesData) {
      const { items, ...template } = templateData;

      // Check if template with same name already exists
      const existing = existingTemplates.find(t => t.name === template.name);
      if (existing) {
        console.log(`⏭️  Skipped: "${template.name}" (already exists)`);
        skippedCount++;
        continue;
      }

      // Create template
      const [createdTemplate] = await db
        .insert(checklistTemplates)
        .values(template)
        .returning();

      // Create template items
      const itemsToInsert = items.map((item) => ({
        ...item,
        templateId: createdTemplate.id,
      }));

      await db.insert(checklistTemplateItems).values(itemsToInsert);

      console.log(`✅ Created: "${template.name}" with ${items.length} items`);
      createdCount++;
    }

    console.log("\n📊 Summary:");
    console.log(`   ✅ Created: ${createdCount} templates`);
    console.log(`   ⏭️  Skipped: ${skippedCount} templates`);
    console.log(`   📦 Total: ${createdCount + skippedCount} templates processed`);
    
    if (createdCount > 0) {
      console.log("\n🎉 Default checklist templates seeded successfully!");
    } else {
      console.log("\n✨ No new templates were created (all already exist)");
    }

  } catch (error) {
    console.error("\n❌ Error seeding templates:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedDefaultTemplates();
