"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  BarChart3,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  FolderKanban,
  ArrowRight,
  Target,
  Users,
  Zap,
  Download,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { getUserProjects, getUserTasks } from "@/lib/database";

interface ProjectSummary {
  id: string;
  name: string;
  orgName: string;
  status: string;
  total: number;
  done: number;
  inProgress: number;
  blocked: number;
  completionRate: number;
}

const STATUS_COLOR: Record<string, string> = {
  planning: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  active: "bg-green-500/10 text-green-700 border-green-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  completed: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  archived: "bg-gray-500/10 text-gray-600 border-gray-300",
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [myTaskStats, setMyTaskStats] = useState({
    total: 0,
    done: 0,
    inProgress: 0,
    review: 0,
    blocked: 0,
    todo: 0,
    overdue: 0,
  });
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [allSprints, setAllSprints] = useState<any[]>([]);
  const [selectedSprint, setSelectedSprint] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        // Fetch projects and my tasks in parallel
        const [rawProjects, myTasks] = await Promise.all([
          getUserProjects(user.id),
          getUserTasks(user.id),
        ]);

        // Compute personal task stats (myTasks don't filter done, so we include all)
        const allMyTasks = await supabase
          .from("tasks")
          .select("id, status, due_date, project_id, created_at, completed_at, sprint_id, title, priority, assignee_id")
          .eq("assignee_id", user.id);

        const now = new Date();
        const mt = (allMyTasks.data as any[]) || [];
        setAllTasks(mt);
        setMyTaskStats({
          total: mt.length,
          done: mt.filter((t) => t.status === "done").length,
          inProgress: mt.filter((t) => t.status === "in_progress").length,
          review: mt.filter((t) => t.status === "review").length,
          blocked: mt.filter((t) => t.status === "blocked").length,
          todo: mt.filter((t) => t.status === "todo").length,
          overdue: mt.filter(
            (t) =>
              t.due_date &&
              new Date(t.due_date) < now &&
              t.status !== "done"
          ).length,
        });

        // For each project, fetch task stats
        const projectSummaries: ProjectSummary[] = await Promise.all(
          (rawProjects || []).map(async (p: any) => {
            const { data: rawTasks } = await supabase
              .from("tasks")
              .select("id, status")
              .eq("project_id", p.id);

            const tasks = (rawTasks as any[]) || [];
            const total = tasks.length;
            const done = tasks.filter((t) => t.status === "done").length;
            const inProgress = tasks.filter((t) => t.status === "in_progress").length;
            const blocked = tasks.filter((t) => t.status === "blocked").length;

            return {
              id: p.id,
              name: p.name,
              orgName: (p.organizations as any)?.name || "Unknown Org",
              status: p.status,
              total,
              done,
              inProgress,
              blocked,
              completionRate:
                total > 0 ? Math.round((done / total) * 100) : 0,
            };
          })
        );

        setProjects(projectSummaries);

        // Fetch sprints for all user projects
        const allProjectIds = (rawProjects || []).map((p: any) => p.id);
        if (allProjectIds.length > 0) {
          const { data: sprintsData } = await supabase
            .from("sprints")
            .select("id, name, status, start_date, end_date, project_id")
            .in("project_id", allProjectIds)
            .order("created_at", { ascending: true });
          const sprints = (sprintsData as any[]) || [];
          setAllSprints(sprints);
          // Auto-select first active sprint, or first sprint
          const activeSprint = sprints.find((s: any) => s.status === "active");
          if (activeSprint) {
            setSelectedSprint(activeSprint.id);
          } else if (sprints.length > 0) {
            setSelectedSprint(sprints[0].id);
          }
        }
      } catch (e) {
        console.error("Analytics page error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const myCompletionRate =
    myTaskStats.total > 0
      ? Math.round((myTaskStats.done / myTaskStats.total) * 100)
      : 0;

  // ── KPI Computations ──────────────────────────────────────────────
  const avgCompletionTime = useMemo(() => {
    const doneTasks = allTasks.filter(
      (t) => t.status === "done" && t.completed_at && t.created_at
    );
    if (doneTasks.length === 0) return null;
    const totalDays = doneTasks.reduce((sum: number, t: any) => {
      const diff =
        (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      return sum + diff;
    }, 0);
    return Math.round((totalDays / doneTasks.length) * 10) / 10;
  }, [allTasks]);

  const onTimeDelivery = useMemo(() => {
    const doneWithDue = allTasks.filter(
      (t) => t.status === "done" && t.due_date && t.completed_at
    );
    if (doneWithDue.length === 0) return null;
    const onTime = doneWithDue.filter(
      (t: any) => new Date(t.completed_at) <= new Date(t.due_date)
    ).length;
    return Math.round((onTime / doneWithDue.length) * 100);
  }, [allTasks]);

  const tasksPerSprint = useMemo(() => {
    const relevantSprints = allSprints.filter(
      (s) => s.status === "completed" || s.status === "active"
    );
    if (relevantSprints.length === 0) return null;
    const totalDone = relevantSprints.reduce((sum: number, s: any) => {
      const count = allTasks.filter(
        (t) => t.sprint_id === s.id && t.status === "done"
      ).length;
      return sum + count;
    }, 0);
    return Math.round((totalDone / relevantSprints.length) * 10) / 10;
  }, [allTasks, allSprints]);

  const overdueCount = useMemo(() => {
    const now = new Date();
    return allTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < now && t.status !== "done"
    ).length;
  }, [allTasks]);

  // ── Burndown Data ───────────────────────────────────────────────
  const burndownData = useMemo(() => {
    if (!selectedSprint) return [];
    const sprint = allSprints.find((s) => s.id === selectedSprint);
    if (!sprint || !sprint.start_date || !sprint.end_date) return [];

    const sprintTasks = allTasks.filter((t) => t.sprint_id === sprint.id);
    if (sprintTasks.length === 0) return [];

    const startDate = new Date(sprint.start_date);
    const endDate = new Date(sprint.end_date);
    const totalDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const total = sprintTasks.length;

    const data: { date: string; ideal: number; actual: number }[] = [];
    const now = new Date();

    for (let i = 0; i <= totalDays; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      if (day > now && day > endDate) break;

      const ideal = Math.round(total * (1 - i / totalDays) * 10) / 10;
      const completedByDay = sprintTasks.filter(
        (t: any) =>
          t.status === "done" &&
          t.completed_at &&
          new Date(t.completed_at) <= day
      ).length;
      const actual = total - completedByDay;

      data.push({
        date: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ideal,
        actual,
      });
    }
    return data;
  }, [selectedSprint, allSprints, allTasks]);

  // ── Export CSV ───────────────────────────────────────────────────
  const handleExportCSV = () => {
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    const headers = ["Task Title", "Project", "Status", "Priority", "Due Date", "Completed At", "Created At"];
    const rows = allTasks.map((t) => [
      `"${(t.title || "").replace(/"/g, '""')}"`,
      `"${(projectMap.get(t.project_id) || "Unknown").replace(/"/g, '""')}"`,
      t.status || "",
      t.priority || "",
      t.due_date || "",
      t.completed_at || "",
      t.created_at || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground text-sm">Loading reports…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BarChart3 className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          </div>
          <p className="text-muted-foreground">
            Your personal contribution overview across all projects
          </p>
        </div>
        {allTasks.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* ── My Overall Stats ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">My Task Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myTaskStats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{myTaskStats.done}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {myCompletionRate}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Zap className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{myTaskStats.inProgress}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked / Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {myTaskStats.blocked + myTaskStats.overdue}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {myTaskStats.blocked} blocked · {myTaskStats.overdue} overdue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Personal completion bar */}
        {myTaskStats.total > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">My completion rate</span>
                <span className="font-bold text-green-600">{myCompletionRate}%</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${myCompletionRate}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                  {myTaskStats.todo} To Do
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                  {myTaskStats.inProgress} In Progress
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
                  {myTaskStats.review} In Review
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                  {myTaskStats.done} Done
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                  {myTaskStats.blocked} Blocked
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Key Performance Indicators ─────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Key Performance Indicators</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {avgCompletionTime !== null ? `${avgCompletionTime}d` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average days to complete a task
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {onTimeDelivery !== null ? `${onTimeDelivery}%` : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tasks completed before due date
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks per Sprint</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {tasksPerSprint !== null ? tasksPerSprint : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg completed tasks per sprint
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
              <AlertCircle className={`h-4 w-4 ${overdueCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                {overdueCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Past due date and not completed
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Sprint Burndown Chart ──────────────────────────────────────── */}
      {allSprints.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Sprint Burndown</h2>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Burndown Chart</CardTitle>
                  <CardDescription>Track remaining work across the sprint</CardDescription>
                </div>
                <Select value={selectedSprint} onValueChange={setSelectedSprint}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    {allSprints.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.status === "active" ? "(Active)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {burndownData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={burndownData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="ideal"
                      name="Ideal"
                      stroke="#22c55e"
                      strokeDasharray="6 3"
                      fill="transparent"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      name="Actual"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                  No task data available for this sprint.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Project Breakdown ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Project Breakdown</h2>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">You are not a member of any project yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{p.name}</CardTitle>
                      <CardDescription className="truncate">{p.orgName}</CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${STATUS_COLOR[p.status] || ""} border text-xs flex-shrink-0 capitalize`}
                    >
                      {p.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold">{p.total}</p>
                      <p className="text-[10px] text-muted-foreground">Tasks</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{p.done}</p>
                      <p className="text-[10px] text-muted-foreground">Done</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-600">{p.inProgress}</p>
                      <p className="text-[10px] text-muted-foreground">Active</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${p.blocked > 0 ? "text-red-600" : "text-muted-foreground"}`}>{p.blocked}</p>
                      <p className="text-[10px] text-muted-foreground">Blocked</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {p.total > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Completion</span>
                        <span className="font-semibold">{p.completionRate}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${p.completionRate}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center">No tasks yet</p>
                  )}

                  <Button asChild variant="outline" size="sm" className="w-full gap-1">
                    <Link href={`/dashboard/projects/${p.id}?tab=analytics`}>
                      <BarChart3 className="h-3.5 w-3.5" />
                      View Full Analytics
                      <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
