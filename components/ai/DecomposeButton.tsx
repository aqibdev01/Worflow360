"use client";

import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { requestDecomposition } from "@/lib/ai/decomposition";
import type { DecomposeResult } from "@/lib/ai/decomposition";

interface DecomposeButtonProps {
  taskId: string;
  hasSubtasks: boolean;
  userRole: string;
  decompositionStatus?: string;
  onDecompose: (result: DecomposeResult) => void;
  className?: string;
}

/**
 * "AI Decompose" button shown on tasks with no subtasks.
 * Only visible to contributors and above.
 */
export function DecomposeButton({
  taskId,
  hasSubtasks,
  userRole,
  decompositionStatus,
  onDecompose,
  className,
}: DecomposeButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  // Only show for contributor+ roles and tasks without subtasks
  const allowedRoles = ["owner", "lead", "contributor"];
  if (!allowedRoles.includes(userRole) || hasSubtasks) return null;

  const isReanalyze = decompositionStatus === "none" && state === "idle";
  const wasRejected =
    decompositionStatus === "none" && state === "done";

  const handleClick = async () => {
    setState("loading");
    try {
      const result = await requestDecomposition(taskId);
      setState("done");
      onDecompose(result);
    } catch (error) {
      setState("idle");
      toast.error(
        error instanceof Error ? error.message : "Failed to analyze task"
      );
    }
  };

  if (state === "done") return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={state === "loading"}
      className={`gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 transition-all ${className || ""}`}
    >
      {state === "loading" ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing task...
        </>
      ) : (
        <>
          <Wand2 className="h-4 w-4" />
          {wasRejected ? "Re-analyze" : "AI Decompose"}
        </>
      )}
    </Button>
  );
}
