import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Users,
  CheckCircle2,
  Circle,
  Plus,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  Flag,
  Calendar,
  Info,
} from "lucide-react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { STATUS_VARIANTS, PRIORITY_VARIANTS, type TaskStatus, type TaskPriority } from "@/lib/badge-variants";

const mockMainTask = {
  taskNumber: "#25-003",
  title: "Tổ chức hội nghị tổng kết quý I năm 2025",
  description: "Chuẩn bị và tổ chức hội nghị tổng kết công tác quý I, đánh giá kết quả thực hiện nhiệm vụ và đề ra kế hoạch quý II.",
  status: "Đang thực hiện",
  priority: "Quan trọng",
  deadline: "2025-03-30",
  progress: 45,
  createdBy: "Nguyễn Văn A (Giám đốc)",
  assignedTo: [
    { name: "Trần Thị B", role: "Chủ trì" },
    { name: "Lê Văn C", role: "Phối hợp" },
  ],
};

const mockSubTasks = [
  {
    taskNumber: "#25-003-01",
    displayNumber: "3.1",
    title: "Chuẩn bị tài liệu hội nghị",
    status: "Hoàn thành",
    priority: "Quan trọng",
    deadline: "2025-03-15",
    progress: 100,
    assignedTo: "Trần Thị B",
    hasSubTasks: true,
    expanded: true,
    breadcrumb: ["#25-003 Tổ chức hội nghị", "3.1 Chuẩn bị tài liệu"],
    children: [
      {
        taskNumber: "#25-003-01-01",
        displayNumber: "3.1.1",
        title: "Soạn thảo báo cáo tổng kết",
        status: "Hoàn thành",
        priority: "Bình thường",
        deadline: "2025-03-10",
        progress: 100,
        assignedTo: "Nguyễn Văn D",
        breadcrumb: ["#25-003 Tổ chức hội nghị", "3.1 Chuẩn bị tài liệu", "3.1.1 Soạn thảo báo cáo"],
      },
      {
        taskNumber: "#25-003-01-02",
        displayNumber: "3.1.2",
        title: "Thu thập số liệu từ các phòng ban",
        status: "Hoàn thành",
        priority: "Bình thường",
        deadline: "2025-03-12",
        progress: 100,
        assignedTo: "Phạm Thị E",
        breadcrumb: ["#25-003 Tổ chức hội nghị", "3.1 Chuẩn bị tài liệu", "3.1.2 Thu thập số liệu"],
      },
    ],
  },
  {
    taskNumber: "#25-003-02",
    displayNumber: "3.2",
    title: "Đặt phòng họp và thiết bị",
    status: "Hoàn thành",
    priority: "Bình thường",
    deadline: "2025-03-20",
    progress: 100,
    assignedTo: "Lê Văn C",
    hasSubTasks: false,
    breadcrumb: ["#25-003 Tổ chức hội nghị", "3.2 Đặt phòng họp"],
  },
  {
    taskNumber: "#25-003-03",
    displayNumber: "3.3",
    title: "Gửi thư mời và xác nhận khách mời",
    status: "Đang thực hiện",
    priority: "Quan trọng",
    deadline: "2025-03-25",
    progress: 60,
    assignedTo: "Trần Thị B",
    hasSubTasks: false,
    breadcrumb: ["#25-003 Tổ chức hội nghị", "3.3 Gửi thư mời"],
  },
  {
    taskNumber: "#25-003-04",
    displayNumber: "3.4",
    title: "Chuẩn bị đồ ăn và nước uống",
    status: "Chưa bắt đầu",
    priority: "Bình thường",
    deadline: "2025-03-28",
    progress: 0,
    assignedTo: "Lê Văn C",
    hasSubTasks: false,
    breadcrumb: ["#25-003 Tổ chức hội nghị", "3.4 Chuẩn bị đồ ăn"],
  },
  {
    taskNumber: "#25-003-05",
    displayNumber: "3.5",
    title: "Kiểm tra và thử nghiệm thiết bị kỹ thuật",
    status: "Chưa bắt đầu",
    priority: "Khẩn cấp",
    deadline: "2025-03-29",
    progress: 0,
    assignedTo: "Nguyễn Văn D",
    hasSubTasks: false,
    breadcrumb: ["#25-003 Tổ chức hội nghị", "3.5 Kiểm tra thiết bị"],
  },
];

