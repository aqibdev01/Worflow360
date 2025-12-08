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
  ArrowRight,
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
          <Loader2 className="h-12 w-12 animate-spin text-brand-blue mx-auto mb-4" />
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
          <h1 className="text-2xl font-bold text-navy-900">Organizations</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organizations and collaborate with teams
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/organizations/join")}
            className="border-brand-purple/30 text-brand-purple hover:bg-brand-purple/5 hover:border-brand-purple"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Join Organization
          </Button>
          <Button
            onClick={() => router.push("/dashboard/organizations/new")}
            className="bg-brand-blue hover:bg-brand-blue-600 text-white shadow-lg shadow-brand-blue/25"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Organization
          </Button>
        </div>
      </div>

      {/* Organizations Grid */}
      {organizations.length === 0 ? (
        <Card className="bg-white border border-[#E7E9EF] shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-20 w-20 bg-brand-blue/10 rounded-2xl flex items-center justify-center mb-6">
              <Building2 className="h-10 w-10 text-brand-blue" />
            </div>
            <h3 className="text-xl font-semibold text-navy-900 mb-2">No organizations yet</h3>
            <p className="text-muted-foreground text-center mb-8 max-w-md">
              Get started by creating a new organization or joining an existing one with an invite code.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/organizations/join")}
                className="border-brand-purple/30 text-brand-purple hover:bg-brand-purple/5"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Join Organization
              </Button>
              <Button
                onClick={() => router.push("/dashboard/organizations/new")}
                className="bg-brand-blue hover:bg-brand-blue-600 text-white"
              >
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
                className="bg-white border border-[#E7E9EF] shadow-sm hover:shadow-lg hover:border-brand-blue/30 transition-all cursor-pointer group"
                onClick={() => router.push(`/dashboard/organizations/${org.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-12 w-12 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl flex items-center justify-center shadow-md shadow-brand-blue/20 group-hover:scale-105 transition-transform">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    {isOwner ? (
                      <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
                        <Crown className="h-3 w-3" />
                        Owner
                      </Badge>
                    ) : memberRole ? (
                      <Badge variant="secondary" className="gap-1 bg-brand-purple/10 text-brand-purple border-brand-purple/20">
                        <Shield className="h-3 w-3" />
                        {memberRole}
                      </Badge>
                    ) : null}
                  </div>
                  <CardTitle className="text-lg text-navy-900 group-hover:text-brand-blue transition-colors">
                    {org.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {org.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                          <Users className="h-4 w-4 text-brand-blue" />
                        </div>
                        <div>
                          <p className="font-medium text-navy-900">{org.member_count || 1}</p>
                          <p className="text-xs text-muted-foreground">Members</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-brand-purple/10 rounded-lg flex items-center justify-center">
                          <FolderKanban className="h-4 w-4 text-brand-purple" />
                        </div>
                        <div>
                          <p className="font-medium text-navy-900">{org.project_count || 0}</p>
                          <p className="text-xs text-muted-foreground">Projects</p>
                        </div>
                      </div>
                    </div>

                    {/* Invite Code */}
                    <div className="pt-3 border-t border-[#E7E9EF]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Invite Code</p>
                          <code className="text-xs font-mono bg-[#F8F9FC] px-2 py-1 rounded text-navy-900">
                            {org.invite_code}
                          </code>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
                      </div>
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
