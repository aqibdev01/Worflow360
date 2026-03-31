"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

interface WorkloadHeatmapProps {
  projectId: string;
  sprintId: string;
  startDate: string;
  endDate: string;
  className?: string;
}

interface HeatmapCell {
  memberId: string;
  memberName: string;
  date: string;
  taskCount: number;
  storyPoints: number;
}

function getCellColor(sp: number): string {
  if (sp === 0) return "#f1f5f9"; // slate-100
  if (sp <= 3) return "#bbf7d0"; // green-200
  if (sp <= 6) return "#86efac"; // green-300
  if (sp <= 10) return "#fde68a"; // amber-200
  if (sp <= 15) return "#fbbf24"; // amber-400
  return "#f87171"; // red-400
}

/**
 * SVG grid heatmap: rows = team members, columns = sprint days.
 * Cell color = workload intensity on that day.
 */
export function WorkloadHeatmap({
  projectId,
  sprintId,
  startDate,
  endDate,
  className,
}: WorkloadHeatmapProps) {
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    cell: HeatmapCell;
  } | null>(null);

  // Generate date range
  const dates = useMemo(() => {
    const result: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current <= end) {
      result.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [startDate, endDate]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch sprint tasks with assignees
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, assignee_id, story_points, status, due_date, created_at")
        .eq("sprint_id", sprintId)
        .not("assignee_id", "is", null);

      // Fetch member names
      const { data: members } = await supabase
        .from("project_members")
        .select("user_id, users!user_id(id, full_name)")
        .eq("project_id", projectId);

      if (!tasks || !members) {
        setLoading(false);
        return;
      }

      const nameMap: Record<string, string> = {};
      for (const m of members) {
        const u = m.users as unknown as { id: string; full_name: string | null } | null;
        nameMap[m.user_id] = u?.full_name || "Unknown";
      }

      // Build heatmap: for each member+date, count tasks active on that date
      const heatmapCells: HeatmapCell[] = [];
      const assigneeIds = [...new Set(tasks.map((t) => t.assignee_id).filter(Boolean))];

      for (const memberId of assigneeIds) {
        const memberTasks = tasks.filter((t) => t.assignee_id === memberId);
        for (const date of dates) {
          // Tasks active on this date: created before/on date, not completed before date
          const activeTasks = memberTasks.filter((t) => {
            const created = t.created_at?.split("T")[0] || startDate;
            return created <= date && t.status !== "done";
          });

          heatmapCells.push({
            memberId: memberId!,
            memberName: nameMap[memberId!] || "Unknown",
            date,
            taskCount: activeTasks.length,
            storyPoints: activeTasks.reduce((sum, t) => sum + (t.story_points || 0), 0),
          });
        }
      }

      setCells(heatmapCells);
      setLoading(false);
    }
    fetchData();
  }, [projectId, sprintId, dates, startDate]);

  const memberIds = useMemo(
    () => [...new Set(cells.map((c) => c.memberId))],
    [cells]
  );

  const memberNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of cells) map[c.memberId] = c.memberName;
    return map;
  }, [cells]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Workload Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[150px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (memberIds.length === 0 || dates.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Workload Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-6">
            No workload data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const cellSize = 18;
  const labelWidth = 80;
  const headerHeight = 24;
  const svgWidth = labelWidth + dates.length * (cellSize + 2) + 10;
  const svgHeight = headerHeight + memberIds.length * (cellSize + 2) + 10;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Workload Heatmap</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="relative">
          <svg
            width={svgWidth}
            height={svgHeight}
            className="text-xs"
          >
            {/* Date headers */}
            {dates.map((date, col) => {
              const x = labelWidth + col * (cellSize + 2);
              const day = new Date(date).getDate();
              return (
                <text
                  key={date}
                  x={x + cellSize / 2}
                  y={14}
                  textAnchor="middle"
                  fontSize={8}
                  className="fill-muted-foreground"
                >
                  {day}
                </text>
              );
            })}

            {/* Member rows */}
            {memberIds.map((memberId, row) => {
              const y = headerHeight + row * (cellSize + 2);
              return (
                <g key={memberId}>
                  {/* Member name */}
                  <text
                    x={labelWidth - 4}
                    y={y + cellSize / 2 + 3}
                    textAnchor="end"
                    fontSize={9}
                    className="fill-foreground"
                  >
                    {(memberNames[memberId] || "").slice(0, 10)}
                  </text>

                  {/* Cells */}
                  {dates.map((date, col) => {
                    const x = labelWidth + col * (cellSize + 2);
                    const cell = cells.find(
                      (c) => c.memberId === memberId && c.date === date
                    );
                    const sp = cell?.storyPoints || 0;

                    return (
                      <rect
                        key={date}
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        rx={3}
                        fill={getCellColor(sp)}
                        className="cursor-pointer"
                        onMouseEnter={(e) => {
                          if (cell) {
                            const rect = (e.target as SVGRectElement).getBoundingClientRect();
                            setTooltip({
                              x: rect.left + rect.width / 2,
                              y: rect.top - 10,
                              cell,
                            });
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="fixed z-50 pointer-events-none bg-popover border rounded-md shadow-md px-2 py-1.5 text-xs"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: "translate(-50%, -100%)",
              }}
            >
              <p className="font-medium">{tooltip.cell.memberName}</p>
              <p className="text-muted-foreground">
                {new Date(tooltip.cell.date).toLocaleDateString()}
              </p>
              <p>
                {tooltip.cell.taskCount} tasks, {tooltip.cell.storyPoints} SP
              </p>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            <span>Less</span>
            {[0, 3, 6, 10, 15].map((sp) => (
              <div
                key={sp}
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: getCellColor(sp) }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
