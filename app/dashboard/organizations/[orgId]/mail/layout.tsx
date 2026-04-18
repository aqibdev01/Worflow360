"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useBreadcrumbs } from "@/components/breadcrumbs";
import { MailSidebar } from "@/components/mail/MailSidebar";

export default function MailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgId = params.orgId as string;
  const { user } = useAuth();

  useBreadcrumbs([
    { label: "Organizations", href: "/dashboard/organizations" },
    { label: "Mail" },
  ]);

  return (
    <div className="flex h-[calc(100vh-5rem)] -mx-4 lg:-mx-6 -mb-4 lg:-mb-6 bg-white dark:bg-slate-950 rounded-t-xl border dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Left sidebar — 220px fixed */}
      <MailSidebar orgId={orgId} currentUserId={user?.id || ""} />

      {/* Main mail area */}
      <div className="flex-1 flex flex-col min-w-0 border-l">{children}</div>
    </div>
  );
}