const statusIcons = {
  "Chưa bắt đầu": Circle,
  "Đang thực hiện": Clock,
  "Hoàn thành": CheckCircle2,
  "Quá hạn": Circle,
  "Tạm dừng": Circle,
} as const;

function SubTaskItem({ task, level = 0 }: { task: any; level?: number }) {
  const [expanded, setExpanded] = useState(task.expanded || false);
  const StatusIcon = statusIcons[task.status as TaskStatus] || Circle;
  const indent = level * 24;

  return (
    <div>
      <div
        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover-elevate"
        style={{ marginLeft: `${indent}px` }}
        data-testid={`subtask-item-${task.taskNumber}`}
      >
        {task.hasSubTasks && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setExpanded(!expanded)}
            data-testid={`button-toggle-${task.taskNumber}`}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
        {!task.hasSubTasks && <div className="w-6" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="font-mono text-xs cursor-help">
                    {task.displayNumber}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-semibold mb-1">Mã đầy đủ: {task.taskNumber}</div>
                    <div className="text-muted-foreground">
                      {task.breadcrumb?.map((crumb: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1">
                          {idx > 0 && <ChevronRight className="h-3 w-3" />}
                          <span>{crumb}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="font-medium text-sm">{task.title}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{task.assignedTo}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{task.deadline}</span>
            </div>
            <Badge variant={STATUS_VARIANTS[task.status as TaskStatus]} className="text-xs">
              <StatusIcon className="h-3 w-3 mr-1" />
              {task.status}
            </Badge>
            <Badge variant={PRIORITY_VARIANTS[task.priority as TaskPriority]} className="text-xs">
              <Flag className="h-3 w-3 mr-1" />
              {task.priority}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-24">
            <Progress value={task.progress} className="h-2" />
            <span className="text-xs text-muted-foreground">{task.progress}%</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-edit-${task.taskNumber}`}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-delete-${task.taskNumber}`}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {expanded && task.children && (
        <div className="mt-2 space-y-2">
          {task.children.map((child: any) => (
            <SubTaskItem key={child.taskNumber} task={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaskDetailPrototype() {
  const StatusIcon = statusIcons[mockMainTask.status as TaskStatus] || Circle;

  const completedSubTasks = mockSubTasks.filter(t => t.status === "Hoàn thành").length;
  const totalSubTasks = mockSubTasks.length;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Chi tiết nhiệm vụ</h1>
            <p className="text-muted-foreground">Xem và quản lý thông tin nhiệm vụ</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" data-testid="button-cancel">
              Hủy
            </Button>
            <Button data-testid="button-save">
              Lưu thay đổi
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="font-mono">
                    {mockMainTask.taskNumber}
                  </Badge>
                  <Badge variant={STATUS_VARIANTS[mockMainTask.status as TaskStatus]}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {mockMainTask.status}
                  </Badge>
                  <Badge variant={PRIORITY_VARIANTS[mockMainTask.priority as TaskPriority]}>
                    <Flag className="h-3 w-3 mr-1" />
                    {mockMainTask.priority}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{mockMainTask.title}</CardTitle>
              </div>
              <Button variant="outline" data-testid="button-edit-main">
                <Edit className="h-4 w-4" />
                Chỉnh sửa
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Mô tả</h3>
              <p className="text-muted-foreground">{mockMainTask.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Hạn hoàn thành
                </h3>
                <p className="text-muted-foreground">{mockMainTask.deadline}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Người tạo
                </h3>
                <p className="text-muted-foreground">{mockMainTask.createdBy}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Người thực hiện</h3>
              <div className="flex gap-2 flex-wrap">
                {mockMainTask.assignedTo.map((person, idx) => (
                  <Badge key={idx} variant="secondary">
                    {person.name} ({person.role})
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Tiến độ tổng thể</h3>
                <span className="text-sm text-muted-foreground">
                  {mockMainTask.progress}% (Tự động tính từ {completedSubTasks}/{totalSubTasks} nhiệm vụ con)
                </span>
              </div>
              <Progress value={mockMainTask.progress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Nhiệm vụ con ({totalSubTasks})</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Quản lý các nhiệm vụ nhỏ trong nhiệm vụ chính
                </p>
              </div>
              <Button data-testid="button-add-subtask">
                <Plus className="h-4 w-4" />
                Thêm nhiệm vụ con
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="mb-4 p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-6">
                  <div>
                    <span className="text-muted-foreground">Hoàn thành:</span>{" "}
                    <span className="font-semibold text-green-600">{completedSubTasks}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Đang thực hiện:</span>{" "}
                    <span className="font-semibold text-cyan-600">
                      {mockSubTasks.filter(t => t.status === "Đang thực hiện").length}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Chưa bắt đầu:</span>{" "}
                    <span className="font-semibold text-orange-600">
                      {mockSubTasks.filter(t => t.status === "Chưa bắt đầu").length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {mockSubTasks.map(task => (
                <SubTaskItem key={task.taskNumber} task={task} />
              ))}
            </div>

            {mockSubTasks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Circle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Chưa có nhiệm vụ con nào</p>
                <p className="text-sm">Nhấn "Thêm nhiệm vụ con" để bắt đầu</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lưu ý thiết kế - Cách đánh số ngắn gọn & khoa học</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold mb-1 text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Số thứ tự ngắn gọn trên giao diện
              </h4>
              <p className="text-blue-700 dark:text-blue-300 mb-2">
                Giao diện hiển thị số ngắn: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">3.1</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">3.2</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">3.1.1</code> thay vì #25-003-01
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                <strong>Hover chuột vào số</strong> để xem mã đầy đủ (#25-003-01) và đường dẫn phân cấp
              </p>
            </div>

            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
              <h4 className="font-semibold mb-1 text-purple-900 dark:text-purple-100">
                ✓ Database lưu số đầy đủ
              </h4>
              <p className="text-purple-700 dark:text-purple-300">
                Hệ thống lưu mã đầy đủ #25-003-01-01 để kiểm toán, truy xuất, báo cáo. Chỉ giao diện hiển thị ngắn gọn.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <h4 className="font-semibold mb-1 text-green-900 dark:text-green-100">
                ✓ Tiến độ tự động tính toán
              </h4>
              <p className="text-green-700 dark:text-green-300">
                Hoàn thành 2/5 nhiệm vụ con → Nhiệm vụ chính tự động 40% (có thể chỉnh thủ công nếu cần)
              </p>
            </div>

            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <h4 className="font-semibold mb-1 text-orange-900 dark:text-orange-100">
                ✓ Liên kết phân cấp rõ ràng
              </h4>
              <p className="text-orange-700 dark:text-orange-300">
                Indentation (thụt lề) + Tooltip breadcrumb hiển thị mối quan hệ cha-con một cách khoa học và trực quan
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 border-2 border-cyan-300 dark:border-cyan-700">
              <h4 className="font-semibold mb-2 text-cyan-900 dark:text-cyan-100">
                💡 Ví dụ cụ thể:
              </h4>
              <div className="space-y-1 text-cyan-800 dark:text-cyan-200">
                <div>• Nhiệm vụ chính: <strong>#25-003</strong> (hiển thị #25-003)</div>
                <div className="ml-4">• Nhiệm vụ con 1: <strong>#25-003-01</strong> (hiển thị 3.1)</div>
                <div className="ml-8">• Nhiệm vụ cháu 1: <strong>#25-003-01-01</strong> (hiển thị 3.1.1)</div>
                <div className="ml-8">• Nhiệm vụ cháu 2: <strong>#25-003-01-02</strong> (hiển thị 3.1.2)</div>
                <div className="ml-4">• Nhiệm vụ con 2: <strong>#25-003-02</strong> (hiển thị 3.2)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
