import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Calendar, User, Users } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { STATUS_VARIANTS, PRIORITY_VARIANTS, type TaskStatus, type TaskPriority } from "@/lib/badge-variants";

interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  deadline: Date;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  assignee: {
    name: string;
    avatar?: string;
    initials: string;
  };
  collaborators?: number;
  onClick?: () => void;
}

export function TaskCard({
  id,
  title,
  description,
  deadline,
  priority,
  status,
  progress,
  assignee,
  collaborators,
  onClick,
}: TaskCardProps) {
  const isOverdue = status === "Quá hạn";

  return (
    <Card
      className="p-4 hover-elevate cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`card-task-${id}`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base mb-1 line-clamp-2" data-testid={`text-task-title-${id}`}>
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>
          <Badge variant={PRIORITY_VARIANTS[priority]} className="shrink-0">
            {priority}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className={`font-mono ${isOverdue ? "text-destructive" : ""}`}>
              {format(deadline, "dd/MM/yyyy", { locale: vi })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{assignee.name}</span>
          </div>
          {collaborators && collaborators > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>+{collaborators}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <Badge variant={STATUS_VARIANTS[status]} className="text-xs">
              {status}
            </Badge>
            <span className="font-mono font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <Avatar className="w-6 h-6">
            <AvatarImage src={assignee.avatar} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {assignee.initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">
            Chủ trì: {assignee.name}
          </span>
        </div>
      </div>
    </Card>
  );
}
