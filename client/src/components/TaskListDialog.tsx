import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Calendar, Clock, User } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";

interface Task {
  id: string;
  taskNumber: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  deadline: string;
  progress: number;
  assignments: Array<{
    id: string;
    fullName: string;
    role: string;
  }>;
}

interface TaskListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  tasks: Task[];
}

const priorityColors = {
  "Khẩn cấp": "destructive",
  "Quan trọng": "default",
  "Bình thường": "secondary",
} as const;

const statusColors = {
  "Chưa bắt đầu": "secondary",
  "Đang thực hiện": "default",
  "Hoàn thành": "outline",
} as const;

export function TaskListDialog({ open, onOpenChange, title, description, tasks }: TaskListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-task-list">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">{title}</DialogTitle>
          {description && (
            <DialogDescription data-testid="text-dialog-description">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-tasks">
              Không có nhiệm vụ nào
            </div>
          ) : (
            tasks.map((task) => {
              const isOverdue = isPast(parseISO(task.deadline)) && task.status !== "Hoàn thành";
              const chuTriUser = task.assignments.find(a => a.role === "Chủ trì");

              return (
                <Card key={task.id} className="hover-elevate" data-testid={`card-task-${task.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base mb-2" data-testid={`text-task-title-${task.id}`}>
                          {task.taskNumber} - {task.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={priorityColors[task.priority as keyof typeof priorityColors] || "secondary"}
                            data-testid={`badge-priority-${task.id}`}
                          >
                            {task.priority}
                          </Badge>
                          <Badge
                            variant={statusColors[task.status as keyof typeof statusColors] || "secondary"}
                            data-testid={`badge-status-${task.id}`}
                          >
                            {task.status}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive" data-testid={`badge-overdue-${task.id}`}>
                              Quá hạn
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span data-testid={`text-deadline-${task.id}`}>
                        Hạn: {format(parseISO(task.deadline), "dd/MM/yyyy", { locale: vi })}
                      </span>
                    </div>
                    
                    {chuTriUser && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span data-testid={`text-lead-${task.id}`}>
                          Chủ trì: {chuTriUser.fullName}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tiến độ</span>
                        <span className="font-medium" data-testid={`text-progress-${task.id}`}>
                          {task.progress}%
                        </span>
                      </div>
                      <Progress value={task.progress} data-testid={`progress-bar-${task.id}`} />
                    </div>

                    <Link href={`/tasks/${task.id}`}>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        data-testid={`button-view-task-${task.id}`}
                      >
                        Xem chi tiết
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
