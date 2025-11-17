import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Save, Star, Info } from "lucide-react";
import { useEvaluationMutation } from "@/lib/useEvaluationMutation";
import {
  calculateCompletionScore,
  calculateMaxLeadershipScore,
  getLeadershipScoreCapExplanation,
  type EvaluationTask,
} from "@/lib/evaluation";

interface TaskEvaluationPanelProps {
  task: EvaluationTask & {
    id: string;
    taskNumber: string;
    title: string;
    leadershipScore?: number | string | null;
  };
}

export function TaskEvaluationPanel({ task }: TaskEvaluationPanelProps) {
  const completionScore = calculateCompletionScore(task);
  const maxScore = calculateMaxLeadershipScore(completionScore);
  const explanation = getLeadershipScoreCapExplanation(completionScore);

  const currentScore = task.leadershipScore 
    ? (typeof task.leadershipScore === 'string' ? parseFloat(task.leadershipScore) : task.leadershipScore)
    : null;

  const [score, setScore] = useState<number>(currentScore ?? maxScore);
  const evaluationMutation = useEvaluationMutation(task.id);

  const handleSave = () => {
    const cappedScore = Math.min(score, maxScore);
    evaluationMutation.mutate(cappedScore);
  };

  const isAlreadyEvaluated = currentScore !== null && currentScore !== undefined;
  const hasChanged = score !== currentScore;

  return (
    <Card className="border-l-4 border-l-amber-500" data-testid={`evaluation-panel-${task.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-xs">
                {task.taskNumber}
              </Badge>
              {isAlreadyEvaluated && (
                <Badge variant="default" className="bg-green-600">
                  Đã đánh giá: {currentScore}/10
                </Badge>
              )}
            </div>
            <CardTitle className="text-base truncate">{task.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">{explanation}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Điểm đánh giá lãnh đạo
            </Label>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="text-lg font-bold">
                {score}/{maxScore}
              </span>
            </div>
          </div>

          <Slider
            value={[score]}
            onValueChange={(values) => setScore(Math.min(values[0], maxScore))}
            min={0}
            max={maxScore}
            step={0.5}
            className="w-full"
            data-testid={`slider-evaluation-${task.id}`}
          />

          <div className="flex gap-2 justify-end">
            <Button
              onClick={handleSave}
              disabled={evaluationMutation.isPending || !hasChanged || score > maxScore}
              size="sm"
              data-testid={`button-save-evaluation-${task.id}`}
            >
              {evaluationMutation.isPending ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isAlreadyEvaluated ? "Cập nhật đánh giá" : "Lưu đánh giá"}
                </>
              )}
            </Button>
          </div>

          {score > maxScore && (
            <p className="text-sm text-destructive">
              Điểm không được vượt quá {maxScore} (điểm tối đa cho mức hoàn thành này)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
