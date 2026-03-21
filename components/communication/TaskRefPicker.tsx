"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Search,
  Loader2,
  CircleDot,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskRefPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onTaskSelected: (taskRef: {
    taskId: string;
    taskTitle: string;
    projectName: string;
    projectId: string;
    status: string;
    assignee: string | null;
    assigneeId: string | null;
  }) => void;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee_id: string | null;
  project_id: string;
  assignee?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  projects?: { id: string; name: string } | null;
}

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  todo: { label: "To Do", color: "text-gray-600", bg: "bg-gray-100", icon: CircleDot },
  in_progress: { label: "In Progress", color: "text-brand-blue", bg: "bg-brand-blue/10", icon: Clock },
  review: { label: "Review", color: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle },
  done: { label: "Done", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2 },
  blocked: { label: "Blocked", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-blue-300",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function TaskRefPicker({
  open,
  onOpenChange,
  orgId,
  onTaskSelected,
}: TaskRefPickerProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"active" | "done">("active");

  // Load tasks from all org projects
  useEffect(() => {
    if (!open || !orgId) return;

    setLoading(true);
    async function loadTasks() {
      try {
        // Get org projects first
        const { data: projects } = await (supabase as any)
          .from("projects")
          .select("id, name")
          .eq("org_id", orgId);

        if (!projects || projects.length === 0) {
          setTasks([]);
          return;
        }

        const projectIds = (projects as any[]).map((p: any) => p.id);

        // Get all tasks from those projects
        const { data: taskData } = await (supabase as any)
          .from("tasks")
          .select(
            "id, title, status, priority, assignee_id, project_id, assignee:users!assignee_id(id, full_name, avatar_url), projects(id, name)"
          )
          .in("project_id", projectIds)
          .order("updated_at", { ascending: false })
          .limit(200);

        setTasks((taskData as TaskItem[]) || []);
      } catch (err) {
        console.error("Error loading tasks:", err);
        toast.error("Failed to load tasks");
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [open, orgId]);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !search ||
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.projects?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesTab =
      tab === "active" ? task.status !== "done" : task.status === "done";

    return matchesSearch && matchesTab;
  });

  const handleSelect = (task: TaskItem) => {
    onTaskSelected({
      taskId: task.id,
      taskTitle: task.title,
      projectName: task.projects?.name || "Unknown Project",
      projectId: task.project_id,
      status: task.status,
      assignee: task.assignee?.full_name || null,
      assigneeId: task.assignee_id || null,
    });
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-brand-blue" />
            Attach Task Reference
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setTab("active")}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "active"
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Active Tasks
          </button>
          <button
            onClick={() => setTab("done")}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "done"
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Completed
          </button>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {search ? "No tasks match your search" : "No tasks found"}
              </p>
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {filteredTasks.map((task) => {
                const statusConf =
                  STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
                const StatusIcon = statusConf.icon;
                const priorityBorder =
                  PRIORITY_COLORS[task.priority] || "border-l-gray-300";

                return (
                  <button
                    key={task.id}
                    onClick={() => handleSelect(task)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border border-transparent hover:border-brand-blue/30 hover:bg-brand-blue/5 transition-all group border-l-2 ${priorityBorder}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-900 group-hover:text-brand-blue transition-colors truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {task.projects?.name}
                          </span>
                          <span
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] font-medium ${statusConf.color} ${statusConf.bg}`}
                          >
                            <StatusIcon className="h-2.5 w-2.5" />
                            {statusConf.label}
                          </span>
                          {task.assignee?.full_name && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <User className="h-2.5 w-2.5" />
                              {task.assignee.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
