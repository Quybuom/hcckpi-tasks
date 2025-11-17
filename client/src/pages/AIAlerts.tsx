import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchJson, apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, ShieldAlert, Info, ChevronRight, TrendingUp, Users, FileText, Clock, Scan } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TaskRisk {
  type: "deadline_risk" | "no_updates" | "overload" | "complexity" | "resource" | "quality" | "coordination";
  severity?: "high" | "medium" | "low";
  reason: string;
  suggestion: string;
  taskId: string;
  taskTitle: string;
  taskNumber: string;
}

interface AiAlert extends TaskRisk {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
}

const getRiskTypeLabel = (type: TaskRisk["type"]): string => {
  const labels: Record<TaskRisk["type"], string> = {
    deadline_risk: "Nguy cơ trễ deadline",
    no_updates: "Không có cập nhật",
    overload: "Quá tải",
    complexity: "Độ phức tạp cao",
    resource: "Thiếu nguồn lực",
    quality: "Vấn đề chất lượng",
    coordination: "Phối hợp kém",
  };
  return labels[type];
};

const getRiskSeverity = (type: TaskRisk["type"], providedSeverity?: "high" | "medium" | "low"): "high" | "medium" | "low" => {
  if (providedSeverity) return providedSeverity;
  
  // Default severity mapping based on risk type
  const severityMap: Record<TaskRisk["type"], "high" | "medium" | "low"> = {
    deadline_risk: "high",
    no_updates: "medium",
    overload: "high",
    complexity: "high",
    resource: "high",
    quality: "medium",
    coordination: "high",
  };
  return severityMap[type] || "medium";
};

const getRiskIcon = (type: TaskRisk["type"]) => {
  const icons: Record<TaskRisk["type"], any> = {
    deadline_risk: Clock,
    no_updates: AlertTriangle,
    overload: TrendingUp,
    complexity: FileText,
    resource: Users,
    quality: ShieldAlert,
    coordination: Users,
  };
  return icons[type] || AlertTriangle;
};

