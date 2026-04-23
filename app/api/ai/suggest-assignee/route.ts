/**
 * AI DATA BOUNDARY — READ BEFORE MODIFYING
 * This route sends data to the external AI server.
 * ONLY these data sources are permitted in AI payloads:
 *   - tasks (title, description, status, priority, tags, story_points, due_date, sprint_id)
 *   - sprints (dates, capacity, status, velocity)
 *   - user_skills (skill, level — no PII)
 *   - project_members (role, workload counts only)
 *
 * NEVER send to AI server:
 *   - Chat or DM content (messages, direct_messages tables)
 *   - Mail content (mail_messages.body, subject)
 *   - File contents or storage paths
 *   - User PII (email, phone, avatar_url, auth fields)
 *   - Any content from notifications table
 *
 * Violation = privacy breach affecting all org customers.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";
import { callAIServer } from "@/lib/ai/client";
import type { AIMemberPayload } from "@/lib/ai/sanitize";

interface AIAssignResponse {
  task_id: string;
  suggestions: Array<{
    user_id: string;
    full_name: string;
    confidence: number;
    scoring_breakdown: Record<string, number>;
  }>;
  model_version: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user — prefer Authorization header (browser client uses localStorage)
    const supabase = await getServerSupabase();
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const { data: { user }, error: authError } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { task_id } = body;

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      );
    }

    // 2. Fetch ONLY permitted task fields
    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .select(
        "id, title, description, status, priority, tags, story_points, estimated_days, due_date, sprint_id, project_id"
      )
      .eq("id", task_id)
      .single();

    if (taskErr || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 3. Validate user has access to this project
    const { data: membership } = await supabase
      .from("project_members")
      .select("id, role")
      .eq("project_id", task.project_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 }
      );
    }

    // 4. Fetch project members — ONLY user_id and role, NO PII
    const { data: members } = await supabase
      .from("project_members")
      .select("user_id, role")
      .eq("project_id", task.project_id);

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: "No project members found" },
        { status: 404 }
      );
    }

    const memberIds = members.map((m) => m.user_id);

    // 5. Fetch skills — ONLY skill name, NO PII
    const { data: skills } = await supabase
      .from("user_skills")
      .select("user_id, skill")
      .in("user_id", memberIds);

    // 6. Fetch workload: active tasks per member (count + story points sum)
    const { data: activeTasks } = await supabase
      .from("tasks")
      .select("assignee_id, story_points")
      .eq("project_id", task.project_id)
      .in("status", ["todo", "in_progress", "review"])
      .in("assignee_id", memberIds);

    const workloadMap: Record<string, { count: number; sp: number }> = {};
    for (const t of activeTasks || []) {
      if (!t.assignee_id) continue;
      if (!workloadMap[t.assignee_id]) {
        workloadMap[t.assignee_id] = { count: 0, sp: 0 };
      }
      workloadMap[t.assignee_id].count++;
      workloadMap[t.assignee_id].sp += t.story_points || 0;
    }

    // 7. Fetch completed tasks in last 30 days — count only
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: completedTasks } = await supabase
      .from("tasks")
      .select("assignee_id")
      .eq("project_id", task.project_id)
      .eq("status", "done")
      .gte("completed_at", thirtyDaysAgo)
      .in("assignee_id", memberIds);

    const completedMap: Record<string, number> = {};
    for (const t of completedTasks || []) {
      if (!t.assignee_id) continue;
      completedMap[t.assignee_id] = (completedMap[t.assignee_id] || 0) + 1;
    }

    // 8. Build skill map per member
    const skillMap: Record<string, string[]> = {};
    for (const s of skills || []) {
      if (!skillMap[s.user_id]) skillMap[s.user_id] = [];
      skillMap[s.user_id].push(s.skill);
    }

    // 9. Build AI payload — matches AssignRequest schema
    // Send user_id as full_name (AI doesn't need real names)
    const memberPayloads = members.map((m) => ({
      user_id: m.user_id,
      full_name: m.user_id, // UUID as name — real names added after AI responds
      role: m.role,
      skills: skillMap[m.user_id] || [],
      current_task_count: workloadMap[m.user_id]?.count || 0,
      current_story_points: workloadMap[m.user_id]?.sp || 0,
      completed_tasks_last_30d: completedMap[m.user_id] || 0,
    }));

    // 10. Call AI server
    const result = await callAIServer<AIAssignResponse>(
      "/api/suggest-assignee",
      {
        task_id: task.id,
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        tags: task.tags || [],
        story_points: task.story_points,
        project_members: memberPayloads,
      }
    );

    // 11. Save top suggestion to ai_assignment_logs
    if (result.suggestions.length > 0) {
      const top = result.suggestions[0];
      const { error: logError } = await supabase
        .from("ai_assignment_logs")
        .insert({
          task_id: task.id,
          suggested_assignee_id: top.user_id,
          confidence_score: top.confidence,
          scoring_breakdown: top.scoring_breakdown,
          model_version: result.model_version,
        });

      if (logError) {
        console.error("[AI Assign] Failed to save log:", logError);
      }
    }

    // 12. AFTER AI responds: enrich with display names for the frontend
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", memberIds);

    const nameMap: Record<string, string> = {};
    for (const u of users || []) {
      nameMap[u.id] = u.full_name || "Unknown";
    }

    // Replace UUID placeholders with real names for UI display
    const enrichedSuggestions = result.suggestions.map((s) => ({
      ...s,
      full_name: nameMap[s.user_id] || "Unknown",
    }));

    return NextResponse.json({
      task_id: result.task_id,
      suggestions: enrichedSuggestions,
      model_version: result.model_version,
    });
  } catch (err) {
    console.error("[AI Suggest Assignee] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to suggest assignee",
      },
      { status: 500 }
    );
  }
}
