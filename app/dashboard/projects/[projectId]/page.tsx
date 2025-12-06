"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  FolderKanban,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  Settings,
  LayoutGrid,
  Activity,
  TrendingUp,
  AlertCircle,
  PlayCircle,
  ArrowLeft,
  Code,
  Bug,
  Palette,
  Briefcase,
  Plus,
  GripVertical,
  Pencil,
} from "lucide-react";
import {
  getProjectDetails,
  getProjectTaskStats,
  getProjectTasks,
  getProjectSprints,
  updateTaskStatus,
  getUserProjectRole,
  startSprint,
  stopSprint,
  getSprintEvents,
} from "@/lib/database";
import { TaskDialog } from "@/components/task-dialog";
import { SprintDialog } from "@/components/sprint-dialog";
import { SprintEventDialog } from "@/components/sprint-event-dialog";
import { SprintTimeline } from "@/components/sprint-timeline";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const statusConfig = {
  planning: { label: "Planning", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  active: { label: "Active", color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" },
  on_hold: { label: "On Hold", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20" },
  completed: { label: "Completed", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  archived: { label: "Archived", color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20" },
};

const roleIcons: { [key: string]: any } = {
  Developer: Code,
  "QA Engineer": Bug,
  Designer: Palette,
  "Project Manager": Briefcase,
};

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<any>(null);
  const [taskStats, setTaskStats] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Task dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  // Sprint dialog state
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<any>(null);
  const [selectedSprint, setSelectedSprint] = useState<any>(null);
  const [sprintEvents, setSprintEvents] = useState<any[]>([]);

  // Sprint event dialog state
  const [sprintEventDialogOpen, setSprintEventDialogOpen] = useState(false);
  const [editingSprintEvent, setEditingSprintEvent] = useState<any>(null);

  // User and permissions state
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [userRole, setUserRole] = useState<{ role: string; custom_role: string | null } | null>(null);

  // Check if user is project manager (owner, lead, or has Project Manager custom role)
  const isProjectManager = userRole?.role === "owner" || userRole?.role === "lead" || userRole?.custom_role === "Project Manager";

  const loadProjectData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Get user's role in this project
        const role = await getUserProjectRole(projectId, user.id);
        setUserRole(role);
      }

      const [projectData, stats, projectTasks, projectSprints] = await Promise.all([
        getProjectDetails(projectId),
        getProjectTaskStats(projectId),
        getProjectTasks(projectId),
        getProjectSprints(projectId),
      ]);

      setProject(projectData);
      setTaskStats(stats);
      setTasks(projectTasks || []);
      setSprints(projectSprints || []);
    } catch (error) {
      console.error("Error loading project data:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshTasks = async () => {
    try {
      const [stats, projectTasks] = await Promise.all([
        getProjectTaskStats(projectId),
        getProjectTasks(projectId),
      ]);
      setTaskStats(stats);
      setTasks(projectTasks || []);
    } catch (error) {
      console.error("Error refreshing tasks:", error);
    }
  };

  // Handle task status change (drag and drop simulation)
  const handleTaskStatusChange = async (taskId: string, newStatus: string, task: any) => {
    // Check permissions: only assignee or creator can move tasks
    const canMoveTask = task.assignee_id === currentUserId || task.created_by === currentUserId || isProjectManager;

    if (!canMoveTask) {
      toast.error("Only the assignee or task creator can move this task");
      return;
    }

    try {
      await updateTaskStatus(taskId, newStatus as any);
      toast.success("Task status updated");
      refreshTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    }
  };

  const openEditTaskDialog = (task: any) => {
    if (!isProjectManager) {
      toast.error("Only project managers can edit tasks");
      return;
    }
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const openCreateTaskDialog = () => {
    if (!isProjectManager) {
      toast.error("Only project managers can create tasks");
      return;
    }
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  // Sprint management functions
  const refreshSprints = async () => {
    try {
      const projectSprints = await getProjectSprints(projectId);
      setSprints(projectSprints || []);
      // Refresh selected sprint if viewing one
      if (selectedSprint) {
        const updatedSprint = projectSprints?.find((s: any) => s.id === selectedSprint.id);
        if (updatedSprint) {
          setSelectedSprint(updatedSprint);
          const events = await getSprintEvents(updatedSprint.id);
          setSprintEvents(events);
        }
      }
    } catch (error) {
      console.error("Error refreshing sprints:", error);
    }
  };

  const openCreateSprintDialog = () => {
    if (!isProjectManager) {
      toast.error("Only project managers can create sprints");
      return;
    }
    setEditingSprint(null);
    setSprintDialogOpen(true);
  };

  const openEditSprintDialog = (sprint: any) => {
    if (!isProjectManager) {
      toast.error("Only project managers can edit sprints");
      return;
    }
    setEditingSprint(sprint);
    setSprintDialogOpen(true);
  };

  const handleViewSprint = async (sprint: any) => {
    setSelectedSprint(sprint);
    try {
      const events = await getSprintEvents(sprint.id);
      setSprintEvents(events);
    } catch (error) {
      console.error("Error loading sprint events:", error);
      setSprintEvents([]);
    }
  };

  const handleStartSprint = async () => {
    if (!selectedSprint || !isProjectManager) return;
    try {
      await startSprint(selectedSprint.id);
      toast.success("Sprint started successfully");
      refreshSprints();
    } catch (error: any) {
      console.error("Error starting sprint:", error);
      toast.error(error.message || "Failed to start sprint");
    }
  };

  const handleStopSprint = async () => {
    if (!selectedSprint || !isProjectManager) return;
    try {
      await stopSprint(selectedSprint.id);
      toast.success("Sprint completed successfully");
      refreshSprints();
    } catch (error) {
      console.error("Error stopping sprint:", error);
      toast.error("Failed to complete sprint");
    }
  };

  const openCreateEventDialog = () => {
    if (!isProjectManager) {
      toast.error("Only project managers can create events");
      return;
    }
    setEditingSprintEvent(null);
    setSprintEventDialogOpen(true);
  };

  const openEditEventDialog = (event: any) => {
    if (!isProjectManager) {
      toast.error("Only project managers can edit events");
      return;
    }
    setEditingSprintEvent(event);
    setSprintEventDialogOpen(true);
  };

  const refreshSprintEvents = async () => {
    if (selectedSprint) {
      try {
        const events = await getSprintEvents(selectedSprint.id);
        setSprintEvents(events);
      } catch (error) {
        console.error("Error refreshing sprint events:", error);
      }
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Project Not Found</h3>
          <p className="text-sm text-muted-foreground">
            This project may have been deleted or you don't have access.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const completionPercentage = taskStats?.total > 0
    ? Math.round((taskStats.byStatus.done / taskStats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Back Button and Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => router.push(`/dashboard/organizations/${project.organizations.id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {project.organizations.name}
        </Button>

        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FolderKanban className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {project.organizations.name}
                </p>
                <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              </div>
            </div>
            <p className="text-muted-foreground max-w-3xl">
              {project.description || "No description provided"}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`${statusConfig[project.status as keyof typeof statusConfig].color} border`}
          >
            {statusConfig[project.status as keyof typeof statusConfig].label}
          </Badge>
        </div>

        {/* Project Metadata */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          {project.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
            </div>
          )}
          {project.end_date && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Deadline: {new Date(project.end_date).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{project.project_members?.length || 0} team members</span>
          </div>
        </div>

        {/* Progress Bar */}
        {taskStats && taskStats.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">{completionPercentage}% complete</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Team Avatars */}
        {project.project_members && project.project_members.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Team:</span>
            <div className="flex -space-x-2">
              {project.project_members.slice(0, 5).map((member: any) => (
                <div
                  key={member.id}
                  className="relative group"
                  title={`${member.users.full_name || member.users.email} - ${member.custom_role || member.role}`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-sm font-medium text-primary hover:z-10 transition-all cursor-pointer">
                    {member.users.full_name
                      ? member.users.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
                      : member.users.email[0].toUpperCase()}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border z-50">
                    <div className="font-medium">{member.users.full_name || member.users.email}</div>
                    <div className="text-muted-foreground">{member.custom_role || member.role}</div>
                  </div>
                </div>
              ))}
              {project.project_members.length > 5 && (
                <div className="h-10 w-10 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs font-medium hover:z-10 transition-all cursor-pointer">
                  +{project.project_members.length - 5}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Sections - Navigation via Quick Actions */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taskStats?.total || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {taskStats?.total === 0 ? "No tasks yet" : "Across all sprints"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {taskStats?.byStatus.done || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {taskStats?.total > 0
                    ? `${Math.round((taskStats.byStatus.done / taskStats.total) * 100)}% of total`
                    : "No tasks completed"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {taskStats?.byStatus.in_progress || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Currently being worked on
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">To Do</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {taskStats?.byStatus.todo || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending tasks
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Navigate to different sections of your project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                  onClick={() => setActiveTab("kanban")}
                >
                  <LayoutGrid className="h-6 w-6" />
                  <span className="text-sm font-medium">Kanban Board</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                  onClick={() => setActiveTab("sprints")}
                >
                  <PlayCircle className="h-6 w-6" />
                  <span className="text-sm font-medium">Sprint Management</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                  onClick={() => setActiveTab("team")}
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm font-medium">Team</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary/50 transition-colors"
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings className="h-6 w-6" />
                  <span className="text-sm font-medium">Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Project Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
                <CardDescription>Key details about this project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant="outline"
                    className={`${statusConfig[project.status as keyof typeof statusConfig].color} border text-xs`}
                  >
                    {statusConfig[project.status as keyof typeof statusConfig].label}
                  </Badge>
                </div>
                {project.start_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="font-medium">
                      {new Date(project.start_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {project.end_date && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">End Date</span>
                    <span className="font-medium">
                      {new Date(project.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created By</span>
                  <span className="font-medium">
                    {project.created_by_user?.full_name || "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created On</span>
                  <span className="font-medium">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Task Distribution</CardTitle>
                <CardDescription>Tasks by status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {taskStats && taskStats.total > 0 ? (
                  <>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">To Do</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-secondary rounded-full w-24">
                          <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{ width: `${(taskStats.byStatus.todo / taskStats.total) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium w-8 text-right">{taskStats.byStatus.todo}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">In Progress</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-secondary rounded-full w-24">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(taskStats.byStatus.in_progress / taskStats.total) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium w-8 text-right">{taskStats.byStatus.in_progress}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">In Review</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-secondary rounded-full w-24">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${(taskStats.byStatus.review / taskStats.total) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium w-8 text-right">{taskStats.byStatus.review}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Done</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-secondary rounded-full w-24">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${(taskStats.byStatus.done / taskStats.total) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium w-8 text-right">{taskStats.byStatus.done}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Blocked</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-secondary rounded-full w-24">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${(taskStats.byStatus.blocked / taskStats.total) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium w-8 text-right">{taskStats.byStatus.blocked}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No tasks created yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Kanban Tab */}
        <TabsContent value="kanban" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Kanban Board</h3>
              <p className="text-sm text-muted-foreground">
                Visualize and manage tasks across different stages
                {!isProjectManager && " (Only project managers can create/edit tasks)"}
              </p>
            </div>
            <Button
              className="gap-2"
              onClick={openCreateTaskDialog}
              disabled={!isProjectManager}
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Tasks Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {isProjectManager
                    ? "Create your first task to get started with the Kanban board"
                    : "No tasks have been created yet. Ask your project manager to create tasks."}
                </p>
                {isProjectManager && (
                  <Button className="gap-2" onClick={openCreateTaskDialog}>
                    <Plus className="h-4 w-4" />
                    Create First Task
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Only show 4 columns: To Do, Work in Progress, Review, Completed */}
              {["todo", "in_progress", "review", "done"].map((status) => {
                const statusTasks = tasks.filter((t) => t.status === status);
                const statusLabels: { [key: string]: { title: string; color: string; bgColor: string } } = {
                  todo: { title: "To Do", color: "bg-orange-500", bgColor: "bg-orange-50 dark:bg-orange-950/20" },
                  in_progress: { title: "Work in Progress", color: "bg-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950/20" },
                  review: { title: "Review", color: "bg-purple-500", bgColor: "bg-purple-50 dark:bg-purple-950/20" },
                  done: { title: "Completed", color: "bg-green-500", bgColor: "bg-green-50 dark:bg-green-950/20" },
                };

                // Get adjacent statuses for move buttons
                const statusOrder = ["todo", "in_progress", "review", "done"];
                const currentIndex = statusOrder.indexOf(status);
                const prevStatus = currentIndex > 0 ? statusOrder[currentIndex - 1] : null;
                const nextStatus = currentIndex < statusOrder.length - 1 ? statusOrder[currentIndex + 1] : null;

                return (
                  <Card key={status} className={`flex flex-col min-h-[500px] ${statusLabels[status].bgColor}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded-full ${statusLabels[status].color}`} />
                          <h4 className="font-semibold">{statusLabels[status].title}</h4>
                        </div>
                        <Badge variant="secondary" className="font-bold">{statusTasks.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-3 overflow-y-auto">
                      {statusTasks.map((task) => {
                        const canMoveTask = task.assignee_id === currentUserId || task.created_by === currentUserId || isProjectManager;

                        return (
                          <Card
                            key={task.id}
                            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 bg-background"
                            style={{
                              borderLeftColor:
                                task.priority === "urgent"
                                  ? "#ef4444"
                                  : task.priority === "high"
                                  ? "#f97316"
                                  : task.priority === "medium"
                                  ? "#3b82f6"
                                  : "#6b7280",
                            }}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h5 className="font-medium text-sm leading-tight line-clamp-2 flex-1">
                                  {task.title}
                                </h5>
                                {isProjectManager && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditTaskDialog(task);
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    task.priority === "high"
                                      ? "border-orange-500 text-orange-600"
                                      : task.priority === "urgent"
                                      ? "border-red-500 text-red-600"
                                      : ""
                                  }`}
                                >
                                  {task.priority}
                                </Badge>
                                {task.due_date && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </Badge>
                                )}
                              </div>
                              {task.assignee && (
                                <div className="flex items-center gap-2 pt-1">
                                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                    {task.assignee.full_name
                                      ? task.assignee.full_name
                                          .split(" ")
                                          .map((n: string) => n[0])
                                          .join("")
                                          .toUpperCase()
                                      : task.assignee.email?.[0]?.toUpperCase() || "?"}
                                  </div>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {task.assignee.full_name || task.assignee.email}
                                  </span>
                                </div>
                              )}

                              {/* Move task buttons */}
                              {canMoveTask && (prevStatus || nextStatus) && (
                                <div className="flex items-center justify-between pt-2 border-t mt-2">
                                  {prevStatus ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs px-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTaskStatusChange(task.id, prevStatus, task);
                                      }}
                                    >
                                      ← {statusLabels[prevStatus].title}
                                    </Button>
                                  ) : (
                                    <div />
                                  )}
                                  {nextStatus && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs px-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTaskStatusChange(task.id, nextStatus, task);
                                      }}
                                    >
                                      {statusLabels[nextStatus].title} →
                                    </Button>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Task Dialog */}
          <TaskDialog
            open={taskDialogOpen}
            onOpenChange={setTaskDialogOpen}
            projectId={projectId}
            currentUserId={currentUserId}
            task={editingTask}
            isProjectManager={isProjectManager}
            onTaskCreated={refreshTasks}
            onTaskUpdated={refreshTasks}
            onTaskDeleted={refreshTasks}
          />
        </TabsContent>

        {/* Sprints Tab */}
        <TabsContent value="sprints" className="space-y-4">
          {selectedSprint ? (
            // Sprint Detail View with Timeline
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setSelectedSprint(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sprints
              </Button>

              <SprintTimeline
                sprint={selectedSprint}
                events={sprintEvents}
                isProjectManager={isProjectManager}
                onStartSprint={handleStartSprint}
                onStopSprint={handleStopSprint}
                onEditSprint={() => openEditSprintDialog(selectedSprint)}
                onAddEvent={openCreateEventDialog}
                onEditEvent={openEditEventDialog}
              />

              {/* Sprint Event Dialog */}
              {selectedSprint && (
                <SprintEventDialog
                  open={sprintEventDialogOpen}
                  onOpenChange={setSprintEventDialogOpen}
                  sprintId={selectedSprint.id}
                  projectId={projectId}
                  currentUserId={currentUserId}
                  event={editingSprintEvent}
                  isProjectManager={isProjectManager}
                  onEventCreated={refreshSprintEvents}
                  onEventUpdated={refreshSprintEvents}
                  onEventDeleted={refreshSprintEvents}
                />
              )}
            </div>
          ) : (
            // Sprint List View
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Sprint Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Plan, track, and manage your project sprints
                    {!isProjectManager && " (Only project managers can create/edit sprints)"}
                  </p>
                </div>
                <Button
                  className="gap-2"
                  onClick={openCreateSprintDialog}
                  disabled={!isProjectManager}
                >
                  <Plus className="h-4 w-4" />
                  Create Sprint
                </Button>
              </div>

              {sprints.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <PlayCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Sprints Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                      Create your first sprint to organize tasks into time-boxed iterations.
                      Define goals, set timelines, and schedule events.
                    </p>
                    {isProjectManager && (
                      <Button className="gap-2" onClick={openCreateSprintDialog}>
                        <Plus className="h-4 w-4" />
                        Create First Sprint
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sprints.map((sprint: any) => {
                    const sprintStatusConfig: { [key: string]: { label: string; color: string } } = {
                      planned: { label: "Planned", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
                      active: { label: "Active", color: "bg-green-500/10 text-green-700 border-green-500/20" },
                      completed: { label: "Completed", color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
                      cancelled: { label: "Cancelled", color: "bg-gray-500/10 text-gray-700 border-gray-500/20" },
                    };

                    const config = sprintStatusConfig[sprint.status] || sprintStatusConfig.planned;
                    const taskCount = sprint.tasks?.[0]?.count || 0;

                    return (
                      <Card key={sprint.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{sprint.name}</CardTitle>
                              <CardDescription className="mt-1 line-clamp-2">
                                {sprint.goal || "No goal set"}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className={`${config.color} border`}>
                              {config.label}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Start Date</span>
                              <span className="font-medium">
                                {new Date(sprint.start_date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">End Date</span>
                              <span className="font-medium">
                                {new Date(sprint.end_date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Tasks</span>
                              <span className="font-medium">{taskCount}</span>
                            </div>
                          </div>

                          {sprint.status === "active" && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Days Remaining</span>
                                <span className="font-medium">
                                  {Math.max(
                                    0,
                                    Math.ceil(
                                      (new Date(sprint.end_date).getTime() - new Date().getTime()) /
                                        (1000 * 60 * 60 * 24)
                                    )
                                  )}
                                </span>
                              </div>
                              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      ((new Date().getTime() - new Date(sprint.start_date).getTime()) /
                                        (new Date(sprint.end_date).getTime() -
                                          new Date(sprint.start_date).getTime())) *
                                        100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleViewSprint(sprint)}
                          >
                            View Sprint
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {sprints.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sprint Statistics</CardTitle>
                    <CardDescription>Overview of all sprints</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {sprints.filter((s) => s.status === "planned").length}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Planned</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {sprints.filter((s) => s.status === "active").length}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Active</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {sprints.filter((s) => s.status === "completed").length}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {sprints.length}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Total</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Sprint Dialog */}
          <SprintDialog
            open={sprintDialogOpen}
            onOpenChange={setSprintDialogOpen}
            projectId={projectId}
            sprint={editingSprint}
            isProjectManager={isProjectManager}
            onSprintCreated={refreshSprints}
            onSprintUpdated={refreshSprints}
            onSprintDeleted={() => {
              refreshSprints();
              setSelectedSprint(null);
            }}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Manage your project team and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {project.project_members && project.project_members.length > 0 ? (
                <div className="space-y-4">
                  {project.project_members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium text-primary">
                          {member.users.full_name
                            ? member.users.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
                            : member.users.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.users.full_name || member.users.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.users.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {member.custom_role && (
                          <Badge variant="secondary" className="gap-1">
                            {roleIcons[member.custom_role] && (
                              (() => {
                                const Icon = roleIcons[member.custom_role];
                                return <Icon className="h-3 w-3" />;
                              })()
                            )}
                            {member.custom_role}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No team members yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Project Settings</CardTitle>
              <CardDescription>
                Manage project configuration and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold">Settings Coming Soon</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Configure project settings, permissions, and preferences.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
