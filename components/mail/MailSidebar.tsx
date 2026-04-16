"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Inbox,
  Star,
  Send,
  FileEdit,
  Archive,
  Trash2,
  Megaphone,
  PenSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMailUnread } from "@/hooks/useMailUnread";
import { useEffect, useState } from "react";
import { getDrafts } from "@/lib/mail/mail";

interface MailSidebarProps {
  orgId: string;
  currentUserId: string;
}

const folders = [
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "starred", label: "Starred", icon: Star },
  { key: "sent", label: "Sent", icon: Send },
  { key: "drafts", label: "Drafts", icon: FileEdit },
  { key: "archived", label: "Archived", icon: Archive },
  { key: "trash", label: "Trash", icon: Trash2 },
];

export function MailSidebar({ orgId, currentUserId }: MailSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadMailCount } = useMailUnread(orgId);
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    if (!orgId) return;
    getDrafts(orgId)
      .then((drafts) => setDraftCount(drafts.length))
      .catch(() => {});
  }, [orgId]);

  const basePath = `/dashboard/organizations/${orgId}/mail`;

  const activeFolder = (() => {
    if (pathname.includes("/compose")) return "compose";
    const segments = pathname.split("/mail/");
    if (segments[1]) return segments[1].split("/")[0];
    return "inbox";
  })();

  const getBadge = (key: string): number | null => {
    if (key === "inbox" && unreadMailCount > 0) return unreadMailCount;
    if (key === "drafts" && draftCount > 0) return draftCount;
    return null;
  };

  return (
    <div className="w-[220px] shrink-0 flex flex-col bg-gray-50/50 overflow-y-auto">
      {/* Compose button */}
      <div className="p-3">
        <Button
          onClick={() => router.push(`${basePath}/compose`)}
          className="w-full gap-2 bg-indigo-600 hover:bg-indigo-600/90"
        >
          <PenSquare className="h-4 w-4" />
          Compose
        </Button>
      </div>

      {/* Folder nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {folders.map(({ key, label, icon: Icon }) => {
          const isActive = activeFolder === key;
          const badge = getBadge(key);

          return (
            <button
              key={key}
              onClick={() => router.push(`${basePath}/${key}`)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-indigo-600/10 text-indigo-600 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge !== null && (
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    key === "inbox"
                      ? "bg-red-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Divider */}
        <div className="my-3 border-t" />

        {/* Announcements */}
        <button
          onClick={() => router.push(`${basePath}/announcements`)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeFolder === "announcements"
              ? "bg-indigo-600/10 text-indigo-600 font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Megaphone className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Announcements</span>
        </button>
      </nav>
    </div>
  );
}
