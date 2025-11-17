import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient, fetchJson } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Building2, UserCog } from "lucide-react";

interface Department {
  id: string;
  name: string;
  assignedDeputyDirectorId: string | null;
}

interface User {
  id: string;
  fullName: string;
  role: string;
  departmentId: string;
}

export default function Settings() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  // AUTHENTICATED: Fetch all departments
  const { data: departments, isLoading: loadingDepartments, error: departmentsError} = useQuery<Department[]>({
    queryKey: ["/api/departments"],
    queryFn: () => fetchJson<Department[]>("/api/departments"),
  });

  // AUTHENTICATED: Fetch deputy directors (only for Giám đốc)
  const { data: deputyDirectors, isLoading: loadingDeputies, error: deputiesError } = useQuery<User[]>({
    queryKey: ["/api/users", "Phó Giám đốc"],
    queryFn: () => fetchJson<User[]>("/api/users?role=Phó Giám đốc"),
    enabled: !!user && user.role === "Giám đốc",
  });

  const updateDeputyDirectorMutation = useMutation({
    mutationFn: async ({ departmentId, deputyDirectorId }: { departmentId: string; deputyDirectorId: string | null }) => {
      return apiRequest("PUT", `/api/departments/${departmentId}/deputy-director`, { deputyDirectorId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Cập nhật thành công",
        description: "Đã gán Phó Giám đốc phụ trách phòng ban",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật Phó Giám đốc phụ trách",
        variant: "destructive",
      });
    },
  });

  const handleDeputyChange = (departmentId: string, deputyDirectorId: string) => {
    updateDeputyDirectorMutation.mutate({
      departmentId,
      deputyDirectorId: deputyDirectorId === "none" ? null : deputyDirectorId,
    });
  };

  // Show loading state
  if (authLoading || loadingDepartments || loadingDeputies) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Only Giám đốc can access this page (check after auth loaded)
  if (user?.role !== "Giám đốc") {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Chỉ Giám đốc mới có quyền truy cập trang Cài đặt
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show error states
  if (departmentsError || deputiesError) {
    return (
      <div className="container max-w-4xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {departmentsError ? "Lỗi tải danh sách phòng ban" : "Lỗi tải danh sách Phó Giám đốc"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6" data-testid="page-settings">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserCog className="w-8 h-8" />
          Cài đặt Hệ thống
        </h1>
        <p className="text-muted-foreground">
          Quản lý cấu hình và phân quyền hệ thống quản lý nhiệm vụ
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Phân Công Phó Giám Đốc Phụ Trách Phòng Ban
          </CardTitle>
          <CardDescription>
            Gán Phó Giám đốc chịu trách nhiệm quản lý và đánh giá từng phòng ban. 
            Mỗi phòng ban chỉ có một Phó Giám đốc phụ trách.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(departments ?? []).map((department) => {
            const assignedDeputy = (deputyDirectors ?? []).find(
              (d) => d.id === department.assignedDeputyDirectorId
            );

            return (
              <div
                key={department.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover-elevate"
                data-testid={`department-setting-${department.id}`}
              >
                <div className="space-y-1 flex-1">
                  <Label htmlFor={`deputy-${department.id}`} className="text-base font-medium">
                    {department.name}
                  </Label>
                  {assignedDeputy && (
                    <p className="text-sm text-muted-foreground">
                      Hiện tại: {assignedDeputy.fullName}
                    </p>
                  )}
                </div>
                <Select
                  value={department.assignedDeputyDirectorId || "none"}
                  onValueChange={(value) => handleDeputyChange(department.id, value)}
                  disabled={updateDeputyDirectorMutation.isPending}
                >
                  <SelectTrigger
                    id={`deputy-${department.id}`}
                    className="w-64"
                    data-testid={`select-deputy-${department.id}`}
                  >
                    <SelectValue placeholder="Chọn Phó Giám đốc..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa phân công</SelectItem>
                    {(deputyDirectors ?? []).map((deputy) => (
                      <SelectItem
                        key={deputy.id}
                        value={deputy.id}
                        data-testid={`option-deputy-${deputy.id}`}
                      >
                        {deputy.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}

          {!(departments ?? []).length && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Chưa có phòng ban nào trong hệ thống
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thông Tin Hệ Thống</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tổng số phòng ban:</span>
            <span className="font-medium" data-testid="text-total-departments">{(departments ?? []).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tổng số Phó Giám đốc:</span>
            <span className="font-medium" data-testid="text-total-deputies">{(deputyDirectors ?? []).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phòng đã phân công:</span>
            <span className="font-medium" data-testid="text-assigned-departments">
              {(departments ?? []).filter((d) => d.assignedDeputyDirectorId).length} / {(departments ?? []).length}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
