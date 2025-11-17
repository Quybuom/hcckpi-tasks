import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Users, ChevronDown, Building2, User, X, UserPlus } from "lucide-react";
import { useState } from "react";

const mockDepartments = [
  {
    id: "1",
    name: "Ban Giám đốc",
    users: [
      { id: "u1", name: "Nguyễn Văn A", role: "Giám đốc" },
      { id: "u2", name: "Trần Thị B", role: "Phó Giám đốc" },
      { id: "u3", name: "Lê Văn C", role: "Phó Giám đốc" },
    ],
  },
  {
    id: "2",
    name: "Phòng Hành chính - Tổng hợp",
    users: [
      { id: "u4", name: "Phạm Văn D", role: "Trưởng phòng" },
      { id: "u5", name: "Hoàng Thị E", role: "Phó phòng" },
      { id: "u6", name: "Vũ Văn F", role: "Chuyên viên" },
      { id: "u7", name: "Đặng Thị G", role: "Chuyên viên" },
    ],
  },
  {
    id: "3",
    name: "Phòng Kế hoạch - Tài chính",
    users: [
      { id: "u8", name: "Bùi Văn H", role: "Trưởng phòng" },
      { id: "u9", name: "Ngô Thị I", role: "Chuyên viên" },
      { id: "u10", name: "Đỗ Văn K", role: "Chuyên viên" },
    ],
  },
  {
    id: "4",
    name: "Phòng Nghiệp vụ 1",
    users: [
      { id: "u11", name: "Lý Văn L", role: "Trưởng phòng" },
      { id: "u12", name: "Mai Thị M", role: "Phó phòng" },
      { id: "u13", name: "Trương Văn N", role: "Chuyên viên" },
    ],
  },
];

const currentUser = { id: "u1", name: "Nguyễn Văn A", role: "Giám đốc" };

