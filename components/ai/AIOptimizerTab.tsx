"use client";

import { useState, useEffect } from "react";
import { Bot, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { AIDataNotice } from "./AIDataNotice";
import { RiskScoreGauge } from "./RiskScoreGauge";
import { BottleneckList } from "./BottleneckList";
import { RecommendationList } from "./RecommendationList";
import { VelocityTrendChart } from "./VelocityTrendChart";
import { WorkloadHeatmap } from "./WorkloadHeatmap";
import { ProjectRiskHistory } from "./ProjectRiskHistory";

import { analyzeSprint, getLatestReport } from "@/lib/ai/optimizer";
import type { SprintAnalysisResult } from "@/lib/ai/optimizer";

interface Sprint {
  id: string;
  name: string;
  status: string;
  start_date?: string;
  end_date?: string;
  ai_risk_score?: number | null;
  ai_analyzed_at?: string | null;
}

interface AIOptimizerTabProps {
  projectId: string;
  sprints: Sprint[];
  activeSprint?: Sprint;
}

/**
 * Full AI Workflow Optimizer page content.
 * Shows risk gauge, bottlenecks, recommendations, velocity chart,
 * workload heatmap, and project risk history.
 */
export function AIOptimizerTab({
  projectId,
  sprints,
  activeSprint,
}: AIOptimizerTabProps) {
  const eligibleSprints = sprints.filter(
    (s: any) => s.status === "active" || s.status === "planned" || s.status === "completed"
  );

  const [selectedSprintId, setSelectedSprintId] = useState(
    activeSprint?.id || eligibleSprints[0]?.id || ""
  );
  const [report, setReport] = useState<SprintAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);

  const selectedSprint = eligibleSprints.find((s) => s.id === selectedSprintId);

  // Load existing report on sprint change
  useEffect(() => {
    if (!selectedSprintId) {
      setLoadingExisting(false);
      return;
    }

    setLoadingExisting(true);
    getLatestReport(selectedSprintId)
      .then((latest) => {
        if (latest) {
          setReport({
            sprint_id: latest.sprint_id,
            risk_level: latest.risk_level,
            risk_score: latest.risk_score ?? 0,
            bottlenecks: (latest.bottlenecks as any[]) || [],
            recommendations: (latest.recommendations as any[]) || [],
            model_version: latest.model_version,
          });
          setLastAnalyzed(latest.created_at);
        } else {
          setReport(null);
          setLastAnalyzed(null);
        }
      })
      .catch(() => {
        setReport(null);
        setLastAnalyzed(null);
      })
      .finally(() => setLoadingExisting(false));
  }, [selectedSprintId]);

  const handleAnalyze = async () => {
    if (!selectedSprintId) return;
    setLoading(true);
    try {
      const result = await analyzeSprint(selectedSprintId);
      setReport(result);
      setLastAnalyzed(new Date().toISOString());
      toast.success(
        `Sprint analysis complete \u2014 ${result.risk_level} risk detected`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Analysis failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            AI Workflow Optimizer
          </h3>
          <p className="text-sm text-muted-foreground">
            Detect sprint bottlenecks, risk factors, and get actionable recommendations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sprint selector */}
          {eligibleSprints.length > 1 && (
            <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
              <SelectTrigger className="h-9 w-[200px] text-sm">
                <SelectValue placeholder="Select sprint" />
              </SelectTrigger>
              <SelectContent>
                {eligibleSprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.status === "active" && " (Active)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={handleAnalyze}
            disabled={loading || !selectedSprintId}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {loading ? "Analyzing..." : "Re-analyze"}
          </Button>
        </div>
      </div>

      {lastAnalyzed && (
        <p className="text-xs text-muted-foreground -mt-4">
          Last analyzed:{" "}
          {new Date(lastAnalyzed).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      <AIDataNotice />

      {/* Loading state */}
      {(loadingExisting || (loading && !report)) && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-[250px] bg-muted animate-pulse rounded-xl" />
          <div className="h-[250px] bg-muted animate-pulse rounded-xl" />
          <div className="h-[200px] bg-muted animate-pulse rounded-xl" />
          <div className="h-[200px] bg-muted animate-pulse rounded-xl" />
        </div>
      )}

      {/* Empty state */}
      {!loadingExisting && !loading && !report && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bot className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h4 className="text-lg font-semibold mb-2">No Analysis Yet</h4>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Run AI analysis to detect bottlenecks, predict risk levels,
              and get recommendations for your sprint.
            </p>
            <Button
              onClick={handleAnalyze}
              disabled={!selectedSprintId}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Bot className="h-4 w-4" />
              Run First Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Report content */}
      {report && !loadingExisting && (
        <>
          {/* Row 1: Risk Gauge + Bottlenecks */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Risk Score Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sprint Risk Level</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <RiskScoreGauge
                  score={report.risk_score}
                  riskLevel={report.risk_level}
                  size={200}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Model: {report.model_version}
                </p>
              </CardContent>
            </Card>

            {/* Bottlenecks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Detected Issues</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[350px] overflow-y-auto">
                <BottleneckList bottlenecks={report.bottlenecks} />
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Recommendations */}
          <RecommendationList
            recommendations={report.recommendations}
            sprintId={selectedSprintId}
          />

          {/* Row 3: Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <VelocityTrendChart
              projectId={projectId}
              currentSprintId={selectedSprintId}
            />
            <ProjectRiskHistory projectId={projectId} />
          </div>

          {/* Row 4: Workload Heatmap */}
          {selectedSprint?.start_date && selectedSprint?.end_date && (
            <WorkloadHeatmap
              projectId={projectId}
              sprintId={selectedSprintId}
              startDate={selectedSprint.start_date}
              endDate={selectedSprint.end_date}
            />
          )}
        </>
      )}
    </div>
  );
}
