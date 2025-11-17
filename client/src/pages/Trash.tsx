import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Trash2,
  RotateCcw,
  Calendar,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, fetchJson } from "@/lib/queryClient";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type TaskAssignment = {
  id: string;
  fullName: string;
  role: string;
  assignmentRole: "Chủ trì" | "Phối hợp" | "Chỉ đạo";
};

type Task = {
  id: string;
  taskNumber: string;
  title: string;
  description: string | null;
  deadline: string;
  priority: "Khẩn cấp" | "Quan trọng" | "Bình thường";
  status: string;
  progress: number;
  deletedAt: string | null;
  deletedById: string | null;
  assignments: TaskAssignment[];
};

export default function Trash() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [restoreTaskId, setRestoreTaskId] = useState<string | null>(null);

  // AUTHENTICATED: Fetch deleted tasks
  const { data: deletedTasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/trash"],
    queryFn: () => fetchJson<Task[]>("/api/tasks/trash"),
    enabled: !!user,
  });

  const restoreTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/restore`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
      toast({
        title: "Đã khôi phục",
        description: "Nhiệm vụ đã được khôi phục thành công",
      });
      setRestoreTaskId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
      setRestoreTaskId(null);
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Khẩn cấp":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Quan trọng":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Hoàn thành":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Đang thực hiện":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const leadAssignment = (task: Task) => {
    return task.assignments.find((a) => a.assignmentRole === "Chủ trì");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Trash2 className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Thùng rác</h1>
          <p className="text-muted-foreground">
            Các nhiệm vụ đã xóa ({deletedTasks.length})
          </p>
        </div>
      </div>

      {deletedTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trash2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground" data-testid="text-empty-trash">
              Thùng rác trống
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Các nhiệm vụ đã xóa sẽ xuất hiện ở đây
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deletedTasks.map((task) => {
            const lead = leadAssignment(task);
            const deadlineDate = new Date(task.deadline);
            const deletedDate = task.deletedAt ? new Date(task.deletedAt) : null;

            return (
              <Card key={task.id} className="hover-elevate" data-testid={`card-task-${task.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="font-mono" data-testid={`badge-task-number-${task.id}`}>
                          {task.taskNumber}
                        </Badge>
                        <Badge className={getPriorityColor(task.priority)} data-testid={`badge-priority-${task.id}`}>
                          {task.priority}
                        </Badge>
                        <Badge className={getStatusColor(task.status)} data-testid={`badge-status-${task.id}`}>
                          {task.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl mb-2" data-testid={`text-task-title-${task.id}`}>
                        {task.title}
                      </CardTitle>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {task.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {lead && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span data-testid={`text-lead-${task.id}`}>{lead.fullName}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span data-testid={`text-deadline-${task.id}`}>
                            {format(deadlineDate, "dd/MM/yyyy", { locale: vi })}
                          </span>
                        </div>
                        {deletedDate && (
                          <div className="flex items-center gap-1">
                            <Trash2 className="h-4 w-4" />
                            <span data-testid={`text-deleted-${task.id}`}>
                              Đã xóa: {format(deletedDate, "dd/MM/yyyy HH:mm", { locale: vi })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRestoreTaskId(task.id)}
                      data-testid={`button-restore-${task.id}`}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Khôi phục
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Tiến độ:</span>
                    <Progress value={task.progress} className="flex-1" />
                    <span className="text-sm font-medium" data-testid={`text-progress-${task.id}`}>
                      {task.progress}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreTaskId} onOpenChange={(open) => !open && setRestoreTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận khôi phục</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn khôi phục nhiệm vụ này không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreTaskId && restoreTaskMutation.mutate(restoreTaskId)}
              disabled={restoreTaskMutation.isPending}
              data-testid="button-confirm-restore"
            >
              {restoreTaskMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Khôi phục"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
