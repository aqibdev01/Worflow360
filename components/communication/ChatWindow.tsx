"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Hash, Lock, Megaphone, Users, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChannelMessages } from "@/hooks/useChannelMessages";
import { getChannelMembers, updateLastRead } from "@/lib/communication/channels";
import { CommunicationMessageList } from "./MessageList";
import { CommunicationMessageInput } from "./MessageInput";
import { CommunicationThreadPanel } from "./ThreadPanel";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatWindowProps {
  channelId: string;
  currentUserId: string;
  orgId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatWindow({ channelId, currentUserId, orgId }: ChatWindowProps) {
  const [channel, setChannel] = useState<any>(null);
  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageLenRef = useRef(0);

  const {
    messages,
    isLoading,
    hasMore,
    loadMore,
  } = useChannelMessages(channelId);

  // ─── Load channel info ─────────────────────────────────────────────────

  useEffect(() => {
    if (!channelId) return;
    async function load() {
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
    load();
  }, [channelId]);

  // ─── Load members ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!channelId) return;
    getChannelMembers(channelId)
      .then(setChannelMembers)
      .catch((err) => console.error("Error loading members:", err));
  }, [channelId]);

  // ─── Mark as read ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!channelId || !currentUserId) return;
    updateLastRead(channelId, currentUserId).catch(() => {});
  }, [channelId, currentUserId, messages.length]);

  // Also mark as read when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (channelId && currentUserId) {
        updateLastRead(channelId, currentUserId).catch(() => {});
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [channelId, currentUserId]);

  // ─── "New messages" pill logic ──────────────────────────────────────────

  useEffect(() => {
    if (messages.length > prevMessageLenRef.current && prevMessageLenRef.current > 0) {
      // Check if user is scrolled up
      const container = scrollContainerRef.current;
      if (container) {
        const isAtBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (!isAtBottom) {
          setShowNewMessagePill(true);
        }
      }
    }
    prevMessageLenRef.current = messages.length;
  }, [messages.length]);

  const scrollToBottom = () => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
    setShowNewMessagePill(false);
  };

  // ─── Thread handling ───────────────────────────────────────────────────

  const handleOpenThread = useCallback((messageId: string) => {
    setThreadParentId(messageId);
    setShowMembers(false);
  }, []);

  const threadParentMessage = threadParentId
    ? messages.find((m) => m.id === threadParentId)
    : null;

  // ─── Member suggestions for @mentions ──────────────────────────────────

  const memberSuggestions = channelMembers.map((m: any) => ({
    user_id: m.user_id,
    full_name: m.users?.full_name || null,
    email: m.users?.email || "",
  }));

  // ─── Channel icon ──────────────────────────────────────────────────────

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

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* Main message area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
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
        <div ref={scrollContainerRef} className="flex-1 flex flex-col min-h-0">
          <CommunicationMessageList
            messages={messages}
            loading={isLoading}
            hasMore={hasMore}
            currentUserId={currentUserId}
            onLoadMore={loadMore}
            onOpenThread={handleOpenThread}
          />
        </div>

        {/* "New messages" pill */}
        {showNewMessagePill && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={scrollToBottom}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-blue text-white text-xs font-medium rounded-full shadow-lg hover:bg-brand-blue/90 transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              New messages
            </button>
          </div>
        )}

        {/* Input */}
        <CommunicationMessageInput
          channelId={channelId}
          currentUserId={currentUserId}
          channelMembers={memberSuggestions}
          orgId={orgId}
          placeholder={`Message #${channel?.name || "channel"}`}
          onMessageSent={() => {
            updateLastRead(channelId, currentUserId).catch(() => {});
            setShowNewMessagePill(false);
          }}
        />
      </div>

      {/* Thread panel — right panel */}
      {threadParentMessage && (
        <CommunicationThreadPanel
          parentMessage={threadParentMessage}
          currentUserId={currentUserId}
          channelMembers={channelMembers}
          onClose={() => setThreadParentId(null)}
        />
      )}

      {/* Members panel — right panel */}
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
