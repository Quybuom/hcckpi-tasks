import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  Clock,
  User,
  Users,
  Edit2,
  Save,
  X,
  MessageSquare,
  Paperclip,
  TrendingUp,
  CheckSquare,
  CheckCircle,
  Plus,
  Download,
  Upload,
  Loader2,
  FileText,
  Star,
  ChevronLeft,
  Eye,
  Trash2,
  AlertCircle,
  Info,
  Building2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, fetchJson } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  STATUS_VARIANTS,
  PRIORITY_VARIANTS,
  ROLE_VARIANTS,
  type TaskStatus,
  type TaskPriority,
  type AssignmentRole,
} from "@/lib/badge-variants";

type TaskDetail = {
  id: string;
  taskNumber: string;
  title: string;
  description: string | null;
  deadline: string;
  priority: "Khẩn cấp" | "Quan trọng" | "Bình thường";
  status: string;
  progress: number;
  createdById: string;
  departmentId: string | null;
  parentTaskId: string | null;
  completedAt: string | null;
  // REMOVED: leadershipScore, evaluatedById, evaluatedAt (legacy task-level evaluation fields)
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    fullName: string;
    role: string;
    position: string | null;
  } | null;
  assignments: Array<{
    id: string;
    fullName: string;
    role: string;
    position: string | null;
    assignmentRole: "Chủ trì" | "Phối hợp" | "Chỉ đạo";
    assignmentId: string;
    collaborationCompleted: boolean;
    evaluationScore: number | null;
    evaluationComments: string | null;
    evaluatedBy: string | null;
    evaluatedAt: string | null;
  }>;
};

type Comment = {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
  } | null;
};

type FileRecord = {
  id: string;
  taskId: string;
  userId: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
};

type ProgressUpdate = {
  id: string;
  taskId: string;
  userId: string;
  updateType: string;
  content: string | null;
  progressPercent: number | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
  } | null;
};

type ChecklistItem = {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
};

/**
 * Calculate completion score based on task status and deadline
 * (Mirror of backend logic in server/kpi.ts)
 */
