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
import { getServerSupabase, getSupabaseWithToken } from "@/lib/supabase-server";
import { callAIServer } from "@/lib/ai/client";
import type { AITaskPayload } from "@/lib/ai/sanitize";

interface DecomposeAIResponse {
  task_id: string;
  subtasks: Array<{
    title: string;
    description: string;
    priority: string;
    story_points: number;
    estimated_days: number;
    tags: string[];
    confidence: number;
  }>;
  overall_confidence: number;
  model_version: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user — prefer Authorization header (browser client uses localStorage)
    const cookieSupabase = await getServerSupabase();
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const { data: { user }, error: authError } = bearerToken
      ? await cookieSupabase.auth.getUser(bearerToken)
      : await cookieSupabase.auth.getUser();
    const supabase = bearerToken ? getSupabaseWithToken(bearerToken) : cookieSupabase;

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

    // 2. Fetch ONLY permitted task fields — never join user tables
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
        "id, title, description, status, priority, tags, story_points, estimated_days, due_date, sprint_id, project_id"
      )
      .eq("id", task_id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 3. Validate user has access to this project
    const { data: membership, error: memberError } = await supabase
      .from("project_members")
      .select("id, role")
      .eq("project_id", task.project_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 }
      );
    }

    // 4. Fetch project context (name, active sprint, common tags)
    const { data: project } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", task.project_id)
      .single();

    // Get active sprint name if task is in a sprint
    let sprintContext = "";
    if (task.sprint_id) {
      const { data: sprint } = await supabase
        .from("sprints")
        .select("name, status")
        .eq("id", task.sprint_id)
        .single();
      if (sprint) {
        sprintContext = `Sprint: ${sprint.name} (${sprint.status})`;
      }
    }

    // Get existing tags used in this project (for context)
    const { data: projectTasks } = await supabase
      .from("tasks")
      .select("tags")
      .eq("project_id", task.project_id)
      .limit(50);

    const existingTags = new Set<string>();
    if (projectTasks) {
      for (const t of projectTasks) {
        if (t.tags) {
          for (const tag of t.tags) {
            existingTags.add(tag);
          }
        }
      }
    }

    // Build project context string
    const projectContext = [
      project?.name ? `Project: ${project.name}` : "",
      sprintContext,
    ]
      .filter(Boolean)
      .join(". ");

    // 5. Build sanitized AI payload — only permitted fields
    const aiPayload = {
      task_id: task.id,
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      project_context: projectContext,
      existing_tags: Array.from(existingTags).slice(0, 20),
    };

    // 6. Call AI server
    const result = await callAIServer<DecomposeAIResponse>(
      "/api/decompose",
      aiPayload
    );

    // 7. Save result to ai_task_decompositions table
    const { data: decomposition, error: insertError } = await supabase
      .from("ai_task_decompositions")
      .insert({
        parent_task_id: task_id,
        suggested_subtasks: result.subtasks,
        model_version: result.model_version,
        confidence_score: result.overall_confidence,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error(
        "[AI Decompose] Failed to save decomposition:",
        insertError
      );
      // Still return the result even if DB save fails
    }

    // 8. Update task decomposition_status
    await supabase
      .from("tasks")
      .update({ decomposition_status: "suggested" })
      .eq("id", task_id);

    return NextResponse.json({
      ...result,
      decomposition_id: decomposition?.id || null,
    });
  } catch (err) {
    console.error("[AI Decompose] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to decompose task",
      },
      { status: 500 }
    );
  }
}
