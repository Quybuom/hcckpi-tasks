import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { X, ChevronDown, ChevronUp, Sparkles, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardSuggestion {
  id: string;
  type: string;
  priority: "high" | "medium" | "low";
  title: string;
  content: string;
  actionable: boolean;
  details?: string;
}

const DISMISS_STORAGE_KEY = "ai-suggestions-dismissed";
const BLACKLIST_THRESHOLD = 3;

function getDismissCount(type: string): number {
  try {
    const stored = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!stored) return 0;
    const data = JSON.parse(stored);
    return data[type] || 0;
  } catch {
    return 0;
  }
}

function incrementDismissCount(type: string): number {
  try {
    const stored = localStorage.getItem(DISMISS_STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : {};
    const newCount = (data[type] || 0) + 1;
    data[type] = newCount;
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(data));
    return newCount;
  } catch {
    return 0;
  }
}

function getBlacklistedTypes(): string[] {
  try {
    const stored = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!stored) return [];
    const data = JSON.parse(stored);
    return Object.keys(data).filter(key => data[key] >= BLACKLIST_THRESHOLD);
  } catch {
    return [];
  }
}

function AISuggestionCard({ suggestion, onDismiss }: { suggestion: DashboardSuggestion; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const priorityStyles = {
    high: {
      bg: "bg-error/10 dark:bg-error/10",
      border: "border-error/30",
      icon: AlertCircle,
      iconColor: "text-error",
    },
    medium: {
      bg: "bg-warning/10 dark:bg-warning/10",
      border: "border-warning/30",
      icon: Info,
      iconColor: "text-warning",
    },
    low: {
      bg: "bg-info/10 dark:bg-info/10",
      border: "border-info/30",
      icon: Sparkles,
      iconColor: "text-info",
    },
  };

  const style = priorityStyles[suggestion.priority];
  const Icon = style.icon;

  return (
    <Alert
      className={cn(
        "relative transition-all",
        style.bg,
        style.border,
        "border"
      )}
      data-testid={`suggestion-${suggestion.type}`}
    >
      <Icon className={cn("h-4 w-4", style.iconColor)} />
      <AlertTitle className="pr-8 flex items-start justify-between">
        <span>{suggestion.title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={onDismiss}
          data-testid={`button-dismiss-${suggestion.type}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{suggestion.content}</p>
        {suggestion.details && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 p-0 h-auto text-sm"
              data-testid={`button-toggle-details-${suggestion.type}`}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Ẩn chi tiết
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Xem chi tiết
                </>
              )}
            </Button>
            {expanded && (
              <div className="mt-2 p-3 bg-background/50 rounded-md text-sm whitespace-pre-line">
                {suggestion.details}
              </div>
            )}
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function AISuggestions() {
  const [dismissedInSession, setDismissedInSession] = useState<Set<string>>(new Set());

  const blacklistedTypes = getBlacklistedTypes();

  // AUTHENTICATED: Fetch AI suggestions
  const { data: suggestions = [], isLoading } = useQuery<DashboardSuggestion[]>({
    queryKey: ["/api/ai/dashboard-suggestions", blacklistedTypes.join(",")],
    queryFn: () => {
      const params = new URLSearchParams();
      if (blacklistedTypes.length > 0) {
        params.set("dismissed", blacklistedTypes.join(","));
      }
      return fetchJson<DashboardSuggestion[]>(`/api/ai/dashboard-suggestions?${params}`);
    },
    refetchInterval: 60000,
  });

  const handleDismiss = (suggestion: DashboardSuggestion) => {
    const newCount = incrementDismissCount(suggestion.type);
    setDismissedInSession(prev => new Set(prev).add(suggestion.type));

    if (newCount >= BLACKLIST_THRESHOLD) {
      window.location.reload();
    }
  };

  const visibleSuggestions = suggestions.filter(
    s => !dismissedInSession.has(s.type) && !blacklistedTypes.includes(s.type)
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gợi ý từ AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-20 bg-muted/50 rounded-md animate-pulse" />
            <div className="h-20 bg-muted/50 rounded-md animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <Card data-testid="card-ai-suggestions">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Gợi ý từ AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleSuggestions.map((suggestion) => (
          <AISuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onDismiss={() => handleDismiss(suggestion)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
