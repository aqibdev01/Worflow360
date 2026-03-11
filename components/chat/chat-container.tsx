"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Hash, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelSidebar } from "./channel-sidebar";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { ThreadPanel } from "./thread-panel";
import { ChannelCreateDialog } from "./channel-create-dialog";
import { useChannels } from "@/hooks/useChannels";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { getChannelMembers, updateLastRead } from "@/lib/chat-database";

interface ChatContainerProps {
  scope: "org" | "project";
  scopeId: string;
  currentUserId: string;
  canManageChannels: boolean;
}

export function ChatContainer({
  scope,
  scopeId,
  currentUserId,
  canManageChannels,
}: ChatContainerProps) {
  const {
    channels,
    selectedChannelId,
    setSelectedChannelId,
    unreadCounts,
    setUnreadCounts,
    loading: channelsLoading,
    refreshChannels,
  } = useChannels(scope, scopeId, currentUserId);

  const {
    messages,
    loading: messagesLoading,
    hasMore,
    loadMore,
  } = useRealtimeMessages(selectedChannelId);

  const [channelMembers, setChannelMembers] = useState<any[]>([]);
  const [threadParentId, setThreadParentId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  // Load channel members when channel changes
  useEffect(() => {
    if (!selectedChannelId) return;

    async function loadMembers() {
      try {
        const members = await getChannelMembers(selectedChannelId!);
        setChannelMembers(members);
      } catch (error) {
        console.error("Error loading channel members:", error);
      }
    }

    loadMembers();
  }, [selectedChannelId]);

  // Mark channel as read when selecting it
  useEffect(() => {
    if (!selectedChannelId || !currentUserId) return;

    updateLastRead(selectedChannelId, currentUserId).catch(() => {});
    setUnreadCounts((prev) => ({ ...prev, [selectedChannelId]: 0 }));
  }, [selectedChannelId, currentUserId, setUnreadCounts]);

  const handleSelectChannel = useCallback(
    (channelId: string) => {
      setSelectedChannelId(channelId);
      setThreadParentId(null);
      setShowMembersPanel(false);
    },
    [setSelectedChannelId]
  );

  const handleOpenThread = useCallback((messageId: string) => {
    setThreadParentId(messageId);
    setShowMembersPanel(false);
  }, []);

  const threadParentMessage = threadParentId
    ? messages.find((m) => m.id === threadParentId)
    : null;

  const memberSuggestions = channelMembers.map((m: any) => ({
    user_id: m.user_id,
    full_name: m.users?.full_name || null,
    email: m.users?.email || "",
  }));

  return (
    <div className="flex h-[600px] bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Channel sidebar */}
      <ChannelSidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        unreadCounts={unreadCounts}
        onSelectChannel={handleSelectChannel}
        onCreateChannel={() => setCreateDialogOpen(true)}
        canCreateChannel={canManageChannels}
        scope={scope}
      />

      {/* Main message area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChannel ? (
          <>
            {/* Channel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <h3 className="text-sm font-semibold text-navy-900 truncate">
                  {selectedChannel.name}
                </h3>
                {selectedChannel.description && (
                  <span className="text-xs text-muted-foreground truncate hidden md:block">
                    — {selectedChannel.description}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => {
                    setShowMembersPanel(!showMembersPanel);
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
              channelId={selectedChannelId!}
              currentUserId={currentUserId}
              channelMembers={memberSuggestions}
              placeholder={`Message #${selectedChannel.name}`}
              onMessageSent={() => {
                updateLastRead(selectedChannelId!, currentUserId).catch(
                  () => {}
                );
              }}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center px-4">
            <div>
              <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Hash className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-navy-900">
                {channelsLoading ? "Loading channels..." : "Select a channel"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a channel from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Thread panel */}
      {threadParentMessage && (
        <ThreadPanel
          parentMessage={threadParentMessage}
          currentUserId={currentUserId}
          channelMembers={channelMembers}
          onClose={() => setThreadParentId(null)}
        />
      )}

      {/* Members panel */}
      {showMembersPanel && (
        <div className="w-[250px] border-l bg-white flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-navy-900">Members</h3>
            <span className="text-xs text-muted-foreground">
              {channelMembers.length}
            </span>
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

      {/* Create channel dialog */}
      <ChannelCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        scope={scope}
        scopeId={scopeId}
        currentUserId={currentUserId}
        onChannelCreated={refreshChannels}
      />
    </div>
  );
}
