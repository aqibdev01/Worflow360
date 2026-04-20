"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  UserPlus,
  SkipForward,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { suggestAssignee, confirmAssignment } from "@/lib/ai/assigner";
import { supabase } from "@/lib/supabase";
import type { AssignResult } from "@/lib/ai/assigner";

interface UnassignedTask {
  id: string;
  title: string;
  priority: string;
  story_points: number | null;
}

interface BulkResult {
  task: UnassignedTask;
  result: AssignResult | null;
  status: "pending" | "accepted" | "skipped" | "changed";
  selectedUserId: string | null;
  selectedName: string | null;
}

interface BulkAssignDialogProps {
  projectId: string;
  sprintId: string;
  unassignedTasks: UnassignedTask[];
  onComplete: () => void;
}

function confidenceColor(score: number): string {
  if (score >= 0.75) return "text-green-700 bg-green-100";
  if (score >= 0.5) return "text-yellow-700 bg-yellow-100";
  return "text-red-700 bg-red-100";
}

/**
 * Bulk assignment dialog for sprint leads/owners.
 * Runs AI suggestions for all unassigned tasks sequentially,
 * then shows results in a table for accept/skip actions.
 */
export function BulkAssignDialog({
  projectId,
  sprintId,
  unassignedTasks,
  onComplete,
}: BulkAssignDialogProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BulkResult[]>([]);

  const handleRunAI = async () => {
    setRunning(true);
    setProgress(0);
    const bulkResults: BulkResult[] = [];

    for (let i = 0; i < unassignedTasks.length; i++) {
      const task = unassignedTasks[i];
      setProgress(i + 1);

      try {
        const result = await suggestAssignee(task.id);
        const topSuggestion = result.suggestions[0] || null;
        bulkResults.push({
          task,
          result,
          status: topSuggestion ? "accepted" : "skipped",
          selectedUserId: topSuggestion?.user_id || null,
          selectedName: topSuggestion?.full_name || null,
        });
      } catch {
        bulkResults.push({
          task,
          result: null,
          status: "skipped",
          selectedUserId: null,
          selectedName: null,
        });
      }
    }

    setResults(bulkResults);
    setRunning(false);
  };

  const toggleAccept = (idx: number) => {
    setResults((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        if (r.status === "accepted") {
          return { ...r, status: "skipped" as const };
        }
        if (r.result?.suggestions[0]) {
          const top = r.result.suggestions[0];
          return {
            ...r,
            status: "accepted" as const,
            selectedUserId: top.user_id,
            selectedName: top.full_name,
          };
        }
        return r;
      })
    );
  };

  const acceptAll = () => {
    setResults((prev) =>
      prev.map((r) => {
        if (r.result?.suggestions[0]) {
          const top = r.result.suggestions[0];
          return {
            ...r,
            status: "accepted" as const,
            selectedUserId: top.user_id,
            selectedName: top.full_name,
          };
        }
        return r;
      })
    );
  };

  const handleApply = async () => {
    const toApply = results.filter(
      (r) => r.status === "accepted" && r.selectedUserId
    );
    if (toApply.length === 0) {
      toast.error("No suggestions accepted");
      return;
    }

    setApplying(true);
    let successCount = 0;

    for (const item of toApply) {
      try {
        await supabase
          .from("tasks")
          .update({
            assignee_id: item.selectedUserId,
            ai_suggested_assignee_id: item.selectedUserId,
          })
          .eq("id", item.task.id);
        successCount++;
      } catch {
        // Continue with remaining
      }
    }

    setApplying(false);
    toast.success(`Assigned ${successCount} task${successCount > 1 ? "s" : ""}`);
    setOpen(false);
    setResults([]);
    onComplete();
  };

  const acceptedCount = results.filter((r) => r.status === "accepted").length;

  if (unassignedTasks.length === 0) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI Assign ({unassignedTasks.length} unassigned)
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); setResults([]); } else setOpen(true); }}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Bulk AI Assignment
              <Badge variant="secondary">{unassignedTasks.length} tasks</Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Before running */}
          {results.length === 0 && !running && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Run AI suggestions for all {unassignedTasks.length} unassigned tasks in this sprint.
                You can review and accept/skip each suggestion before applying.
              </p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {unassignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded text-sm"
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          task.priority === "urgent"
                            ? "#ef4444"
                            : task.priority === "high"
                            ? "#f97316"
                            : task.priority === "medium"
                            ? "#3b82f6"
                            : "#6b7280",
                      }}
                    />
                    <span className="truncate flex-1">{task.title}</span>
                    {task.story_points && (
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {task.story_points} pts
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              <Button
                onClick={handleRunAI}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Run AI Assignment
              </Button>
            </div>
          )}

          {/* Running */}
          {running && (
            <div className="py-8 space-y-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
              <p className="text-sm font-medium">
                Analyzing task {progress}/{unassignedTasks.length}...
              </p>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden max-w-xs mx-auto">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{
                    width: `${(progress / unassignedTasks.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Results table */}
          {results.length > 0 && !running && (
            <div className="space-y-3">
              {/* Bulk actions */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {acceptedCount}/{results.length} accepted
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={acceptAll}
                  className="text-xs gap-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  Accept All
                </Button>
              </div>

              {/* Results list */}
              <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                {results.map((item, idx) => {
                  const top = item.result?.suggestions[0];
                  const isAccepted = item.status === "accepted";

                  return (
                    <div
                      key={item.task.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        isAccepted
                          ? "bg-purple-50 border border-purple-200"
                          : "bg-muted/30 border border-transparent"
                      }`}
                    >
                      {/* Task title */}
                      <span className="truncate flex-1 min-w-0 font-medium">
                        {item.task.title}
                      </span>

                      {/* Suggestion */}
                      {top ? (
                        <>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {item.selectedName || top.full_name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] shrink-0 ${confidenceColor(
                              top.confidence
                            )}`}
                          >
                            {Math.round(top.confidence * 100)}%
                          </Badge>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No suggestion
                        </span>
                      )}

                      {/* Accept/Skip toggle */}
                      {top && (
                        <Button
                          variant={isAccepted ? "default" : "outline"}
                          size="sm"
                          className={`h-6 text-[10px] px-2 shrink-0 ${
                            isAccepted
                              ? "bg-purple-600 hover:bg-purple-700"
                              : ""
                          }`}
                          onClick={() => toggleAccept(idx)}
                        >
                          {isAccepted ? (
                            <>
                              <Check className="h-3 w-3 mr-0.5" />
                              Accept
                            </>
                          ) : (
                            <>
                              <SkipForward className="h-3 w-3 mr-0.5" />
                              Skip
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          {results.length > 0 && !running && (
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setResults([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={applying || acceptedCount === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
              >
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Apply {acceptedCount} Assignment{acceptedCount !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
