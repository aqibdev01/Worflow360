"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjectRiskHistory } from "@/lib/ai/optimizer";
import type { RiskHistoryPoint } from "@/lib/ai/optimizer";

interface ProjectRiskHistoryProps {
  projectId: string;
  className?: string;
}

const RISK_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

/**
 * Bar chart showing historical risk scores colored by risk level.
 * Shows risk trend over time — is the project improving or degrading?
 */
export function ProjectRiskHistory({
  projectId,
  className,
}: ProjectRiskHistoryProps) {
  const [data, setData] = useState<RiskHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProjectRiskHistory(projectId)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Risk History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Risk History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-6">
            No analysis history yet — run an analysis to start tracking
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((point, i) => ({
    label: new Date(point.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    score: Math.round(point.risk_score * 100),
    risk_level: point.risk_level,
    bottlenecks: point.bottleneck_count,
  }));

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Risk History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={30}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-md shadow-md px-3 py-2 text-xs">
                      <p className="font-medium">{d.label}</p>
                      <p>
                        Risk: {d.score}% ({d.risk_level})
                      </p>
                      <p className="text-muted-foreground">
                        {d.bottlenecks} bottleneck
                        {d.bottlenecks !== 1 ? "s" : ""}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={30}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={RISK_COLORS[entry.risk_level] || RISK_COLORS.medium}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
