/**
 * Client library for AI Sprint Bottleneck Predictor (M11).
 *
 * Provides functions to:
 * - Analyze a single sprint for risk
 * - Analyze all active sprints in a project
 * - Fetch latest and historical risk reports
 */

import { supabase } from "@/lib/supabase";
import type { AiBottleneckReport } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Bottleneck {
  type: string;
  description: string;
  affected_task_ids: string[];
  severity: string;
}

export interface Recommendation {
  action: string;
  reason: string;
  priority: string;
}

export interface SprintAnalysisResult {
  sprint_id: string;
  risk_level: string;
  risk_score: number;
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  model_version: string;
}

export interface ProjectAnalysisResult {
  project_id: string;
  risk_level: string;
  risk_score: number;
  sprint_count: number;
  bottleneck_count: number;
  top_recommendations: Recommendation[];
  sprint_results: SprintAnalysisResult[];
  model_version: string;
}

export interface RiskHistoryPoint {
  date: string;
  risk_score: number;
  risk_level: string;
  bottleneck_count: number;
  sprint_id: string;
}

// ---------------------------------------------------------------------------
// Analyze sprint
// ---------------------------------------------------------------------------

/**
 * Request AI analysis for a single sprint.
 *
 * Calls the Next.js API route which handles auth, data fetching,
 * AI server call, and DB persistence.
 */
export async function analyzeSprint(
  sprintId: string
): Promise<SprintAnalysisResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch("/api/ai/analyze-sprint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ sprint_id: sprintId }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `Sprint analysis failed (${res.status})`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Analyze project (all active sprints)
// ---------------------------------------------------------------------------

/**
 * Analyze all active sprints in a project.
 *
 * Calls analyze-sprint for each active sprint and returns
 * aggregated project-level risk.
 */
export async function analyzeProject(
  projectId: string
): Promise<ProjectAnalysisResult> {
  // Fetch active sprints
  const { data: sprints, error } = await supabase
    .from("sprints")
    .select("id")
    .eq("project_id", projectId)
    .in("status", ["active", "planned"]);

  if (error || !sprints) {
    throw new Error("Failed to fetch project sprints");
  }

  // Analyze each sprint
  const sprintResults: SprintAnalysisResult[] = [];
  for (const sprint of sprints) {
    try {
      const result = await analyzeSprint(sprint.id);
      sprintResults.push(result);
    } catch (err) {
      console.error(`Failed to analyze sprint ${sprint.id}:`, err);
    }
  }

  // Aggregate
  const totalScore =
    sprintResults.length > 0
      ? sprintResults.reduce((sum, r) => sum + r.risk_score, 0) /
        sprintResults.length
      : 0;

  const allBottlenecks = sprintResults.flatMap((r) => r.bottlenecks);

  // Deduplicate recommendations
  const seenActions = new Set<string>();
  const topRecs: Recommendation[] = [];
  for (const r of sprintResults.flatMap((s) => s.recommendations)) {
    if (!seenActions.has(r.action)) {
      seenActions.add(r.action);
      topRecs.push(r);
    }
  }

  const riskLevel =
    totalScore >= 0.75
      ? "critical"
      : totalScore >= 0.5
      ? "high"
      : totalScore >= 0.25
      ? "medium"
      : "low";

  return {
    project_id: projectId,
    risk_level: riskLevel,
    risk_score: Math.round(totalScore * 100) / 100,
    sprint_count: sprintResults.length,
    bottleneck_count: allBottlenecks.length,
    top_recommendations: topRecs.slice(0, 5),
    sprint_results: sprintResults,
    model_version: sprintResults[0]?.model_version || "unknown",
  };
}

// ---------------------------------------------------------------------------
// Fetch latest report
// ---------------------------------------------------------------------------

/**
 * Get the most recent bottleneck report for a sprint.
 */
export async function getLatestReport(
  sprintId: string
): Promise<AiBottleneckReport | null> {
  const { data, error } = await supabase
    .from("ai_bottleneck_reports")
    .select("*")
    .eq("sprint_id", sprintId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

// ---------------------------------------------------------------------------
// Risk history for trend charts
// ---------------------------------------------------------------------------

/**
 * Fetch historical risk scores for a project (for trend visualization).
 *
 * Returns one data point per report, ordered chronologically.
 */
export async function getProjectRiskHistory(
  projectId: string
): Promise<RiskHistoryPoint[]> {
  const { data, error } = await supabase
    .from("ai_bottleneck_reports")
    .select("created_at, risk_score, risk_level, bottlenecks, sprint_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error || !data) return [];

  return data.map((report) => ({
    date: report.created_at,
    risk_score: report.risk_score ?? 0,
    risk_level: report.risk_level,
    bottleneck_count: Array.isArray(report.bottlenecks)
      ? report.bottlenecks.length
      : 0,
    sprint_id: report.sprint_id,
  }));
}
