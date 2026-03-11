"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getUserOrganizations } from "@/lib/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FolderKanban,
  CheckCircle2,
  Building2,
  Plus,
  UserPlus,
  ArrowRight,
  Sparkles,
  ListChecks,
  Zap,
  Target,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setOrgsLoading(false); return; }
    setOrgsLoading(true);
    getUserOrganizations(user.id)
      .then((orgs) => setOrganizations(orgs || []))
      .catch(() => {})
      .finally(() => setOrgsLoading(false));
  }, [user, authLoading]);

  const loading = authLoading || orgsLoading;
  const hasOrganizations = organizations.length > 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded-lg w-1/2" />
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-900">
          Welcome back, {userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0]}!
        </h1>
        <p className="text-muted-foreground mt-2">
          {hasOrganizations
            ? "Here's what's happening with your projects today."
            : "Get started by creating or joining an organization."}
        </p>
      </div>

      {!hasOrganizations ? (
        <>
          {/* Empty State - Create/Join Organization Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {/* Create Organization Card */}
            <Card className="relative overflow-hidden border-2 border-brand-blue/20 hover:border-brand-blue/40 transition-all hover:shadow-xl hover:shadow-brand-blue/10 group bg-white">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform" />
              <CardHeader>
                <div className="h-14 w-14 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-lg shadow-brand-blue/25">
                  <Plus className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-2xl text-navy-900">Create Organization</CardTitle>
                <CardDescription className="text-base">
                  Start your own team workspace and invite members to collaborate on projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Create unlimited projects
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Invite up to 20 team members
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    AI-powered project insights
                  </li>
                </ul>
                <Button className="w-full group/btn bg-brand-blue hover:bg-brand-blue-600 text-white" size="lg" onClick={() => router.push("/dashboard/organizations/new")}>
                  Create Organization
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* Join Organization Card */}
            <Card className="relative overflow-hidden border-2 border-brand-purple/20 hover:border-brand-purple/40 transition-all hover:shadow-xl hover:shadow-brand-purple/10 group bg-white">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-brand-purple-light/10 to-brand-purple-dark/10 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform" />
              <CardHeader>
                <div className="h-14 w-14 bg-gradient-to-br from-brand-purple-light to-brand-purple-dark rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-lg shadow-brand-purple/25">
                  <UserPlus className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-2xl text-navy-900">Join Organization</CardTitle>
                <CardDescription className="text-base">
                  Join an existing organization using an invitation code or link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Collaborate with your team
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Access shared projects
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Track team progress
                  </li>
                </ul>
                <Button className="w-full group/btn bg-brand-purple hover:bg-brand-purple-dark text-white" size="lg" onClick={() => router.push("/dashboard/organizations/join")}>
                  Join Organization
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Getting Started Guide */}
          <Card className="bg-gradient-to-br from-brand-blue/5 via-white to-brand-purple/5 border-brand-blue/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-blue" />
                <CardTitle className="text-navy-900">Getting Started with Workflow360</CardTitle>
              </div>
              <CardDescription>
                Follow these steps to get the most out of your project management experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="h-10 w-10 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-lg flex items-center justify-center shadow-md shadow-brand-blue/20">
                    <span className="text-lg font-bold text-white">1</span>
                  </div>
                  <h3 className="font-semibold text-navy-900">Create or Join</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up your organization or join an existing team
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 bg-gradient-to-br from-brand-purple-light to-brand-purple-dark rounded-lg flex items-center justify-center shadow-md shadow-brand-purple/20">
                    <span className="text-lg font-bold text-white">2</span>
                  </div>
                  <h3 className="font-semibold text-navy-900">Add Projects</h3>
                  <p className="text-sm text-muted-foreground">
                    Create projects and define your goals
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 bg-gradient-to-br from-success to-emerald-400 rounded-lg flex items-center justify-center shadow-md shadow-success/20">
                    <span className="text-lg font-bold text-white">3</span>
                  </div>
                  <h3 className="font-semibold text-navy-900">Invite Team</h3>
                  <p className="text-sm text-muted-foreground">
                    Collaborate with your team members
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 bg-gradient-to-br from-warning to-amber-400 rounded-lg flex items-center justify-center shadow-md shadow-warning/20">
                    <span className="text-lg font-bold text-navy-900">4</span>
                  </div>
                  <h3 className="font-semibold text-navy-900">Track Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Use AI insights to optimize workflows
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Preview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="group hover:shadow-lg hover:shadow-brand-cyan/10 transition-all border-brand-cyan/10 hover:border-brand-cyan/30 bg-white">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-to-br from-brand-cyan-light to-brand-cyan-dark rounded-xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-md shadow-brand-cyan/20">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-navy-900">AI-Powered Insights</CardTitle>
                <CardDescription>
                  Get intelligent recommendations and predictive analytics for your projects
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group hover:shadow-lg hover:shadow-brand-purple/10 transition-all border-brand-purple/10 hover:border-brand-purple/30 bg-white">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-to-br from-brand-purple-light to-brand-purple-dark rounded-xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-md shadow-brand-purple/20">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-navy-900">Sprint Planning</CardTitle>
                <CardDescription>
                  Organize work into sprints and track progress toward your goals
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="group hover:shadow-lg hover:shadow-brand-blue/10 transition-all border-brand-blue/10 hover:border-brand-blue/30 bg-white">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-to-br from-brand-blue to-brand-blue-600 rounded-xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-md shadow-brand-blue/20">
                  <ListChecks className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-navy-900">Task Management</CardTitle>
                <CardDescription>
                  Create, assign, and track tasks with customizable workflows
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* Stats Cards - Real data from organizations */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-l-4 border-l-brand-blue hover:shadow-lg hover:shadow-brand-blue/10 transition-all bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-navy-900">
                  Organizations
                </CardTitle>
                <div className="h-8 w-8 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-brand-blue" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-brand-blue">{organizations.length}</div>
                <p className="text-xs text-muted-foreground">
                  {organizations.length === 1 ? "1 organization" : `${organizations.length} organizations`}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-brand-purple hover:shadow-lg hover:shadow-brand-purple/10 transition-all bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-navy-900">
                  Total Projects
                </CardTitle>
                <div className="h-8 w-8 bg-brand-purple/10 rounded-lg flex items-center justify-center">
                  <FolderKanban className="h-4 w-4 text-brand-purple" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-brand-purple">
                  {organizations.reduce((sum, o) => sum + (o.project_count || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">Across all organizations</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-brand-cyan hover:shadow-lg hover:shadow-brand-cyan/10 transition-all bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-navy-900">
                  Team Members
                </CardTitle>
                <div className="h-8 w-8 bg-brand-cyan/10 rounded-lg flex items-center justify-center">
                  <Users className="h-4 w-4 text-brand-cyan-dark" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-brand-cyan-dark">
                  {organizations.reduce((sum, o) => sum + (o.member_count || 1), 0)}
                </div>
                <p className="text-xs text-muted-foreground">Across all organizations</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-navy-900">Your Organizations</CardTitle>
                <CardDescription>
                  Click an organization to manage its projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {organizations.slice(0, 5).map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
                    >
                      <div className="h-9 w-9 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-900 truncate">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.member_count || 1} member{(org.member_count || 1) !== 1 ? "s" : ""} · {org.project_count || 0} project{(org.project_count || 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                  {organizations.length > 5 && (
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => router.push("/dashboard/organizations")}>
                      View all {organizations.length} organizations
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-navy-900">Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start group hover:border-brand-blue hover:bg-brand-blue/5" size="lg" onClick={() => router.push("/dashboard/organizations")}>
                  <FolderKanban className="mr-2 h-4 w-4 text-brand-blue" />
                  View All Organizations
                </Button>
                <Button variant="outline" className="w-full justify-start group hover:border-brand-purple hover:bg-brand-purple/5" size="lg" onClick={() => router.push("/dashboard/organizations/join")}>
                  <UserPlus className="mr-2 h-4 w-4 text-brand-purple" />
                  Join Organization
                </Button>
                <Button variant="outline" className="w-full justify-start group hover:border-success hover:bg-success/5" size="lg" onClick={() => router.push("/dashboard/organizations/new")}>
                  <Building2 className="mr-2 h-4 w-4 text-success" />
                  Create Organization
                </Button>
                <Button variant="outline" className="w-full justify-start group hover:border-brand-cyan hover:bg-brand-cyan/5" size="lg" onClick={() => router.push("/dashboard/analytics")}>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-brand-cyan-dark" />
                  View Reports
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
