"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban,
  Plus,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getUserProjects } from "@/lib/database";

const statusConfig = {
  planning: { label: "Planning", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  active: { label: "Active", color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" },
  on_hold: { label: "On Hold", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20" },
  completed: { label: "Completed", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  archived: { label: "Archived", color: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20" },
};

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userProjects = await getUserProjects(user.id);
        setProjects(userProjects || []);
      } catch (error) {
        console.error("Error loading projects:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track all your projects in one place
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/organizations")}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              You're not part of any projects yet. Join an organization or create a new project to get started.
            </p>
            <Button onClick={() => router.push("/dashboard/organizations")}>
              <Plus className="mr-2 h-4 w-4" />
              Go to Organizations
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/projects/${project.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <FolderKanban className="h-8 w-8 text-primary" />
                  <Badge
                    variant="outline"
                    className={`${statusConfig[project.status as keyof typeof statusConfig]?.color || ""} border`}
                  >
                    {statusConfig[project.status as keyof typeof statusConfig]?.label || project.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {project.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Organization */}
                  {project.organizations && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{project.organizations.name}</span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">0 tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-muted-foreground">0% done</span>
                    </div>
                  </div>

                  {/* Created date */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <Clock className="h-3 w-3" />
                    <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
