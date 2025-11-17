import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ShieldAlert, Info, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface TaskRisk {
  type: "deadline_risk" | "no_updates" | "overload" | "complexity" | "resource" | "quality" | "coordination";
  severity: "high" | "medium" | "low";
  reason: string;
  suggestion: string;
  taskId: string;
  taskTitle: string;
  taskNumber: string;
}

function RiskCard({ risk }: { risk: TaskRisk }) {
  const [, setLocation] = useLocation();

  const severityStyles = {
    high: {
      bg: "bg-error/10 dark:bg-error/10",
      border: "border-error/30",
      icon: ShieldAlert,
      iconColor: "text-error",
      label: "Nghiêm trọng",
    },
    medium: {
      bg: "bg-warning/10 dark:bg-warning/10",
      border: "border-warning/30",
      icon: AlertTriangle,
      iconColor: "text-warning",
      label: "Trung bình",
    },
    low: {
      bg: "bg-info/10 dark:bg-info/10",
      border: "border-info/30",
      icon: Info,
      iconColor: "text-info",
      label: "Thấp",
    },
  };

  const riskTypeLabels: Record<TaskRisk["type"], string> = {
    deadline_risk: "Nguy cơ trễ deadline",
    no_updates: "Thiếu cập nhật",
    overload: "Quá tải",
    complexity: "Độ phức tạp cao",
    resource: "Thiếu nguồn lực",
    quality: "Chất lượng",
    coordination: "Phối hợp kém",
  };

  const style = severityStyles[risk.severity];
  const Icon = style.icon;

  return (
    <Alert
      className={cn(
        "relative transition-all cursor-pointer hover-elevate",
        style.bg,
        style.border,
        "border"
      )}
      onClick={() => setLocation(`/tasks/${risk.taskId}`)}
      data-testid={`risk-${risk.type}-${risk.taskId}`}
    >
      <Icon className={cn("h-4 w-4", style.iconColor)} />
      <AlertTitle className="pr-8 flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{risk.taskNumber}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full", style.bg, style.iconColor)}>
              {style.label}
            </span>
          </div>
          <div className="text-sm font-normal text-muted-foreground line-clamp-1">
            {risk.taskTitle}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <div>
          <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
            {riskTypeLabels[risk.type]}
          </span>
          <p className="mt-1 text-sm">{risk.reason}</p>
        </div>
        <div className="pt-2 border-t border-border/50">
          <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
            Đề xuất
          </span>
          <p className="mt-1 text-sm text-muted-foreground">{risk.suggestion}</p>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function AIRiskWarnings() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: risks = [], isLoading } = useQuery<TaskRisk[]>({
    queryKey: ["/api/ai/risks/me"],
    queryFn: () => fetchJson<TaskRisk[]>("/api/ai/risks/me"),
    enabled: !authLoading && !!user, // Only fetch when auth is ready and user is authenticated
    refetchInterval: 120000, // Refresh every 2 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-error" />
            Cảnh báo rủi ro AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-24 bg-muted/50 rounded-md animate-pulse" />
            <div className="h-24 bg-muted/50 rounded-md animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (risks.length === 0) {
    return null;
  }

  return (
    <Card data-testid="card-ai-risk-warnings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-error" />
          Cảnh báo rủi ro AI
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {risks.length} rủi ro được phát hiện
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {risks.map((risk, index) => (
          <RiskCard
            key={`${risk.taskId}-${risk.type}-${index}`}
            risk={risk}
          />
        ))}
      </CardContent>
    </Card>
  );
}
