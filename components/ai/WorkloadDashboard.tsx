"use client";

import { useState, useEffect } from "react";
import { Users, Loader2, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMemberWorkloadSummary } from "@/lib/ai/assigner";
import type { MemberWorkload } from "@/lib/ai/assigner";

interface WorkloadDashboardProps {
  projectId: string;
  trigger?: React.ReactNode;
}

const CAPACITY_SP = 20; // default sprint capacity per member

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function workloadColor(sp: number, capacity: number): string {
  const pct = sp / capacity;
  if (pct < 0.6) return "bg-green-500";
  if (pct < 0.8) return "bg-yellow-500";
  return "bg-red-500";
}

function statusColor(sp: number, capacity: number): string {
  const pct = sp / capacity;
  if (pct < 0.6) return "text-green-700 bg-green-50 border-green-200";
  if (pct < 0.8) return "text-yellow-700 bg-yellow-50 border-yellow-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function statusLabel(sp: number, capacity: number): string {
  const pct = sp / capacity;
  if (pct < 0.6) return "Available";
  if (pct < 0.8) return "Busy";
  return "Overloaded";
}

/**
 * Team workload dashboard showing all project members' capacity.
 * Accessible from project settings or sprint view.
 */
export function WorkloadDashboard({ projectId, trigger }: WorkloadDashboardProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberWorkload[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMemberWorkloadSummary(projectId)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Team Workload
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Workload
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No team members found.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {members.map((member) => {
                const pct = Math.min(
                  100,
                  Math.round((member.active_story_points / CAPACITY_SP) * 100)
                );

                return (
                  <Card
                    key={member.user_id}
                    className={`border ${statusColor(member.active_story_points, CAPACITY_SP)}`}
                  >
                    <CardContent className="p-3 space-y-2">
                      {/* Row 1: Avatar + name + status */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                          {getInitials(member.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {member.role}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${statusColor(
                            member.active_story_points,
                            CAPACITY_SP
                          )}`}
                        >
                          {statusLabel(member.active_story_points, CAPACITY_SP)}
                        </Badge>
                      </div>

                      {/* Story points bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {member.active_story_points} / {CAPACITY_SP} pts
                          </span>
                          <span className="text-muted-foreground">
                            {member.active_task_count} active tasks
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${workloadColor(
                              member.active_story_points,
                              CAPACITY_SP
                            )}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{member.completed_last_30d} completed (30d)</span>
                      </div>

                      {/* Skills (top 3) */}
                      {member.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {member.skills.slice(0, 3).map((skill) => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="text-[10px] bg-background"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {member.skills.length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-background text-muted-foreground"
                            >
                              +{member.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
