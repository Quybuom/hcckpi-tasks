import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Info, User, Send, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [telegramId, setTelegramId] = useState(user?.telegramId || "");
  const [groupTelegramChatId, setGroupTelegramChatId] = useState(user?.groupTelegramChatId || "");
  const [notifyOnNewTask, setNotifyOnNewTask] = useState(user?.notifyOnNewTask ?? true);
  const [notifyOnDeadline, setNotifyOnDeadline] = useState(user?.notifyOnDeadline ?? true);
  const [notifyOnComment, setNotifyOnComment] = useState(user?.notifyOnComment ?? true);
  const [notifyOnScheduledAISuggestions, setNotifyOnScheduledAISuggestions] = useState(user?.notifyOnScheduledAISuggestions ?? false);
  const [notifyOnScheduledAIAlerts, setNotifyOnScheduledAIAlerts] = useState(user?.notifyOnScheduledAIAlerts ?? false);
  const [notifyOnScheduledWeeklyKPI, setNotifyOnScheduledWeeklyKPI] = useState(user?.notifyOnScheduledWeeklyKPI ?? false);
  const [notifyOnScheduledMonthlyKPI, setNotifyOnScheduledMonthlyKPI] = useState(user?.notifyOnScheduledMonthlyKPI ?? false);
  
  const isDeptHead = user?.role === "Trưởng phòng";

  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      telegramId: string;
      groupTelegramChatId?: string;
      notifyOnNewTask: boolean;
      notifyOnDeadline: boolean;
      notifyOnComment: boolean;
      notifyOnScheduledAISuggestions: boolean;
      notifyOnScheduledAIAlerts: boolean;
      notifyOnScheduledWeeklyKPI: boolean;
      notifyOnScheduledMonthlyKPI: boolean;
    }) => {
      return apiRequest("PUT", "/api/profile/telegram", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Cập nhật thành công",
        description: "Thông tin Telegram đã được lưu",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật thông tin",
        variant: "destructive",
      });
    },
  });

  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/telegram/test", { chatId: telegramId });
    },
    onSuccess: () => {
      toast({
        title: "Đã gửi tin nhắn thử!",
        description: "Kiểm tra Telegram của bạn",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Lỗi gửi tin nhắn",
        description: error.message || "Kiểm tra lại Chat ID",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const data: any = {
      telegramId: telegramId.trim(),
      notifyOnNewTask,
      notifyOnDeadline,
      notifyOnComment,
      notifyOnScheduledAISuggestions,
      notifyOnScheduledAIAlerts,
      notifyOnScheduledWeeklyKPI,
      notifyOnScheduledMonthlyKPI,
    };
    
    if (isDeptHead) {
      data.groupTelegramChatId = groupTelegramChatId.trim();
    }
    
    updateProfileMutation.mutate(data);
  };

  const handleTest = () => {
    if (!telegramId.trim()) {
      toast({
        title: "Chưa nhập Chat ID",
        description: "Vui lòng nhập Telegram Chat ID trước",
        variant: "destructive",
      });
      return;
    }
    testNotificationMutation.mutate();
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6" data-testid="page-profile">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="w-8 h-8" />
          Trang cá nhân
        </h1>
        <p className="text-muted-foreground">
          Quản lý thông tin và tùy chọn thông báo của bạn
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
          <CardDescription>
            Thông tin tài khoản của bạn trong hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Họ và tên</Label>
              <Input value={user?.fullName || ""} disabled data-testid="input-user-fullname" />
            </div>
            <div className="space-y-2">
              <Label>Vai trò</Label>
              <div className="flex gap-2">
                <Input value={user?.role || ""} disabled data-testid="input-user-role" />
                <Badge variant="secondary" data-testid="badge-user-role">{user?.role}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tên đăng nhập</Label>
              <Input value={user?.username || ""} disabled data-testid="input-user-username" />
            </div>
            {user?.position && (
              <div className="space-y-2">
                <Label>Chức vụ</Label>
                <Input value={user.position} disabled data-testid="input-user-position" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#0088cc]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.68c.223-.198-.054-.308-.346-.11l-6.4 4.02-2.76-.918c-.6-.187-.612-.6.125-.89l10.782-4.156c.498-.187.936.112.77.89z"/>
            </svg>
            Thông báo Telegram
          </CardTitle>
          <CardDescription>
            Nhận thông báo qua Telegram khi có task mới hoặc deadline sắp đến
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Cách lấy Telegram Chat ID</AlertTitle>
            <AlertDescription className="space-y-2">
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Mở Telegram, tìm <code className="bg-muted px-1 py-0.5 rounded">@userinfobot</code></li>
                <li>Nhấn "Start" và bot sẽ gửi cho bạn Chat ID</li>
                <li>Copy số Chat ID và paste vào ô bên dưới</li>
                <li>Nhấn "Lưu" và "Gửi tin nhắn thử" để kiểm tra</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegram-id">Telegram Chat ID</Label>
              <div className="flex gap-2">
                <Input
                  id="telegram-id"
                  placeholder="VD: 123456789"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  data-testid="input-telegram-id"
                />
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={!telegramId.trim() || testNotificationMutation.isPending}
                  data-testid="button-test-telegram"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {testNotificationMutation.isPending ? "Đang gửi..." : "Thử"}
                </Button>
              </div>
              {user?.telegramId && (
                <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-telegram-configured">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Đã cấu hình
                </p>
              )}
            </div>
            
            {isDeptHead && (
              <>
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <Label htmlFor="group-telegram-id">Telegram Group Chat ID (Nhóm phòng ban)</Label>
                  <Input
                    id="group-telegram-id"
                    placeholder="VD: -1001234567890"
                    value={groupTelegramChatId}
                    onChange={(e) => setGroupTelegramChatId(e.target.value)}
                    data-testid="input-group-telegram-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nhóm này sẽ nhận thông báo tự động: Đề xuất AI (8h sáng T2-T6), Cảnh báo AI (16h chiều T2-T6 & Chủ nhật), KPI tuần (17h T6), KPI tháng (cuối tháng)
                  </p>
                  {user?.groupTelegramChatId && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-group-telegram-configured">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Đã cấu hình nhóm
                    </p>
                  )}
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-4">
              <Label>Thông báo theo sự kiện (ngay lập tức):</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-new-task"
                    checked={notifyOnNewTask}
                    onCheckedChange={(checked) => setNotifyOnNewTask(checked as boolean)}
                    data-testid="checkbox-notify-new-task"
                  />
                  <label
                    htmlFor="notify-new-task"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Có task mới được giao
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-deadline"
                    checked={notifyOnDeadline}
                    onCheckedChange={(checked) => setNotifyOnDeadline(checked as boolean)}
                    data-testid="checkbox-notify-deadline"
                  />
                  <label
                    htmlFor="notify-deadline"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Deadline sắp đến (3 ngày trước)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-comment"
                    checked={notifyOnComment}
                    onCheckedChange={(checked) => setNotifyOnComment(checked as boolean)}
                    data-testid="checkbox-notify-comment"
                  />
                  <label
                    htmlFor="notify-comment"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Có người bình luận vào task của tôi
                  </label>
                </div>
              </div>
            </div>
            
            <Separator />

            <div className="space-y-4">
              <Label>Báo cáo tự động (theo lịch định kỳ):</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-scheduled-ai-suggestions"
                    checked={notifyOnScheduledAISuggestions}
                    onCheckedChange={(checked) => setNotifyOnScheduledAISuggestions(checked as boolean)}
                    data-testid="checkbox-notify-scheduled-ai-suggestions"
                  />
                  <label
                    htmlFor="notify-scheduled-ai-suggestions"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Đề xuất AI (8h sáng T2-T6)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-scheduled-ai-alerts"
                    checked={notifyOnScheduledAIAlerts}
                    onCheckedChange={(checked) => setNotifyOnScheduledAIAlerts(checked as boolean)}
                    data-testid="checkbox-notify-scheduled-ai-alerts"
                  />
                  <label
                    htmlFor="notify-scheduled-ai-alerts"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Cảnh báo AI (16h chiều T2-T6 & Chủ nhật)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-scheduled-weekly-kpi"
                    checked={notifyOnScheduledWeeklyKPI}
                    onCheckedChange={(checked) => setNotifyOnScheduledWeeklyKPI(checked as boolean)}
                    data-testid="checkbox-notify-scheduled-weekly-kpi"
                  />
                  <label
                    htmlFor="notify-scheduled-weekly-kpi"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    KPI tuần (17h T6, 7 ngày qua)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notify-scheduled-monthly-kpi"
                    checked={notifyOnScheduledMonthlyKPI}
                    onCheckedChange={(checked) => setNotifyOnScheduledMonthlyKPI(checked as boolean)}
                    data-testid="checkbox-notify-scheduled-monthly-kpi"
                  />
                  <label
                    htmlFor="notify-scheduled-monthly-kpi"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    KPI tháng (cuối tháng, tháng trước)
                  </label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Các thông báo này sẽ được gửi tự động theo lịch định kỳ đến Telegram cá nhân của bạn. {isDeptHead && "Nhóm phòng ban cũng sẽ nhận báo cáo này nếu đã cấu hình Group Chat ID."}
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
              className="w-full"
              data-testid="button-save-telegram"
            >
              {updateProfileMutation.isPending ? "Đang lưu..." : "Lưu cài đặt"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
