# 🔄 Hướng Dẫn Đồng Bộ Code từ Agent về Main Workspace

## ❗ Vấn Đề
Bạn đang làm việc trên **Replit Agent** (môi trường này), nhưng khi **Republish**, Replit deploy từ **Main Workspace** của bạn. Hai môi trường này không tự động đồng bộ!

```
Agent Environment (đây)         Main Workspace (production)
✅ Code mới nhất                ❌ Code cũ
✅ Idle timeout feature         ❌ Thiếu feature
✅ Template improvements        ❌ Lỗi 500/401
```

---

## ✅ Giải Pháp: Copy Files Thủ Công

Vì bạn không dùng Git, cần copy các files sau từ **Agent** sang **Main Workspace**:

### 📂 Files Đã Thay Đổi (Cần Copy)

#### 1. **IdleTimeout Component** (MỚI)
```
client/src/components/IdleTimeout.tsx
```
**Tính năng:** Tự động logout sau 5 phút không hoạt động

#### 2. **App.tsx** (ĐÃ SỬA)
```
client/src/App.tsx
```
**Thay đổi:** Thêm import và sử dụng `<IdleTimeout />`

#### 3. **Replit.md** (ĐÃ CẬP NHẬT)
```
replit.md
```
**Thay đổi:** Thêm documentation về idle timeout feature

---

## 📝 Các Bước Thực Hiện

### Bước 1: Download Files từ Agent
1. Mở **Replit Agent** này (môi trường đang làm việc)
2. Download 3 files trên về máy tính

### Bước 2: Upload lên Main Workspace
1. Mở **Main Workspace** của bạn trên Replit (nơi deploy production)
2. Upload/Copy 3 files vào đúng vị trí:
   - `client/src/components/IdleTimeout.tsx` (tạo mới nếu chưa có)
   - `client/src/App.tsx` (overwrite file cũ)
   - `replit.md` (overwrite file cũ)

### Bước 3: Verify
Sau khi copy xong, kiểm tra trong Main Workspace:
- ✅ File `IdleTimeout.tsx` tồn tại
- ✅ File `App.tsx` có dòng `import { IdleTimeout } from "@/components/IdleTimeout"`
- ✅ File `replit.md` có section "Auto-Logout Idle Timeout (Nov 17, 2025)"

### Bước 4: Republish Production
1. Trong Main Workspace, vào tab **Deployments**
2. Click **Republish** hoặc **Deploy**
3. Đợi deployment hoàn tất (~2-5 phút)

### Bước 5: Test Production
Sau khi deploy xong:
1. Truy cập https://hcckpi-tasks.replit.app
2. Đăng nhập vào hệ thống
3. **Test Idle Timeout:**
   - Đăng nhập và không làm gì trong 4.5 phút
   - Phải hiện dialog cảnh báo với countdown 30 giây
   - Nếu không click "Tiếp tục làm việc", hệ thống tự logout sau 5 phút

---

## 🎯 Tóm Tắt Files Cần Copy

| File | Loại | Mô tả |
|------|------|-------|
| `client/src/components/IdleTimeout.tsx` | **MỚI** | Component idle timeout |
| `client/src/App.tsx` | **SỬA** | Integrate IdleTimeout |
| `replit.md` | **CẬP NHẬT** | Documentation |

---

## 💡 Lưu Ý Quan Trọng

### 1. Template Feature Đã Có Sẵn
Code template (dropdown "Mẫu checklist") **đã tồn tại** trong Main Workspace từ trước. Nếu production vẫn lỗi 500, có thể do:
- Database production thiếu templates → Chạy `scripts/seed-default-templates.ts`
- Session issue → Clear cookies và đăng nhập lại

### 2. Kiểm Tra Deployment Logs
Sau khi republish, kiểm tra deployment logs để đảm bảo:
- ✅ Build thành công
- ✅ Không có lỗi TypeScript
- ✅ Frontend assets được build đúng

### 3. Clear Browser Cache
Sau khi deploy xong production:
- Nhấn **Ctrl + Shift + R** (Windows) hoặc **Cmd + Shift + R** (Mac)
- Hoặc xóa cookies của site https://hcckpi-tasks.replit.app

---

## 🆘 Nếu Vẫn Gặp Lỗi

### Lỗi 401 (Unauthorized)
- **Nguyên nhân:** Session đã hết hạn hoặc không tồn tại
- **Giải pháp:** Đăng xuất và đăng nhập lại

### Lỗi 500 (Internal Server Error)
- **Nguyên nhân:** Database thiếu dữ liệu (templates, sequences)
- **Giải pháp:** Chạy script khởi tạo database:
  ```bash
  DATABASE_URL_PROD="<production_db_url>" tsx scripts/import-to-production.ts
  ```

### Template Dropdown Vẫn Không Hiện
- **Nguyên nhân:** Code cũ vẫn đang chạy
- **Giải pháp:** 
  1. Verify file `CreateTask.tsx` trong Main Workspace có dropdown code
  2. Force rebuild deployment (delete old deployment và tạo mới)

---

## 🚀 Khuyến Nghị: Sử dụng Git

Để tránh vấn đề đồng bộ trong tương lai, nên:
1. Setup Git repository cho project
2. Commit code sau mỗi thay đổi
3. Push lên remote (GitHub, GitLab, etc.)
4. Replit tự động sync từ Git repository

**Lợi ích:**
- ✅ Tự động đồng bộ giữa các môi trường
- ✅ Version control (quản lý phiên bản)
- ✅ Dễ rollback khi có lỗi
- ✅ Collaboration (làm việc nhóm)

---

## ✅ Checklist Hoàn Thành

- [ ] Download 3 files từ Agent environment
- [ ] Upload 3 files lên Main Workspace
- [ ] Verify files đã được copy đúng
- [ ] Republish production deployment
- [ ] Test idle timeout trên production
- [ ] Verify không còn lỗi 401/500

---

**Lưu ý:** Nếu bạn cần thêm hỗ trợ, hãy cung cấp:
- Screenshot deployment logs
- Thông báo lỗi chi tiết
- Kết quả test trên production