function RiskCard({ risk }: { risk: AiAlert }) {
  const [, setLocation] = useLocation();
  const Icon = getRiskIcon(risk.type);
  const severity = getRiskSeverity(risk.type, risk.severity);

  const severityConfig = {
    high: {
      variant: "destructive" as const,
      color: "text-destructive",
      bgColor: "bg-destructive/10 hover-elevate",
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    medium: {
      variant: "default" as const,
      color: "text-yellow-700 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20 hover-elevate",
      icon: <ShieldAlert className="h-5 w-5" />,
    },
    low: {
      variant: "secondary" as const,
      color: "text-blue-700 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20 hover-elevate",
      icon: <Info className="h-5 w-5" />,
    },
  };

  const config = severityConfig[severity];

  return (
    <Alert
      className={cn(
        "cursor-pointer transition-all",
        config.bgColor
      )}
      onClick={() => setLocation(`/tasks/${risk.taskId}`)}
      data-testid={`risk-${risk.type}-${risk.taskId}`}
    >
      <div className="flex items-start gap-3">
        <div className={config.color}>
          {config.icon}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <AlertTitle className="text-base font-semibold mb-0">
              <Badge variant={config.variant} className="mr-2">
                {getRiskTypeLabel(risk.type)}
              </Badge>
              {risk.taskNumber} - {risk.taskTitle}
            </AlertTitle>
            <ChevronRight className="h-5 w-5 opacity-50" />
          </div>
          <AlertDescription className="space-y-2">
            <div>
              <span className="font-medium">Nguyên nhân:</span> {risk.reason}
            </div>
            <div className="text-muted-foreground">
              <span className="font-medium">Đề xuất:</span> {risk.suggestion}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

export default function AIAlerts() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: risks = [], isLoading } = useQuery<AiAlert[]>({
    queryKey: ["/api/ai-alerts"],
    queryFn: () => fetchJson<AiAlert[]>("/api/ai-alerts"),
    enabled: !authLoading && !!user,
    refetchInterval: 120000, // Refresh every 2 minutes
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const response = await fetchJson<{
        scannedTasks: number;
        tasksWithRisks: number;
        risks: Array<{ taskId: string; taskTitle: string; risks: any[] }>;
      }>("/api/ai/scan-all-risks");
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-alerts/pending-count"] });
      const totalRisks = data.risks.reduce((sum, task) => sum + task.risks.length, 0);
      toast({
        title: "Quét rủi ro thành công",
        description: `Đã quét ${data.scannedTasks} nhiệm vụ, phát hiện ${totalRisks} rủi ro từ ${data.tasksWithRisks} nhiệm vụ.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi quét rủi ro",
        description: error.message || "Không thể quét rủi ro. Vui lòng thử lại.",
        variant: "destructive",
      });
    },
  });

  const isLeadership = user?.role === "Giám đốc" || user?.role === "Phó Giám đốc";

  if (authLoading || !user) {
    return (
      <div className="container max-w-6xl py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const highRisks = risks.filter(r => getRiskSeverity(r.type, r.severity) === "high");
  const mediumRisks = risks.filter(r => getRiskSeverity(r.type, r.severity) === "medium");
  const lowRisks = risks.filter(r => getRiskSeverity(r.type, r.severity) === "low");

  return (
    <div className="container max-w-6xl py-8 space-y-6" data-testid="page-ai-alerts">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cảnh báo rủi ro từ AI</h1>
          <p className="text-muted-foreground">
            Hệ thống AI phân tích và cảnh báo các rủi ro tiềm ẩn trong nhiệm vụ của bạn
          </p>
        </div>
        {isLeadership && (
          <Button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            data-testid="button-scan-risks"
          >
            <Scan className="h-4 w-4 mr-2" />
            {scanMutation.isPending ? "Đang quét..." : "Quét rủi ro toàn hệ thống"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </CardContent>
        </Card>
      ) : risks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Không có rủi ro nào được phát hiện</h3>
            <p className="text-muted-foreground">
              Tuyệt vời! Hệ thống không phát hiện rủi ro nào trong các nhiệm vụ của bạn.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-risks">
              Tất cả ({risks.length})
            </TabsTrigger>
            <TabsTrigger value="high" data-testid="tab-high-risks">
              Cao ({highRisks.length})
            </TabsTrigger>
            <TabsTrigger value="medium" data-testid="tab-medium-risks">
              Trung bình ({mediumRisks.length})
            </TabsTrigger>
            <TabsTrigger value="low" data-testid="tab-low-risks">
              Thấp ({lowRisks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tổng quan rủi ro</CardTitle>
                <CardDescription>
                  {risks.length} cảnh báo được phát hiện từ {new Set(risks.map(r => r.taskId)).size} nhiệm vụ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {risks.map((risk, index) => (
                  <RiskCard key={`${risk.taskId}-${risk.type}-${index}`} risk={risk} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="high" className="space-y-4">
            {highRisks.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Không có rủi ro mức cao</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Rủi ro mức cao</CardTitle>
                  <CardDescription>
                    {highRisks.length} cảnh báo cần xử lý ngay
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {highRisks.map((risk, index) => (
                    <RiskCard key={`${risk.taskId}-${risk.type}-${index}`} risk={risk} />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="medium" className="space-y-4">
            {mediumRisks.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Không có rủi ro mức trung bình</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-yellow-700 dark:text-yellow-400">Rủi ro mức trung bình</CardTitle>
                  <CardDescription>
                    {mediumRisks.length} cảnh báo cần theo dõi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mediumRisks.map((risk, index) => (
                    <RiskCard key={`${risk.taskId}-${risk.type}-${index}`} risk={risk} />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="low" className="space-y-4">
            {lowRisks.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Info className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Không có rủi ro mức thấp</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-700 dark:text-blue-400">Rủi ro mức thấp</CardTitle>
                  <CardDescription>
                    {lowRisks.length} cảnh báo để tham khảo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lowRisks.map((risk, index) => (
                    <RiskCard key={`${risk.taskId}-${risk.type}-${index}`} risk={risk} />
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