function calculateCompletionScore(task: TaskDetail): number {
  const now = new Date();
  const deadline = new Date(task.deadline);
  const daysDiff = Math.floor(
    (now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (task.status === "Hoàn thành") {
    if (task.completedAt) {
      const completedAt = new Date(task.completedAt);
      const completionDaysDiff = Math.floor(
        (completedAt.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (completionDaysDiff < -7) return 120;
      else if (completionDaysDiff < 0) return 110;
      else if (completionDaysDiff === 0) return 100;
      else if (completionDaysDiff <= 3) return 90;
      else return 80;
    }
    return 100;
  }

  if (task.status === "Đang thực hiện") {
    if (daysDiff > 0) return 0;
    return 50 + (task.progress || 0) * 0.5;
  }

  if (task.status === "Chưa bắt đầu") {
    if (daysDiff > 0) return 0;
    return 30;
  }

  return 0;
}

/**
 * Calculate maximum allowed leadership score based on task performance
 * (Mirror of backend logic in server/kpi.ts)
 */
function calculateMaxLeadershipScore(completionScore: number): number {
  if (completionScore >= 110) return 10; // Sớm >=1 ngày
  if (completionScore >= 100) return 8; // Đúng hạn
  if (completionScore >= 90) return 6; // Trễ 1-3 ngày
  if (completionScore >= 80) return 4; // Trễ >3 ngày
  if (completionScore > 0) return 2; // Đang làm, chậm
  return 1; // Quá hạn chưa bắt đầu
}

/**
 * Get explanation text for leadership score cap
 */
function getLeadershipScoreCapExplanation(completionScore: number): string {
  if (completionScore >= 110)
    return "Hoàn thành sớm >=1 ngày - Điểm tối đa: 10";
  if (completionScore >= 100) return "Hoàn thành đúng hạn - Điểm tối đa: 8";
  if (completionScore >= 90) return "Hoàn thành trễ 1-3 ngày - Điểm tối đa: 6";
  if (completionScore >= 80) return "Hoàn thành trễ >3 ngày - Điểm tối đa: 4";
  if (completionScore > 0)
    return "Đang thực hiện nhưng chậm tiến độ - Điểm tối đa: 2";
  return "Quá hạn chưa bắt đầu - Điểm tối đa: 1";
}

// Helper function to get role priority for sorting
// Lower number = higher priority (appears first in list)
function getRoleOrder(role: string): number {
  const roleOrder: { [key: string]: number } = {
    "Giám đốc": 1,
    "Phó Giám đốc": 2,
    "Trưởng phòng": 3,
    "Phó trưởng phòng": 4,
    "Chuyên viên": 5,
  };
  return roleOrder[role] || 999;
}

// Helper function to sort users by role hierarchy
function sortUsersByRole<T extends { role: string; fullName: string }>(users: T[]): T[] {
  return [...users].sort((a, b) => {
    const roleOrderDiff = getRoleOrder(a.role) - getRoleOrder(b.role);
    if (roleOrderDiff !== 0) return roleOrderDiff;
    // If same role, sort alphabetically by full name
    return a.fullName.localeCompare(b.fullName, 'vi');
  });
}

export default function TaskDetail() {
  const params = useParams();
  const taskId = params.id;
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedPriority, setEditedPriority] = useState("");
  const [editedDeadline, setEditedDeadline] = useState("");
  const [noDeadline, setNoDeadline] = useState(false);
  // REMOVED: editedLeadershipScore state (legacy task-level evaluation)

  const [newComment, setNewComment] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [lastViewedTimes, setLastViewedTimes] = useState<
    Record<string, number>
  >({});
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState("");
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [showDeleteTaskDialog, setShowDeleteTaskDialog] = useState(false);
  const [editingAssignmentScores, setEditingAssignmentScores] = useState<
    Record<string, string>
  >({});
  const [editingAssignmentComments, setEditingAssignmentComments] = useState<
    Record<string, string>
  >({});
  const [editAssignmentsDialogOpen, setEditAssignmentsDialogOpen] =
    useState(false);
  const [selectedUsers, setSelectedUsers] = useState<
    Record<string, "Chủ trì" | "Phối hợp" | "Chỉ đạo">
  >({});

  const getLastViewedKey = (tab: string) => `task-${taskId}-${tab}-lastViewed`;

  useEffect(() => {
    if (typeof window === "undefined" || !taskId) return;
    const tabs = ["progress", "comments", "files"];
    const times: Record<string, number> = {};
    tabs.forEach((tab) => {
      const stored = localStorage.getItem(getLastViewedKey(tab));
      times[tab] = stored ? parseInt(stored, 10) : 0;
    });
    setLastViewedTimes(times);
  }, [taskId]);

  const hasNewContent = (
    items: Array<{ createdAt: string }>,
    tab: string,
  ): boolean => {
    if (items.length === 0) return false;
    const lastViewed = lastViewedTimes[tab] || 0;
    const maxCreatedAt = Math.max(
      ...items.map((item) => new Date(item.createdAt).getTime()),
    );
    return maxCreatedAt > lastViewed;
  };

  // AUTHENTICATED: Fetch task details
  const { data: task, isLoading } = useQuery<TaskDetail>({
    queryKey: [`/api/tasks/${taskId}`],
    queryFn: () => fetchJson<TaskDetail>(`/api/tasks/${taskId}`),
    enabled: !!taskId,
  });

  // AUTHENTICATED: Fetch comments
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/tasks/${taskId}/comments`],
    queryFn: () => fetchJson<Comment[]>(`/api/tasks/${taskId}/comments`),
    enabled: !!taskId,
  });

  // AUTHENTICATED: Fetch files
  const { data: files = [] } = useQuery<FileRecord[]>({
    queryKey: [`/api/tasks/${taskId}/files`],
    queryFn: () => fetchJson<FileRecord[]>(`/api/tasks/${taskId}/files`),
    enabled: !!taskId,
  });

  // AUTHENTICATED: Fetch progress updates
  const { data: progressUpdates = [] } = useQuery<ProgressUpdate[]>({
    queryKey: [`/api/tasks/${taskId}/progress`],
    queryFn: () => fetchJson<ProgressUpdate[]>(`/api/tasks/${taskId}/progress`),
    enabled: !!taskId,
  });

  // AUTHENTICATED: Fetch checklist items
  const { data: checklistItems = [] } = useQuery<ChecklistItem[]>({
    queryKey: [`/api/tasks/${taskId}/checklist`],
    queryFn: () => fetchJson<ChecklistItem[]>(`/api/tasks/${taskId}/checklist`),
    enabled: !!taskId,
  });

  // Fetch evaluator lookup for permission checks
  type EvaluatorLookup = Array<{
    assignmentId: string;
    evaluator: {
      id: string;
      fullName: string;
      role: string;
    } | null;
  }>;

  // AUTHENTICATED: Fetch assignment evaluators
  const { data: evaluatorLookup = [] } = useQuery<EvaluatorLookup>({
    queryKey: [`/api/tasks/${taskId}/assignment-evaluators`],
    queryFn: () =>
      fetchJson<EvaluatorLookup>(`/api/tasks/${taskId}/assignment-evaluators`),
    enabled: !!taskId && !!task,
  });

  // AUTHENTICATED: Fetch subtasks (if this task is a parent)
  type SubtaskSummary = {
    id: string;
    taskNumber: string;
    title: string;
    status: string;
    priority: string;
    progress: number;
    deadline: string;
  };
  const { data: subtasks = [] } = useQuery<SubtaskSummary[]>({
    queryKey: ["/api/tasks", taskId, "subtasks"],
    queryFn: () => fetchJson<SubtaskSummary[]>(`/api/tasks/${taskId}/subtasks`),
    enabled: !!taskId,
  });

  // AUTHENTICATED: Fetch parent task info (if this task is a subtask)
  const { data: parentTask } = useQuery<TaskDetail>({
    queryKey: ["/api/tasks", task?.parentTaskId],
    queryFn: () => fetchJson<TaskDetail>(`/api/tasks/${task?.parentTaskId}`),
    enabled: !!task?.parentTaskId,
  });

  // AUTHENTICATED: Fetch all users for edit assignments dialog
  const isDirectorOrDeputy =
    user?.role === "Giám đốc" || user?.role === "Phó Giám đốc";
  // Determine scope: directors see all, others see department (fallback to task's department)
  const scopeDepartmentId = user?.departmentId || task?.departmentId;

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<
    Array<{
      id: string;
      fullName: string;
      role: string;
      departmentId: string | null;
      departmentName: string | null;
    }>
  >({
    queryKey: isDirectorOrDeputy
      ? ["/api/users"]
      : ["/api/users", { departmentId: scopeDepartmentId }],
    queryFn: () => {
      // Directors/Deputies see all users
      if (isDirectorOrDeputy) {
        return fetchJson("/api/users");
      }
      // Others see department-scoped users (own or task's department)
      if (!scopeDepartmentId) {
        throw new Error("Không thể xác định phạm vi truy cập");
      }
      return fetchJson(`/api/users?departmentId=${scopeDepartmentId}`);
    },
    enabled:
      editAssignmentsDialogOpen &&
      !!user &&
      (isDirectorOrDeputy || !!scopeDepartmentId),
  });

  // AUTHENTICATED: Fetch all departments for edit assignments dialog
  type Department = {
    id: string;
    name: string;
  };
  const { data: allDepartments = [], isLoading: departmentsLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: () => fetchJson<Department[]>("/api/departments"),
    enabled: editAssignmentsDialogOpen && isDirectorOrDeputy,
  });

  // Initialize selectedUsers from task.assignments when dialog opens
  useEffect(() => {
    if (editAssignmentsDialogOpen && task?.assignments) {
      const roleMap: Record<string, "Chủ trì" | "Phối hợp" | "Chỉ đạo"> = {};
      let chuTriCount = 0;

      // First pass: build map and count Chủ trì
      task.assignments.forEach((a) => {
        roleMap[a.id] = a.assignmentRole;
        if (a.assignmentRole === "Chủ trì") chuTriCount++;
      });

      // If multiple Chủ trì, demote extras to Phối hợp (keep first one)
      if (chuTriCount > 1) {
        let kept = false;
        Object.keys(roleMap).forEach((userId) => {
          if (roleMap[userId] === "Chủ trì") {
            if (kept) {
              roleMap[userId] = "Phối hợp";
            } else {
              kept = true;
            }
          }
        });
      }

      setSelectedUsers(roleMap);
    } else if (!editAssignmentsDialogOpen) {
      // Clear state when dialog closes
      setSelectedUsers({});
    }
  }, [editAssignmentsDialogOpen, task?.assignments]);

  // REMOVED: useEffect watching task.leadershipScore (legacy task-level evaluation)

  useEffect(() => {
    let objectUrl: string | null = null;
    let isMounted = true;

    async function fetchPreview() {
      if (!previewFile) {
        if (isMounted) {
          setPreviewUrl(null);
        }
        return;
      }

      try {
        const response = await fetch(`/api/files/${previewFile.id}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load preview");
        }

        const blob = await response.blob();

        if (isMounted) {
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
        } else if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Preview error:", error);
          toast({
            title: "Lỗi",
            description: "Không thể tải xem trước file",
            variant: "destructive",
          });
          setPreviewFile(null);
        }
      }
    }

    fetchPreview();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [previewFile]);

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await apiRequest(
        "PATCH",
        `/api/tasks/${taskId}`,
        updates,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      // If this is a subtask, also invalidate parent task cache
      if (task?.parentTaskId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/tasks/${task.parentTaskId}`],
        });
      }
      toast({ title: "Đã cập nhật nhiệm vụ" });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // REMOVED: Legacy task-level evaluation mutation (replaced by per-assignment evaluation)

  const updateAssignmentEvaluationMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      score,
      comments,
    }: {
      assignmentId: string;
      score: number;
      comments?: string | null;
    }) => {
      const response = await apiRequest(
        "PUT",
        `/api/tasks/${taskId}/assignments/${assignmentId}/evaluation`,
        { score, comments },
      );
      const result = await response.json();
      return result;
    },
    onSuccess: async (_data, variables) => {
      // Force immediate refetch and WAIT for it to complete
      await queryClient.refetchQueries({ queryKey: [`/api/tasks/${taskId}`] });
      await queryClient.refetchQueries({
        queryKey: [`/api/tasks/${taskId}/assignment-evaluators`],
      });
      // Refetch all evaluation-related queries (matches MyTasks tab "Đánh giá")
      await queryClient.refetchQueries({
        queryKey: ["/api/tasks/evaluations"],
      });
      await queryClient.refetchQueries({
        queryKey: ["/api/tasks/evaluations?view=assignments"],
      });

      // Then reset editing state
      setEditingAssignmentScores((prev) => {
        const newState = { ...prev };
        delete newState[variables.assignmentId];
        return newState;
      });
      setEditingAssignmentComments((prev) => {
        const newState = { ...prev };
        delete newState[variables.assignmentId];
        return newState;
      });

      toast({ title: "Đã lưu đánh giá" });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/tasks/${taskId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/trash"] });
      toast({
        title: "Đã xóa nhiệm vụ",
        description: "Nhiệm vụ đã được chuyển vào thùng rác",
      });
      window.location.href = "/tasks/my-tasks";
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest(
        "POST",
        `/api/tasks/${taskId}/comments`,
        { content },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/comments`],
      });
      setNewComment("");
      toast({ title: "Đã thêm bình luận" });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadFilesMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`/api/tasks/${taskId}/files`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload thất bại");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/files`],
      });
      toast({ title: "Đã upload file" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addChecklistItemMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest(
        "POST",
        `/api/tasks/${taskId}/checklist`,
        {
          title,
          order: checklistItems.length,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/checklist`],
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      setNewChecklistItem("");
      toast({ title: "Đã thêm công việc" });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: async ({
      itemId,
      completed,
    }: {
      itemId: string;
      completed: boolean;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/tasks/${taskId}/checklist/${itemId}`,
        {
          completed,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/checklist`],
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editChecklistItemMutation = useMutation({
    mutationFn: async ({
      itemId,
      title,
    }: {
      itemId: string;
      title: string;
    }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/tasks/${taskId}/checklist/${itemId}`,
        {
          title,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/checklist`],
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      setEditingItemId(null);
      setEditingItemTitle("");
      toast({ title: "Đã cập nhật" });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật",
        variant: "destructive",
      });
    },
  });

  const deleteChecklistItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiRequest(
        "DELETE",
        `/api/tasks/${taskId}/checklist/${itemId}`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/checklist`],
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      setDeleteItemId(null);
      toast({ title: "Đã xóa" });
    },
    onError: (error: Error) => {
      setDeleteItemId(null);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa",
        variant: "destructive",
      });
    },
  });

  const markCollaborationCompleteMutation = useMutation({
    mutationFn: async ({ assignmentId }: { assignmentId: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/tasks/${taskId}/assignments/${assignmentId}/collaboration-complete`,
        { collaborationCompleted: true },
      );
      return response.json();
    },
    onSuccess: () => {
      // Invalidate task detail and all task list queries
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
      toast({
        title: "Đã đánh dấu",
        description: "Phối hợp hoàn thành",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể đánh dấu hoàn thành",
        variant: "destructive",
      });
    },
  });

  // Update task assignments mutation
  const updateAssignmentsMutation = useMutation({
    mutationFn: async (
      assignments: Array<{ userId: string; role: string }>,
    ) => {
      const response = await apiRequest(
        "PUT",
        `/api/tasks/${taskId}/assignments`,
        { assignments },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/assignment-evaluators`],
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/progress`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setEditAssignmentsDialogOpen(false);
      toast({
        title: "Đã cập nhật",
        description: "Người thực hiện đã được cập nhật",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật người thực hiện",
        variant: "destructive",
      });
    },
  });

  // Role toggle handler (similar to CreateTask)
  const handleRoleToggle = (
    userId: string,
    role: "Chủ trì" | "Phối hợp" | "Chỉ đạo",
  ) => {
    const currentRole = selectedUsers[userId];

    // If clicking the same role checkbox, uncheck (remove user)
    if (currentRole === role) {
      const newSelected = { ...selectedUsers };
      delete newSelected[userId];
      setSelectedUsers(newSelected);
      return;
    }

    // If assigning Chủ trì, demote previous Chủ trì to Phối hợp
    if (role === "Chủ trì") {
      const newSelected: Record<string, "Chủ trì" | "Phối hợp" | "Chỉ đạo"> =
        {};
      Object.entries(selectedUsers).forEach(([id, r]) => {
        if (id !== userId) {
          if (r === "Chủ trì") {
            // Demote previous Chủ trì to Phối hợp
            newSelected[id] = "Phối hợp";
          } else {
            newSelected[id] = r;
          }
        }
      });
      newSelected[userId] = "Chủ trì";
      setSelectedUsers(newSelected);
    } else {
      // Assigning Chỉ đạo or Phối hợp
      setSelectedUsers({
        ...selectedUsers,
        [userId]: role,
      });
    }
  };

  // Get available roles for a user
  const getAvailableRoles = (
    userId: string,
  ): Array<"Chủ trì" | "Phối hợp" | "Chỉ đạo"> => {
    const u = allUsers.find((user) => user.id === userId);
    if (u?.role === "Giám đốc" || u?.role === "Phó Giám đốc") {
      return ["Chỉ đạo", "Chủ trì", "Phối hợp"];
    }
    return ["Chủ trì", "Phối hợp"];
  };

  // Check if user can edit assignments
  const canEditAssignments = (): boolean => {
    if (!task || !user) return false;

    // Case 1: User is task creator
    const isCreator = task.createdById === user.id;
    
    // Case 2: User is leadership (Giám đốc/Phó Giám đốc)
    const isLeadership =
      user.role === "Giám đốc" || user.role === "Phó Giám đốc";
    
    // Case 3 (NEW): User is Department Head AND task was created by Deputy Director
    const isDeptHead = user.role === "Trưởng phòng" || user.role === "Phó Trưởng phòng";
    const creatorIsDeputyDirector = task.createdBy?.role === "Phó Giám đốc";
    const canEditAsDeputyDelegate = isDeptHead && creatorIsDeputyDirector;

    // Must satisfy at least one case
    if (!isCreator && !isLeadership && !canEditAsDeputyDelegate) return false;

    // Task must be "Chưa bắt đầu" OR have no evaluations
    if (task.status === "Chưa bắt đầu") return true;

    // Check if any assignment has evaluations
    const hasEvaluations = task.assignments.some(
      (a) => a.evaluationScore !== null,
    );
    return !hasEvaluations;
  };

  // Handle save assignments
  const handleSaveAssignments = () => {
    // Build assignments array from selectedUsers
    const assignments = Object.entries(selectedUsers).map(([userId, role]) => ({
      userId,
      role,
    }));

    // Validate at least one Chủ trì
    const hasChuTri = assignments.some((a) => a.role === "Chủ trì");
    if (!hasChuTri) {
      toast({
        title: "Lỗi",
        description: "Phải có ít nhất 1 người Chủ trì",
        variant: "destructive",
      });
      return;
    }

    updateAssignmentsMutation.mutate(assignments);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !taskId) return;
    if (activeTab !== "overview") {
      const now = Date.now();
      localStorage.setItem(getLastViewedKey(activeTab), now.toString());
      setLastViewedTimes((prev) => ({ ...prev, [activeTab]: now }));
    }
  }, [activeTab, taskId]);

  // Auto-set deadline when "Không thời hạn" checkbox is toggled during edit
  useEffect(() => {
    if (!isEditing) return; // Only run when in edit mode

    if (noDeadline) {
      // Set deadline to Dec 31 of next year
      const nextYear = new Date().getFullYear() + 1;
      const farFutureDate = `${nextYear}-12-31`;
      setEditedDeadline(farFutureDate);
    }
    // Note: Don't clear deadline when unchecking (user may have manually edited it)
  }, [noDeadline, isEditing]);

  const handleStartEdit = () => {
    if (task) {
      setEditedTitle(task.title);
      setEditedDescription(task.description || "");
      setEditedPriority(task.priority);
      const deadlineStr = new Date(task.deadline).toISOString().split("T")[0];
      setEditedDeadline(deadlineStr);

      // Detect if deadline is Dec 31 of any year (likely "no deadline")
      const deadlineDate = new Date(task.deadline);
      const isDecember31 =
        deadlineDate.getMonth() === 11 && deadlineDate.getDate() === 31;
      setNoDeadline(isDecember31);

      // REMOVED: setEditedLeadershipScore (legacy task-level evaluation)
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    const updates: any = {};
    if (editedTitle !== task?.title) updates.title = editedTitle;
    if (editedDescription !== task?.description)
      updates.description = editedDescription;
    if (editedPriority !== task?.priority) updates.priority = editedPriority;

    const newDeadline = new Date(editedDeadline).toISOString();
    if (newDeadline !== task?.deadline) updates.deadline = newDeadline;

    // REMOVED: Legacy task-level leadership score editing (now using per-assignment evaluation)

    updateTaskMutation.mutate(updates);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFilesMutation.mutate(e.target.files);
    }
  };

  const isLeadership =
    user?.role === "Giám đốc" || user?.role === "Phó Giám đốc";
  const isDeptHead = user?.role === "Trưởng phòng";
  // REMOVED: Legacy task-level canEvaluate (now using per-assignment evaluator lookup)
  const canEdit = task?.createdById === user?.id || isLeadership;

  const getStatusVariant = (status: string) => {
    return (
      STATUS_VARIANTS[status as TaskStatus] || STATUS_VARIANTS["Chưa bắt đầu"]
    );
  };

  const getPriorityVariant = (priority: string) => {
    return (
      PRIORITY_VARIANTS[priority as TaskPriority] ||
      PRIORITY_VARIANTS["Bình thường"]
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Không tìm thấy nhiệm vụ</h2>
          <p className="text-muted-foreground mt-2">
            Nhiệm vụ này có thể đã bị xóa hoặc không tồn tại
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-back"
                onClick={() => {
                  // Fallback to My Tasks if no history (direct link scenario)
                  if (window.history.length <= 1) {
                    window.location.href = "/tasks/my-tasks";
                  } else {
                    window.history.back();
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Quay lại
              </Button>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Badge
                variant="outline"
                className="font-mono"
                data-testid="text-task-number"
              >
                {task.taskNumber}
              </Badge>
              <Badge
                variant={getPriorityVariant(task.priority)}
                data-testid="badge-priority"
              >
                {task.priority}
              </Badge>
              <Badge
                variant={getStatusVariant(task.status)}
                data-testid="badge-status"
              >
                {task.status}
              </Badge>
            </div>
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-3xl font-bold h-auto"
                data-testid="input-edit-title"
              />
            ) : (
              <h1 className="text-3xl font-bold" data-testid="text-task-title">
                {task.title}
              </h1>
            )}
          </div>

          <div className="flex gap-2">
            {/* Create Subtask button - only show if task is not a subtask */}
            {!task.parentTaskId && canEdit && !isEditing && (
              <Button
                variant="outline"
                onClick={() => {
                  // Navigate to Create Task page with parentTaskId
                  setLocation(`/tasks/create?parentTaskId=${task.id}`);
                }}
                data-testid="button-create-subtask"
              >
                <Plus className="h-4 w-4" />
                Tạo NV con
              </Button>
            )}

            {canEdit && !isEditing && (
              <>
                <Button onClick={handleStartEdit} data-testid="button-edit">
                  <Edit2 className="h-4 w-4" />
                  Sửa
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteTaskDialog(true)}
                  data-testid="button-delete-task"
                >
                  <Trash2 className="h-4 w-4" />
                  Xóa
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateTaskMutation.isPending}
                  data-testid="button-save"
                >
                  {updateTaskMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Lưu
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  data-testid="button-cancel-edit"
                >
                  <X className="h-4 w-4" />
                  Hủy
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <FileText className="h-4 w-4 mr-2" />
              Thông tin
            </TabsTrigger>
            <TabsTrigger value="progress" data-testid="tab-progress">
              <TrendingUp className="h-4 w-4 mr-2" />
              Tiến độ
              {hasNewContent(progressUpdates, "progress") && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-2 w-2 p-0 rounded-full"
                  data-testid="badge-new-progress"
                />
              )}
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Bình luận ({comments.length})
              {hasNewContent(comments, "comments") && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-2 w-2 p-0 rounded-full"
                  data-testid="badge-new-comments"
                />
              )}
            </TabsTrigger>
            <TabsTrigger value="files" data-testid="tab-files">
              <Paperclip className="h-4 w-4 mr-2" />
              File ({files.length})
              {hasNewContent(
                files.map((f) => ({ createdAt: f.uploadedAt })),
                "files",
              ) && (
                <Badge
                  variant="destructive"
                  className="ml-2 h-2 w-2 p-0 rounded-full"
                  data-testid="badge-new-files"
                />
              )}
            </TabsTrigger>
            {subtasks.length > 0 && (
              <TabsTrigger value="subtasks" data-testid="tab-subtasks">
                <CheckSquare className="h-4 w-4 mr-2" />
                Nhiệm vụ con ({subtasks.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Parent Task Info (if this is a subtask) */}
            {task.parentTaskId && parentTask && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Info className="h-4 w-4" />
                    Nhiệm vụ con của
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`/tasks/${parentTask.id}`}
                    className="block hover-elevate active-elevate-2 p-3 rounded-lg border bg-card"
                    data-testid="link-parent-task"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {parentTask.taskNumber}
                      </Badge>
                      <Badge
                        variant={
                          STATUS_VARIANTS[parentTask.status as TaskStatus] ||
                          "secondary"
                        }
                      >
                        {parentTask.status}
                      </Badge>
                    </div>
                    <h4
                      className="font-medium text-sm"
                      data-testid="text-parent-task-title"
                    >
                      {parentTask.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(parentTask.deadline).toLocaleDateString(
                            "vi-VN",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{parentTask.progress}%</span>
                      </div>
                    </div>
                  </a>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Chi tiết nhiệm vụ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Mô tả</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={4}
                      data-testid="input-edit-description"
                    />
                  ) : (
                    <p
                      className="text-sm text-muted-foreground mt-1"
                      data-testid="text-description"
                    >
                      {task.description || "Chưa có mô tả"}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Người giao nhiệm vụ
                  </Label>
                  <p className="text-sm mt-1" data-testid="text-task-creator">
                    {task.createdBy
                      ? `${task.createdBy.fullName} (${task.createdBy.role})`
                      : "Không xác định"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Trạng thái (tự động từ checklist)</Label>
                    <p className="text-sm mt-1 text-muted-foreground italic">
                      {task.status}
                    </p>
                  </div>

                  <div>
                    <Label>Độ ưu tiên</Label>
                    {isEditing ? (
                      <Select
                        value={editedPriority}
                        onValueChange={setEditedPriority}
                      >
                        <SelectTrigger data-testid="select-edit-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Khẩn cấp">Khẩn cấp</SelectItem>
                          <SelectItem value="Quan trọng">Quan trọng</SelectItem>
                          <SelectItem value="Bình thường">
                            Bình thường
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm mt-1">{task.priority}</p>
                    )}
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Hạn hoàn thành
                    </Label>
                    {isEditing ? (
                      <>
                        <Input
                          type="date"
                          value={editedDeadline}
                          onChange={(e) => setEditedDeadline(e.target.value)}
                          disabled={noDeadline}
                          data-testid="input-edit-deadline"
                        />
                        <div className="flex items-center space-x-2 mt-2">
                          <Checkbox
                            id="editNoDeadline"
                            checked={noDeadline}
                            onCheckedChange={(checked) =>
                              setNoDeadline(checked === true)
                            }
                            data-testid="checkbox-edit-no-deadline"
                          />
                          <Label
                            htmlFor="editNoDeadline"
                            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Không thời hạn
                          </Label>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm mt-1" data-testid="text-deadline">
                        {new Date(task.deadline).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Tiến độ
                    </Label>
                    <p
                      className="text-sm mt-1"
                      data-testid="text-progress-percent"
                    >
                      {task.progress}%
                    </p>
                  </div>
                </div>

                {/* REMOVED: Legacy task-level leadership score display/editing UI
                    Replaced by per-assignment evaluation system in "Người thực hiện" card below */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Người thực hiện ({task.assignments.length})
                </CardTitle>
                {canEditAssignments() && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditAssignmentsDialogOpen(true)}
                    data-testid="button-edit-assignments"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Sửa người thực hiện
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...task.assignments]
                    .sort((a, b) => {
                      // Sort order: Chỉ đạo -> Chủ trì -> Phối hợp
                      const roleOrder = {
                        "Chỉ đạo": 1,
                        "Chủ trì": 2,
                        "Phối hợp": 3,
                      };
                      return (
                        (roleOrder[
                          a.assignmentRole as keyof typeof roleOrder
                        ] || 999) -
                        (roleOrder[
                          b.assignmentRole as keyof typeof roleOrder
                        ] || 999)
                      );
                    })
                    .map((assignment) => {
                      const isCurrentUserAssignment =
                        assignment.id === user?.id;
                      const isPhoiHop =
                        assignment.assignmentRole === "Phối hợp";
                      const canMarkComplete =
                        isCurrentUserAssignment && isPhoiHop;

                      // Check if current user can evaluate this assignment
                      const evaluatorData = evaluatorLookup.find(
                        (e) => e.assignmentId === assignment.assignmentId,
                      );
                      const isEvaluated = assignment.evaluationScore !== null;
                      const canEvaluate =
                        evaluatorData?.evaluator?.id === user?.id &&
                        task?.status === "Hoàn thành" &&
                        !isEvaluated;

                      // Get current editing score for this assignment
                      const editingScore =
                        editingAssignmentScores[assignment.assignmentId] ??
                        assignment.evaluationScore?.toString() ??
                        "";

                      return (
                        <div
                          key={assignment.id}
                          className="p-3 rounded-lg border bg-card space-y-2"
                          data-testid={`assignment-${assignment.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {assignment.fullName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {assignment.position || assignment.role}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  ROLE_VARIANTS[
                                    assignment.assignmentRole as AssignmentRole
                                  ]
                                }
                                data-testid={`badge-role-${assignment.id}`}
                              >
                                {assignment.assignmentRole}
                              </Badge>
                              {canMarkComplete &&
                                (assignment.collaborationCompleted ? (
                                  <Badge
                                    variant="default"
                                    className="bg-success/10 text-success border-success/20"
                                    data-testid={`badge-collaboration-completed-${assignment.id}`}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Đã phối hợp
                                  </Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (assignment.assignmentId) {
                                        markCollaborationCompleteMutation.mutate(
                                          {
                                            assignmentId:
                                              assignment.assignmentId,
                                          },
                                        );
                                      }
                                    }}
                                    disabled={
                                      markCollaborationCompleteMutation.isPending
                                    }
                                    data-testid={`button-mark-collaboration-${assignment.id}`}
                                  >
                                    {markCollaborationCompleteMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                    )}
                                    Đánh dấu hoàn thành
                                  </Button>
                                ))}
                            </div>
                          </div>

                          {/* Evaluation section - only show for completed tasks */}
                          {task?.status === "Hoàn thành" && (
                            <div className="pl-13 space-y-2">
                              {canEvaluate ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs text-muted-foreground whitespace-nowrap">
                                      Đánh giá:
                                    </Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="10"
                                      step="0.1"
                                      value={editingScore}
                                      onChange={(e) => {
                                        setEditingAssignmentScores((prev) => ({
                                          ...prev,
                                          [assignment.assignmentId]:
                                            e.target.value,
                                        }));
                                      }}
                                      className="w-20 h-8 text-sm"
                                      data-testid={`input-evaluation-${assignment.assignmentId}`}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      /10
                                    </span>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        const score = parseFloat(editingScore);
                                        const comments =
                                          editingAssignmentComments[
                                            assignment.assignmentId
                                          ] || "";
                                        if (
                                          !isNaN(score) &&
                                          score >= 0 &&
                                          score <= 10
                                        ) {
                                          updateAssignmentEvaluationMutation.mutate(
                                            {
                                              assignmentId:
                                                assignment.assignmentId,
                                              score,
                                              comments: comments.trim() || null,
                                            },
                                          );
                                        }
                                      }}
                                      disabled={
                                        updateAssignmentEvaluationMutation.isPending ||
                                        editingScore === "" ||
                                        parseFloat(editingScore) < 0 ||
                                        parseFloat(editingScore) > 10
                                      }
                                      data-testid={`button-save-evaluation-${assignment.assignmentId}`}
                                    >
                                      {updateAssignmentEvaluationMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        "Lưu đánh giá"
                                      )}
                                    </Button>
                                  </div>
                                  <Textarea
                                    placeholder="Nhận xét, ghi chú về đánh giá (không bắt buộc)..."
                                    value={
                                      editingAssignmentComments[
                                        assignment.assignmentId
                                      ] || ""
                                    }
                                    onChange={(e) => {
                                      setEditingAssignmentComments((prev) => ({
                                        ...prev,
                                        [assignment.assignmentId]:
                                          e.target.value,
                                      }));
                                    }}
                                    className="text-sm min-h-[60px]"
                                    data-testid={`textarea-evaluation-comments-${assignment.assignmentId}`}
                                  />
                                </div>
                              ) : isEvaluated ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    <span
                                      className="text-sm font-medium"
                                      data-testid={`text-evaluation-score-${assignment.assignmentId}`}
                                    >
                                      Điểm: {assignment.evaluationScore}/10
                                    </span>
                                  </div>
                                  {assignment.evaluationComments !== null &&
                                    assignment.evaluationComments !==
                                      undefined &&
                                    assignment.evaluationComments !== "" && (
                                      <div
                                        className="text-sm text-muted-foreground bg-muted/30 p-2 rounded border"
                                        data-testid={`text-evaluation-comments-${assignment.assignmentId}`}
                                      >
                                        <p className="text-xs font-medium mb-1">
                                          Nhận xét:
                                        </p>
                                        <p className="whitespace-pre-wrap">
                                          {assignment.evaluationComments ||
                                            "(Không có nhận xét)"}
                                        </p>
                                      </div>
                                    )}
                                  {assignment.evaluatedAt && (
                                    <p
                                      className="text-xs text-muted-foreground"
                                      data-testid={`text-evaluated-at-${assignment.assignmentId}`}
                                    >
                                      Đã đánh giá{" "}
                                      {formatDistanceToNow(
                                        new Date(assignment.evaluatedAt),
                                        { addSuffix: true, locale: vi },
                                      )}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p
                                  className="text-xs text-muted-foreground"
                                  data-testid={`text-not-evaluated-${assignment.assignmentId}`}
                                >
                                  Chưa được đánh giá
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tiến độ tổng quan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Hoàn thành</Label>
                    <span
                      className="text-2xl font-bold"
                      data-testid="text-progress-value"
                    >
                      {task.progress}%
                    </span>
                  </div>
                  <Progress
                    value={task.progress}
                    className="h-3"
                    data-testid="progress-bar"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Checklist (
                      {checklistItems.filter((i) => i.completed).length}/
                      {checklistItems.length})
                    </Label>
                  </div>

                  <div className="space-y-2 mb-3">
                    {checklistItems.map((item) => {
                      // Check if current user is Chủ trì for this task
                      const currentUserId = user?.id;
                      const isChuTri =
                        task?.assignments?.some(
                          (a) =>
                            a.id === currentUserId &&
                            a.assignmentRole === "Chủ trì",
                        ) ?? false;
                      const isEditing = editingItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-2 rounded-lg ${isEditing ? "bg-accent/20 border border-accent" : "hover-elevate"}`}
                          data-testid={`checklist-item-${item.id}`}
                        >
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) =>
                              toggleChecklistMutation.mutate({
                                itemId: item.id,
                                completed: !!checked,
                              })
                            }
                            disabled={isEditing}
                            data-testid={`checkbox-${item.id}`}
                          />
                          {isEditing ? (
                            <>
                              <Input
                                value={editingItemTitle}
                                onChange={(e) =>
                                  setEditingItemTitle(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    editingItemTitle.trim()
                                  ) {
                                    editChecklistItemMutation.mutate({
                                      itemId: item.id,
                                      title: editingItemTitle,
                                    });
                                  } else if (e.key === "Escape") {
                                    setEditingItemId(null);
                                    setEditingItemTitle("");
                                  }
                                }}
                                className="flex-1"
                                disabled={editChecklistItemMutation.isPending}
                                autoFocus
                                data-testid={`input-edit-checklist-${item.id}`}
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (editingItemTitle.trim()) {
                                    editChecklistItemMutation.mutate({
                                      itemId: item.id,
                                      title: editingItemTitle,
                                    });
                                  }
                                }}
                                disabled={
                                  !editingItemTitle.trim() ||
                                  editChecklistItemMutation.isPending
                                }
                                data-testid={`button-save-checklist-${item.id}`}
                              >
                                {editChecklistItemMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-1" />
                                    Lưu
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingItemId(null);
                                  setEditingItemTitle("");
                                }}
                                disabled={editChecklistItemMutation.isPending}
                                data-testid={`button-cancel-edit-checklist-${item.id}`}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Hủy
                              </Button>
                            </>
                          ) : (
                            <>
                              <span
                                className={`flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}
                                data-testid={`text-checklist-${item.id}`}
                              >
                                {item.title}
                              </span>
                              {isChuTri && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setEditingItemTitle(item.title);
                                    }}
                                    data-testid={`button-edit-checklist-${item.id}`}
                                    title="Chỉnh sửa (chỉ Chủ trì)"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setDeleteItemId(item.id)}
                                    data-testid={`button-delete-checklist-${item.id}`}
                                    title="Xóa (chỉ Chủ trì)"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Thêm công việc mới..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && newChecklistItem.trim()) {
                          addChecklistItemMutation.mutate(newChecklistItem);
                        }
                      }}
                      data-testid="input-new-checklist"
                    />
                    <Button
                      onClick={() => {
                        if (newChecklistItem.trim()) {
                          addChecklistItemMutation.mutate(newChecklistItem);
                        }
                      }}
                      disabled={
                        !newChecklistItem.trim() ||
                        addChecklistItemMutation.isPending
                      }
                      data-testid="button-add-checklist"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lịch sử cập nhật</CardTitle>
                <CardDescription>
                  Ghi lại các cập nhật tiến độ, nhận xét và thay đổi quan trọng
                  trong quá trình thực hiện nhiệm vụ
                </CardDescription>
              </CardHeader>
              <CardContent>
                {progressUpdates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Chưa có cập nhật tiến độ
                  </p>
                ) : (
                  <div className="space-y-3">
                    {progressUpdates.map((update) => {
                      const isAssignmentChange = update.updateType === "assignment_changed";
                      
                      return (
                        <div
                          key={update.id}
                          className={`border-l-2 pl-4 py-2 ${
                            isAssignmentChange 
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                              : "border-primary"
                          }`}
                          data-testid={`progress-update-${update.id}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {isAssignmentChange && (
                                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              )}
                              <span className="font-medium text-sm">
                                {update.user?.fullName || "Unknown"}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(update.createdAt), {
                                addSuffix: true,
                                locale: vi,
                              })}
                            </span>
                          </div>
                          {isAssignmentChange && (
                            <Badge variant="outline" className="mb-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                              Thay đổi người thực hiện
                            </Badge>
                          )}
                          {update.progressPercent !== null && (
                            <Badge variant="outline" className="mb-2">
                              Tiến độ: {update.progressPercent}%
                            </Badge>
                          )}
                          {update.content && (
                            <p className="text-sm text-muted-foreground">
                              {update.content}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <AlertDialog
              open={deleteItemId !== null}
              onOpenChange={(open) => !open && setDeleteItemId(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc chắn muốn xóa công việc này? Hành động này không
                    thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">
                    Hủy
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (deleteItemId) {
                        deleteChecklistItemMutation.mutate(deleteItemId);
                      }
                    }}
                    disabled={deleteChecklistItemMutation.isPending}
                    data-testid="button-confirm-delete"
                  >
                    {deleteChecklistItemMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    Xóa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bình luận</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Nhập bình luận..."
                    rows={3}
                    data-testid="input-new-comment"
                  />
                  <Button
                    onClick={() => {
                      if (newComment.trim()) {
                        addCommentMutation.mutate(newComment);
                      }
                    }}
                    disabled={
                      !newComment.trim() || addCommentMutation.isPending
                    }
                    data-testid="button-add-comment"
                  >
                    {addCommentMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Chưa có bình luận nào
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-4 rounded-lg border bg-card"
                        data-testid={`comment-${comment.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            {comment.user?.fullName || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </span>
                        </div>
                        <p
                          className="text-sm"
                          data-testid={`text-comment-${comment.id}`}
                        >
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>File đính kèm</span>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadFilesMutation.isPending}
                    data-testid="button-upload-files"
                  >
                    {uploadFilesMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file-upload"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Chưa có file đính kèm
                  </p>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                        data-testid={`file-${file.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Paperclip className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div
                              className="font-medium text-sm"
                              data-testid={`text-filename-${file.id}`}
                            >
                              {file.originalName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(file.fileSize)} •{" "}
                              {formatDistanceToNow(new Date(file.uploadedAt), {
                                addSuffix: true,
                                locale: vi,
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewFile(file)}
                            data-testid={`button-preview-${file.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              window.open(
                                `/api/files/${file.id}/download`,
                                "_blank",
                              );
                            }}
                            data-testid={`button-download-${file.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subtasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Nhiệm vụ con ({subtasks.length})</CardTitle>
                <CardDescription>
                  Danh sách các nhiệm vụ con của nhiệm vụ này
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subtasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Chưa có nhiệm vụ con nào
                  </p>
                ) : (
                  <div className="space-y-2">
                    {subtasks.map((subtask) => (
                      <a
                        key={subtask.id}
                        href={`/tasks/${subtask.id}`}
                        className="block"
                        data-testid={`link-subtask-${subtask.id}`}
                      >
                        <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate active-elevate-2">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {subtask.taskNumber}
                              </Badge>
                              <Badge
                                variant={
                                  STATUS_VARIANTS[
                                    subtask.status as TaskStatus
                                  ] || "secondary"
                                }
                              >
                                {subtask.status}
                              </Badge>
                              <Badge
                                variant={
                                  PRIORITY_VARIANTS[
                                    subtask.priority as TaskPriority
                                  ] || "secondary"
                                }
                              >
                                {subtask.priority}
                              </Badge>
                            </div>
                            <h4
                              className="font-medium text-sm truncate"
                              data-testid={`text-subtask-title-${subtask.id}`}
                            >
                              {subtask.title}
                            </h4>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {new Date(
                                    subtask.deadline,
                                  ).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                <span>{subtask.progress}%</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <Progress
                              value={subtask.progress}
                              className="w-24 h-2"
                            />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={!!previewFile}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFile(null);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewFile?.originalName}</DialogTitle>
            <DialogDescription>
              {previewFile && formatFileSize(previewFile.fileSize)} •{" "}
              {previewFile &&
                formatDistanceToNow(new Date(previewFile.uploadedAt), {
                  addSuffix: true,
                  locale: vi,
                })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px] bg-muted/20 rounded-lg overflow-auto">
            {!previewUrl && previewFile && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Đang tải xem trước...</span>
              </div>
            )}
            {previewFile &&
              previewUrl &&
              (() => {
                const ext = previewFile.originalName
                  .split(".")
                  .pop()
                  ?.toLowerCase();
                const imageTypes = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
                const pdfTypes = ["pdf"];

                if (imageTypes.includes(ext || "")) {
                  return (
                    <img
                      src={previewUrl}
                      alt={previewFile.originalName}
                      className="max-w-full max-h-[60vh] object-contain"
                      data-testid="preview-image"
                    />
                  );
                } else if (pdfTypes.includes(ext || "")) {
                  return (
                    <iframe
                      src={previewUrl}
                      className="w-full h-[60vh] border-0"
                      title={previewFile.originalName}
                      data-testid="preview-pdf"
                    />
                  );
                } else {
                  return (
                    <div
                      className="text-center p-8"
                      data-testid="preview-unavailable"
                    >
                      <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Preview không khả dụng cho loại file này
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Vui lòng tải xuống để xem nội dung
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => {
                          window.open(
                            `/api/files/${previewFile.id}/download`,
                            "_blank",
                          );
                        }}
                        data-testid="button-download-from-preview"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Tải xuống
                      </Button>
                    </div>
                  );
                }
              })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Assignments Dialog */}
      <Dialog
        open={editAssignmentsDialogOpen}
        onOpenChange={setEditAssignmentsDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Chỉnh sửa người thực hiện
            </DialogTitle>
            <DialogDescription>
              Click vào checkbox để phân công vai trò cho từng người. Chỉ có thể
              sửa khi nhiệm vụ chưa có đánh giá.
            </DialogDescription>
          </DialogHeader>

          {usersLoading || (isDirectorOrDeputy && departmentsLoading) ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-[1fr,80px,80px,90px] gap-2 px-4 py-2 border-b bg-muted/50 font-medium text-sm">
                <div>Họ và tên</div>
                <div className="flex justify-center text-purple-600">
                  Chỉ đạo
                </div>
                <div className="flex justify-center text-primary">Chủ trì</div>
                <div className="flex justify-center text-blue-600">
                  Phối hợp
                </div>
              </div>

              <div className="flex-1 overflow-auto pr-2">
                <Accordion type="single" collapsible className="w-full">
                  {/* Leadership Section */}
                  {(() => {
                    const leadershipUsers = sortUsersByRole(
                      allUsers.filter(
                        (u) => u.role === "Giám đốc" || u.role === "Phó Giám đốc",
                      )
                    );
                    if (leadershipUsers.length === 0) return null;

                    return (
                      <AccordionItem value="leadership">
                        <AccordionTrigger
                          className="px-4 hover:bg-muted/50"
                          data-testid="accordion-leadership"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-600" />
                            <span className="font-medium text-purple-600">
                              Ban lãnh đạo
                            </span>
                            <Badge variant="secondary" className="ml-2">
                              {
                                leadershipUsers.filter(
                                  (u) => selectedUsers[u.id],
                                ).length
                              }
                              /{leadershipUsers.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-1 mt-2">
                            {leadershipUsers.map((u) => {
                              const currentRole = selectedUsers[u.id];
                              const availableRoles = getAvailableRoles(u.id);

                              return (
                                <div
                                  key={u.id}
                                  className="grid grid-cols-[1fr,80px,80px,90px] gap-2 items-center py-2 px-4 hover:bg-muted/30 rounded"
                                  data-testid={`user-item-${u.id}`}
                                >
                                  <div>
                                    <div className="font-medium text-sm">
                                      {u.fullName}
                                    </div>
                                    <div className="text-xs text-purple-600">
                                      {u.position || u.role}
                                    </div>
                                  </div>

                                  {/* Chỉ đạo */}
                                  <div className="flex justify-center">
                                    {availableRoles.includes("Chỉ đạo") ? (
                                      <Checkbox
                                        checked={currentRole === "Chỉ đạo"}
                                        onCheckedChange={() =>
                                          handleRoleToggle(u.id, "Chỉ đạo")
                                        }
                                        data-testid={`checkbox-chidao-${u.id}`}
                                      />
                                    ) : (
                                      <span className="text-xs text-muted-foreground/30">
                                        —
                                      </span>
                                    )}
                                  </div>

                                  {/* Chủ trì */}
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={currentRole === "Chủ trì"}
                                      onCheckedChange={() =>
                                        handleRoleToggle(u.id, "Chủ trì")
                                      }
                                      data-testid={`checkbox-chutri-${u.id}`}
                                    />
                                  </div>

                                  {/* Phối hợp */}
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={currentRole === "Phối hợp"}
                                      onCheckedChange={() =>
                                        handleRoleToggle(u.id, "Phối hợp")
                                      }
                                      data-testid={`checkbox-phoihop-${u.id}`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })()}

                  {/* Departments Section */}
                  {(() => {
                    // For directors/deputies: show ALL departments
                    // For others: show only their department with users grouped
                    if (isDirectorOrDeputy && allDepartments.length > 0) {
                      // Show ALL departments (even without users)
                      return allDepartments.map((dept) => {
                        const deptUsers = sortUsersByRole(
                          allUsers.filter(
                            (u) => u.departmentId === dept.id &&
                              u.role !== "Giám đốc" &&
                              u.role !== "Phó Giám đốc"
                          )
                        );
                        const selectedCount = deptUsers.filter(
                          (u) => selectedUsers[u.id],
                        ).length;

                        return (
                          <AccordionItem key={dept.id} value={dept.id}>
                            <AccordionTrigger
                              className="px-4 hover:bg-muted/50"
                              data-testid={`accordion-dept-${dept.id}`}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span className="font-medium">{dept.name}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {selectedCount}/{deptUsers.length}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              {deptUsers.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  Chưa có cán bộ nào trong phòng ban này
                                </p>
                              ) : (
                                <div className="space-y-1 mt-2">
                                  {deptUsers.map((u) => {
                                    const currentRole = selectedUsers[u.id];

                                    return (
                                      <div
                                        key={u.id}
                                        className="grid grid-cols-[1fr,80px,80px,90px] gap-2 items-center py-2 px-4 hover:bg-muted/30 rounded"
                                        data-testid={`user-item-${u.id}`}
                                      >
                                        <div>
                                          <div className="font-medium text-sm">
                                            {u.fullName}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {u.position || u.role}
                                          </div>
                                        </div>

                                        {/* Chỉ đạo - Empty for non-leadership */}
                                        <div className="flex justify-center">
                                          <span className="text-xs text-muted-foreground/30">
                                            —
                                          </span>
                                        </div>

                                        {/* Chủ trì */}
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={currentRole === "Chủ trì"}
                                            onCheckedChange={() =>
                                              handleRoleToggle(u.id, "Chủ trì")
                                            }
                                            data-testid={`checkbox-chutri-${u.id}`}
                                          />
                                        </div>

                                        {/* Phối hợp */}
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={currentRole === "Phối hợp"}
                                            onCheckedChange={() =>
                                              handleRoleToggle(u.id, "Phối hợp")
                                            }
                                            data-testid={`checkbox-phoihop-${u.id}`}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    });
                  } else {
                    // For non-directors: group by department (old logic)
                    const departments: Record<string, typeof allUsers> = {};
                    allUsers.forEach((u) => {
                      if (
                        u.role !== "Giám đốc" &&
                        u.role !== "Phó Giám đốc" &&
                        u.departmentId
                      ) {
                        if (!departments[u.departmentId]) {
                          departments[u.departmentId] = [];
                        }
                        departments[u.departmentId].push(u);
                      }
                    });

                    return Object.entries(departments).map(
                      ([deptId, deptUsers]) => {
                        const sortedDeptUsers = sortUsersByRole(deptUsers);
                        const selectedCount = sortedDeptUsers.filter(
                          (u) => selectedUsers[u.id],
                        ).length;
                        const deptName =
                          sortedDeptUsers[0]?.departmentName || "Phòng ban";

                        return (
                          <AccordionItem key={deptId} value={deptId}>
                            <AccordionTrigger
                              className="px-4 hover:bg-muted/50"
                              data-testid={`accordion-dept-${deptId}`}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span className="font-medium">{deptName}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {selectedCount}/{sortedDeptUsers.length}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="space-y-1 mt-2">
                                {sortedDeptUsers.map((u) => {
                                  const currentRole = selectedUsers[u.id];

                                  return (
                                    <div
                                      key={u.id}
                                      className="grid grid-cols-[1fr,80px,80px,90px] gap-2 items-center py-2 px-4 hover:bg-muted/30 rounded"
                                      data-testid={`user-item-${u.id}`}
                                    >
                                      <div>
                                        <div className="font-medium text-sm">
                                          {u.fullName}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {u.position || u.role}
                                        </div>
                                      </div>

                                      {/* Chỉ đạo - Empty for non-leadership */}
                                      <div className="flex justify-center">
                                        <span className="text-xs text-muted-foreground/30">
                                          —
                                        </span>
                                      </div>

                                      {/* Chủ trì */}
                                      <div className="flex justify-center">
                                        <Checkbox
                                          checked={currentRole === "Chủ trì"}
                                          onCheckedChange={() =>
                                            handleRoleToggle(u.id, "Chủ trì")
                                          }
                                          data-testid={`checkbox-chutri-${u.id}`}
                                        />
                                      </div>

                                      {/* Phối hợp */}
                                      <div className="flex justify-center">
                                        <Checkbox
                                          checked={currentRole === "Phối hợp"}
                                          onCheckedChange={() =>
                                            handleRoleToggle(u.id, "Phối hợp")
                                          }
                                          data-testid={`checkbox-phoihop-${u.id}`}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      }
                    );
                  }
                })()}
                </Accordion>
              </div>

              {/* Footer Buttons */}
              <div className="border-t pt-4 flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditAssignmentsDialogOpen(false)}
                  disabled={updateAssignmentsMutation.isPending}
                  data-testid="button-cancel-edit-assignments"
                >
                  Hủy
                </Button>
                <Button
                  onClick={handleSaveAssignments}
                  disabled={
                    updateAssignmentsMutation.isPending ||
                    Object.keys(selectedUsers).length === 0
                  }
                  data-testid="button-save-assignments"
                >
                  {updateAssignmentsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog
        open={showDeleteTaskDialog}
        onOpenChange={setShowDeleteTaskDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa nhiệm vụ</AlertDialogTitle>
            <AlertDialogDescription>
              Nhiệm vụ sẽ được chuyển vào thùng rác. Bạn có thể khôi phục lại
              sau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskMutation.mutate()}
              disabled={deleteTaskMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteTaskMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Xóa"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
