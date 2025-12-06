"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, FolderKanban, CheckCircle2, Plus } from "lucide-react";
import { getOrganization, getOrganizationProjects, getOrganizationMembers } from "@/lib/database";

export default function OrganizationDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [organization, setOrganization] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrganizationData() {
      try {
        const [orgData, projectsData, membersData] = await Promise.all([
          getOrganization(orgId),
          getOrganizationProjects(orgId),
          getOrganizationMembers(orgId),
        ]);

        setOrganization(orgData);
        setProjects(projectsData || []);
        setMembers(membersData || []);
      } catch (error) {
        console.error("Error loading organization data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOrganizationData();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Project Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {organization?.name || "Organization Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {organization?.description || "Manage your organization and projects"}
          </p>
        </div>
        <Link href={`/dashboard/organizations/${orgId}/projects/new`}>
          <Button size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create Project
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">
              {projects.length === 0 ? "No projects yet" : "Active projects"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              {members.length === 1 ? "Just you" : "Team members"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No tasks yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invite Code</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-mono font-bold">{organization?.invite_code}</div>
            <p className="text-xs text-muted-foreground mt-1">Share with team</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>
                Members of {organization?.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet</p>
          ) : (
            <div className="space-y-3">
              {members.map((member: any) => {
                // Get display name - prefer full_name, fallback to email username
                const displayName = member.users?.full_name ||
                  member.users?.email?.split("@")[0] ||
                  "Unknown User";
                const initials = member.users?.full_name
                  ? member.users.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                  : member.users?.email?.charAt(0)?.toUpperCase() || "?";

                return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {initials}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.users?.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      member.role === "admin"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        : member.role === "manager"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects List or Empty State */}
      {projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to {organization?.name}!</CardTitle>
            <CardDescription>
              Get started by creating your first project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
              <div className="flex gap-3">
                <FolderKanban className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div>
                  <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Ready to Create Your First Project?
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                    Projects help you organize work, assign tasks to team members, and track progress with Kanban boards and sprints.
                  </p>
                  <div className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                    <p className="font-medium mb-1">What you can do with projects:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Create and manage tasks on a Kanban board</li>
                      <li>Assign team members with specific roles (Developer, QA, Designer, etc.)</li>
                      <li>Plan and track sprints</li>
                      <li>Monitor progress with real-time updates</li>
                    </ul>
                  </div>
                  <Link href={`/dashboard/organizations/${orgId}/projects/new`}>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Your First Project
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-4">Projects</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {project.description || "No description"}
                      </CardDescription>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        project.status === "active"
                          ? "bg-green-100 text-green-700"
                          : project.status === "planning"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>0 tasks</span>
                    <span>
                      {project.project_members?.[0]?.count || 0} members
                    </span>
                  </div>
                  <Link href={`/dashboard/projects/${project.id}`}>
                    <Button variant="outline" size="sm" className="w-full mt-4">
                      View Project
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
