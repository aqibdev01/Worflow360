"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Users, CheckCircle2, Calendar, Target } from "lucide-react";

export default function ProjectDashboardPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const orgId = params.orgId as string;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Project Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage tasks, sprints, and team collaboration
        </p>
      </div>

      {/* Placeholder Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No tasks yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">You're the owner</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sprints</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No sprints yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project ID</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono truncate">{projectId}</div>
            <p className="text-xs text-muted-foreground mt-1">Just created</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to your project!</CardTitle>
          <CardDescription>
            Get started by creating tasks and organizing your workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg p-6">
            <div className="flex gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <h4 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                  Project Created Successfully!
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                  Your project is ready to use. Start collaborating with your team by creating tasks and sprints.
                </p>
                <div className="text-sm text-green-800 dark:text-green-200">
                  <p className="font-medium mb-1">Next steps:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Create your first task</li>
                    <li>Set up a sprint for planning</li>
                    <li>Invite additional team members if needed</li>
                    <li>Configure project settings and workflows</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
