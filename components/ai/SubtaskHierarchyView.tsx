"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Sparkles, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface Subtask {
  id: string;
  title: string;
  status: string;
  priority: string;
  story_points: number | null;
  assignee_id: string | null;
  is_ai_generated: boolean;
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface SubtaskHierarchyViewProps {
  parentTaskId: string;
  parentTitle: string;
  onSubtaskClick?: (subtaskId: string) => void;
  className?: string;
}

const STATUS_ICONS: Record<string, { icon: typeof Circle; color: string }> = {
  todo: { icon: Circle, color: "text-gray-400" },
  in_progress: { icon: Clock, color: "text-blue-500" },
  review: { icon: AlertCircle, color: "text-purple-500" },
  done: { icon: CheckCircle2, color: "text-green-500" },
  blocked: { icon: AlertCircle, color: "text-red-500" },
};

/**
 * Tree view showing a parent task and its subtasks.
 * Displayed inside the task detail drawer when accepted subtasks exist.
 */
export function SubtaskHierarchyView({
  parentTaskId,
  parentTitle,
  onSubtaskClick,
  className,
}: SubtaskHierarchyViewProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubtasks() {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, title, status, priority, story_points, assignee_id, is_ai_generated, assignee:users!assignee_id(id, full_name, avatar_url)"
        )
        .eq("parent_task_id", parentTaskId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setSubtasks(data as unknown as Subtask[]);
      }
      setLoading(false);
    }

    fetchSubtasks();
  }, [parentTaskId]);

  if (loading) {
    return (
      <div className={`space-y-2 ${className || ""}`}>
        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        <div className="h-8 w-full bg-muted animate-pulse rounded" />
        <div className="h-8 w-full bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (subtasks.length === 0) return null;

  const doneCount = subtasks.filter((s) => s.status === "done").length;
  const total = subtasks.length;
  const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h4 className="text-sm font-semibold">Subtasks</h4>
          <span className="text-xs text-muted-foreground">
            {doneCount}/{total} done
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Tree: parent at top */}
      <div className="space-y-0.5">
        {/* Parent task */}
        <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/50">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{parentTitle}</span>
        </div>

        {/* Subtask rows — indented with connecting line */}
        <div className="ml-2 border-l-2 border-muted pl-3 space-y-0.5">
          {subtasks.map((subtask) => {
            const statusConfig = STATUS_ICONS[subtask.status] || STATUS_ICONS.todo;
            const StatusIcon = statusConfig.icon;

            return (
              <button
                key={subtask.id}
                type="button"
                onClick={() => onSubtaskClick?.(subtask.id)}
                className="flex items-center gap-2 w-full py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
              >
                {/* Status dot */}
                <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${statusConfig.color}`} />

                {/* Title */}
                <span
                  className={`text-sm truncate flex-1 ${
                    subtask.status === "done"
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {subtask.title}
                </span>

                {/* AI generated indicator */}
                {subtask.is_ai_generated && (
                  <Sparkles className="h-3 w-3 text-purple-400 shrink-0" />
                )}

                {/* Assignee avatar */}
                {subtask.assignee?.full_name && (
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                    {subtask.assignee.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                )}

                {/* Story points */}
                {subtask.story_points && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                    {subtask.story_points}
                  </Badge>
                )}

                {/* Arrow on hover */}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
