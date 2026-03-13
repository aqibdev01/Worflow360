"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Hash, Lock, Megaphone, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { getChannelMembers, updateLastRead } from "@/lib/communication/channels";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { supabase } from "@/lib/supabase";

export default function ChannelPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const channelId = params.channelId as string;
  const { user } = useAuth();
  const currentUserId = user?.id || "";

  const [channel, setChannel] = useState<any>(null);
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  const {
    messages,
    loading: messagesLoading,
    hasMore,
    loadMore,
  } = useRealtimeMessages(channelId);

  // Load channel info
  useEffect(() => {
    if (!channelId) return;
    async function loadChannel() {
      try {
        const { data } = await (supabase as any)
          .from("channels")
          .select("*")
          .eq("id", channelId)
          .single();
        setChannel(data);
      } catch (err) {
        console.error("Error loading channel:", err);
      }
    }
    loadChannel();
  }, [channelId]);

  // Load channel members
  useEffect(() => {
    if (!channelId) return;
    getChannelMembers(channelId)
      .then(setChannelMembers)
      .catch((err) => console.error("Error loading members:", err));
  }, [channelId]);

  // Mark as read on mount and on new messages
  useEffect(() => {
    if (!channelId || !currentUserId) return;
    updateLastRead(channelId, currentUserId).catch(() => {});
  }, [channelId, currentUserId, messages.length]);

  const handleOpenThread = useCallback((messageId: string) => {
    setThreadParentId(messageId);
    setShowMembers(false);
  }, []);

  const threadParentMessage = threadParentId
    ? messages.find((m) => m.id === threadParentId)
    : null;

  const memberSuggestions = channelMembers.map((m: any) => ({
    user_id: m.user_id,
    full_name: m.users?.full_name || null,
    email: m.users?.email || "",
  }));

  const channelIcon = () => {
    switch (channel?.type) {
      case "private":
        return <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
      case "announcement":
        return <Megaphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
      default:
        return <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    }
  };

  return (
    <>
      {/* Main message area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <div className="flex items-center gap-2 min-w-0">
            {channelIcon()}
            <h3 className="text-sm font-semibold text-navy-900 truncate">
              {channel?.display_name || channel?.name || "Loading..."}
            </h3>
            {channel?.description && (
              <span className="text-xs text-muted-foreground truncate hidden md:block">
                — {channel.description}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                setShowMembers(!showMembers);
                setThreadParentId(null);
              }}
            >
              <Users className="h-3.5 w-3.5" />
              {channelMembers.length}
            </Button>
          </div>
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          loading={messagesLoading}
          hasMore={hasMore}
          currentUserId={currentUserId}
          onLoadMore={loadMore}
          onOpenThread={handleOpenThread}
        />

        {/* Input */}
        <MessageInput
          channelId={channelId}
          currentUserId={currentUserId}
          channelMembers={memberSuggestions}
          placeholder={`Message #${channel?.name || "channel"}`}
          onMessageSent={() => {
            updateLastRead(channelId, currentUserId).catch(() => {});
          }}
        />
      </div>

      {/* Thread panel — 280px right panel */}
      {threadParentMessage && (
        <ThreadPanel
          parentMessage={threadParentMessage}
          currentUserId={currentUserId}
          channelMembers={channelMembers}
          onClose={() => setThreadParentId(null)}
        />
      )}

      {/* Members panel — 280px right panel */}
      {showMembers && (
        <div className="w-[280px] border-l bg-white flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-navy-900">Members</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {channelMembers.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowMembers(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {channelMembers.map((member: any) => {
              const name =
                member.users?.full_name ||
                member.users?.email?.split("@")[0] ||
                "Unknown";
              const initials = member.users?.full_name
                ? member.users.full_name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : name[0]?.toUpperCase() || "?";

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5 px-4 py-1.5"
                >
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-white">
                      {initials}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-navy-900 truncate">{name}</p>
                    {member.role === "admin" && (
                      <p className="text-[10px] text-brand-purple font-medium">
                        Admin
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
