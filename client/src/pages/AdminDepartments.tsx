import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { fetchJson, apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { insertDepartmentSchema, type Department } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = insertDepartmentSchema.pick({ name: true, code: true });
type FormData = z.infer<typeof formSchema>;

export default function AdminDepartments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const isAdmin = user?.role === "Giám đốc" || user?.role === "Phó Giám đốc";

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: () => fetchJson<Department[]>("/api/departments"),
    enabled: isAdmin,
  });

  const createForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/departments", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Thành công",
        description: "Đã tạo phòng ban mới",
      });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo phòng ban",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const response = await apiRequest("PUT", `/api/departments/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin phòng ban",
      });
      setEditDialogOpen(false);
      setSelectedDepartment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật phòng ban",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/departments/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({
        title: "Đã xóa",
        description: "Phòng ban đã được xóa thành công",
      });
      setDeleteAlertOpen(false);
      setSelectedDepartment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa phòng ban",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    editForm.reset({ name: department.name, code: department.code });
    setEditDialogOpen(true);
  };

  const handleDelete = (department: Department) => {
    setSelectedDepartment(department);
    setDeleteAlertOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Không có quyền truy cập</CardTitle>
            <CardDescription>
              Chỉ Giám đốc và Phó Giám đốc mới có quyền quản lý phòng ban.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Quản lý phòng ban</CardTitle>
            <CardDescription>Tạo, sửa và xóa phòng ban trong hệ thống</CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-department">
                <Plus className="w-4 h-4 mr-2" />
                Tạo phòng ban mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo phòng ban mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin phòng ban mới
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mã phòng ban</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="VD: KTTC, IT, HC"
                            data-testid="input-department-code"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên phòng ban</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nhập tên phòng ban"
                            data-testid="input-department-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                      data-testid="button-cancel-create"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      {createMutation.isPending ? "Đang tạo..." : "Tạo"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : departments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có phòng ban nào. Nhấn nút "Tạo phòng ban mới" để bắt đầu.
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {departments.map((department) => (
                <Card key={department.id} data-testid={`card-department-${department.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-primary" data-testid={`text-department-code-${department.id}`}>
                            {department.code}
                          </span>
                        </div>
                        <div className="text-base font-medium" data-testid={`text-department-name-${department.id}`}>
                          {department.name}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(department)}
                          data-testid={`button-edit-${department.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(department)}
                          data-testid={`button-delete-${department.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Tên phòng ban</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow key={department.id} data-testid={`row-department-${department.id}`}>
                    <TableCell data-testid={`text-department-code-${department.id}`}>
                      <span className="font-mono text-sm">{department.code}</span>
                    </TableCell>
                    <TableCell data-testid={`text-department-name-${department.id}`}>
                      {department.name}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(department)}
                          data-testid={`button-edit-${department.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(department)}
                          data-testid={`button-delete-${department.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa phòng ban</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin phòng ban
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) => {
                if (selectedDepartment) {
                  updateMutation.mutate({ id: selectedDepartment.id, data });
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã phòng ban</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="VD: KTTC, IT, HC"
                        data-testid="input-edit-department-code"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên phòng ban</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập tên phòng ban"
                        data-testid="input-edit-department-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? "Đang lưu..." : "Lưu"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa phòng ban</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa phòng ban <strong>{selectedDepartment?.name}</strong>?
              <br />
              Hành động này không thể hoàn tác nếu phòng ban có cán bộ đang hoạt động.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedDepartment) {
                  deleteMutation.mutate(selectedDepartment.id);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
