"use client";

import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { Recommendation } from "@/lib/ai/optimizer";

interface RecommendationListProps {
  recommendations: Recommendation[];
  sprintId: string;
  className?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const STORAGE_KEY_PREFIX = "ai_rec_done_";

/**
 * AI recommendations list with "Mark Done" tracking via localStorage.
 */
export function RecommendationList({
  recommendations,
  sprintId,
  className,
}: RecommendationListProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}${sprintId}`;
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setDoneSet(new Set(JSON.parse(stored)));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const toggleDone = (idx: number) => {
    setDoneSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (recommendations.length === 0) {
    return (
      <div className={`text-center py-6 ${className || ""}`}>
        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No recommendations</p>
      </div>
    );
  }

  // Sort: high → medium → low, done items last
  const sorted = [...recommendations.map((r, i) => ({ ...r, _idx: i }))].sort(
    (a, b) => {
      const aDone = doneSet.has(a._idx) ? 1 : 0;
      const bDone = doneSet.has(b._idx) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    }
  );

  return (
    <div className={`space-y-2 ${className || ""}`}>
      <h4 className="text-sm font-semibold flex items-center gap-2">
        AI Recommendations
        <Badge variant="secondary" className="text-xs">
          {recommendations.length - doneSet.size} remaining
        </Badge>
      </h4>

      {sorted.map((rec) => {
        const isDone = doneSet.has(rec._idx);

        return (
          <Card
            key={rec._idx}
            className={`transition-all duration-200 ${
              isDone ? "opacity-50" : ""
            }`}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={isDone}
                  onChange={() => toggleDone(rec._idx)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.medium
                      }`}
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                  <p
                    className={`text-sm font-medium ${
                      isDone ? "line-through" : ""
                    }`}
                  >
                    {rec.action}
                  </p>
                  <p className="text-xs text-muted-foreground">{rec.reason}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
