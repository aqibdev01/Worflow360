"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  BarChart3,
  Filter,
  X,
  Activity,
  Target,
  Zap,
  ShieldAlert,
  User,
  Code,
  Bug,
  Palette,
  Briefcase,
  LayoutList,
  PieChart as PieChartIcon,
  Download,
  Timer,
  CalendarCheck,
  Gauge,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import { getProjectAnalyticsData } from "@/lib/database";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsProps {
  projectId: string;
  currentUserId: string;
  isProjectManager: boolean;
}

interface MemberStats {
  userId: string;
  name: string;
  email: string;
  role: string;
  customRole: string | null;
  assigned: number;
  completed: number;
  inProgress: number;
  review: number;
  blocked: number;
  todo: number;
  completionRate: number;
  overdue: number;
}

// ─── Colour constants (hex for recharts, Tailwind for CSS bars) ───────────────

const STATUS_HEX: Record<string, string> = {
  todo: "#f97316",
  in_progress: "#3b82f6",
  review: "#a855f7",
  done: "#22c55e",
  blocked: "#ef4444",
};

const PRIORITY_HEX: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#10b981",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-orange-500",
  in_progress: "bg-blue-500",
  review: "bg-purple-500",
  done: "bg-green-500",
  blocked: "bg-red-500",
};

const ROLE_ICONS: Record<string, any> = {
  Developer: Code,
  "QA Engineer": Bug,
  Designer: Palette,
  "Project Manager": Briefcase,
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function initials(name: string | null, email: string): string {
  if (name) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }
  return email[0].toUpperCase();
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-6 text-right">{value}</span>
    </div>
  );
}

function StatCard({
  label, value, sub, color, icon: Icon,
}: {
  label: string; value: number | string; sub?: string; color: string; icon: any;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/** Toggle between chart and table view */
function ViewToggle({
  value,
  onChange,
}: {
  value: "chart" | "table";
  onChange: (v: "chart" | "table") => void;
}) {
  return (
    <div className="flex items-center border rounded-md overflow-hidden h-7">
      <button
        type="button"
        onClick={() => onChange("chart")}
        className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
          value === "chart"
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-muted-foreground hover:bg-muted"
        }`}
      >
        <PieChartIcon className="h-3 w-3" />
        Chart
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
          value === "table"
            ? "bg-primary text-primary-foreground"
            : "bg-transparent text-muted-foreground hover:bg-muted"
        }`}
      >
        <LayoutList className="h-3 w-3" />
        Table
      </button>
    </div>
  );
}

