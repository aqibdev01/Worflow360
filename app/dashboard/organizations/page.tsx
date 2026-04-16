"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Users,
  FolderKanban,
  UserPlus,
  Crown,
  Shield,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getUserOrganizations } from "@/lib/database";
import { useBreadcrumbs } from "@/components/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function OrganizationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useBreadcrumbs([{ label: "Organizations" }]);

  useEffect(() => {
    if (authLoading) return;

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
  }, [user, authLoading]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Organizations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage your workspaces and collaborate with teams
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/dashboard/organizations/join")}
            className="px-5 py-2.5 rounded-lg font-bold text-sm text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Join Organization
          </button>
          <button
            onClick={() => router.push("/dashboard/organizations/new")}
            className="px-5 py-2.5 rounded-lg font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Organization
          </button>
        </div>
      </div>

      {/* Organizations Grid */}
      {organizations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-16 text-center shadow-sm">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center mx-auto">
              <Building2 className="h-10 w-10 text-indigo-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                No organizations yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Get started by creating a new organization or joining an existing
                one with an invite code.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => router.push("/dashboard/organizations/join")}
                className="px-5 py-2.5 rounded-lg font-bold text-sm text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-colors flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Join
              </button>
              <button
                onClick={() => router.push("/dashboard/organizations/new")}
                className="px-5 py-2.5 rounded-lg font-bold text-sm bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => {
            const isOwner = org.owner_id === user?.id;
            const memberRole = org.organization_members?.[0]?.role;

            return (
              <div
                key={org.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm hover:shadow-ambient transition-all cursor-pointer group"
                onClick={() =>
                  router.push(`/dashboard/organizations/${org.id}`)
                }
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  {isOwner ? (
                    <Badge className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-0 gap-1 text-[10px] font-bold uppercase tracking-wider">
                      <Crown className="h-3 w-3" />
                      Owner
                    </Badge>
                  ) : memberRole ? (
                    <Badge className="bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-0 gap-1 text-[10px] font-bold uppercase tracking-wider">
                      <Shield className="h-3 w-3" />
                      {memberRole}
                    </Badge>
                  ) : null}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1 tracking-tight">
                  {org.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-5">
                  {org.description || "No description provided"}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-6 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">
                        {org.member_count || 1}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Members
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-violet-50 dark:bg-violet-950/30 rounded-lg flex items-center justify-center">
                      <FolderKanban className="h-4 w-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">
                        {org.project_count || 0}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Projects
                      </p>
                    </div>
                  </div>
                </div>

                {/* Invite code footer */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Invite Code
                    </p>
                    <code className="text-xs font-mono bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg text-foreground">
                      {org.invite_code}
                    </code>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
