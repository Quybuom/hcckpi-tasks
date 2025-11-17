import { AIAlertCard } from "../AIAlertCard";

export default function AIAlertCardExample() {
  const handleAccept = (id: string) => {
    console.log(`Alert ${id} accepted`);
  };

  const handleDismiss = (id: string) => {
    console.log(`Alert ${id} dismissed`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-background">
      <AIAlertCard
        id="1"
        type="deadline_risk"
        taskTitle="Báo cáo tình hình thực hiện nhiệm vụ tháng 11"
        reason="Còn 2 ngày đến hạn nhưng tiến độ mới đạt 35%"
        suggestion="Đề xuất họp nhóm để đẩy nhanh tiến độ hoặc xin gia hạn thêm 3 ngày"
        createdAt={new Date()}
        onAccept={() => handleAccept("1")}
        onDismiss={() => handleDismiss("1")}
      />
      <AIAlertCard
        id="2"
        type="overload"
        taskTitle="Cập nhật hệ thống quản lý hồ sơ điện tử"
        reason="Người được giao có 6 nhiệm vụ đang thực hiện (vượt ngưỡng 5)"
        suggestion="Gợi ý phân công lại cho Trần Văn Bình (đang có 2 nhiệm vụ)"
        createdAt={new Date(Date.now() - 3600000)}
        onAccept={() => handleAccept("2")}
        onDismiss={() => handleDismiss("2")}
      />
      <AIAlertCard
        id="3"
        type="no_update"
        taskTitle="Tập huấn sử dụng phần mềm mới"
        reason="Không có cập nhật tiến độ trong 4 ngày liên tục"
        createdAt={new Date(Date.now() - 7200000)}
        onDismiss={() => handleDismiss("3")}
      />
      <AIAlertCard
        id="4"
        type="low_performance"
        taskTitle="Kiểm tra và cập nhật quy trình"
        reason="Hiệu suất hoàn thành nhiệm vụ thấp hơn 30% so với trung bình"
        suggestion="Đề xuất tổ chức buổi trao đổi để hiểu rõ khó khăn và hỗ trợ"
        createdAt={new Date(Date.now() - 10800000)}
        onAccept={() => handleAccept("4")}
        onDismiss={() => handleDismiss("4")}
      />
    </div>
  );
}
