import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import { useToast } from "@/hooks/use-toast";

export function useEvaluationMutation(taskId: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (leadershipScore: number) => {
      const response = await apiRequest("PATCH", `/api/tasks/${taskId}/evaluation`, {
        leadershipScore,
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all task-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/evaluations"] });
      toast({
        title: "Đã lưu đánh giá",
        description: "Điểm đánh giá lãnh đạo đã được cập nhật",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể lưu đánh giá",
        variant: "destructive",
      });
    },
  });
}
