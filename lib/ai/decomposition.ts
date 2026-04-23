/**
 * Client library for AI Task Decomposition (M6).
 *
 * Provides functions to:
 * - Request decomposition from the AI server
 * - Accept/reject suggested subtasks
 * - Create real task records from accepted subtasks
 * - Fetch decomposition history for a task
 */

import { supabase } from "@/lib/supabase";
import type {
  AiTaskDecomposition,
  AiTaskDecompositionInsert,
  TaskInsert,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SubtaskSuggestion {
  title: string;
  description: string;
  priority: string;
  story_points: number;
  estimated_days: number;
  tags: string[];
  confidence: number;
}

export interface DecomposeResult {
  task_id: string;
  subtasks: SubtaskSuggestion[];
  overall_confidence: number;
  model_version: string;
  decomposition_id: string | null;
}

// ---------------------------------------------------------------------------
// Request decomposition
// ---------------------------------------------------------------------------

/**
 * Request AI decomposition for a task.
 *
 * Calls the Next.js API route which handles auth, data fetching,
 * sanitization, AI server call, and DB persistence.
 */
export async function requestDecomposition(
  taskId: string
): Promise<DecomposeResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/ai/decompose", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ task_id: taskId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `Decomposition failed (${res.status})`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Accept subtasks — create real task records
// ---------------------------------------------------------------------------

/**
 * Accept selected subtasks from a decomposition.
 *
 * Creates real task records in Supabase for each accepted subtask,
 * setting parent_task_id and is_ai_generated=true. Updates the
 * decomposition status and the parent task's decomposition_status.
 *
 * @param decompositionId - ID of the ai_task_decompositions record
 * @param acceptedIndices - Indices of subtasks to accept (0-based)
 */
export async function acceptSubtasks(
  decompositionId: string,
  acceptedIndices: number[]
): Promise<{ created_tasks: string[] }> {
  // 1. Fetch the decomposition record
  const { data: decomposition, error: fetchError } = await supabase
    .from("ai_task_decompositions")
    .select("*")
    .eq("id", decompositionId)
    .single();

  if (fetchError || !decomposition) {
    throw new Error("Decomposition record not found");
  }

  // 2. Fetch parent task for project_id, sprint_id, created_by
  const { data: parentTask, error: taskError } = await supabase
    .from("tasks")
    .select("id, project_id, sprint_id, created_by")
    .eq("id", decomposition.parent_task_id)
    .single();

  if (taskError || !parentTask) {
    throw new Error("Parent task not found");
  }

  // 3. Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  // 4. Extract accepted subtasks from the JSON array
  const allSubtasks = decomposition.suggested_subtasks as SubtaskSuggestion[];
  const accepted = acceptedIndices
    .filter((i) => i >= 0 && i < allSubtasks.length)
    .map((i) => allSubtasks[i]);

  if (accepted.length === 0) {
    throw new Error("No valid subtask indices provided");
  }

  // 5. Create task records for each accepted subtask
  const taskInserts: TaskInsert[] = accepted.map((subtask) => ({
    project_id: parentTask.project_id,
    sprint_id: parentTask.sprint_id,
    title: subtask.title,
    description: subtask.description || null,
    priority: subtask.priority as "low" | "medium" | "high" | "urgent",
    status: "todo" as const,
    story_points: subtask.story_points,
    estimated_days: subtask.estimated_days,
    tags: subtask.tags,
    parent_task_id: parentTask.id,
    is_ai_generated: true,
    created_by: user.id,
  }));

  const { data: createdTasks, error: insertError } = await supabase
    .from("tasks")
    .insert(taskInserts)
    .select("id");

  if (insertError) {
    throw new Error(`Failed to create subtasks: ${insertError.message}`);
  }

  // 6. Update decomposition status
  const isPartial = acceptedIndices.length < allSubtasks.length;
  const newStatus = isPartial ? "partially_accepted" : "accepted";

  await supabase
    .from("ai_task_decompositions")
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", decompositionId);

  // 7. Update parent task decomposition_status
  const taskDecompStatus = isPartial
    ? "partially_accepted"
    : "fully_accepted";

  await supabase
    .from("tasks")
    .update({ decomposition_status: taskDecompStatus })
    .eq("id", parentTask.id);

  return {
    created_tasks: createdTasks?.map((t) => t.id) || [],
  };
}

// ---------------------------------------------------------------------------
// Reject decomposition
// ---------------------------------------------------------------------------

/**
 * Reject a decomposition — no subtasks are created.
 */
export async function rejectDecomposition(
  decompositionId: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  // Update decomposition status
  const { error } = await supabase
    .from("ai_task_decompositions")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", decompositionId);

  if (error) {
    throw new Error(`Failed to reject decomposition: ${error.message}`);
  }

  // Fetch parent_task_id to reset decomposition_status
  const { data: decomp } = await supabase
    .from("ai_task_decompositions")
    .select("parent_task_id")
    .eq("id", decompositionId)
    .single();

  if (decomp) {
    await supabase
      .from("tasks")
      .update({ decomposition_status: "none" })
      .eq("id", decomp.parent_task_id);
  }
}

// ---------------------------------------------------------------------------
// Decomposition history
// ---------------------------------------------------------------------------

/**
 * Fetch all decomposition records for a task from the database.
 */
export async function getDecompositionHistory(
  taskId: string
): Promise<AiTaskDecomposition[]> {
  const { data, error } = await supabase
    .from("ai_task_decompositions")
    .select("*")
    .eq("parent_task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch decomposition history: ${error.message}`
    );
  }

  return data || [];
}
