"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Check,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { AIDataNotice } from "./AIDataNotice";
import {
  suggestAssignee,
  confirmAssignment,
} from "@/lib/ai/assigner";
import type { AssignResult, AssigneeSuggestion } from "@/lib/ai/assigner";

interface AssigneeSuggestionPanelProps {
  taskId: string;
  hasAssignee: boolean;
  userRole: string;
  onAssigned: (userId: string, fullName: string) => void;
  onDismiss: () => void;
  className?: string;
}

function confidenceColor(score: number): string {
  if (score >= 0.75) return "bg-green-500";
  if (score >= 0.5) return "bg-yellow-500";
  return "bg-red-400";
}

function confidenceBadgeColor(score: number): string {
  if (score >= 0.75) return "bg-green-100 text-green-700";
  if (score >= 0.5) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * AI assignee suggestion panel shown inside the task detail drawer.
 * Triggered by "Suggest Assignee" button when task has no assignee.
 */
export function AssigneeSuggestionPanel({
  taskId,
  hasAssignee,
  userRole,
  onAssigned,
  onDismiss,
  className,
}: AssigneeSuggestionPanelProps) {
  const [state, setState] = useState<"idle" | "loading" | "results">("idle");
  const [result, setResult] = useState<AssignResult | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [assigningIdx, setAssigningIdx] = useState<number | null>(null);

  const allowedRoles = ["owner", "lead", "contributor"];
  if (hasAssignee || !allowedRoles.includes(userRole)) return null;

  const handleSuggest = async () => {
    setState("loading");
    try {
      const res = await suggestAssignee(taskId);
      setResult(res);
      setState("results");
    } catch (error) {
      setState("idle");
      toast.error(
        error instanceof Error ? error.message : "Failed to get suggestions"
      );
    }
  };

  const handleAssign = async (suggestion: AssigneeSuggestion, index: number) => {
    setAssigningIdx(index);
    try {
      // Optimistic: call onAssigned immediately
      onAssigned(suggestion.user_id, suggestion.full_name);
      toast.success(`Task assigned to ${suggestion.full_name}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to assign"
      );
    } finally {
      setAssigningIdx(null);
    }
  };

  // Idle state — show trigger button
  if (state === "idle") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleSuggest}
        className={`gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 transition-all ${className || ""}`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Suggest Assignee
      </Button>
    );
  }

  // Loading state
  if (state === "loading") {
    return (
      <div className={`flex items-center gap-2 py-3 ${className || ""}`}>
        <div className="relative">
          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center animate-pulse">
            <Sparkles className="h-4 w-4 text-purple-500" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-purple-700">Analyzing team workload...</p>
          <div className="flex gap-1">
            <div className="h-1 w-8 bg-purple-300 rounded-full animate-pulse" />
            <div className="h-1 w-6 bg-purple-200 rounded-full animate-pulse delay-100" />
            <div className="h-1 w-10 bg-purple-300 rounded-full animate-pulse delay-200" />
          </div>
        </div>
      </div>
    );
  }

  // Results state
  if (!result || result.suggestions.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground py-2 ${className || ""}`}>
        No suggestions available.{" "}
        <button type="button" onClick={onDismiss} className="underline">
          Assign manually
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 border-t pt-3 mt-3 animate-in slide-in-from-top-2 duration-300 ${className || ""}`}>
      <AIDataNotice className="mb-2" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <h4 className="text-sm font-semibold">Suggested Assignees</h4>
        </div>
        <span className="text-xs text-muted-foreground">{result.model_version}</span>
      </div>

      {/* Suggestion cards */}
      <div className="space-y-2">
        {result.suggestions.map((suggestion, idx) => {
          const isExpanded = expandedIdx === idx;
          const isAssigning = assigningIdx === idx;
          const bd = suggestion.scoring_breakdown;

          return (
            <Card
              key={suggestion.user_id}
              className={`transition-all duration-200 ${
                idx === 0 ? "border-purple-200 bg-purple-50/30" : ""
              }`}
            >
              <CardContent className="p-3 space-y-2">
                {/* Row 1: Avatar + name + confidence + assign */}
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                    {getInitials(suggestion.full_name)}
                  </div>

                  {/* Name + role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">
                        {suggestion.full_name}
                      </span>
                      {idx === 0 && (
                        <Badge className="text-[10px] h-4 bg-purple-100 text-purple-700 border-purple-200">
                          Best Match
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Confidence */}
                  <Badge
                    variant="outline"
                    className={`text-xs shrink-0 ${confidenceBadgeColor(suggestion.confidence)}`}
                  >
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>

                  {/* Assign button */}
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                    onClick={() => handleAssign(suggestion, idx)}
                    disabled={isAssigning}
                  >
                    {isAssigning ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Assign
                      </>
                    )}
                  </Button>
                </div>

                {/* Confidence bar */}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${confidenceColor(suggestion.confidence)}`}
                      style={{ width: `${suggestion.confidence * 100}%` }}
                    />
                  </div>
                </div>

                {/* Expandable "Why?" section */}
                <button
                  type="button"
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Why this suggestion?
                </button>

                {isExpanded && (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-in slide-in-from-top-1 duration-200">
                    <div className="text-xs">
                      <span className="text-muted-foreground">Skill Match:</span>{" "}
                      <span className="font-medium">{Math.round(bd.skill_match * 100)}%</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Workload:</span>{" "}
                      <span className="font-medium">{Math.round(bd.workload * 100)}%</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Role Match:</span>{" "}
                      <span className="font-medium">{Math.round(bd.role_match * 100)}%</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Performance:</span>{" "}
                      <span className="font-medium">{Math.round(bd.performance * 100)}%</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Availability:</span>{" "}
                      <span className="font-medium">{Math.round(bd.availability * 100)}%</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Semantic:</span>{" "}
                      <span className="font-medium">{Math.round(bd.semantic_similarity * 100)}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Skip link */}
      <div className="text-center">
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
        >
          Skip — Assign Manually
        </button>
      </div>
    </div>
  );
}
