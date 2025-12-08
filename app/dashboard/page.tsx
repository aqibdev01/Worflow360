"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
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
  Activity,
  ListChecks,
  Zap,
  Target,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  // Simulating empty state - in real app, this would come from database
  const [hasOrganizations] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
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
          {/* Stats Cards - Shown when user has organizations */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                <div className="text-2xl font-bold text-brand-blue">3</div>
                <p className="text-xs text-muted-foreground">
                  +1 joined this month
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
                <div className="text-2xl font-bold text-brand-purple">12</div>
                <p className="text-xs text-muted-foreground">
                  8 active, 4 completed
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-success hover:shadow-lg hover:shadow-success/10 transition-all bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-navy-900">
                  Active Tasks
                </CardTitle>
                <div className="h-8 w-8 bg-success/10 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">47</div>
                <p className="text-xs text-muted-foreground">
                  23 completed this week
                </p>
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
                <div className="text-2xl font-bold text-brand-cyan-dark">18</div>
                <p className="text-xs text-muted-foreground">
                  Across all orgs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-navy-900">Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates from your organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { user: "Sarah Chen", action: "completed task", item: "User Authentication", org: "Tech Startup", time: "2 hours ago", color: "bg-success" },
                    { user: "Mike Johnson", action: "created project", item: "Q1 Planning", org: "Marketing Team", time: "4 hours ago", color: "bg-brand-blue" },
                    { user: "Emma Wilson", action: "commented on", item: "Design Review", org: "Tech Startup", time: "5 hours ago", color: "bg-brand-purple" },
                    { user: "Alex Turner", action: "assigned task", item: "API Testing", org: "Dev Team", time: "1 day ago", color: "bg-brand-cyan" },
                  ].map((activity, i) => (
                    <div key={i} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`h-8 w-8 rounded-full ${activity.color} flex items-center justify-center flex-shrink-0`}>
                        <Activity className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium text-navy-900">{activity.user}</span>{" "}
                          <span className="text-muted-foreground">{activity.action}</span>{" "}
                          <span className="font-medium text-brand-blue">{activity.item}</span>
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs bg-navy-50">
                            {activity.org}
                          </Badge>
                          <span>{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
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
                <Button variant="outline" className="w-full justify-start group hover:border-brand-blue hover:bg-brand-blue/5" size="lg">
                  <Plus className="mr-2 h-4 w-4 text-brand-blue" />
                  Create New Project
                </Button>
                <Button variant="outline" className="w-full justify-start group hover:border-brand-purple hover:bg-brand-purple/5" size="lg">
                  <UserPlus className="mr-2 h-4 w-4 text-brand-purple" />
                  Invite Team Member
                </Button>
                <Button variant="outline" className="w-full justify-start group hover:border-success hover:bg-success/5" size="lg" onClick={() => router.push("/dashboard/organizations/new")}>
                  <Building2 className="mr-2 h-4 w-4 text-success" />
                  Create Organization
                </Button>
                <Button variant="outline" className="w-full justify-start group hover:border-brand-cyan hover:bg-brand-cyan/5" size="lg">
                  <FolderKanban className="mr-2 h-4 w-4 text-brand-cyan-dark" />
                  View All Projects
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
