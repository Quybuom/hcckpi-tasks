import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Users, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type AlertType = "deadline_risk" | "overload" | "no_update" | "low_performance";

interface AIAlertCardProps {
  id: string;
  type: AlertType;
  taskTitle: string;
  reason: string;
  suggestion?: string;
  createdAt: Date;
  onAccept?: () => void;
  onDismiss?: () => void;
}

const alertConfig: Record<
  AlertType,
  { icon: typeof AlertTriangle; color: string; label: string }
> = {
  deadline_risk: {
    icon: Clock,
    color: "text-yellow-600",
    label: "Nguy cơ trễ hạn",
  },
  overload: {
    icon: Users,
    color: "text-orange-600",
    label: "Quá tải công việc",
  },
  no_update: {
    icon: AlertTriangle,
    color: "text-red-600",
    label: "Không cập nhật",
  },
  low_performance: {
    icon: TrendingDown,
    color: "text-red-600",
    label: "Hiệu suất thấp",
  },
};

export function AIAlertCard({
  id,
  type,
  taskTitle,
  reason,
  suggestion,
  createdAt,
  onAccept,
  onDismiss,
}: AIAlertCardProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <Card className="p-4" data-testid={`card-alert-${id}`}>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className={`rounded-md bg-destructive/10 p-2 shrink-0`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Badge variant="outline" className="shrink-0">
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {format(createdAt, "dd/MM HH:mm", { locale: vi })}
              </span>
            </div>
            <h4 className="font-medium text-sm mb-1 line-clamp-2">{taskTitle}</h4>
            <p className="text-sm text-muted-foreground mb-2">{reason}</p>
            {suggestion && (
              <div className="rounded-md bg-muted/50 p-3 mt-2">
                <p className="text-xs font-medium mb-1">Đề xuất từ AI:</p>
                <p className="text-xs text-muted-foreground">{suggestion}</p>
              </div>
            )}
          </div>
        </div>

        {(onAccept || onDismiss) && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {onAccept && (
              <Button
                size="sm"
                variant="default"
                onClick={onAccept}
                data-testid={`button-accept-alert-${id}`}
              >
                Chấp nhận
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                data-testid={`button-dismiss-alert-${id}`}
              >
                Bỏ qua
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
