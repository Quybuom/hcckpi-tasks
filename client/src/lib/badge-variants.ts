// Badge color variants - Standardized across the entire application
// This ensures consistent colors for status, role, and priority badges

export type TaskStatus = "Chưa bắt đầu" | "Đang thực hiện" | "Hoàn thành" | "Quá hạn" | "Tạm dừng";
export type TaskPriority = "Khẩn cấp" | "Quan trọng" | "Bình thường";
export type AssignmentRole = "Chủ trì" | "Phối hợp" | "Chỉ đạo";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "purple";

// Status badge colors
export const STATUS_VARIANTS: Record<TaskStatus, BadgeVariant> = {
  "Chưa bắt đầu": "outline",
  "Đang thực hiện": "default",
  "Hoàn thành": "secondary",
  "Quá hạn": "destructive",
  "Tạm dừng": "secondary",
};

// Priority badge colors
export const PRIORITY_VARIANTS: Record<TaskPriority, BadgeVariant> = {
  "Khẩn cấp": "destructive",
  "Quan trọng": "default",
  "Bình thường": "secondary",
};

// Assignment role badge colors
export const ROLE_VARIANTS: Record<AssignmentRole, BadgeVariant> = {
  "Chủ trì": "default",
  "Phối hợp": "secondary",
  "Chỉ đạo": "purple",
};
