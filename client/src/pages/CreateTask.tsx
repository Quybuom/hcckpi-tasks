import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Users, Building2, User, X, UserPlus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, fetchJson } from "@/lib/queryClient";
import { useLocation } from "wouter";

type Department = {
  id: string;
  name: string;
  code: string;
  createdAt: string;
};

type UserType = {
  id: string;
  username: string;
  fullName: string;
  role: string;
  departmentId: string | null;
  position: string | null;
};

type ChecklistTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  createdAt: string;
};

const createTaskFormSchema = z.object({
  title: z.string().min(1, "Vui lòng nhập tên nhiệm vụ"),
  description: z.string().optional(),
  deadline: z.string().min(1, "Vui lòng chọn hạn hoàn thành"),
  priority: z.enum(["Khẩn cấp", "Quan trọng", "Bình thường"], {
    required_error: "Vui lòng chọn độ ưu tiên",
  }),
  assignments: z.array(z.object({
    userId: z.string(),
    role: z.enum(["Chủ trì", "Phối hợp", "Chỉ đạo"]),
  })).min(1, "Phải có ít nhất 1 người được phân công").refine(
    (assignments) => assignments.some((a) => a.role === "Chủ trì"),
    "Phải có ít nhất 1 người chủ trì"
  ),
});

type CreateTaskFormData = z.infer<typeof createTaskFormSchema>;

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
function sortUsersByRole(users: UserType[]): UserType[] {
  return [...users].sort((a, b) => {
    const roleOrderDiff = getRoleOrder(a.role) - getRoleOrder(b.role);
    if (roleOrderDiff !== 0) return roleOrderDiff;
    // If same role, sort alphabetically by full name
    return a.fullName.localeCompare(b.fullName, 'vi');
  });
}

type DuplicateMatch = {
  taskId: string;
  taskNumber: string;
  title: string;
  similarity: number;
  reason: string;
};

