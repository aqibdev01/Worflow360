"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  FolderKanban,
  CheckCircle2,
  Plus,
  ArrowRight,
  Copy,
  Loader2,
} from "lucide-react";
import { getOrganization, getOrganizationProjects, getOrganizationMembers } from "@/lib/database";
import { toast } from "sonner";

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

  const copyInviteCode = () => {
    if (organization?.invite_code) {
      navigator.clipboard.writeText(organization.invite_code);
      toast.success("Invite code copied!");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand-blue mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Project Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            {organization?.name || "Organization Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {organization?.description || "Manage your organization and projects"}
          </p>
        </div>
        <Link href={`/dashboard/organizations/${orgId}/projects/new`}>
          <Button className="bg-brand-blue hover:bg-brand-blue-600 text-white shadow-lg shadow-brand-blue/25 gap-2">
            <Plus className="h-5 w-5" />
            Create Project
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border border-[#E7E9EF] shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-navy-900">{projects.length}</p>
                <p className="text-sm text-muted-foreground">Projects</p>
                <p className="text-xs text-muted-foreground">
                  {projects.length === 0 ? "No projects yet" : "Active projects"}
                </p>
              </div>
              <div className="h-12 w-12 bg-brand-blue rounded-xl flex items-center justify-center">
                <FolderKanban className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E7E9EF] shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-navy-900">{members.length}</p>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-xs text-muted-foreground">
                  {members.length === 1 ? "Just you" : "Team members"}
                </p>
              </div>
              <div className="h-12 w-12 bg-brand-purple rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E7E9EF] shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-3xl font-bold text-navy-900">0</p>
                <p className="text-sm text-muted-foreground">Active Tasks</p>
                <p className="text-xs text-muted-foreground">No tasks yet</p>
              </div>
              <div className="h-12 w-12 bg-success rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E7E9EF] shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-lg font-mono font-bold text-navy-900">{organization?.invite_code}</p>
                <p className="text-sm text-muted-foreground">Invite Code</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-brand-blue hover:text-brand-blue-600"
                  onClick={copyInviteCode}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy code
                </Button>
              </div>
              <div className="h-12 w-12 bg-warning rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Section */}
      <Card className="bg-white border border-[#E7E9EF] shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-brand-purple/10 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-brand-purple" />
              </div>
              <div>
                <CardTitle className="text-lg text-navy-900">Team Members</CardTitle>
                <CardDescription>
                  Members of {organization?.name}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet</p>
          ) : (
            <div className="space-y-3">
              {members.map((member: any) => {
                const displayName = member.users?.full_name ||
                  member.users?.email?.split("@")[0] ||
                  "Unknown User";
                const initials = member.users?.full_name
                  ? member.users.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                  : member.users?.email?.charAt(0)?.toUpperCase() || "?";

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-[#F8F9FC] rounded-xl hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {initials}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-navy-900">
                          {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.users?.email}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={`capitalize ${
                        member.role === "admin"
                          ? "bg-brand-purple/10 text-brand-purple border-brand-purple/20"
                          : member.role === "manager"
                          ? "bg-brand-blue/10 text-brand-blue border-brand-blue/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {member.role}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects List or Empty State */}
      {projects.length === 0 ? (
        <Card className="bg-white border border-[#E7E9EF] shadow-sm">
          <CardHeader>
            <CardTitle className="text-navy-900">Welcome to {organization?.name}!</CardTitle>
            <CardDescription>
              Get started by creating your first project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-6">
              <div className="flex gap-4">
                <div className="h-12 w-12 bg-brand-blue rounded-xl flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-navy-900 mb-2">
                    Ready to Create Your First Project?
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Projects help you organize work, assign tasks to team members, and track progress with Kanban boards and sprints.
                  </p>
                  <div className="text-sm text-muted-foreground mb-4">
                    <p className="font-medium mb-2 text-navy-900">What you can do with projects:</p>
                    <ul className="space-y-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Create and manage tasks on a Kanban board
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Assign team members with specific roles
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Plan and track sprints
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Monitor progress with real-time updates
                      </li>
                    </ul>
                  </div>
                  <Link href={`/dashboard/organizations/${orgId}/projects/new`}>
                    <Button className="bg-brand-blue hover:bg-brand-blue-600 text-white gap-2">
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-navy-900">Projects</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: any) => (
              <Card
                key={project.id}
                className="bg-white border border-[#E7E9EF] shadow-sm hover:shadow-lg hover:border-brand-blue/30 transition-all cursor-pointer group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg text-navy-900 group-hover:text-brand-blue transition-colors">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {project.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge
                      className={`capitalize ${
                        project.status === "active"
                          ? "bg-success/10 text-success border-success/20"
                          : project.status === "planning"
                          ? "bg-brand-blue/10 text-brand-blue border-brand-blue/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span>0 tasks</span>
                    <span>
                      {project.project_members?.[0]?.count || 0} members
                    </span>
                  </div>
                  <Link href={`/dashboard/projects/${project.id}`}>
                    <Button variant="outline" size="sm" className="w-full group-hover:border-brand-blue group-hover:text-brand-blue">
                      View Project
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
