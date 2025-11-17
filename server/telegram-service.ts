import type { tasks, users } from "@shared/schema";

type Task = typeof tasks.$inferSelect;
type User = typeof users.$inferSelect;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const APP_URL = process.env.REPL_SLUG 
  ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  : "http://localhost:5000";

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: "HTML" | "Markdown";
  disable_notification?: boolean;
}

async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("Telegram Bot Token not configured");
    return false;
  }

  if (!chatId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    const payload: TelegramMessage = {
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Telegram API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return false;
  }
}

export async function notifyNewTask(
  task: Task,
  assignee: User,
  creator: User,
  assignmentRole: "Chủ trì" | "Phối hợp" | "Chỉ đạo"
): Promise<void> {
  if (!assignee.telegramId || !assignee.notifyOnNewTask) {
    return;
  }

  const roleEmoji = {
    "Chủ trì": "🎯",
    "Phối hợp": "🤝",
    "Chỉ đạo": "👔"
  };

  const priorityEmoji = {
    "Khẩn cấp": "🔴",
    "Quan trọng": "🟡",
    "Bình thường": "🟢"
  };

  const message = `
🔔 <b>Nhiệm vụ mới!</b>

📋 <b>${task.title}</b>
${task.description ? `📝 ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}` : ''}

${roleEmoji[assignmentRole]} Vai trò: <b>${assignmentRole}</b>
👤 Người giao: ${creator.fullName}
📅 Deadline: ${new Date(task.deadline).toLocaleDateString('vi-VN')}
${priorityEmoji[task.priority as keyof typeof priorityEmoji]} Ưu tiên: ${task.priority}

👉 <a href="${APP_URL}/tasks/${task.id}">Xem chi tiết</a>
  `.trim();

  await sendTelegramMessage(assignee.telegramId, message);
}

export async function notifyDeadlineSoon(
  task: Task,
  assignee: User,
  daysRemaining: number
): Promise<void> {
  if (!assignee.telegramId || !assignee.notifyOnDeadline) {
    return;
  }

  const urgencyEmoji = daysRemaining <= 1 ? "🚨" : "⏰";
  const dayText = daysRemaining === 0 ? "HÔM NAY" : 
                  daysRemaining === 1 ? "1 NGÀY" : 
                  `${daysRemaining} NGÀY`;

  const message = `
${urgencyEmoji} <b>Deadline sắp đến!</b>

📋 <b>${task.title}</b>
⏳ Còn lại: <b>${dayText}</b>
📊 Tiến độ hiện tại: ${task.progress}%
📅 Deadline: ${new Date(task.deadline).toLocaleDateString('vi-VN')}

${task.progress < 50 && daysRemaining <= 1 ? '⚠️ Tiến độ chậm, cần đẩy nhanh!' : ''}

👉 <a href="${APP_URL}/tasks/${task.id}">Cập nhật ngay</a>
  `.trim();

  await sendTelegramMessage(assignee.telegramId, message);
}

export async function notifyNewComment(
  task: Task,
  assignee: User,
  commenter: User,
  commentContent: string
): Promise<void> {
  if (!assignee.telegramId || !assignee.notifyOnComment) {
    return;
  }

  // Don't notify if user commented on their own task
  if (assignee.id === commenter.id) {
    return;
  }

  const truncatedComment = commentContent.length > 100 
    ? commentContent.substring(0, 100) + "..." 
    : commentContent;

  const message = `
💬 <b>Bình luận mới!</b>

📋 Task: <b>${task.title}</b>
👤 ${commenter.fullName} đã bình luận:
"${truncatedComment}"

👉 <a href="${APP_URL}/tasks/${task.id}">Xem & Trả lời</a>
  `.trim();

  await sendTelegramMessage(assignee.telegramId, message);
}

export async function notifyTaskOverdue(
  task: Task,
  assignee: User
): Promise<void> {
  if (!assignee.telegramId || !assignee.notifyOnDeadline) {
    return;
  }

  const message = `
🔴 <b>TASK QUÁ HẠN!</b>

📋 <b>${task.title}</b>
📅 Deadline: ${new Date(task.deadline).toLocaleDateString('vi-VN')}
📊 Tiến độ: ${task.progress}%
⚠️ Trạng thái: <b>Quá hạn</b>

Vui lòng cập nhật tiến độ hoặc báo cáo lý do chậm trễ.

👉 <a href="${APP_URL}/tasks/${task.id}">Xử lý ngay</a>
  `.trim();

  await sendTelegramMessage(assignee.telegramId, message);
}

