/**
 * AI DATA BOUNDARY — Sanitized payload types
 *
 * These types define the ONLY data shapes that are ever sent to the AI server.
 * Nothing outside these types should ever reach the AI server.
 *
 * NEVER include in any AI payload:
 *   - User PII: email, phone, avatar_url, full_name, auth tokens
 *   - Communication: chat messages, DMs, mail content
 *   - Files: storage paths, file contents, public URLs
 *   - Notifications: notification content
 */

// ---------------------------------------------------------------------------
// ALLOWED: Task data sent to AI (M6 decomposition, M10 assigner)
// ---------------------------------------------------------------------------
export type AITaskPayload = {
  task_id: string; // UUID only — no joins to user data
  title: string; // task content only
  description: string; // task content only
  priority: string; // enum value only
  status: string; // enum value only
  tags: string[]; // labels only
  story_points: number | null;
  estimated_days: number | null;
  due_date: string | null; // ISO date string only
  sprint_id: string | null; // UUID only
  project_id: string; // UUID only
  // NEVER INCLUDE: assignee name, creator name, comments, attachments
};

// ---------------------------------------------------------------------------
// ALLOWED: Member profile sent to AI (M10 assigner only)
// ---------------------------------------------------------------------------
export type AIMemberPayload = {
  user_id: string; // UUID only
  role: string; // project role enum only
  skills: string[]; // from user_skills table only
  current_task_count: number;
  current_story_points: number;
  completed_tasks_last_30d: number;
  // NEVER INCLUDE: full_name, email, avatar_url, phone, any auth fields
  // full_name is added AFTER AI responds, purely for UI display
};

// ---------------------------------------------------------------------------
// ALLOWED: Sprint data sent to AI (M10, M11)
// ---------------------------------------------------------------------------
export type AISprintPayload = {
  sprint_id: string;
  start_date: string;
  end_date: string;
  capacity: number | null;
  status: string;
  tasks: AITaskPayload[];
  member_workloads: Record<string, number>; // { user_id: story_points } — no names
  past_velocities: number[]; // last 3 sprint velocity numbers only
  // NEVER INCLUDE: sprint goal text if it contains member names or sensitive info
};
