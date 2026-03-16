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
  MessageSquare,
  LayoutDashboard,
} from "lucide-react";
import { getOrganization, getOrganizationProjects, getOrganizationMembers } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useBreadcrumbs } from "@/components/breadcrumbs";
import { InviteCodeManager } from "@/components/org/InviteCodeManager";
import { OrgMemberTable } from "@/components/org/OrgMemberTable";
import { TemplateManager } from "@/components/projects/TemplateManager";

export default function OrganizationDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [organization, setOrganization] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [activeTasks, setActiveTasks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "members">("overview");

  useBreadcrumbs([
    { label: "Organizations", href: "/dashboard/organizations" },
    { label: organization?.name || "…" },
  ]);

  useEffect(() => {
    if (authLoading) return;
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

        // Fetch active tasks count across all org projects
        const projectIds = (projectsData || []).map((p: any) => p.id);
        if (projectIds.length > 0) {
          const { count } = await (supabase as any)
            .from("tasks")
            .select("id", { count: "exact", head: true })
            .in("project_id", projectIds)
            .in("status", ["todo", "in_progress", "review"]);
          setActiveTasks(count || 0);
        }
      } catch (error) {
        console.error("Error loading organization data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOrganizationData();
  }, [orgId, authLoading]);

  const copyInviteCode = () => {
    if (organization?.invite_code) {
      navigator.clipboard.writeText(organization.invite_code);
      toast.success("Invite code copied!");
    }
  };

  // Determine if user is admin/manager in this org
  const currentUserId = user?.id || "";
  const currentMember = members.find((m: any) => m.user_id === currentUserId);
  const isOrgAdmin = currentMember?.role === "admin" || currentMember?.role === "manager";

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 bg-muted rounded-lg w-52" />
            <div className="h-4 bg-muted rounded w-72" />
          </div>
          <div className="h-9 bg-muted rounded-lg w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="h-48 bg-muted rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-44 bg-muted rounded-xl" />)}
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
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/organizations/${orgId}/projects/new`}>
            <Button className="bg-brand-blue hover:bg-brand-blue-600 text-white shadow-lg shadow-brand-blue/25 gap-2">
              <Plus className="h-5 w-5" />
              Create Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "overview"
              ? "bg-white text-navy-900 shadow-sm"
              : "text-muted-foreground hover:text-navy-900"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Overview
        </button>
        {isOrgAdmin && (
          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "members"
                ? "bg-white text-navy-900 shadow-sm"
                : "text-muted-foreground hover:text-navy-900"
            }`}
          >
            <Users className="h-4 w-4" />
            Members
          </button>
        )}
        <Link href={`/dashboard/organizations/${orgId}/communication`}>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all text-muted-foreground hover:text-navy-900"
          >
            <MessageSquare className="h-4 w-4" />
            Communication Hub
          </button>
        </Link>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
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
                    <p className="text-3xl font-bold text-navy-900">{activeTasks}</p>
                    <p className="text-sm text-muted-foreground">Active Tasks</p>
                    <p className="text-xs text-muted-foreground">
                      {activeTasks === 0 ? "No tasks yet" : "Across all projects"}
                    </p>
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
        </>
      )}

      {/* Members Tab */}
      {activeTab === "members" && isOrgAdmin && (
        <div className="space-y-8">
          {/* Invite Code Manager */}
          <Card className="bg-white border border-[#E7E9EF] shadow-sm">
            <CardContent className="p-6">
              <InviteCodeManager orgId={orgId} isAdmin={currentMember?.role === "admin"} />
            </CardContent>
          </Card>

          {/* Org Member Table */}
          <Card className="bg-white border border-[#E7E9EF] shadow-sm">
            <CardContent className="p-6">
              <OrgMemberTable
                members={members}
                currentUserId={currentUserId}
                isAdmin={currentMember?.role === "admin"}
                orgName={organization?.name || ""}
                onMembersChanged={async () => {
                  const updated = await getOrganizationMembers(orgId);
                  setMembers(updated || []);
                }}
              />
            </CardContent>
          </Card>

          {/* Template Manager */}
          <Card className="bg-white border border-[#E7E9EF] shadow-sm">
            <CardContent className="p-6">
              <TemplateManager
                orgId={orgId}
                currentUserId={currentUserId}
                isAdmin={currentMember?.role === "admin" || currentMember?.role === "manager"}
              />
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