export default function CreateTask() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<{
    [userId: string]: "Chủ trì" | "Phối hợp" | "Chỉ đạo";
  }>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [noDeadline, setNoDeadline] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateMatch[] | null>(null);
  const [pendingTaskData, setPendingTaskData] = useState<CreateTaskFormData | null>(null);
  
  // Extract parentTaskId from URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const parentTaskId = searchParams.get("parentTaskId");

  // AUTHENTICATED: Fetch all departments
  const { data: departments = [], isLoading: loadingDepts } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: () => fetchJson<Department[]>("/api/departments"),
  });

  // AUTHENTICATED: Fetch all users
  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    queryFn: () => fetchJson<UserType[]>("/api/users"),
    enabled: !!user,
  });

  // AUTHENTICATED: Fetch user's checklist templates
  const { data: templatesData, isLoading: loadingTemplates } = useQuery<{
    default: ChecklistTemplate | null;
    personal: ChecklistTemplate[];
    system: ChecklistTemplate[];
  }>({
    queryKey: ["/api/templates/overview"],
    queryFn: () => fetchJson<{
      default: ChecklistTemplate | null;
      personal: ChecklistTemplate[];
      system: ChecklistTemplate[];
    }>("/api/templates/overview"),
    enabled: !!user,
  });

  // Flatten templates for easy access, with default first
  const templates = templatesData
    ? [
        ...(templatesData.default ? [templatesData.default] : []),
        ...templatesData.personal,
        ...templatesData.system,
      ]
    : [];

  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      deadline: "",
      priority: "Bình thường",
      assignments: [],
    },
  });

  // Auto-select default template when data loads
  useEffect(() => {
    if (templatesData?.default && !selectedTemplateId) {
      setSelectedTemplateId(templatesData.default.id);
    }
  }, [templatesData, selectedTemplateId]);

  // Auto-set deadline when "Không thời hạn" checkbox is toggled
  useEffect(() => {
    if (noDeadline) {
      // Set deadline to Dec 31 of next year
      const nextYear = new Date().getFullYear() + 1;
      const farFutureDate = `${nextYear}-12-31`;
      form.setValue("deadline", farFutureDate);
    } else {
      // Clear deadline when unchecked
      form.setValue("deadline", "");
    }
  }, [noDeadline, form]);

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateTaskFormData) => {
      const response = await apiRequest("POST", "/api/tasks", {
        title: data.title,
        description: data.description || undefined,
        deadline: new Date(data.deadline).toISOString(),
        priority: data.priority,
        assignments: data.assignments,
        templateId: selectedTemplateId || undefined,
        parentTaskId: parentTaskId || undefined,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Thành công",
        description: "Đã tạo nhiệm vụ mới",
      });
      setLocation("/tasks/my-tasks");
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo nhiệm vụ",
        variant: "destructive",
      });
    },
  });

  const getUsersByDepartment = () => {
    const deptMap: { [deptId: string]: UserType[] } = {};
    allUsers.forEach((u) => {
      if (u.departmentId) {
        if (!deptMap[u.departmentId]) deptMap[u.departmentId] = [];
        deptMap[u.departmentId].push(u);
      }
    });
    // Sort users within each department by role hierarchy
    Object.keys(deptMap).forEach(deptId => {
      deptMap[deptId] = sortUsersByRole(deptMap[deptId]);
    });
    return deptMap;
  };

  const getLeadershipUsers = () => {
    const leadership = allUsers.filter(u => u.role === "Giám đốc" || u.role === "Phó Giám đốc");
    return sortUsersByRole(leadership);
  };

  const usersByDept = getUsersByDepartment();
  const leadershipUsers = getLeadershipUsers();

  const getUserDepartment = (userId: string) => {
    const u = allUsers.find((user) => user.id === userId);
    return u?.departmentId || null;
  };

  const getAvailableRoles = (userId: string): Array<"Chủ trì" | "Phối hợp" | "Chỉ đạo"> => {
    const u = allUsers.find((user) => user.id === userId);
    if (u?.role === "Giám đốc" || u?.role === "Phó Giám đốc") {
      return ["Chỉ đạo", "Chủ trì", "Phối hợp"];
    }
    return ["Chủ trì", "Phối hợp"];
  };

  const handleRoleToggle = (userId: string, role: "Chủ trì" | "Phối hợp" | "Chỉ đạo") => {
    const currentRole = selectedUsers[userId];
    
    // If clicking the same role checkbox, uncheck (remove user)
    if (currentRole === role) {
      const newSelected = { ...selectedUsers };
      delete newSelected[userId];
      setSelectedUsers(newSelected);
      form.setValue("assignments", Object.entries(newSelected).map(([uid, r]) => ({ userId: uid, role: r })));
      return;
    }
    
    // If assigning Chủ trì, demote previous Chủ trì to Phối hợp
    if (role === "Chủ trì") {
      const newSelected: { [key: string]: "Chủ trì" | "Phối hợp" | "Chỉ đạo" } = {};
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
      form.setValue("assignments", Object.entries(newSelected).map(([uid, r]) => ({ userId: uid, role: r })));
    } else {
      // Assigning Chỉ đạo or Phối hợp
      const updated = {
        ...selectedUsers,
        [userId]: role,
      };
      setSelectedUsers(updated);
      form.setValue("assignments", Object.entries(updated).map(([uid, r]) => ({ userId: uid, role: r })));
    }
  };

  const selectedUsersList = Object.entries(selectedUsers).map(([userId, role]) => {
    const u = allUsers.find((user) => user.id === userId);
    return u ? { ...u, assignedRole: role } : null;
  }).filter(Boolean);

  const hasLeader = Object.values(selectedUsers).includes("Chủ trì");

  const onSubmit = async (data: CreateTaskFormData) => {
    // Check for duplicates before creating
    try {
      const checkResult = await fetchJson<{ duplicates: DuplicateMatch[] }>("/api/tasks/check-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          // SECURITY: Never send departmentId - backend uses req.user's department
        }),
      });

      if (checkResult.duplicates && checkResult.duplicates.length > 0) {
        // Show warning dialog
        setDuplicateWarning(checkResult.duplicates);
        setPendingTaskData(data);
        return;
      }
    } catch (error) {
      // If duplicate check fails, continue creating task
      console.warn("Duplicate check failed:", error);
    }

    // No duplicates or check failed, create task
    createTaskMutation.mutate(data);
  };

  const handleCreateAnyway = () => {
    if (pendingTaskData) {
      createTaskMutation.mutate(pendingTaskData);
      setDuplicateWarning(null);
      setPendingTaskData(null);
    }
  };

  if (loadingDepts || loadingUsers || loadingTemplates) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Tạo nhiệm vụ mới</h1>
            <p className="text-muted-foreground">Điền thông tin và phân công nhiệm vụ</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Thông tin nhiệm vụ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tên nhiệm vụ <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập tên nhiệm vụ..."
                        data-testid="input-task-title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mô tả chi tiết</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Mô tả chi tiết về nhiệm vụ..."
                        rows={4}
                        data-testid="input-task-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Mẫu checklist</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger data-testid="select-template">
                    <SelectValue placeholder="Chọn mẫu checklist (tùy chọn)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templatesData?.default && (
                      <SelectGroup>
                        <SelectLabel className="text-primary font-semibold">Mẫu mặc định</SelectLabel>
                        <SelectItem key={templatesData.default.id} value={templatesData.default.id} data-testid={`template-default-${templatesData.default.id}`}>
                          {templatesData.default.name} ({templatesData.default.category})
                        </SelectItem>
                      </SelectGroup>
                    )}
                    {templatesData && templatesData.system.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Mẫu hệ thống</SelectLabel>
                        {templatesData.system.map((template) => (
                          <SelectItem key={template.id} value={template.id} data-testid={`template-system-${template.id}`}>
                            {template.name} ({template.category})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Độ ưu tiên <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Khẩn cấp">🔴 Khẩn cấp</SelectItem>
                          <SelectItem value="Quan trọng">🟡 Quan trọng</SelectItem>
                          <SelectItem value="Bình thường">⚪ Bình thường</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Hạn hoàn thành <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            data-testid="input-deadline"
                            disabled={noDeadline}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="noDeadline"
                      checked={noDeadline}
                      onCheckedChange={(checked) => setNoDeadline(checked === true)}
                      data-testid="checkbox-no-deadline"
                    />
                    <Label
                      htmlFor="noDeadline"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Không thời hạn
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Phân công thực hiện
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Chọn người thực hiện và vai trò. Phải có ít nhất 1 người chủ trì.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasLeader && selectedUsersList.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  ⚠️ Phải có ít nhất 1 người chủ trì
                </div>
              )}

              {form.formState.errors.assignments && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {form.formState.errors.assignments.message}
                </div>
              )}

              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Người được phân công ({selectedUsersList.length})
                  </h4>

                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-open-select-users">
                        <UserPlus className="h-4 w-4" />
                        Chọn người thực hiện
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Phân công nhiệm vụ
                        </DialogTitle>
                        <DialogDescription>
                          Click vào checkbox để phân công vai trò cho từng người.
                        </DialogDescription>
                      </DialogHeader>

                      {/* Table Header */}
                      <div className="grid grid-cols-[1fr,80px,80px,90px] gap-2 px-4 py-2 border-b bg-muted/50 font-medium text-sm">
                        <div>Họ và tên</div>
                        <div className="flex justify-center text-purple-600">Chỉ đạo</div>
                        <div className="flex justify-center text-primary">Chủ trì</div>
                        <div className="flex justify-center text-blue-600">Phối hợp</div>
                      </div>

                      <div className="flex-1 overflow-auto pr-2">
                        <Accordion type="single" collapsible className="w-full">
                          {leadershipUsers.length > 0 && (
                            <AccordionItem value="leadership">
                              <AccordionTrigger
                                className="px-4 hover:bg-muted/50"
                                data-testid="accordion-leadership"
                              >
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-purple-600" />
                                  <span className="font-medium text-purple-600">Ban lãnh đạo</span>
                                  <Badge variant="secondary" className="ml-2">
                                    {leadershipUsers.filter(u => selectedUsers[u.id]).length}/{leadershipUsers.length}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-1 mt-2">
                                  {leadershipUsers.map((u) => {
                                    const currentRole = selectedUsers[u.id];
                                    return (
                                      <div
                                        key={u.id}
                                        className="grid grid-cols-[1fr,80px,80px,90px] gap-2 items-center py-2 px-4 hover:bg-muted/30 rounded"
                                        data-testid={`user-item-${u.id}`}
                                      >
                                        <div>
                                          <div className="font-medium text-sm">{u.fullName}</div>
                                          <div className="text-xs text-purple-600">{u.position || u.role}</div>
                                        </div>
                                        
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={currentRole === "Chỉ đạo"}
                                            onCheckedChange={() => handleRoleToggle(u.id, "Chỉ đạo")}
                                            data-testid={`checkbox-direct-${u.id}`}
                                          />
                                        </div>
                                        
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={currentRole === "Chủ trì"}
                                            onCheckedChange={() => handleRoleToggle(u.id, "Chủ trì")}
                                            data-testid={`checkbox-lead-${u.id}`}
                                          />
                                        </div>
                                        
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={currentRole === "Phối hợp"}
                                            onCheckedChange={() => handleRoleToggle(u.id, "Phối hợp")}
                                            data-testid={`checkbox-coord-${u.id}`}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {departments.map((dept) => {
                            const deptUsers = usersByDept[dept.id] || [];
                            const selectedCount = deptUsers.filter(u => selectedUsers[u.id]).length;
                            
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
                                            <div className="font-medium text-sm">{u.fullName}</div>
                                            <div className="text-xs text-muted-foreground">{u.position || u.role}</div>
                                          </div>
                                          
                                          {/* Empty cell - Chỉ đạo chỉ dành cho Ban lãnh đạo */}
                                          <div className="flex justify-center">
                                            <span className="text-xs text-muted-foreground/30">—</span>
                                          </div>
                                          
                                          <div className="flex justify-center">
                                            <Checkbox
                                              checked={currentRole === "Chủ trì"}
                                              onCheckedChange={() => handleRoleToggle(u.id, "Chủ trì")}
                                              data-testid={`checkbox-lead-${u.id}`}
                                            />
                                          </div>
                                          
                                          <div className="flex justify-center">
                                            <Checkbox
                                              checked={currentRole === "Phối hợp"}
                                              onCheckedChange={() => handleRoleToggle(u.id, "Phối hợp")}
                                              data-testid={`checkbox-coord-${u.id}`}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </div>

                      <div className="border-t pt-4 flex justify-end">
                        <Button onClick={() => setDialogOpen(false)} data-testid="button-close-dialog">
                          Xong
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {selectedUsersList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Chưa chọn người thực hiện. Nhấn nút "Chọn người thực hiện" để thêm.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedUsersList.map((u, idx) => (
                      <div
                        key={u?.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-card border"
                        data-testid={`assigned-user-${u?.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium">{u?.fullName}</div>
                            <div className="text-xs text-muted-foreground">{u?.position || u?.role}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={u?.assignedRole === "Chủ trì" ? "default" : u?.assignedRole === "Chỉ đạo" ? "secondary" : "outline"}
                            className={u?.assignedRole === "Chỉ đạo" ? "bg-purple-100 text-purple-700 border-purple-200" : ""}
                          >
                            {u?.assignedRole}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const newSelected = { ...selectedUsers };
                              delete newSelected[u?.id!];
                              setSelectedUsers(newSelected);
                              form.setValue("assignments", Object.entries(newSelected).map(([uid, r]) => ({ userId: uid, role: r })));
                            }}
                            data-testid={`button-remove-${u?.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              data-testid="button-cancel"
              onClick={() => setLocation("/tasks/my-tasks")}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={createTaskMutation.isPending}
              data-testid="button-create"
            >
              {createTaskMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Tạo nhiệm vụ
            </Button>
          </div>
        </form>
      </Form>

      {/* Duplicate Warning Dialog */}
      <Dialog open={duplicateWarning !== null} onOpenChange={(open) => !open && setDuplicateWarning(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-600" />
              Phát hiện nhiệm vụ tương tự
            </DialogTitle>
            <DialogDescription>
              Hệ thống phát hiện {duplicateWarning?.length} nhiệm vụ có nội dung tương tự. Bạn có muốn xem trước khi tạo mới?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {duplicateWarning?.map((dup) => (
              <Card key={dup.taskId} className="p-4 hover-elevate">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {dup.taskNumber}
                      </Badge>
                      <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                        {Math.round(dup.similarity * 100)}% giống
                      </Badge>
                    </div>
                    <h4 className="font-medium mb-1">{dup.title}</h4>
                    <p className="text-sm text-muted-foreground">{dup.reason}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLocation(`/tasks/${dup.taskId}`);
                    }}
                    data-testid={`button-view-task-${dup.taskId}`}
                  >
                    Xem chi tiết
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDuplicateWarning(null);
                setPendingTaskData(null);
              }}
              data-testid="button-cancel-create"
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreateAnyway}
              disabled={createTaskMutation.isPending}
              data-testid="button-create-anyway"
            >
              {createTaskMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Vẫn tạo mới
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
