# TÀI KHOẢN SYSTEM ADMIN - HƯỚNG DẪN SỬ DỤNG

## ✅ ĐÃ TẠO THÀNH CÔNG

### Thông tin đăng nhập

```
Username: sysadmin
Password: Admin@2025
Họ tên: System Administrator
Vai trò: Giám đốc (quyền cao nhất)
```

⚠️ **LƯU Ý**: Vui lòng lưu mật khẩu này ở nơi an toàn!

---

## 🔐 ĐẶC ĐIỂM TÀI KHOẢN

### 1. Hoàn toàn ẩn khỏi danh sách

✅ **Không hiển thị ở đâu cả:**
- Không xuất hiện trong "Quản lý cán bộ" (`/admin/users`)
- Không xuất hiện khi giao việc (chọn người thực hiện)
- Không xuất hiện trong báo cáo KPI
- Không xuất hiện trong bất kỳ danh sách nào

### 2. Quyền hạn như Giám đốc

✅ **Có thể làm mọi thứ:**
- Xem tất cả nhiệm vụ của tất cả phòng ban
- Quản lý cán bộ (thêm, sửa, xóa)
- Quản lý phòng ban (thêm, sửa, xóa)
- Xem thống kê KPI toàn đơn vị
- Xuất báo cáo
- Xem cảnh báo AI

### 3. Không thuộc phòng ban nào

✅ **Đặc điểm:**
- Không gắn với phòng ban cụ thể
- Không tính trong thống kê nhân sự phòng ban
- Không nhận nhiệm vụ (vì chỉ dùng để quản trị)

---

## 📊 XÁC NHẬN HOẠT ĐỘNG

### Kiểm tra trong Database

```sql
-- Tổng số users
Total users: 37
  ├─ Normal users: 36
  └─ System admin: 1 (sysadmin)
```

### Kiểm tra trên giao diện

✅ **Đã test thành công:**

1. **Đăng nhập**: Username `sysadmin` + Password `Admin@2025` → ✅ Thành công
2. **Quyền truy cập**: Vào `/admin/users` → ✅ Thành công (không bị chặn)
3. **Ẩn khỏi danh sách**: 
   - Database có 37 users
   - Giao diện chỉ hiển thị 36 users → ✅ Đúng (sysadmin bị ẩn)
4. **Quyền Giám đốc**: Xem được tất cả phòng ban → ✅ Thành công

---

## 🎯 CÁCH SỬ DỤNG

### Khi nào dùng tài khoản này?

✅ **Nên dùng khi:**
- Cần can thiệp hệ thống khẩn cấp
- Cần xóa/sửa dữ liệu quan trọng
- Giám đốc thật nghỉ việc, chưa có người thay thế
- Cần xem toàn bộ hệ thống không bị giới hạn

❌ **KHÔNG nên:**
- Dùng hàng ngày (nên dùng tài khoản Giám đốc thật)
- Giao việc từ tài khoản này
- Để nhiều người biết mật khẩu

### Cách đăng nhập

1. Vào trang đăng nhập: `[Link website của bạn]`
2. Nhập:
   - Tên đăng nhập: `sysadmin`
   - Mật khẩu: `Admin@2025`
3. Bấm "Đăng nhập"
4. Sử dụng như Giám đốc bình thường

---

## 🔧 QUẢN TRỊ KỸ THUẬT

### Cách tạo lại (nếu cần)

Nếu mất tài khoản hoặc quên mật khẩu, chạy lệnh:

```bash
npx tsx scripts/create-system-admin.ts
```

Script sẽ:
- Kiểm tra xem đã có `sysadmin` chưa
- Nếu chưa có → Tạo mới
- Nếu đã có → Thông báo "Đã tồn tại"

### Cách đổi mật khẩu

```sql
-- Chạy trong database
UPDATE users 
SET password = '[Mật khẩu đã hash bằng bcrypt]'
WHERE username = 'sysadmin';
```

**Lưu ý**: Mật khẩu phải hash bằng bcrypt (10 salt rounds) trước khi lưu!

### Cách xóa (nếu không cần nữa)

```sql
-- Soft delete (khuyến nghị)
UPDATE users 
SET is_deleted = true, deleted_at = NOW()
WHERE username = 'sysadmin';

-- Hard delete (không khuyến nghị)
DELETE FROM users WHERE username = 'sysadmin';
```

---

## 🛡️ BẢO MẬT

### Biện pháp đã áp dụng

✅ **Mật khẩu mạnh**: `Admin@2025` (8 ký tự, có chữ hoa, số, ký tự đặc biệt)
✅ **Hash bcrypt**: Mật khẩu được mã hóa với bcrypt (10 salt rounds)
✅ **Ẩn khỏi danh sách**: Không ai thấy được tài khoản này
✅ **Không thuộc phòng ban**: Tránh nhầm lẫn với nhân viên thật

### Khuyến nghị bảo mật

⚠️ **Nên làm:**
1. Đổi mật khẩu ngay sau khi nhận
2. Chỉ lưu mật khẩu ở nơi an toàn (két sắt, password manager)
3. Chỉ cho 1-2 người tin cậy nhất biết
4. Đăng xuất ngay sau khi dùng xong
5. Không dùng máy công cộng để đăng nhập

❌ **KHÔNG được:**
1. Chia sẻ mật khẩu qua email, Zalo, Telegram
2. Viết mật khẩu lên giấy để bừa
3. Để nhiều người cùng dùng 1 tài khoản
4. Dùng mật khẩu này cho tài khoản khác

---

## 📋 TỔNG KẾT

### Đã hoàn thành

✅ Tạo tài khoản `sysadmin` thành công  
✅ Tài khoản hoàn toàn ẩn khỏi danh sách  
✅ Có đầy đủ quyền Giám đốc  
✅ Không thuộc phòng ban nào  
✅ Test thành công trên giao diện  

### Số liệu

- **Tổng users**: 37
  - Normal users: 36 (hiển thị)
  - System admin: 1 (ẩn)
- **Vai trò**: Giám đốc
- **Phòng ban**: Không
- **Trạng thái**: Hoạt động ✅

---

**Ngày tạo**: 15/11/2025  
**Người tạo**: [Tên của bạn]  
**Trạng thái**: Hoạt động bình thường  

**Hỗ trợ kỹ thuật**: [Email/Phone của bạn]