/** Recharts custom tooltip for bar / pie charts */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.fill || p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProjectAnalytics({ projectId, currentUserId, isProjectManager }: AnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ tasks: any[]; members: any[]; sprints: any[] }>({
    tasks: [], members: [], sprints: [],
  });

  // Filters
  const [filterMember, setFilterMember] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterSprint, setFilterSprint] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Chart/Table toggles per section
  const [myStatusView, setMyStatusView] = useState<"chart" | "table">("chart");
  const [myPriorityView, setMyPriorityView] = useState<"chart" | "table">("chart");
  const [teamStatusView, setTeamStatusView] = useState<"chart" | "table">("chart");
  const [teamPriorityView, setTeamPriorityView] = useState<"chart" | "table">("chart");
  const [memberView, setMemberView] = useState<"chart" | "table">("chart");
  const [velocityView, setVelocityView] = useState<"chart" | "table">("chart");
  const [burndownSprint, setBurndownSprint] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await getProjectAnalyticsData(projectId);
        if (mounted) setData(result);
      } catch (e) {
        console.error("Analytics load error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [projectId]);

  // ── Filtered tasks ──────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return data.tasks.filter((t) => {
      if (filterMember !== "all" && t.assignee_id !== filterMember) return false;
      if (filterSprint !== "all") {
        if (filterSprint === "backlog" && t.sprint_id) return false;
        if (filterSprint !== "backlog" && t.sprint_id !== filterSprint) return false;
      }
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterRole !== "all") {
        const member = data.members.find((m) => m.users?.id === t.assignee_id);
        const memberRole = member?.custom_role || member?.role || "";
        if (memberRole !== filterRole) return false;
      }
      return true;
    });
  }, [data, filterMember, filterRole, filterSprint, filterStatus, filterPriority]);

  // ── Personal tasks ──────────────────────────────────────────────────────────
  const myTasks = useMemo(
    () => data.tasks.filter((t) => t.assignee_id === currentUserId),
    [data.tasks, currentUserId]
  );

  const myStats = useMemo(() => {
    const now = new Date();
    return {
      total: myTasks.length,
      completed: myTasks.filter((t) => t.status === "done").length,
      inProgress: myTasks.filter((t) => t.status === "in_progress").length,
      review: myTasks.filter((t) => t.status === "review").length,
      blocked: myTasks.filter((t) => t.status === "blocked").length,
      todo: myTasks.filter((t) => t.status === "todo").length,
      overdue: myTasks.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== "done").length,
      urgent: myTasks.filter((t) => t.priority === "urgent").length,
      high: myTasks.filter((t) => t.priority === "high").length,
      medium: myTasks.filter((t) => t.priority === "medium").length,
      low: myTasks.filter((t) => t.priority === "low").length,
    };
  }, [myTasks]);

  const myCompletionRate = myStats.total > 0
    ? Math.round((myStats.completed / myStats.total) * 100)
    : 0;

  // ── Chart data: my status ───────────────────────────────────────────────────
  const myStatusChartData = useMemo(() => [
    { name: "To Do", value: myStats.todo, fill: STATUS_HEX.todo },
    { name: "In Progress", value: myStats.inProgress, fill: STATUS_HEX.in_progress },
    { name: "In Review", value: myStats.review, fill: STATUS_HEX.review },
    { name: "Done", value: myStats.completed, fill: STATUS_HEX.done },
    { name: "Blocked", value: myStats.blocked, fill: STATUS_HEX.blocked },
  ].filter((d) => d.value > 0), [myStats]);

  // ── Chart data: my priority ─────────────────────────────────────────────────
  const myPriorityChartData = useMemo(() => [
    { name: "Urgent", value: myStats.urgent, fill: PRIORITY_HEX.urgent },
    { name: "High", value: myStats.high, fill: PRIORITY_HEX.high },
    { name: "Medium", value: myStats.medium, fill: PRIORITY_HEX.medium },
    { name: "Low", value: myStats.low, fill: PRIORITY_HEX.low },
  ].filter((d) => d.value > 0), [myStats]);

  // ── Status / Priority distribution (team) ──────────────────────────────────
  const statusDist = useMemo(() => {
    const total = filteredTasks.length;
    return [
      { label: "To Do", key: "todo", count: filteredTasks.filter((t) => t.status === "todo").length, color: "bg-orange-500" },
      { label: "In Progress", key: "in_progress", count: filteredTasks.filter((t) => t.status === "in_progress").length, color: "bg-blue-500" },
      { label: "In Review", key: "review", count: filteredTasks.filter((t) => t.status === "review").length, color: "bg-purple-500" },
      { label: "Done", key: "done", count: filteredTasks.filter((t) => t.status === "done").length, color: "bg-green-500" },
      { label: "Blocked", key: "blocked", count: filteredTasks.filter((t) => t.status === "blocked").length, color: "bg-red-500" },
    ].map((s) => ({ ...s, pct: total > 0 ? Math.round((s.count / total) * 100) : 0, fill: STATUS_HEX[s.key] }));
  }, [filteredTasks]);

  const priorityDist = useMemo(() => {
    const total = filteredTasks.length;
    return [
      { label: "Urgent", key: "urgent", count: filteredTasks.filter((t) => t.priority === "urgent").length, color: "bg-red-500" },
      { label: "High", key: "high", count: filteredTasks.filter((t) => t.priority === "high").length, color: "bg-orange-500" },
      { label: "Medium", key: "medium", count: filteredTasks.filter((t) => t.priority === "medium").length, color: "bg-yellow-500" },
      { label: "Low", key: "low", count: filteredTasks.filter((t) => t.priority === "low").length, color: "bg-emerald-500" },
    ].map((p) => ({ ...p, pct: total > 0 ? Math.round((p.count / total) * 100) : 0, fill: PRIORITY_HEX[p.key] }));
  }, [filteredTasks]);

  // ── Member contributions ────────────────────────────────────────────────────
  const memberStats: MemberStats[] = useMemo(() => {
    const now = new Date();
    return data.members
      .filter((m) => m.users)
      .map((m) => {
        const uid = m.users.id;
        const memberTasks = filteredTasks.filter((t) => t.assignee_id === uid);
        const completed = memberTasks.filter((t) => t.status === "done").length;
        return {
          userId: uid,
          name: m.users.full_name || m.users.email,
          email: m.users.email,
          role: m.role,
          customRole: m.custom_role,
          assigned: memberTasks.length,
          completed,
          inProgress: memberTasks.filter((t) => t.status === "in_progress").length,
          review: memberTasks.filter((t) => t.status === "review").length,
          blocked: memberTasks.filter((t) => t.status === "blocked").length,
          todo: memberTasks.filter((t) => t.status === "todo").length,
          completionRate: memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0,
          overdue: memberTasks.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== "done").length,
        };
      })
      .sort((a, b) => b.assigned - a.assigned);
  }, [data.members, filteredTasks]);

  const memberChartData = useMemo(() => memberStats.map((m) => ({
    name: m.name.split(" ")[0], // first name for brevity
    fullName: m.name,
    Done: m.completed,
    "In Progress": m.inProgress,
    Review: m.review,
    Blocked: m.blocked,
    "To Do": m.todo,
  })), [memberStats]);

  // ── Sprint velocity ─────────────────────────────────────────────────────────
  const sprintVelocity = useMemo(() => {
    return data.sprints.map((s) => {
      const sprintTasks = filteredTasks.filter((t) => t.sprint_id === s.id);
      const done = sprintTasks.filter((t) => t.status === "done").length;
      const inProgress = sprintTasks.filter((t) => t.status === "in_progress").length;
      const blocked = sprintTasks.filter((t) => t.status === "blocked").length;
      const review = sprintTasks.filter((t) => t.status === "review").length;
      const todo = sprintTasks.filter((t) => t.status === "todo").length;
      return {
        id: s.id,
        name: s.name,
        shortName: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
        status: s.status,
        total: sprintTasks.length,
        completed: done,
        inProgress,
        blocked,
        review,
        todo,
        completionRate: sprintTasks.length > 0 ? Math.round((done / sprintTasks.length) * 100) : 0,
        // recharts data keys
        Done: done,
        "In Progress": inProgress,
        Review: review,
        "To Do": todo,
        Blocked: blocked,
      };
    });
  }, [data.sprints, filteredTasks]);

  // ── Auto-select burndown sprint ─────────────────────────────────────────────
  useEffect(() => {
    if (data.sprints.length > 0 && !burndownSprint) {
      const active = data.sprints.find((s) => s.status === "active");
      setBurndownSprint(active ? active.id : data.sprints[data.sprints.length - 1].id);
    }
  }, [data.sprints, burndownSprint]);

  // ── KPI metrics ────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const now = new Date();
    const doneTasks = filteredTasks.filter((t) => t.status === "done");

    // Average completion time
    const tasksWithTime = doneTasks.filter((t) => t.completed_at && t.created_at);
    const avgCompletionTime = tasksWithTime.length > 0
      ? (tasksWithTime.reduce((sum, t) => {
          const diff = new Date(t.completed_at).getTime() - new Date(t.created_at).getTime();
          return sum + diff / (1000 * 60 * 60 * 24);
        }, 0) / tasksWithTime.length).toFixed(1)
      : "N/A";

    // On-time delivery rate
    const doneWithDue = doneTasks.filter((t) => t.due_date);
    const onTime = doneWithDue.filter((t) => new Date(t.completed_at) <= new Date(t.due_date)).length;
    const onTimeRate = doneWithDue.length > 0 ? Math.round((onTime / doneWithDue.length) * 100) : 0;

    // Average velocity
    const sprintsWithTasks = data.sprints.filter((s) => s.status === "completed" || s.status === "active");
    const totalDoneInSprints = sprintsWithTasks.reduce((sum, s) => {
      return sum + filteredTasks.filter((t) => t.sprint_id === s.id && t.status === "done").length;
    }, 0);
    const avgVelocity = sprintsWithTasks.length > 0
      ? (totalDoneInSprints / sprintsWithTasks.length).toFixed(1)
      : "N/A";

    // Overdue count
    const overdueCount = filteredTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== "done"
    ).length;

    return { avgCompletionTime, onTimeRate, avgVelocity, overdueCount, doneWithDueCount: doneWithDue.length };
  }, [filteredTasks, data.sprints]);

  // ── Burndown chart data ────────────────────────────────────────────────────
  const burndownData = useMemo(() => {
    if (!burndownSprint) return [];
    const sprint = data.sprints.find((s) => s.id === burndownSprint);
    if (!sprint || !sprint.start_date || !sprint.end_date) return [];

    const sprintTasks = data.tasks.filter((t) => t.sprint_id === burndownSprint);
    const total = sprintTasks.length;
    if (total === 0) return [];

    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);
    const now = new Date();
    const effectiveEnd = sprint.status === "active" && now < end ? now : end;

    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const result: { date: string; ideal: number; actual: number }[] = [];

    const current = new Date(start);
    let dayIndex = 0;
    while (current <= effectiveEnd) {
      const dayEnd = new Date(current);
      dayEnd.setHours(23, 59, 59, 999);
      const completedByDay = sprintTasks.filter(
        (t) => t.status === "done" && t.completed_at && new Date(t.completed_at) <= dayEnd
      ).length;

      result.push({
        date: current.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ideal: Math.round(total * (1 - dayIndex / totalDays) * 10) / 10,
        actual: total - completedByDay,
      });

      current.setDate(current.getDate() + 1);
      dayIndex++;
    }

    return result;
  }, [burndownSprint, data.sprints, data.tasks]);

  // ── Export to CSV ──────────────────────────────────────────────────────────
  const exportToCSV = () => {
    const headers = ["Task", "Status", "Priority", "Assignee", "Sprint", "Due Date", "Completed At", "Created At"];
    const rows = filteredTasks.map((t) => {
      const member = data.members.find((m) => m.users?.id === t.assignee_id);
      const sprint = data.sprints.find((s) => s.id === t.sprint_id);
      return [
        `"${(t.title || "").replace(/"/g, '""')}"`,
        t.status || "",
        t.priority || "",
        member?.users?.full_name || member?.users?.email || "Unassigned",
        sprint?.name || "Backlog",
        t.due_date || "",
        t.completed_at || "",
        t.created_at || "",
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Roles for filter ────────────────────────────────────────────────────────
  const allRoles = useMemo(() => {
    const roles = new Set<string>();
    data.members.forEach((m) => {
      if (m.custom_role) roles.add(m.custom_role);
      else roles.add(m.role);
    });
    return Array.from(roles);
  }, [data.members]);

  const hasActiveFilters =
    filterMember !== "all" || filterRole !== "all" || filterSprint !== "all" ||
    filterStatus !== "all" || filterPriority !== "all";

  const clearFilters = () => {
    setFilterMember("all"); setFilterRole("all"); setFilterSprint("all");
    setFilterStatus("all"); setFilterPriority("all");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-muted-foreground text-sm">Loading analytics…</div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── My Contribution ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">My Contribution</h3>
        </div>

        {myStats.total === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <Activity className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No tasks assigned to you yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Assigned" value={myStats.total} sub="Total tasks assigned" color="text-primary" icon={Target} />
              <StatCard label="Completed" value={myStats.completed} sub={`${myCompletionRate}% completion rate`} color="text-green-600" icon={CheckCircle2} />
              <StatCard label="In Progress" value={myStats.inProgress} sub="Currently active" color="text-blue-600" icon={TrendingUp} />
              <StatCard label="Blocked" value={myStats.blocked} sub={myStats.blocked > 0 ? "Needs attention" : "All clear"} color={myStats.blocked > 0 ? "text-red-600" : "text-muted-foreground"} icon={ShieldAlert} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* My Task Status Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Task Status Breakdown</CardTitle>
                      <CardDescription>Your tasks by current status</CardDescription>
                    </div>
                    <ViewToggle value={myStatusView} onChange={setMyStatusView} />
                  </div>
                </CardHeader>
                <CardContent>
                  {myStatusView === "chart" ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={myStatusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius="45%"
                            outerRadius="75%"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {myStatusChartData.map((entry, index) => (
                              <Cell key={index} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                          <Legend
                            iconType="circle"
                            iconSize={8}
                            formatter={(value) => <span className="text-xs">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { label: "To Do", value: myStats.todo, color: "bg-orange-500" },
                        { label: "In Progress", value: myStats.inProgress, color: "bg-blue-500" },
                        { label: "In Review", value: myStats.review, color: "bg-purple-500" },
                        { label: "Done", value: myStats.completed, color: "bg-green-500" },
                        { label: "Blocked", value: myStats.blocked, color: "bg-red-500" },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between text-sm items-center gap-2">
                          <span className="text-muted-foreground w-24 shrink-0">{item.label}</span>
                          <MiniBar value={item.value} max={myStats.total} color={item.color} />
                        </div>
                      ))}
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">Overall Completion</span>
                          <span className="font-bold text-green-600">{myCompletionRate}%</span>
                        </div>
                        <div className="h-3 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
                            style={{ width: `${myCompletionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* My Priority Breakdown */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Priority Breakdown</CardTitle>
                      <CardDescription>Your tasks by priority level</CardDescription>
                    </div>
                    <ViewToggle value={myPriorityView} onChange={setMyPriorityView} />
                  </div>
                </CardHeader>
                <CardContent>
                  {myPriorityView === "chart" ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={myPriorityChartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                          <Bar dataKey="value" name="Tasks" radius={[0, 4, 4, 0]}>
                            {myPriorityChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { label: "Urgent", count: myStats.urgent, color: "bg-red-500", text: "text-red-600" },
                        { label: "High", count: myStats.high, color: "bg-orange-500", text: "text-orange-600" },
                        { label: "Medium", count: myStats.medium, color: "bg-yellow-500", text: "text-yellow-600" },
                        { label: "Low", count: myStats.low, color: "bg-emerald-500", text: "text-emerald-600" },
                      ].map((p) => (
                        <div key={p.label} className="flex items-center gap-3">
                          <div className={`w-20 text-xs font-medium ${p.text}`}>{p.label}</div>
                          <div className="flex-1 h-6 bg-secondary rounded overflow-hidden">
                            <div
                              className={`h-full ${p.color} rounded transition-all duration-500 flex items-center justify-end pr-2`}
                              style={{ width: myStats.total > 0 ? `${Math.max((p.count / myStats.total) * 100, p.count > 0 ? 8 : 0)}%` : "0%" }}
                            >
                              {p.count > 0 && <span className="text-white text-xs font-bold">{p.count}</span>}
                            </div>
                          </div>
                          {p.count === 0 && <div className="w-6 text-right text-xs text-muted-foreground">–</div>}
                        </div>
                      ))}
                      {myStats.overdue > 0 && (
                        <div className="flex items-center gap-2 pt-2 border-t text-sm text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>{myStats.overdue} overdue task{myStats.overdue > 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      {/* ── Team Analytics (PM only) ───────────────────────────────────────── */}
      {isProjectManager && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Team Analytics</h3>
              <Badge variant="secondary" className="ml-1 text-xs">Manager View</Badge>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={exportToCSV}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>

          {/* ── Filters ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Filters</CardTitle>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={clearFilters}>
                    <X className="h-3 w-3" />Clear all
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Team Member</label>
                  <Select value={filterMember} onValueChange={setFilterMember}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All members" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All members</SelectItem>
                      {data.members.filter((m) => m.users).map((m) => (
                        <SelectItem key={m.users.id} value={m.users.id}>{m.users.full_name || m.users.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Role</label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All roles" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      {allRoles.map((r) => (
                        <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Sprint</label>
                  <Select value={filterSprint} onValueChange={setFilterSprint}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All sprints" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sprints</SelectItem>
                      <SelectItem value="backlog">Backlog (no sprint)</SelectItem>
                      {data.sprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Priority</label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All priorities" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hasActiveFilters && (
                <p className="text-xs text-muted-foreground mt-3">
                  Showing <span className="font-semibold text-foreground">{filteredTasks.length}</span> of{" "}
                  <span className="font-semibold text-foreground">{data.tasks.length}</span> tasks
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Overview stats ───────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Tasks" value={filteredTasks.length} sub={hasActiveFilters ? "Matching filters" : "Across project"} color="text-primary" icon={Target} />
            <StatCard
              label="Completed" value={filteredTasks.filter((t) => t.status === "done").length}
              sub={filteredTasks.length > 0 ? `${Math.round((filteredTasks.filter((t) => t.status === "done").length / filteredTasks.length) * 100)}% done` : "No tasks"}
              color="text-green-600" icon={CheckCircle2}
            />
            <StatCard label="In Progress" value={filteredTasks.filter((t) => t.status === "in_progress").length} sub="Being worked on" color="text-blue-600" icon={Zap} />
            <StatCard
              label="Blocked" value={filteredTasks.filter((t) => t.status === "blocked").length}
              sub={filteredTasks.filter((t) => t.status === "blocked").length > 0 ? "Needs attention" : "All clear"}
              color={filteredTasks.filter((t) => t.status === "blocked").length > 0 ? "text-red-600" : "text-muted-foreground"}
              icon={ShieldAlert}
            />
          </div>

          {/* ── KPI Metrics ────────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
                <Timer className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {kpis.avgCompletionTime === "N/A" ? "N/A" : `${kpis.avgCompletionTime} days`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Average time from creation to done</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
                <CalendarCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{kpis.doneWithDueCount > 0 ? `${kpis.onTimeRate}%` : "N/A"}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.doneWithDueCount > 0 ? `${kpis.doneWithDueCount} tasks with due dates completed` : "No completed tasks with due dates"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Velocity</CardTitle>
                <Gauge className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {kpis.avgVelocity === "N/A" ? "N/A" : `${kpis.avgVelocity}`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Tasks completed per sprint</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${kpis.overdueCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {kpis.overdueCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.overdueCount > 0 ? "Past due date, not yet done" : "All on track"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Status + Priority distributions ─────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
                    <CardDescription>Task breakdown by current status</CardDescription>
                  </div>
                  <ViewToggle value={teamStatusView} onChange={setTeamStatusView} />
                </div>
              </CardHeader>
              <CardContent>
                {filteredTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No tasks match filters</p>
                ) : teamStatusView === "chart" ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusDist} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="label" width={70} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                        <Bar dataKey="count" name="Tasks" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11, fill: "#64748b" }}>
                          {statusDist.map((s, i) => (
                            <Cell key={i} fill={s.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {statusDist.map((s) => (
                      <div key={s.key} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-muted-foreground text-xs">{s.label}</span>
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full ${s.color} rounded-full transition-all duration-500`} style={{ width: `${s.pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs font-medium">{s.count}</span>
                        <span className="w-8 text-right text-xs text-muted-foreground">{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Priority Distribution */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">Priority Distribution</CardTitle>
                    <CardDescription>Task breakdown by priority level</CardDescription>
                  </div>
                  <ViewToggle value={teamPriorityView} onChange={setTeamPriorityView} />
                </div>
              </CardHeader>
              <CardContent>
                {filteredTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No tasks match filters</p>
                ) : teamPriorityView === "chart" ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={priorityDist.filter((p) => p.count > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius="40%"
                          outerRadius="70%"
                          dataKey="count"
                          nameKey="label"
                          paddingAngle={2}
                          label={({ label, pct }: any) => `${label} ${pct}%`}
                          labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                        >
                          {priorityDist.map((p, i) => (
                            <Cell key={i} fill={p.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {priorityDist.map((p) => (
                      <div key={p.key} className="flex items-center gap-3 text-sm">
                        <span className="w-16 text-muted-foreground text-xs">{p.label}</span>
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full ${p.color} rounded-full transition-all duration-500`} style={{ width: `${p.pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs font-medium">{p.count}</span>
                        <span className="w-8 text-right text-xs text-muted-foreground">{p.pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Member Contributions ─────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Member Contributions</CardTitle>
                  <CardDescription>
                    Task breakdown per team member
                    {filterRole !== "all" && ` · Role: ${filterRole}`}
                    {filterSprint !== "all" && ` · Sprint: ${data.sprints.find((s) => s.id === filterSprint)?.name || "Backlog"}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <ViewToggle value={memberView} onChange={setMemberView} />
                </div>
              </div>
            </CardHeader>
            <CardContent className={memberView === "table" ? "p-0" : undefined}>
              {memberStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No members found</div>
              ) : memberView === "chart" ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={memberChartData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const full = memberChartData.find((d) => d.name === label);
                          return (
                            <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
                              <p className="font-semibold mb-1">{full?.fullName || label}</p>
                              {payload.map((p: any) => (
                                <div key={p.name} className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: p.fill }} />
                                  <span className="text-muted-foreground">{p.name}:</span>
                                  <span className="font-medium">{p.value}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend iconType="square" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
                      <Bar dataKey="Done" stackId="a" fill={STATUS_HEX.done} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="In Progress" stackId="a" fill={STATUS_HEX.in_progress} />
                      <Bar dataKey="Review" stackId="a" fill={STATUS_HEX.review} />
                      <Bar dataKey="To Do" stackId="a" fill={STATUS_HEX.todo} />
                      <Bar dataKey="Blocked" stackId="a" fill={STATUS_HEX.blocked} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                        <th className="text-center px-3 py-3 font-medium text-muted-foreground">Total</th>
                        <th className="text-center px-3 py-3 font-medium text-muted-foreground text-green-700">Done</th>
                        <th className="text-center px-3 py-3 font-medium text-muted-foreground text-blue-700">Active</th>
                        <th className="text-center px-3 py-3 font-medium text-muted-foreground text-purple-700">Review</th>
                        <th className="text-center px-3 py-3 font-medium text-muted-foreground text-red-700">Blocked</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberStats.map((m) => {
                        const RoleIcon = ROLE_ICONS[m.customRole || ""] || null;
                        const isMe = m.userId === currentUserId;
                        return (
                          <tr key={m.userId} className={`border-b transition-colors hover:bg-muted/20 ${isMe ? "bg-primary/5" : ""}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                                  {initials(m.name !== m.email ? m.name : null, m.email)}
                                </div>
                                <div>
                                  <p className="font-medium leading-tight">
                                    {m.name}
                                    {isMe && <span className="ml-1.5 text-xs text-primary font-normal">(You)</span>}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{m.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                {m.customRole && (
                                  <Badge variant="secondary" className="gap-1 w-fit text-xs">
                                    {RoleIcon && <RoleIcon className="h-3 w-3" />}
                                    {m.customRole}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="w-fit text-xs capitalize">{m.role}</Badge>
                              </div>
                            </td>
                            <td className="text-center px-3 py-3 font-semibold">{m.assigned}</td>
                            <td className="text-center px-3 py-3 font-semibold text-green-600">{m.completed}</td>
                            <td className="text-center px-3 py-3 font-semibold text-blue-600">{m.inProgress}</td>
                            <td className="text-center px-3 py-3 font-semibold text-purple-600">{m.review}</td>
                            <td className="text-center px-3 py-3">
                              {m.blocked > 0 ? (
                                <span className="font-semibold text-red-600">{m.blocked}</span>
                              ) : (
                                <span className="text-muted-foreground">–</span>
                              )}
                            </td>
                            <td className="px-4 py-3 min-w-[140px]">
                              {m.assigned > 0 ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{m.completionRate}%</span>
                                    {m.overdue > 0 && (
                                      <span className="text-red-500 flex items-center gap-0.5">
                                        <AlertCircle className="h-3 w-3" />
                                        {m.overdue} overdue
                                      </span>
                                    )}
                                  </div>
                                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${m.completionRate}%` }} />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">No tasks assigned</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Sprint Velocity ───────────────────────────────────────────── */}
          {data.sprints.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sprint Velocity</CardTitle>
                    <CardDescription>
                      Task completion across sprints
                      {filterMember !== "all" && ` · ${data.members.find((m) => m.users?.id === filterMember)?.users?.full_name || "Selected member"}`}
                    </CardDescription>
                  </div>
                  <ViewToggle value={velocityView} onChange={setVelocityView} />
                </div>
              </CardHeader>
              <CardContent>
                {sprintVelocity.filter((s) => s.total > 0 || filterSprint === "all").length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No sprint data matches current filters</p>
                ) : velocityView === "chart" ? (
                  <div className="space-y-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sprintVelocity} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="shortName" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              const sprint = sprintVelocity.find((s) => s.shortName === label);
                              return (
                                <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
                                  <p className="font-semibold mb-1">{sprint?.name || label}</p>
                                  {payload.map((p: any) => (
                                    <div key={p.name} className="flex items-center gap-2">
                                      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: p.fill }} />
                                      <span className="text-muted-foreground">{p.name}:</span>
                                      <span className="font-medium">{p.value}</span>
                                    </div>
                                  ))}
                                  {sprint && (
                                    <div className="pt-1 border-t mt-1 text-muted-foreground">
                                      Completion: <span className="font-semibold text-foreground">{sprint.completionRate}%</span>
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          />
                          <Legend iconType="square" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
                          <Bar dataKey="Done" stackId="a" fill={STATUS_HEX.done} />
                          <Bar dataKey="In Progress" stackId="a" fill={STATUS_HEX.in_progress} />
                          <Bar dataKey="Review" stackId="a" fill={STATUS_HEX.review} />
                          <Bar dataKey="To Do" stackId="a" fill={STATUS_HEX.todo} />
                          <Bar dataKey="Blocked" stackId="a" fill={STATUS_HEX.blocked} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Completion rate line below chart */}
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sprintVelocity.length}, 1fr)` }}>
                      {sprintVelocity.map((s) => (
                        <div key={s.id} className="text-center text-xs">
                          <span className={`font-semibold ${s.completionRate === 100 ? "text-green-600" : s.completionRate > 50 ? "text-blue-600" : "text-muted-foreground"}`}>
                            {s.completionRate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sprintVelocity.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-muted/30 transition-colors">
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize min-w-[70px] justify-center ${
                            s.status === "active" ? "border-blue-500 text-blue-600 bg-blue-50" :
                            s.status === "completed" ? "border-green-500 text-green-600 bg-green-50" :
                            "text-muted-foreground"
                          }`}
                        >
                          {s.status}
                        </Badge>
                        <span className="flex-1 font-medium truncate">{s.name}</span>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="text-green-600 font-medium">{s.completed} done</span>
                          <span>{s.inProgress} active</span>
                          {s.blocked > 0 && <span className="text-red-600">{s.blocked} blocked</span>}
                          <span className="font-semibold text-foreground">{s.completionRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Burndown Chart ─────────────────────────────────────────── */}
          {data.sprints.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Sprint Burndown</CardTitle>
                    <CardDescription>Remaining tasks over time vs ideal pace</CardDescription>
                  </div>
                  <Select value={burndownSprint} onValueChange={setBurndownSprint}>
                    <SelectTrigger className="w-[180px] h-9 text-sm">
                      <SelectValue placeholder="Select sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.sprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                          {s.status === "active" ? " (Active)" : s.status === "completed" ? " (Done)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {burndownData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No burndown data available for this sprint. Ensure the sprint has tasks and valid dates.
                  </p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={burndownData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          interval={burndownData.length > 14 ? Math.floor(burndownData.length / 7) : 0}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          label={{ value: "Tasks Remaining", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#94a3b8" } }}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                              <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
                                <p className="font-semibold mb-1">{label}</p>
                                {payload.map((p: any) => (
                                  <div key={p.name} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
                                    <span className="text-muted-foreground">{p.name}:</span>
                                    <span className="font-medium">{typeof p.value === "number" ? Math.round(p.value) : p.value}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend iconType="line" iconSize={12} formatter={(v) => <span className="text-xs">{v}</span>} />
                        <Area
                          type="monotone"
                          dataKey="actual"
                          name="Actual Remaining"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.1}
                          strokeWidth={2}
                          dot={{ r: 3, fill: "#3b82f6" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="ideal"
                          name="Ideal Burndown"
                          stroke="#94a3b8"
                          strokeWidth={2}
                          strokeDasharray="6 3"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
