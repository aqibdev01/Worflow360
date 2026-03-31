/**
 * Client library for AI Smart Assignment (M10).
 *
 * Provides functions to:
 * - Request assignment suggestions from the AI server
 * - Confirm or reject assignment suggestions
 * - Get member workload summaries for display
 */

import { supabase } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoringBreakdown {
  skill_match: number;
  semantic_similarity: number;
  workload: number;
  role_match: number;
  performance: number;
  availability: number;
}

export interface AssigneeSuggestion {
  user_id: string;
  full_name: string;
  confidence: number;
  scoring_breakdown: ScoringBreakdown;
}

export interface AssignResult {
  task_id: string;
  suggestions: AssigneeSuggestion[];
  model_version: string;
}

export interface MemberWorkload {
  user_id: string;
  full_name: string;
  role: string;
  active_task_count: number;
  active_story_points: number;
  completed_last_30d: number;
  skills: string[];
}

// ---------------------------------------------------------------------------
// Request assignment suggestion
// ---------------------------------------------------------------------------

/**
 * Request AI assignment suggestion for a task.
 *
 * Calls the Next.js API route which handles auth, data fetching,
 * sanitization, AI server call, and DB logging.
 */
export async function suggestAssignee(
  taskId: string
): Promise<AssignResult> {
  const res = await fetch("/api/ai/suggest-assignee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id: taskId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `Assignment suggestion failed (${res.status})`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Confirm assignment
// ---------------------------------------------------------------------------

/**
 * Confirm an AI assignment suggestion — assigns the user to the task.
 *
 * Updates:
 * - task.assignee_id to the selected user
 * - task.ai_suggested_assignee_id and ai_assignee_confidence
 * - ai_assignment_logs.was_accepted and final_assignee_id
 */
export async function confirmAssignment(
  logId: string,
  taskId: string,
  userId: string
): Promise<void> {
  // Update the task with the assignee
  const { error: taskError } = await supabase
    .from("tasks")
    .update({
      assignee_id: userId,
      ai_suggested_assignee_id: userId,
    })
    .eq("id", taskId);

  if (taskError) {
    throw new Error(`Failed to assign task: ${taskError.message}`);
  }

  // Update the assignment log
  const { error: logError } = await supabase
    .from("ai_assignment_logs")
    .update({
      was_accepted: true,
      final_assignee_id: userId,
    })
    .eq("id", logId);

  if (logError) {
    console.error("Failed to update assignment log:", logError);
  }
}

// ---------------------------------------------------------------------------
// Reject suggestion
// ---------------------------------------------------------------------------

/**
 * Reject an AI assignment suggestion.
 */
export async function rejectSuggestion(
  logId: string,
  taskId: string
): Promise<void> {
  const { error } = await supabase
    .from("ai_assignment_logs")
    .update({ was_accepted: false })
    .eq("id", logId);

  if (error) {
    throw new Error(`Failed to reject suggestion: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Member workload summary
// ---------------------------------------------------------------------------

/**
 * Fetch workload data for all members of a project.
 *
 * Used by UI to display who is available vs overloaded.
 */
export async function getMemberWorkloadSummary(
  projectId: string
): Promise<MemberWorkload[]> {
  // Fetch members with profiles
  const { data: members, error: membersError } = await supabase
    .from("project_members")
    .select("user_id, role, users!user_id(id, full_name)")
    .eq("project_id", projectId);

  if (membersError || !members) {
    throw new Error("Failed to fetch project members");
  }

  const memberIds = members.map((m) => m.user_id);

  // Fetch active tasks, skills, and completed counts in parallel
  const [activeTasksResult, skillsResult, completedResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("assignee_id, story_points")
      .eq("project_id", projectId)
      .in("status", ["todo", "in_progress", "review"])
      .in("assignee_id", memberIds),
    supabase
      .from("user_skills")
      .select("user_id, skill")
      .in("user_id", memberIds),
    supabase
      .from("tasks")
      .select("assignee_id")
      .eq("project_id", projectId)
      .eq("status", "done")
      .gte(
        "completed_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .in("assignee_id", memberIds),
  ]);

  // Build workload maps
  const workloadMap: Record<string, { count: number; sp: number }> = {};
  for (const t of activeTasksResult.data || []) {
    if (!t.assignee_id) continue;
    if (!workloadMap[t.assignee_id])
      workloadMap[t.assignee_id] = { count: 0, sp: 0 };
    workloadMap[t.assignee_id].count++;
    workloadMap[t.assignee_id].sp += t.story_points || 0;
  }

  const completedMap: Record<string, number> = {};
  for (const t of completedResult.data || []) {
    if (!t.assignee_id) continue;
    completedMap[t.assignee_id] = (completedMap[t.assignee_id] || 0) + 1;
  }

  const skillMap: Record<string, string[]> = {};
  for (const s of skillsResult.data || []) {
    if (!skillMap[s.user_id]) skillMap[s.user_id] = [];
    skillMap[s.user_id].push(s.skill);
  }

  return members.map((m) => {
    const userProfile = m.users as unknown as {
      id: string;
      full_name: string | null;
    } | null;
    return {
      user_id: m.user_id,
      full_name: userProfile?.full_name || "Unknown",
      role: m.role,
      active_task_count: workloadMap[m.user_id]?.count || 0,
      active_story_points: workloadMap[m.user_id]?.sp || 0,
      completed_last_30d: completedMap[m.user_id] || 0,
      skills: skillMap[m.user_id] || [],
    };
  });
}
