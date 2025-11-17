import { TaskCard } from "../TaskCard";

export default function TaskCardExample() {
  const handleClick = () => {
    console.log("Task card clicked");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-background">
      <TaskCard
        id="1"
        title="Báo cáo tình hình thực hiện nhiệm vụ tháng 11"
        description="Tổng hợp và báo cáo kết quả thực hiện công việc của phòng trong tháng 11/2024"
        deadline={new Date(2024, 10, 25)}
        priority="Khẩn cấp"
        status="Đang thực hiện"
        progress={65}
        assignee={{
          name: "Nguyễn Văn An",
          initials: "NVA",
        }}
        collaborators={2}
        onClick={handleClick}
      />
      <TaskCard
        id="2"
        title="Cập nhật hệ thống quản lý hồ sơ điện tử"
        deadline={new Date(2024, 11, 15)}
        priority="Quan trọng"
        status="Chưa bắt đầu"
        progress={0}
        assignee={{
          name: "Trần Thị Bình",
          initials: "TTB",
        }}
        onClick={handleClick}
      />
      <TaskCard
        id="3"
        title="Tập huấn sử dụng phần mềm mới"
        description="Tổ chức tập huấn cho toàn bộ cán bộ về phần mềm quản lý nhiệm vụ"
        deadline={new Date(2024, 10, 20)}
        priority="Bình thường"
        status="Quá hạn"
        progress={80}
        assignee={{
          name: "Lê Văn Cường",
          initials: "LVC",
        }}
        collaborators={5}
        onClick={handleClick}
      />
    </div>
  );
}