export default function CreateTaskPrototype() {
  const [selectedUsers, setSelectedUsers] = useState<{
    [userId: string]: "Chủ trì" | "Phối hợp" | "Chỉ đạo";
  }>({
    [currentUser.id]: "Chỉ đạo",
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  const getUserDepartment = (userId: string) => {
    for (const dept of mockDepartments) {
      const user = dept.users.find(u => u.id === userId);
      if (user) return dept.id;
    }
    return null;
  };

  const getAvailableRoles = (userId: string): Array<"Chủ trì" | "Phối hợp" | "Chỉ đạo"> => {
    const deptId = getUserDepartment(userId);
    if (deptId === "1") {
      return ["Chỉ đạo", "Chủ trì", "Phối hợp"];
    }
    return ["Chủ trì", "Phối hợp"];
  };

  const handleRoleChange = (userId: string, role: "Chủ trì" | "Phối hợp" | "Chỉ đạo") => {
    if (role === "Chủ trì") {
      const newSelected: { [key: string]: "Chủ trì" | "Phối hợp" | "Chỉ đạo" } = {};
      Object.keys(selectedUsers).forEach((id) => {
        if (id !== userId) {
          const availableRoles = getAvailableRoles(id);
          if (availableRoles.includes("Chỉ đạo") && selectedUsers[id] === "Chỉ đạo") {
            newSelected[id] = "Chỉ đạo";
          } else {
            newSelected[id] = "Phối hợp";
          }
        }
      });
      newSelected[userId] = "Chủ trì";
      setSelectedUsers(newSelected);
    } else {
      setSelectedUsers({
        ...selectedUsers,
        [userId]: role,
      });
    }
  };

  const handleToggleUser = (userId: string) => {
    if (selectedUsers[userId]) {
      if (selectedUsers[userId] === "Chủ trì") {
        return;
      }
      const newSelected = { ...selectedUsers };
      delete newSelected[userId];
      setSelectedUsers(newSelected);
    } else {
      setSelectedUsers({
        ...selectedUsers,
        [userId]: "Phối hợp",
      });
    }
  };

  const selectedUsersList = Object.entries(selectedUsers).map(([userId, role]) => {
    const user = mockDepartments
      .flatMap((d) => d.users)
      .find((u) => u.id === userId);
    return { ...user, assignedRole: role };
  });

  const hasLeader = Object.values(selectedUsers).includes("Chủ trì");

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Tạo nhiệm vụ mới</h1>
          <p className="text-muted-foreground">Điền thông tin và phân công nhiệm vụ</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Thông tin nhiệm vụ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Tên nhiệm vụ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Nhập tên nhiệm vụ..."
                data-testid="input-task-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả chi tiết</Label>
              <Textarea
                id="description"
                placeholder="Mô tả chi tiết về nhiệm vụ..."
                rows={4}
                data-testid="input-task-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">
                  Độ ưu tiên <span className="text-destructive">*</span>
                </Label>
                <Select defaultValue="normal" data-testid="select-priority">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🔴 Khẩn cấp</SelectItem>
                    <SelectItem value="important">🟡 Quan trọng</SelectItem>
                    <SelectItem value="normal">⚪ Bình thường</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">
                  Hạn hoàn thành <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  data-testid="input-deadline"
                />
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
              Chọn người thực hiện và vai trò. Mặc định người tạo là chủ trì.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasLeader && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                ⚠️ Phải có ít nhất 1 người chủ trì
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
                        Chọn người thực hiện
                      </DialogTitle>
                      <DialogDescription>
                        Click vào phòng ban để xem danh sách. Click vào tên người để thêm/bỏ khỏi danh sách.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto pr-2">
                      <Accordion type="single" collapsible className="w-full">
                        {mockDepartments.map((dept) => (
                          <AccordionItem key={dept.id} value={dept.id}>
                            <AccordionTrigger
                              className="px-4 hover:bg-muted/50"
                              data-testid={`accordion-dept-${dept.id}`}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span className="font-medium">{dept.name}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {dept.users.filter(u => selectedUsers[u.id]).length}/{dept.users.length}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="space-y-2 mt-2">
                                {dept.users.map((user) => {
                                  const isSelected = !!selectedUsers[user.id];
                                  return (
                                    <div
                                      key={user.id}
                                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover-elevate ${
                                        isSelected ? "bg-primary/5 border-primary/20" : "bg-card"
                                      }`}
                                      onClick={() => handleToggleUser(user.id)}
                                      data-testid={`user-item-${user.id}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`h-3 w-3 rounded-full border-2 ${
                                            isSelected
                                              ? "bg-primary border-primary"
                                              : "border-muted-foreground"
                                          }`}
                                        />
                                        <div>
                                          <div className="font-medium">{user.name}</div>
                                          <div className="text-xs text-muted-foreground">{user.role}</div>
                                        </div>
                                      </div>

                                      {isSelected && (
                                        <Badge
                                          variant={
                                            selectedUsers[user.id] === "Chủ trì" ? "default" : "secondary"
                                          }
                                        >
                                          {selectedUsers[user.id]}
                                        </Badge>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
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
                  {selectedUsersList.map((user, idx) => (
                    <div
                      key={user?.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border"
                      data-testid={`assigned-user-${user?.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{user?.name}</div>
                          <div className="text-xs text-muted-foreground">{user?.role}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <RadioGroup
                          value={user?.assignedRole}
                          onValueChange={(value) =>
                            handleRoleChange(user?.id!, value as "Chủ trì" | "Phối hợp" | "Chỉ đạo")
                          }
                          className="flex gap-4"
                        >
                          {getAvailableRoles(user?.id!).includes("Chỉ đạo") && (
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="Chỉ đạo"
                                id={`direct-${user?.id}`}
                                data-testid={`radio-direct-${user?.id}`}
                              />
                              <Label
                                htmlFor={`direct-${user?.id}`}
                                className="cursor-pointer font-semibold text-purple-600"
                              >
                                Chỉ đạo
                              </Label>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="Chủ trì"
                              id={`lead-${user?.id}`}
                              data-testid={`radio-lead-${user?.id}`}
                            />
                            <Label
                              htmlFor={`lead-${user?.id}`}
                              className="cursor-pointer font-semibold text-primary"
                            >
                              Chủ trì
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="Phối hợp"
                              id={`collab-${user?.id}`}
                              data-testid={`radio-collab-${user?.id}`}
                            />
                            <Label
                              htmlFor={`collab-${user?.id}`}
                              className="cursor-pointer"
                            >
                              Phối hợp
                            </Label>
                          </div>
                        </RadioGroup>

                        {user?.assignedRole !== "Chủ trì" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleUser(user?.id!)}
                            data-testid={`button-remove-${user?.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              💡 Hướng dẫn sử dụng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <div>✓ <strong>Ban Giám đốc có vai trò "Chỉ đạo":</strong> Giám đốc/Phó giám đốc có thể chọn vai trò Chỉ đạo, Chủ trì hoặc Phối hợp</div>
            <div>✓ <strong>Click nút "Chọn người thực hiện"</strong> để mở hộp thoại chọn người</div>
            <div>✓ <strong>Click vào phòng ban</strong> trong dialog để xem danh sách người</div>
            <div>✓ <strong>Click vào người</strong> để thêm/bỏ khỏi danh sách phân công</div>
            <div>✓ <strong>3 vai trò:</strong> Chỉ đạo (BGĐ), Chủ trì (1 người), Phối hợp (nhiều người)</div>
            <div>✓ <strong>Xóa người:</strong> Click nút ✕ (không xóa được người Chủ trì)</div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" data-testid="button-cancel">
            Hủy
          </Button>
          <Button disabled={!hasLeader} data-testid="button-create">
            Tạo nhiệm vụ
          </Button>
        </div>
      </div>
    </div>
  );
}
