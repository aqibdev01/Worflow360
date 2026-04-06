"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getOrganizationMembers } from "@/lib/database";
import { CommunicationSidebar } from "@/components/communication/ChannelSidebar";
import { useBreadcrumbs } from "@/components/breadcrumbs";

export default function CommunicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgId = params.orgId as string;
  const { user, loading: authLoading } = useAuth();

  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [canManage, setCanManage] = useState(false);

  useBreadcrumbs([
    { label: "Organizations", href: "/dashboard/organizations" },
    { label: "Communication" },
  ]);

  useEffect(() => {
    if (!user || !orgId) return;
    async function loadOrgData() {
      try {
        const members = (await getOrganizationMembers(orgId)) as any[];
        setOrgMembers(members || []);
        const currentMember = (members || []).find(
          (m: any) => m.user_id === user!.id
        );
        setCanManage(
          currentMember?.role === "admin" || currentMember?.role === "manager"
        );
      } catch (err) {
        console.error("Error loading org members:", err);
      }
    }
    loadOrgData();
  }, [orgId, user]);

  if (authLoading || !user) {
    return (
      <div className="flex h-[calc(100vh-5rem)] -mx-4 lg:-mx-6 -mb-4 lg:-mb-6 bg-white rounded-t-xl border shadow-sm overflow-hidden items-center justify-center">
        <div className="h-6 w-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] -mx-4 lg:-mx-6 -mb-4 lg:-mb-6 bg-white rounded-t-xl border shadow-sm overflow-hidden">
      {/* Left sidebar — 260px fixed */}
      <CommunicationSidebar
        orgId={orgId}
        currentUserId={user.id}
        canManageChannels={canManage}
      />

      {/* Main + Right panel area */}
      <div className="flex-1 flex min-w-0">{children}</div>
    </div>
  );
}
