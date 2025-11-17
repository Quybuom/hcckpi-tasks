-- Test import - Chỉ departments và users
DELETE FROM ai_alerts;
DELETE FROM files;
DELETE FROM task_evaluations;
DELETE FROM checklist_items;
DELETE FROM comments;
DELETE FROM progress_updates;
DELETE FROM task_assignments;
DELETE FROM tasks;
DELETE FROM users;
DELETE FROM departments;

-- DEPARTMENTS
INSERT INTO departments (id, name, code, assigned_deputy_director_id, is_deleted, deleted_at, deleted_by_id, created_at, updated_at) VALUES ('9c7b4c9f-5724-4063-8577-d113bc24a8f9', 'Phòng Tiếp nhận và Trả kết quả', 'TNTKQ', NULL, false, NULL, NULL, '2025-11-15T07:17:38.856Z', '2025-11-15T07:26:43.011Z');
INSERT INTO departments (id, name, code, assigned_deputy_director_id, is_deleted, deleted_at, deleted_by_id, created_at, updated_at) VALUES ('fe3ac6f0-c7b5-425a-b7fe-175d88c6bfda', 'Phòng Kiểm soát TTHC', 'KSTTHC', NULL, false, NULL, NULL, '2025-11-15T07:17:38.850Z', '2025-11-15T07:26:52.413Z');
INSERT INTO departments (id, name, code, assigned_deputy_director_id, is_deleted, deleted_at, deleted_by_id, created_at, updated_at) VALUES ('feea9c9d-3625-44db-8266-60d3626882d1', 'Phòng Hành chính', 'HCTH', NULL, false, NULL, NULL, '2025-11-15T07:17:38.650Z', '2025-11-15T07:26:59.071Z');
INSERT INTO departments (id, name, code, assigned_deputy_director_id, is_deleted, deleted_at, deleted_by_id, created_at, updated_at) VALUES ('dda4e1f8-cd63-4dfc-9fa4-c50dee67241f', 'Phòng CNTT', 'CNTT', NULL, false, NULL, NULL, '2025-11-15T07:17:38.904Z', '2025-11-15T07:32:49.485Z');

-- USERS - Giám đốc
INSERT INTO users (id, username, password, full_name, role, department_id, telegram_id, group_telegram_chat_id, position, is_system_admin, notify_on_new_task, notify_on_deadline, notify_on_comment, notify_on_scheduled_ai_suggestions, notify_on_scheduled_ai_alerts, notify_on_scheduled_weekly_kpi, notify_on_scheduled_monthly_kpi, is_deleted, deleted_at, deleted_by_id, created_at, updated_at) 
VALUES ('1c832a34-36b8-4227-89f2-68f4250dd371', 'namnn842', '$2b$10$TgxtwvBWMz7/sflGucuRN.FxU9WUadVbRltWc42XsYoSVq96t4eBK', 'Nguyễn Ngọc Nam', 'Giám đốc', NULL, NULL, NULL, 'Giám đốc', false, true, true, true, false, false, false, false, false, NULL, NULL, '2025-11-15T07:17:39.024Z', '2025-11-15T07:17:39.024Z');

-- USERS - System Admin
INSERT INTO users (id, username, password, full_name, role, department_id, telegram_id, group_telegram_chat_id, position, is_system_admin, notify_on_new_task, notify_on_deadline, notify_on_comment, notify_on_scheduled_ai_suggestions, notify_on_scheduled_ai_alerts, notify_on_scheduled_weekly_kpi, notify_on_scheduled_monthly_kpi, is_deleted, deleted_at, deleted_by_id, created_at, updated_at) 
VALUES ('c13d6536-affe-4acf-954b-329ea12fae7d', 'sysadmin', '$2b$10$y1A8vCJxKPNPk6kpmSpFA.ACPk9xLRwO9EIaeWIYKTm.9x1r9Q7F6', 'System Administrator', 'Giám đốc', NULL, NULL, NULL, NULL, true, false, false, false, false, false, false, false, false, NULL, NULL, '2025-11-15T14:19:31.436Z', '2025-11-15T14:22:41.558Z');

-- Hoàn thành!
