"use client";

import Link from "next/link";
import {
  ClipboardList,
  ArrowUpRight,
  CircleDot,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  User,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskRefMetadata {
  taskId: string;
  taskTitle: string;
  projectName: string;
  status: string;
  assignee: string | null;
  url: string;
}

interface TaskRefCardProps {
  metadata: TaskRefMetadata;
}

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  todo: {
    label: "To Do",
    color: "text-gray-600",
    bg: "bg-gray-100",
    icon: CircleDot,
  },
  in_progress: {
    label: "In Progress",
    color: "text-indigo-600",
    bg: "bg-indigo-600/10",
    icon: Clock,
  },
  review: {
    label: "Review",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: AlertTriangle,
  },
  done: {
    label: "Done",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: CheckCircle2,
  },
  blocked: {
    label: "Blocked",
    color: "text-red-600",
    bg: "bg-red-50",
    icon: XCircle,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskRefCard({ metadata }: TaskRefCardProps) {
  const statusConf = STATUS_CONFIG[metadata.status] || STATUS_CONFIG.todo;
  const StatusIcon = statusConf.icon;

  return (
    <div className="mt-1.5 max-w-[400px]">
      <Link
        href={metadata.url}
        className="group block rounded-lg border border-border/80 bg-white dark:bg-slate-900 hover:border-indigo-500/40 hover:shadow-sm transition-all overflow-hidden"
      >
        {/* Top accent bar */}
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-400" />

        <div className="p-3">
          {/* Header row */}
          <div className="flex items-start gap-2">
            <ClipboardList className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition-colors leading-snug">
                {metadata.taskTitle}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {metadata.projectName}
              </p>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
          </div>

          {/* Footer row */}
          <div className="flex items-center gap-2 mt-2">
            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConf.color} ${statusConf.bg}`}
            >
              <StatusIcon className="h-3 w-3" />
              {statusConf.label}
            </span>

            {/* Assignee */}
            {metadata.assignee && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <User className="h-3 w-3" />
                {metadata.assignee}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
