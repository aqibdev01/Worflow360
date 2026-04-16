"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Bottleneck } from "@/lib/ai/optimizer";

interface BottleneckListProps {
  bottlenecks: Bottleneck[];
  onTaskClick?: (taskId: string) => void;
  className?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const TYPE_ICONS: Record<string, string> = {
  blocked_tasks: "\uD83D\uDEAB",
  member_overload: "\uD83D\uDC64",
  deadline_risk: "\u23F0",
  velocity_lag: "\uD83D\uDCC9",
  unassigned_critical: "\u2753",
  unassigned_tasks: "\u2753",
  scope_creep: "\uD83D\uDCC8",
  workload_imbalance: "\u2696\uFE0F",
  overdue_tasks: "\u23F3",
};

/**
 * Expandable list of detected sprint bottlenecks.
 * Each item shows severity, type icon, description, and affected tasks.
 */
export function BottleneckList({
  bottlenecks,
  onTaskClick,
  className,
}: BottleneckListProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (bottlenecks.length === 0) {
    return (
      <div className={`text-center py-8 ${className || ""}`}>
        <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-green-700">
          No bottlenecks detected
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Sprint is on track!
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className || ""}`}>
      <h4 className="text-sm font-semibold flex items-center gap-2">
        Detected Bottlenecks
        <Badge variant="secondary" className="text-xs">
          {bottlenecks.length}
        </Badge>
      </h4>

      {bottlenecks.map((bn, idx) => {
        const isExpanded = expandedIdx === idx;
        const icon = TYPE_ICONS[bn.type] || "\u26A0\uFE0F";

        return (
          <Card key={idx} className="overflow-hidden">
            <CardContent className="p-3">
              <button
                type="button"
                className="flex items-start gap-2 w-full text-left"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              >
                <span className="text-base shrink-0 mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        SEVERITY_COLORS[bn.severity] || SEVERITY_COLORS.medium
                      }`}
                    >
                      {bn.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">
                      {bn.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm">{bn.description}</p>
                </div>
                {bn.affected_task_ids.length > 0 && (
                  <span className="shrink-0 text-muted-foreground">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                )}
              </button>

              {isExpanded && bn.affected_task_ids.length > 0 && (
                <div className="mt-2 pl-7 space-y-1 animate-in slide-in-from-top-1 duration-200">
                  <p className="text-xs font-medium text-muted-foreground">
                    Affected Tasks ({bn.affected_task_ids.length})
                  </p>
                  {bn.affected_task_ids.slice(0, 5).map((taskId) => (
                    <button
                      key={taskId}
                      type="button"
                      onClick={() => onTaskClick?.(taskId)}
                      className="block text-xs text-primary hover:underline truncate"
                    >
                      {taskId.slice(0, 8)}...
                    </button>
                  ))}
                  {bn.affected_task_ids.length > 5 && (
                    <span className="text-xs text-muted-foreground">
                      +{bn.affected_task_ids.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
