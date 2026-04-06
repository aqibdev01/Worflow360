"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Hash,
  Lock,
  Megaphone,
  Plus,
  ChevronDown,
  ChevronRight,

  Search,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getOrgChannels } from "@/lib/communication/channels";
import { getDMThreads } from "@/lib/communication/dm";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { usePresence } from "@/hooks/usePresence";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { NewDMDialog } from "./NewDMDialog";
import { supabase } from "@/lib/supabase";

interface CommunicationSidebarProps {
  orgId: string;
  currentUserId: string;
  canManageChannels: boolean;
}

export function CommunicationSidebar({
  orgId,
  currentUserId,
  canManageChannels,
}: CommunicationSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [channels, setChannels] = useState<any[]>([]);
  const [archivedChannels, setArchivedChannels] = useState<any[]>([]);
  const [dmThreads, setDMThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showChannels, setShowChannels] = useState(true);
  const [showDMs, setShowDMs] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newDMOpen, setNewDMOpen] = useState(false);

  // Extract active channel/DM from URL
  const activeChannelId = useMemo(() => {
    const match = pathname.match(
      /\/communication\/(?!dm\/)([^/]+)/
    );
    return match ? match[1] : null;
  }, [pathname]);

  const activeDMThreadId = useMemo(() => {
    const match = pathname.match(/\/communication\/dm\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  // Fetch channels (active + archived separately)
  const loadChannels = useCallback(async () => {
    try {
      // Active channels (getOrgChannels already filters is_archived=false)
      const channelData = await getOrgChannels(orgId);
      setChannels(channelData || []);

      // Archived channels — separate query
      const { data: archived } = await (supabase as any)
        .from("channels")
        .select("*, channel_members(count)")
        .eq("organization_id", orgId)
        .is("project_id", null)
        .eq("is_archived", true)
        .order("name", { ascending: true });

      setArchivedChannels(archived || []);
    } catch (err) {
      console.error("Error loading channels:", err);
    }
  }, [orgId]);

  // Fetch DM threads
  const loadDMThreads = useCallback(async () => {
    try {
      const dmData = await getDMThreads(orgId, currentUserId);
      setDMThreads(dmData || []);
    } catch (err) {
      console.error("Error loading DM threads:", err);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId || !currentUserId) return;
    setLoading(true);
    Promise.all([loadChannels(), loadDMThreads()]).finally(() =>
      setLoading(false)
    );
  }, [orgId, currentUserId, loadChannels, loadDMThreads]);

  // Unread counts for channels
  const channelIds = useMemo(
    () => channels.map((c) => c.id),
    [channels]
  );
  const { unreadCounts, markAsRead } = useUnreadCounts(
    currentUserId,
    channelIds
  );

  // Online presence
  const { isOnline } = usePresence(currentUserId, orgId);

  // Filter by search
  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(
      (c) =>
        (c.display_name || c.name).toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [channels, searchQuery]);

  const filteredDMs = useMemo(() => {
    if (!searchQuery) return dmThreads;
    const q = searchQuery.toLowerCase();
    return dmThreads.filter((dm) => {
      const other = dm.other_participants?.[0];
      const name =
        other?.users?.full_name || other?.users?.email || "";
      return name.toLowerCase().includes(q);
    });
  }, [dmThreads, searchQuery]);

  const handleSelectChannel = (channelId: string) => {
    markAsRead(channelId);
    router.push(
      `/dashboard/organizations/${orgId}/communication/${channelId}`
    );
  };

  const handleSelectDM = (threadId: string) => {
    router.push(
      `/dashboard/organizations/${orgId}/communication/dm/${threadId}`
    );
  };

  const handleChannelCreated = () => {
    loadChannels();
  };

  const handleDMCreated = (threadId: string) => {
    loadDMThreads();
    handleSelectDM(threadId);
  };

  const channelIcon = (type: string) => {
    switch (type) {
      case "private":
        return <Lock className="h-3.5 w-3.5 flex-shrink-0" />;
      case "announcement":
        return <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />;
      default:
        return <Hash className="h-3.5 w-3.5 flex-shrink-0" />;
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-[260px] border-r bg-slate-50 dark:bg-slate-900 flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b">
          <h2 className="text-base font-bold text-foreground">Messages</h2>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels & DMs..."
              className="h-8 pl-8 text-xs bg-white"
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="px-4 py-8 text-center">
              <div className="h-5 w-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground mt-2">Loading...</p>
            </div>
          ) : (
            <>
              {/* ── Channels Section ── */}
              <div>
                <div
                  onClick={() => setShowChannels(!showChannels)}
                  className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full hover:text-foreground cursor-pointer select-none"
                >
                  {showChannels ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Channels
                  <span className="ml-0.5 text-[10px]">
                    ({filteredChannels.length})
                  </span>
                  {canManageChannels && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateChannelOpen(true);
                      }}
                      title="Create channel"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {showChannels &&
                  filteredChannels.map((channel) => {
                    const isActive = channel.id === activeChannelId;
                    const unread = unreadCounts[channel.id] || 0;
                    // Check if current user has muted this channel
                    const isMuted = false; // TODO: track from channel_members

                    return (
                      <Tooltip key={channel.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleSelectChannel(channel.id)}
                            className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors ${
                              isActive
                                ? "bg-indigo-600/10 text-indigo-600 font-medium"
                                : isMuted
                                ? "text-muted-foreground/50 hover:bg-muted/50 hover:text-muted-foreground"
                                : unread > 0
                                ? "text-foreground font-semibold hover:bg-muted/50"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                          >
                            {channelIcon(channel.type)}
                            <span className="truncate flex-1 text-left">
                              {channel.display_name || channel.name}
                            </span>
                            {unread > 0 && !isMuted && (
                              <Badge className="h-5 min-w-[20px] px-1.5 bg-indigo-600 text-white text-[10px] font-bold">
                                {unread > 99 ? "99+" : unread}
                              </Badge>
                            )}
                          </button>
                        </TooltipTrigger>
                        {channel.description && (
                          <TooltipContent side="right" className="max-w-[200px]">
                            <p className="text-xs">{channel.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}

                {/* Archived channels toggle */}
                {showChannels && archivedChannels.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className="flex items-center gap-1.5 px-4 py-1.5 mt-1 text-xs text-muted-foreground hover:text-foreground w-full"
                    >
                      <Archive className="h-3 w-3" />
                      {showArchived ? "Hide" : "Show"} archived (
                      {archivedChannels.length})
                    </button>
                    {showArchived &&
                      archivedChannels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => handleSelectChannel(channel.id)}
                          className="w-full flex items-center gap-2 px-4 py-1.5 text-sm text-muted-foreground/50 hover:bg-muted/50 hover:text-muted-foreground line-through"
                        >
                          {channelIcon(channel.type)}
                          <span className="truncate flex-1 text-left">
                            {channel.display_name || channel.name}
                          </span>
                        </button>
                      ))}
                  </>
                )}
              </div>

              {/* ── Direct Messages Section ── */}
              <div className="mt-3">
                <div
                  onClick={() => setShowDMs(!showDMs)}
                  className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full hover:text-foreground cursor-pointer select-none"
                >
                  {showDMs ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Direct Messages
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 ml-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewDMOpen(true);
                    }}
                    title="New direct message"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {showDMs &&
                  filteredDMs.map((dm) => {
                    const other = dm.other_participants?.[0];
                    const otherUser = other?.users;
                    const otherUserId = other?.user_id;
                    const name =
                      otherUser?.full_name ||
                      otherUser?.email?.split("@")[0] ||
                      "Unknown";
                    const initials = otherUser?.full_name
                      ? otherUser.full_name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : name[0]?.toUpperCase() || "?";
                    const lastMsg = dm.last_message;
                    const isActive = dm.id === activeDMThreadId;
                    const online = otherUserId ? isOnline(otherUserId) : false;

                    // Unread count for DM
                    const myParticipation = (dm.direct_message_participants || []).find(
                      (p: any) => p.user_id === currentUserId
                    );
                    const lastReadAt = myParticipation?.last_read_at;
                    const hasUnread =
                      lastMsg &&
                      lastMsg.sender_id !== currentUserId &&
                      (!lastReadAt || new Date(lastMsg.created_at) > new Date(lastReadAt));

                    // Format timestamp
                    const lastMsgTime = lastMsg?.created_at;
                    let timeLabel = "";
                    if (lastMsgTime) {
                      const d = new Date(lastMsgTime);
                      const now = new Date();
                      const diffMs = now.getTime() - d.getTime();
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      if (diffDays === 0) {
                        timeLabel = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                      } else if (diffDays === 1) {
                        timeLabel = "Yesterday";
                      } else if (diffDays < 7) {
                        timeLabel = d.toLocaleDateString([], { weekday: "short" });
                      } else {
                        timeLabel = d.toLocaleDateString([], { month: "short", day: "numeric" });
                      }
                    }

                    // Truncate preview to 40 chars
                    const preview = lastMsg?.content
                      ? lastMsg.content.length > 40
                        ? lastMsg.content.slice(0, 40) + "..."
                        : lastMsg.content
                      : "";

                    return (
                      <button
                        key={dm.id}
                        onClick={() => handleSelectDM(dm.id)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                          isActive
                            ? "bg-indigo-600/10 text-indigo-600 font-medium"
                            : hasUnread
                            ? "text-foreground font-semibold hover:bg-muted/50"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        {/* Avatar with presence dot */}
                        <div className="relative flex-shrink-0">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                            <span className="text-[10px] font-medium text-white">
                              {initials}
                            </span>
                          </div>
                          {online && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[#F8F9FC]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-sm truncate flex-1">{name}</p>
                            {timeLabel && (
                              <span className={`text-[10px] flex-shrink-0 ${hasUnread ? "text-indigo-600 font-bold" : "text-muted-foreground"}`}>
                                {timeLabel}
                              </span>
                            )}
                          </div>
                          {preview && (
                            <div className="flex items-center gap-1">
                              <p className="text-[11px] text-muted-foreground truncate flex-1">
                                {lastMsg?.sender_id === currentUserId ? "You: " : ""}
                                {preview}
                              </p>
                              {hasUnread && (
                                <div className="h-2 w-2 rounded-full bg-indigo-600 flex-shrink-0" />
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}

                {showDMs && filteredDMs.length === 0 && !loading && (
                  <p className="px-4 py-2 text-xs text-muted-foreground">
                    No conversations yet
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Dialogs */}
        <CreateChannelDialog
          open={createChannelOpen}
          onOpenChange={setCreateChannelOpen}
          orgId={orgId}
          currentUserId={currentUserId}
          onChannelCreated={handleChannelCreated}
        />

        <NewDMDialog
          open={newDMOpen}
          onOpenChange={setNewDMOpen}
          orgId={orgId}
          currentUserId={currentUserId}
          onDMCreated={handleDMCreated}
        />
      </div>
    </TooltipProvider>
  );
}
