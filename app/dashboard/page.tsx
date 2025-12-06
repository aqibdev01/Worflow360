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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
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
            <Card className="relative overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
              <CardHeader>
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Create Organization</CardTitle>
                <CardDescription className="text-base">
                  Start your own team workspace and invite members to collaborate on projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Create unlimited projects
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Invite up to 20 team members
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    AI-powered project insights
                  </li>
                </ul>
                <Button className="w-full group/btn" size="lg" onClick={() => router.push("/dashboard/organizations/new")}>
                  Create Organization
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* Join Organization Card */}
            <Card className="relative overflow-hidden border-2 border-secondary hover:border-secondary/60 transition-all hover:shadow-lg group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/30 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
              <CardHeader>
                <div className="h-12 w-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-secondary/30 transition-colors">
                  <UserPlus className="h-6 w-6 text-secondary-foreground" />
                </div>
                <CardTitle className="text-2xl">Join Organization</CardTitle>
                <CardDescription className="text-base">
                  Join an existing organization using an invitation code or link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary-foreground" />
                    Collaborate with your team
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary-foreground" />
                    Access shared projects
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-secondary-foreground" />
                    Track team progress
                  </li>
                </ul>
                <Button variant="secondary" className="w-full group/btn" size="lg" onClick={() => router.push("/dashboard/organizations/join")}>
                  Join Organization
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Getting Started Guide */}
          <Card className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Getting Started with Workflow360</CardTitle>
              </div>
              <CardDescription>
                Follow these steps to get the most out of your project management experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold">Create or Join</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up your organization or join an existing team
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold">Add Projects</h3>
                  <p className="text-sm text-muted-foreground">
                    Create projects and define your goals
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-semibold">Invite Team</h3>
                  <p className="text-sm text-muted-foreground">
                    Collaborate with your team members
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">4</span>
                  </div>
                  <h3 className="font-semibold">Track Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Use AI insights to optimize workflows
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Preview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-primary mb-2" />
                <CardTitle>AI-Powered Insights</CardTitle>
                <CardDescription>
                  Get intelligent recommendations and predictive analytics for your projects
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <Target className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Sprint Planning</CardTitle>
                <CardDescription>
                  Organize work into sprints and track progress toward your goals
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <ListChecks className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Task Management</CardTitle>
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Organizations
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  +1 joined this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Projects
                </CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  8 active, 4 completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Tasks
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">47</div>
                <p className="text-xs text-muted-foreground">
                  23 completed this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Members
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">18</div>
                <p className="text-xs text-muted-foreground">
                  Across all orgs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates from your organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { user: "Sarah Chen", action: "completed task", item: "User Authentication", org: "Tech Startup", time: "2 hours ago" },
                    { user: "Mike Johnson", action: "created project", item: "Q1 Planning", org: "Marketing Team", time: "4 hours ago" },
                    { user: "Emma Wilson", action: "commented on", item: "Design Review", org: "Tech Startup", time: "5 hours ago" },
                    { user: "Alex Turner", action: "assigned task", item: "API Testing", org: "Dev Team", time: "1 day ago" },
                  ].map((activity, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.user}</span>{" "}
                          <span className="text-muted-foreground">{activity.action}</span>{" "}
                          <span className="font-medium">{activity.item}</span>
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
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

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Project
                </Button>
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Team Member
                </Button>
                <Button variant="outline" className="w-full justify-start" size="lg" onClick={() => router.push("/dashboard/organizations/new")}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Create Organization
                </Button>
                <Button variant="outline" className="w-full justify-start" size="lg">
                  <FolderKanban className="mr-2 h-4 w-4" />
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
