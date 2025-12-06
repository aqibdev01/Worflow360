"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  Users,
  FolderKanban,
  UserPlus,
  Loader2,
  Crown,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getUserOrganizations } from "@/lib/database";

export default function OrganizationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrganizations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userOrgs = await getUserOrganizations(user.id);
        setOrganizations(userOrgs || []);
      } catch (error) {
        console.error("Error loading organizations:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOrganizations();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organizations and collaborate with teams
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push("/dashboard/organizations/join")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Join Organization
          </Button>
          <Button onClick={() => router.push("/dashboard/organizations/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        </div>
      </div>

      {/* Organizations Grid */}
      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Get started by creating a new organization or joining an existing one with an invite code.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/dashboard/organizations/join")}>
                <UserPlus className="mr-2 h-4 w-4" />
                Join Organization
              </Button>
              <Button onClick={() => router.push("/dashboard/organizations/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => {
            const isOwner = org.owner_id === user?.id;
            const memberRole = org.organization_members?.[0]?.role;

            return (
              <Card
                key={org.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Building2 className="h-8 w-8 text-primary" />
                    {isOwner ? (
                      <Badge variant="default" className="gap-1">
                        <Crown className="h-3 w-3" />
                        Owner
                      </Badge>
                    ) : memberRole ? (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        {memberRole}
                      </Badge>
                    ) : null}
                  </div>
                  <CardTitle className="text-xl">{org.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {org.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {org.member_count || 1} {org.member_count === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {org.project_count || 0} {org.project_count === 1 ? 'project' : 'projects'}
                        </span>
                      </div>
                    </div>

                    {/* Invite Code */}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Invite Code</p>
                      <code className="text-xs font-mono bg-secondary px-2 py-1 rounded">
                        {org.invite_code}
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
