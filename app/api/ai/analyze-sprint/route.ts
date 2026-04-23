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

interface AISprintAnalysisResponse {
  sprint_id: string;
  risk_level: string;
  risk_score: number;
  bottlenecks: Array<{
    type: string;
    description: string;
    affected_task_ids: string[];
    severity: string;
  }>;
  recommendations: Array<{
    action: string;
    reason: string;
    priority: string;
  }>;
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
    const { sprint_id } = body;

    if (!sprint_id) {
      return NextResponse.json(
        { error: "sprint_id is required" },
        { status: 400 }
      );
    }

    // 2. Fetch sprint details
    const { data: sprint, error: sprintErr } = await supabase
      .from("sprints")
      .select("id, name, start_date, end_date, status, capacity, velocity, project_id")
      .eq("id", sprint_id)
      .single();

    if (sprintErr || !sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    // 3. Validate user has access to this project
    const { data: membership } = await supabase
      .from("project_members")
      .select("id, role")
      .eq("project_id", sprint.project_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You do not have access to this project" },
        { status: 403 }
      );
    }

    // 4. Fetch sprint tasks — ONLY permitted fields
    const { data: tasks } = await supabase
      .from("tasks")
      .select(
        "id, title, status, priority, story_points, assignee_id, due_date, created_at"
      )
      .eq("sprint_id", sprint_id);

    const taskPayloads = (tasks || []).map((t) => ({
      task_id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee_id: t.assignee_id,
      story_points: t.story_points,
      due_date: t.due_date,
      created_at: t.created_at,
    }));

    // 5. Compute per-member workloads from sprint tasks
    const memberWorkloads: Record<string, number> = {};
    for (const t of taskPayloads) {
      if (!t.assignee_id || t.status === "done") continue;
      memberWorkloads[t.assignee_id] =
        (memberWorkloads[t.assignee_id] || 0) + (t.story_points || 0);
    }

    // 6. Fetch last 3 completed sprint velocities for velocity history
    const { data: pastSprints } = await supabase
      .from("sprints")
      .select("velocity")
      .eq("project_id", sprint.project_id)
      .eq("status", "completed")
      .order("end_date", { ascending: false })
      .limit(3);

    const pastVelocities = (pastSprints || [])
      .map((s) => s.velocity)
      .filter((v): v is number => v !== null);

    // 7. Call AI server
    const result = await callAIServer<AISprintAnalysisResponse>(
      "/api/analyze-sprint",
      {
        sprint_id: sprint.id,
        sprint_name: sprint.name,
        start_date: sprint.start_date,
        end_date: sprint.end_date,
        capacity: sprint.capacity,
        tasks: taskPayloads,
        member_workloads: memberWorkloads,
      }
    );

    // 8. Save result to ai_bottleneck_reports table
    const { error: reportError } = await supabase
      .from("ai_bottleneck_reports")
      .insert({
        sprint_id: sprint.id,
        project_id: sprint.project_id,
        risk_level: result.risk_level,
        risk_score: result.risk_score,
        bottlenecks: result.bottlenecks,
        recommendations: result.recommendations,
        model_version: result.model_version,
      });

    if (reportError) {
      console.error("[AI Sprint] Failed to save report:", reportError);
    }

    // 9. Update sprint with risk score and factors
    await supabase
      .from("sprints")
      .update({
        ai_risk_score: result.risk_score,
        ai_risk_factors: {
          risk_level: result.risk_level,
          bottleneck_count: result.bottlenecks.length,
          bottleneck_types: result.bottlenecks.map((b) => b.type),
        },
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq("id", sprint.id);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[AI Analyze Sprint] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to analyze sprint",
      },
      { status: 500 }
    );
  }
}
