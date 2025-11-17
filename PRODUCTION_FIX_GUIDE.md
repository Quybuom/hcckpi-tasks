# Hướng Dẫn Khắc Phục Lỗi Production

## 🔍 Vấn Đề Hiện Tại

Khi tạo nhiệm vụ trên production (https://hcckpi-tasks.replit.app/):
- ❌ Hiển thị thông báo "lỗi hệ thống"
- ❌ Checklist không hiển thị mẫu mặc định (dropdown trống)

## 🎯 Nguyên Nhân

Production database thiếu **checklist templates** (mẫu checklist). Đây là dữ liệu mặc định cần thiết để hệ thống hoạt động.

## 🛠️ Giải Pháp

### Bước 1: Chẩn đoán Production Database

Chạy lệnh sau để kiểm tra tình trạng database:

```bash
DATABASE_URL_PROD="<your_production_database_url>" tsx scripts/diagnose-production.ts
```

**Lưu ý:** Thay `<your_production_database_url>` bằng connection string thật của production database.

Script này sẽ kiểm tra:
- ✅ Checklist templates (mẫu checklist)
- ✅ Task numbering sequence (số thứ tự nhiệm vụ)
- ✅ Departments (phòng ban)
- ✅ Users (người dùng)
- ✅ Tasks (nhiệm vụ)

### Bước 2: Seed Checklist Templates Mặc Định

Sau khi xác nhận thiếu templates, chạy lệnh:

```bash
DATABASE_URL_PROD="<your_production_database_url>" tsx scripts/seed-default-templates.ts
```

Script này sẽ tạo **5 mẫu checklist mặc định**:

1. **Nhiệm vụ hành chính cơ bản** ⭐ (Default)
   - Thu thập thông tin và tài liệu cần thiết
   - Soạn thảo văn bản/báo cáo
   - Kiểm tra và rà soát nội dung
   - Trình lãnh đạo phê duyệt
   - Hoàn thiện và ban hành

2. **Tổ chức sự kiện**
   - Lập kế hoạch chi tiết và dự toán kinh phí
   - Chuẩn bị địa điểm và trang thiết bị
   - Gửi thư mời và xác nhận khách mời
   - Chuẩn bị tài liệu, tờ rơi, phần quà
   - Tổ chức sự kiện
   - Tổng kết và báo cáo kết quả

3. **Kiểm tra và giám sát**
   - Xây dựng kế hoạch kiểm tra
   - Chuẩn bị nội dung và tiêu chí kiểm tra
   - Thông báo lịch kiểm tra cho đơn vị
   - Tiến hành kiểm tra thực địa
   - Lập biên bản và báo cáo kết quả
   - Đề xuất giải pháp khắc phục (nếu có)

4. **Giải quyết hồ sơ công dân**
   - Tiếp nhận và kiểm tra tính hợp lệ của hồ sơ
   - Nhập thông tin vào hệ thống
   - Xử lý và giải quyết hồ sơ
   - Kiểm tra và ký duyệt kết quả
   - Trả kết quả cho công dân

5. **Đào tạo và bồi dưỡng**
   - Xác định nhu cầu và đối tượng đào tạo
   - Lựa chọn đơn vị/giảng viên đào tạo
   - Chuẩn bị chương trình và tài liệu đào tạo
   - Tổ chức lớp đào tạo
   - Đánh giá kết quả và cấp chứng chỉ
   - Báo cáo và lưu trữ hồ sơ

### Bước 3: Kiểm Tra Lại

Sau khi chạy script, thử lại các thao tác sau trên production:

1. ✅ Đăng nhập vào hệ thống
2. ✅ Vào trang "Tạo nhiệm vụ"
3. ✅ Kiểm tra dropdown "Template" → Phải hiển thị 5 mẫu
4. ✅ Thử tạo nhiệm vụ mới → Phải thành công

## 📝 Lưu Ý Quan Trọng

### 1. DATABASE_URL_PROD

Connection string production database thường có dạng:
```
postgresql://username:password@host:port/database?sslmode=require
```

Bạn có thể lấy từ:
- Replit Secrets (nếu đã lưu)
- Database provider dashboard (Neon, Supabase, etc.)
- Production environment variables

### 2. An Toàn

- ✅ Script chỉ **thêm** dữ liệu, **không xóa** hay sửa dữ liệu hiện có
- ✅ Nếu templates đã tồn tại, script sẽ bỏ qua (không tạo duplicate)
- ✅ Script có xác nhận trước khi thực hiện nếu phát hiện dữ liệu cũ

### 3. Nếu Vẫn Lỗi

Nếu sau khi seed templates vẫn gặp lỗi "lỗi hệ thống", có thể do:

1. **Task numbering sequence chưa tồn tại:**
   ```sql
   CREATE SEQUENCE IF NOT EXISTS task_number_seq START WITH 1;
   ```

2. **Thiếu departments:** Import dữ liệu đầy đủ:
   ```bash
   DATABASE_URL_PROD="<url>" tsx scripts/import-to-production.ts
   ```

3. **Session store chưa được tạo:** Production tự động tạo bảng `user_sessions` khi khởi động lần đầu

## 📞 Hỗ Trợ

Nếu gặp vấn đề, cung cấp thông tin sau:
- Output của script `diagnose-production.ts`
- Thông báo lỗi chi tiết (nếu có)
- Môi trường production (Replit deployment, VPS, etc.)

---

## 🔄 Quy Trình Hoàn Chỉnh

```bash
# 1. Chẩn đoán
DATABASE_URL_PROD="postgres://..." tsx scripts/diagnose-production.ts

# 2. Seed templates (nếu thiếu)
DATABASE_URL_PROD="postgres://..." tsx scripts/seed-default-templates.ts

# 3. Import đầy đủ dữ liệu (nếu cần)
DATABASE_URL_PROD="postgres://..." tsx scripts/import-to-production.ts

# 4. Kiểm tra lại
DATABASE_URL_PROD="postgres://..." tsx scripts/diagnose-production.ts
```

## ✅ Kết Quả Mong Đợi

Sau khi hoàn tất, khi tạo nhiệm vụ:
- ✅ Dropdown "Template" hiển thị 5 mẫu checklist
- ✅ Mẫu "Nhiệm vụ hành chính cơ bản" được chọn mặc định
- ✅ Tạo nhiệm vụ thành công không có lỗi
- ✅ Checklist items tự động được tạo theo template đã chọn
