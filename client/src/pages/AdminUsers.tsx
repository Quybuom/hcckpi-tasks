import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { fetchJson, apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { insertUserSchema, userRoles, type User, type Department, type UserRole } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const createFormSchema = insertUserSchema.pick({ 
  username: true, 
  password: true, 
  fullName: true, 
  role: true, 
  departmentId: true,
  position: true
}).extend({
  position: z.string().nullable().optional(),
});

const editFormSchema = insertUserSchema.pick({ 
  username: true, 
  fullName: true, 
  role: true, 
  departmentId: true,
  position: true
}).extend({
  position: z.string().nullable().optional(),
  password: z.string().optional(),
});

type CreateFormData = z.infer<typeof createFormSchema>;
type EditFormData = z.infer<typeof editFormSchema>;

const ROLES = userRoles;

export default function AdminUsers() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const isAdmin = user?.role === "Giám đốc" || user?.role === "Phó Giám đốc";

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => fetchJson<User[]>("/api/users"),
    enabled: isAdmin,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["/api/departments"],
    queryFn: () => fetchJson<Department[]>("/api/departments"),
    enabled: isAdmin,
  });

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      role: "Chuyên viên",
      departmentId: null,
      position: null,
    },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      username: "",
      fullName: "",
      role: "Chuyên viên",
      departmentId: null,
      position: null,
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateFormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Thành công",
        description: "Đã tạo cán bộ mới",
      });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tạo cán bộ",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditFormData }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin cán bộ",
      });
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật cán bộ",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Đã xóa",
        description: "Cán bộ đã được xóa thành công",
      });
      setDeleteAlertOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa cán bộ",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    editForm.reset({ 
      username: user.username,
      fullName: user.fullName, 
      role: user.role as UserRole,
      departmentId: user.departmentId,
      position: user.position,
      password: "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteAlertOpen(true);
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return "—";
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || "—";
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Không có quyền truy cập</CardTitle>
            <CardDescription>
              Chỉ Giám đốc và Phó Giám đốc mới có quyền quản lý cán bộ.
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
            <CardTitle>Quản lý cán bộ</CardTitle>
            <CardDescription>Tạo, sửa và xóa cán bộ trong hệ thống</CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user">
                <Plus className="w-4 h-4 mr-2" />
                Tạo cán bộ mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tạo cán bộ mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin cán bộ mới
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên đăng nhập</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nhập tên đăng nhập"
                            data-testid="input-username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Nhập mật khẩu"
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Họ và tên</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Nhập họ và tên"
                            data-testid="input-fullname"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chức vụ (tùy chọn)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ví dụ: Trưởng phòng Tổ chức - Hành chính"
                            data-testid="input-position"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vai trò</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Chọn vai trò" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phòng ban</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "null" ? null : value)} 
                          value={field.value || "null"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-department">
                              <SelectValue placeholder="Chọn phòng ban" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="null">Không có</SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có cán bộ nào. Nhấn nút "Tạo cán bộ mới" để bắt đầu.
            </div>
          ) : (
            isMobile ? (
              <div className="space-y-3">
                {users.map((user) => (
                  <Card key={user.id} data-testid={`card-user-${user.id}`}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground" data-testid={`text-username-${user.id}`}>
                                @{user.username}
                              </span>
                            </div>
                            <div className="text-base font-medium" data-testid={`text-fullname-${user.id}`}>
                              {user.fullName}
                            </div>
                          </div>
                          <Badge variant="secondary" data-testid={`badge-role-${user.id}`}>
                            {user.role}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          {user.position && (
                            <div data-testid={`text-position-${user.id}`}>
                              <span className="text-muted-foreground">Chức vụ:</span> {user.position}
                            </div>
                          )}
                          <div data-testid={`text-department-${user.id}`}>
                            <span className="text-muted-foreground">Phòng ban:</span> {getDepartmentName(user.departmentId)}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            size="default"
                            onClick={() => handleEdit(user)}
                            data-testid={`button-edit-${user.id}`}
                            className="flex-1"
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Sửa
                          </Button>
                          <Button
                            variant="outline"
                            size="default"
                            onClick={() => handleDelete(user)}
                            data-testid={`button-delete-${user.id}`}
                            className="flex-1"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Xóa
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên đăng nhập</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead>Chức vụ</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Phòng ban</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell data-testid={`text-username-${user.id}`}>
                          {user.username}
                        </TableCell>
                        <TableCell data-testid={`text-fullname-${user.id}`}>
                          {user.fullName}
                        </TableCell>
                        <TableCell data-testid={`text-position-${user.id}`}>
                          {user.position || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" data-testid={`badge-role-${user.id}`}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-department-${user.id}`}>
                          {getDepartmentName(user.departmentId)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(user)}
                              data-testid={`button-edit-${user.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(user)}
                              data-testid={`button-delete-${user.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cán bộ</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin cán bộ (để trống mật khẩu nếu không muốn thay đổi)
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) => {
                if (selectedUser) {
                  // Remove password if empty
                  const updateData = data.password ? data : { ...data, password: undefined };
                  updateMutation.mutate({ id: selectedUser.id, data: updateData });
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên đăng nhập</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập tên đăng nhập"
                        data-testid="input-edit-username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mật khẩu mới (tùy chọn)</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Để trống nếu không muốn đổi"
                        data-testid="input-edit-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ và tên</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập họ và tên"
                        data-testid="input-edit-fullname"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chức vụ (tùy chọn)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ví dụ: Trưởng phòng Tổ chức - Hành chính"
                        data-testid="input-edit-position"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vai trò</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-role">
                          <SelectValue placeholder="Chọn vai trò" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phòng ban</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "null" ? null : value)} 
                      value={field.value || "null"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-department">
                          <SelectValue placeholder="Chọn phòng ban" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null">Không có</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            <AlertDialogTitle>Xác nhận xóa cán bộ</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa cán bộ <strong>{selectedUser?.fullName}</strong> ({selectedUser?.username})?
              <br />
              Hành động này không thể hoàn tác nếu cán bộ có nhiệm vụ đang thực hiện.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  deleteMutation.mutate(selectedUser.id);
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
