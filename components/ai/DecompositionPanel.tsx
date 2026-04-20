"use client";

import { useState, useCallback } from "react";
import {
  Wand2,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AIDataNotice } from "./AIDataNotice";
import {
  acceptSubtasks,
  rejectDecomposition,
  requestDecomposition,
} from "@/lib/ai/decomposition";
import type { DecomposeResult, SubtaskSuggestion } from "@/lib/ai/decomposition";

interface DecompositionPanelProps {
  result: DecomposeResult;
  onClose: () => void;
  onAccepted: () => void;
  onRejected: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

function confidenceColor(score: number): string {
  if (score >= 0.8) return "bg-green-100 text-green-700";
  if (score >= 0.6) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function confidenceBarColor(score: number): string {
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.6) return "bg-yellow-500";
  return "bg-red-400";
}

/**
 * Panel showing AI-suggested subtasks after decomposition.
 * Allows selecting, editing titles, accepting, rejecting, or re-analyzing.
 */
export function DecompositionPanel({
  result: initialResult,
  onClose,
  onAccepted,
  onRejected,
}: DecompositionPanelProps) {
  const [result, setResult] = useState(initialResult);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(result.subtasks.map((_, i) => i))
  );
  const [editedTitles, setEditedTitles] = useState<Record<number, string>>({});
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === result.subtasks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(result.subtasks.map((_, i) => i)));
    }
  };

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateTitle = (index: number, title: string) => {
    setEditedTitles((prev) => ({ ...prev, [index]: title }));
  };

  const handleAccept = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one subtask to accept");
      return;
    }
    if (!result.decomposition_id) {
      toast.error("No decomposition record found");
      return;
    }

    setAccepting(true);
    try {
      const indices = Array.from(selected);
      await acceptSubtasks(result.decomposition_id, indices);
      toast.success(
        `${indices.length} subtask${indices.length > 1 ? "s" : ""} created successfully`
      );
      onAccepted();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to accept subtasks"
      );
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!result.decomposition_id) {
      onRejected();
      return;
    }

    setRejecting(true);
    try {
      await rejectDecomposition(result.decomposition_id);
      toast("Decomposition rejected", {
        description: "You can re-analyze this task anytime.",
      });
      onRejected();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reject"
      );
    } finally {
      setRejecting(false);
    }
  };

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      const newResult = await requestDecomposition(result.task_id);
      setResult(newResult);
      setSelected(new Set(newResult.subtasks.map((_, i) => i)));
      setEditedTitles({});
      setExpandedItems(new Set());
      toast.success("New analysis complete");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Re-analysis failed"
      );
    } finally {
      setReanalyzing(false);
    }
  };

  const allSelected = selected.size === result.subtasks.length;
  const noneSelected = selected.size === 0;

  return (
    <div className="space-y-3 border-t pt-4 mt-4 animate-in slide-in-from-top-2 duration-300">
      {/* Privacy notice */}
      <AIDataNotice className="mb-3" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <h3 className="font-semibold text-sm">AI Suggested Subtasks</h3>
          <Badge
            variant="outline"
            className={`text-xs ${confidenceColor(result.overall_confidence)}`}
          >
            {Math.round(result.overall_confidence * 100)}% confidence
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {result.model_version}
        </span>
      </div>

      {/* Select all toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
        <span className="text-xs text-muted-foreground">
          {selected.size}/{result.subtasks.length} selected
        </span>
      </div>

      {/* Subtask cards */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {result.subtasks.map((subtask, index) => {
          const isSelected = selected.has(index);
          const isExpanded = expandedItems.has(index);
          const displayTitle = editedTitles[index] ?? subtask.title;

          return (
            <Card
              key={index}
              className={`transition-all duration-200 ${
                isSelected
                  ? "border-purple-300 bg-purple-50/50"
                  : "border-border opacity-60"
              }`}
            >
              <CardContent className="p-3 space-y-2">
                {/* Row 1: checkbox + title */}
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleSelect(index)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <Input
                      value={displayTitle}
                      onChange={(e) => updateTitle(index, e.target.value)}
                      className="h-auto p-0 border-0 bg-transparent text-sm font-medium shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(index)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Row 2: badges */}
                <div className="flex flex-wrap items-center gap-1.5 pl-6">
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${
                      PRIORITY_COLORS[subtask.priority] || PRIORITY_COLORS.medium
                    }`}
                  >
                    {subtask.priority}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {subtask.story_points} pts
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    ~{subtask.estimated_days}d
                  </Badge>
                  {subtask.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs bg-background"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Confidence bar */}
                <div className="pl-6 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${confidenceBarColor(
                        subtask.confidence
                      )}`}
                      style={{ width: `${subtask.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {Math.round(subtask.confidence * 100)}%
                  </span>
                </div>

                {/* Expanded description */}
                {isExpanded && subtask.description && (
                  <div className="pl-6 pt-1 animate-in slide-in-from-top-1 duration-200">
                    <p className="text-xs text-muted-foreground">
                      {subtask.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between pt-2 border-t gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReanalyze}
          disabled={reanalyzing || accepting}
          className="text-muted-foreground"
        >
          {reanalyzing ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Re-analyze
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            disabled={rejecting || accepting}
          >
            {rejecting ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5 mr-1.5" />
            )}
            Reject All
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={accepting || noneSelected}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {accepting ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5 mr-1.5" />
            )}
            Accept Selected ({selected.size})
          </Button>
        </div>
      </div>
    </div>
  );
}