export async function sendTestNotification(chatId: string): Promise<boolean> {
  const message = `
✅ <b>Kết nối thành công!</b>

Bạn đã cấu hình Telegram notifications thành công.

Từ giờ bạn sẽ nhận thông báo khi:
🔔 Có task mới được giao
⏰ Deadline sắp đến
💬 Có người bình luận vào task

TT PVHCC Bắc Ninh
  `.trim();

  return await sendTelegramMessage(chatId, message);
}

// Scheduled notification functions for group chats
export async function sendAISuggestionsToGroup(groupChatId: string, suggestions: any[]): Promise<boolean> {
  if (!groupChatId || suggestions.length === 0) {
    return false;
  }

  const suggestionText = suggestions
    .slice(0, 5)
    .map((s, i) => `${i + 1}. ${s.suggestion}`)
    .join('\n');

  const message = `
🤖 <b>ĐỀ XUẤT TỪ AI - Sáng ${new Date().toLocaleDateString('vi-VN')}</b>

${suggestionText}

📊 Xem chi tiết tại Dashboard
  `.trim();

  return await sendTelegramMessage(groupChatId, message);
}

export async function sendAIAlertsToGroup(groupChatId: string, alerts: any[]): Promise<boolean> {
  if (!groupChatId || alerts.length === 0) {
    return false;
  }

  const highRiskAlerts = alerts.filter(a => a.severity === 'high');
  const mediumRiskAlerts = alerts.filter(a => a.severity === 'medium');

  const alertText = [];
  
  if (highRiskAlerts.length > 0) {
    alertText.push(`🔴 <b>RỦI RO CAO (${highRiskAlerts.length})</b>`);
    highRiskAlerts.slice(0, 3).forEach(a => {
      alertText.push(`• ${a.taskTitle}: ${a.riskDescription}`);
    });
  }
  
  if (mediumRiskAlerts.length > 0) {
    alertText.push(`\n🟡 <b>RỦI RO TRUNG BÌNH (${mediumRiskAlerts.length})</b>`);
    mediumRiskAlerts.slice(0, 3).forEach(a => {
      alertText.push(`• ${a.taskTitle}`);
    });
  }

  const message = `
⚠️ <b>CẢNH BÁO RỦI RO AI - ${new Date().toLocaleDateString('vi-VN')}</b>

${alertText.join('\n')}

👉 Xem chi tiết tại trang AI Alerts
  `.trim();

  return await sendTelegramMessage(groupChatId, message);
}

export async function sendWeeklyKPIToGroup(groupChatId: string, departmentName: string, weeklyKPI: number, topPerformers: any[]): Promise<boolean> {
  if (!groupChatId) {
    return false;
  }

  const performersText = topPerformers
    .slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.fullName}: ${p.score.toFixed(1)} điểm`)
    .join('\n');

  const message = `
📊 <b>BÁO CÁO KPI TUẦN - ${departmentName}</b>

📅 Tuần: ${new Date().toLocaleDateString('vi-VN')}
⭐ Điểm KPI trung bình: <b>${weeklyKPI.toFixed(1)}</b>

🏆 <b>Top 5 xuất sắc:</b>
${performersText}

👉 Xem chi tiết tại Dashboard
  `.trim();

  return await sendTelegramMessage(groupChatId, message);
}

export async function sendMonthlyKPIToGroup(groupChatId: string, departmentName: string, monthlyKPI: number, summary: any): Promise<boolean> {
  if (!groupChatId) {
    return false;
  }

  const message = `
📈 <b>BÁO CÁO KPI THÁNG - ${departmentName}</b>

📅 Tháng: ${new Date().getMonth() + 1}/${new Date().getFullYear()}
⭐ Điểm KPI trung bình: <b>${monthlyKPI.toFixed(1)}</b>

📋 Tổng kết:
• Hoàn thành: ${summary.completed} task
• Đang thực hiện: ${summary.inProgress} task
• Quá hạn: ${summary.overdue} task

👉 Xem báo cáo chi tiết tại Dashboard
  `.trim();

  return await sendTelegramMessage(groupChatId, message);
}
