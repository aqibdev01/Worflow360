"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

interface VelocityTrendChartProps {
  projectId: string;
  currentSprintId?: string;
  className?: string;
}

interface SprintVelocity {
  name: string;
  planned: number;
  actual: number | null;
  isCurrent: boolean;
}

/**
 * Line chart showing planned vs actual velocity across sprints.
 * Uses Recharts (already in the project via project-analytics.tsx).
 */
export function VelocityTrendChart({
  projectId,
  currentSprintId,
  className,
}: VelocityTrendChartProps) {
  const [data, setData] = useState<SprintVelocity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVelocity() {
      setLoading(true);

      const { data: sprints } = await supabase
        .from("sprints")
        .select("id, name, velocity, capacity, status")
        .eq("project_id", projectId)
        .order("start_date", { ascending: true })
        .limit(8);

      if (sprints) {
        const chartData: SprintVelocity[] = sprints.map((s) => ({
          name: s.name.length > 12 ? s.name.slice(0, 12) + "..." : s.name,
          planned: s.capacity || 0,
          actual: s.status === "completed" ? s.velocity : null,
          isCurrent: s.id === currentSprintId,
        }));
        setData(chartData);
      }
      setLoading(false);
    }
    fetchVelocity();
  }, [projectId, currentSprintId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Velocity Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Velocity Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-8">
            No sprint data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentIdx = data.findIndex((d) => d.isCurrent);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Velocity Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                }}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="planned"
                name="Planned"
                stroke="#94a3b8"
                strokeDasharray="6 3"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ r: 3, fill: "#7c3aed" }}
                connectNulls={false}
              />
              {currentIdx >= 0 && data[currentIdx].actual != null && (
                <ReferenceDot
                  x={data[currentIdx].name}
                  y={data[currentIdx].actual!}
                  r={6}
                  fill="#7c3aed"
                  stroke="#fff"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {currentIdx >= 0 && (
          <p className="text-[10px] text-center text-muted-foreground mt-1">
            Current sprint: {data[currentIdx].name}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
