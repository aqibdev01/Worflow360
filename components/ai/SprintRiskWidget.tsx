"use client";

import { useState, useEffect } from "react";
import { Loader2, ArrowRight, RefreshCw, Bot } from "lucide-react";
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
import { RiskScoreGauge } from "./RiskScoreGauge";
import { analyzeSprint, getLatestReport } from "@/lib/ai/optimizer";
import type { SprintAnalysisResult } from "@/lib/ai/optimizer";
import { AIDataNotice } from "./AIDataNotice";

interface Sprint {
  id: string;
  name: string;
  status: string;
  ai_risk_score?: number | null;
  ai_analyzed_at?: string | null;
}

interface SprintRiskWidgetProps {
  projectId: string;
  sprints: Sprint[];
  onViewFullReport?: () => void;
  className?: string;
}

const BOTTLENECK_ICONS: Record<string, string> = {
  blocked_tasks: "\u26A0\uFE0F",
  member_overload: "\uD83D\uDD34",
  deadline_risk: "\u23F0",
  velocity_lag: "\uD83D\uDCC9",
  unassigned_critical: "\u2753",
  scope_creep: "\uD83D\uDCC8",
  workload_imbalance: "\u2696\uFE0F",
  overdue_tasks: "\u23F3",
  unassigned_tasks: "\u2753",
};

const FOUR_HOURS = 4 * 60 * 60 * 1000;

/**
 * Compact card widget showing AI sprint health.
 * Fits alongside analytics cards, auto-triggers if report > 4 hours old.
 */
export function SprintRiskWidget({
  projectId,
  sprints,
  onViewFullReport,
  className,
}: SprintRiskWidgetProps) {
  const activeSprints = sprints.filter(
    (s) => s.status === "active" || s.status === "planned"
  );

  const [selectedSprintId, setSelectedSprintId] = useState(
    activeSprints[0]?.id || ""
  );
  const [report, setReport] = useState<SprintAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);

  // Load latest report on mount/sprint change
  useEffect(() => {
    if (!selectedSprintId) return;

    async function loadReport() {
      const latest = await getLatestReport(selectedSprintId);
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

        // Auto-trigger if stale (> 4 hours)
        const age = Date.now() - new Date(latest.created_at).getTime();
        if (age > FOUR_HOURS) {
          handleAnalyze();
        }
      }
    }
    loadReport();
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
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Sprint Health
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            disabled={loading || !selectedSprintId}
            className="h-7 text-xs gap-1"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {loading ? "Analyzing..." : "Analyze Now"}
          </Button>
        </div>

        {/* Sprint selector */}
        {activeSprints.length > 1 && (
          <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
            <SelectTrigger className="h-7 text-xs mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activeSprints.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>

      <CardContent>
        <AIDataNotice className="mb-3" />

        {!report && !loading && (
          <div className="text-center py-6">
            <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs text-muted-foreground">
              Run AI analysis to detect bottlenecks
            </p>
          </div>
        )}

        {loading && !report && (
          <div className="flex flex-col items-center py-6 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-xs text-muted-foreground">
              Analyzing sprint health...
            </p>
          </div>
        )}

        {report && (
          <div className="space-y-3">
            {/* Risk gauge */}
            <RiskScoreGauge
              score={report.risk_score}
              riskLevel={report.risk_level}
              size={140}
            />

            {/* Last analyzed */}
            {lastAnalyzed && (
              <p className="text-[10px] text-center text-muted-foreground">
                Last analyzed:{" "}
                {new Date(lastAnalyzed).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {/* Top 2 bottleneck pills */}
            {report.bottlenecks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {report.bottlenecks.slice(0, 2).map((bn, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-[10px] gap-1"
                  >
                    {BOTTLENECK_ICONS[bn.type] || "\u26A0\uFE0F"}
                    {bn.description.length > 30
                      ? bn.description.slice(0, 30) + "..."
                      : bn.description}
                  </Badge>
                ))}
              </div>
            )}

            {/* View full report link */}
            {onViewFullReport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewFullReport}
                className="w-full text-xs text-purple-700 hover:text-purple-800 gap-1"
              >
                View Full Report
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
