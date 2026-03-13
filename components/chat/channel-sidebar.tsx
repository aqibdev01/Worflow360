"use client";

import { useState } from "react";
import { Hash, Lock, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChannelData {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  type: string;
  is_archived: boolean;
  channel_members?: { count: number }[];
}

interface ChannelSidebarProps {
  channels: ChannelData[];
  selectedChannelId: string | null;
  unreadCounts: Record<string, number>;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel?: () => void;
  canCreateChannel: boolean;
  scope: "org" | "project";
}

export function ChannelSidebar({
  channels,
  selectedChannelId,
  unreadCounts,
  onSelectChannel,
  onCreateChannel,
  canCreateChannel,
  scope,
}: ChannelSidebarProps) {
  const [showChannels, setShowChannels] = useState(true);

  // Default channels are named "general", custom are everything else
  const defaultChannels = channels.filter((c) => c.name === "general");
  const customChannels = channels.filter((c) => c.name !== "general");

  return (
    <div className="w-60 border-r bg-[#F8F9FC] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold text-navy-900">Channels</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {channels.length} {channels.length === 1 ? "channel" : "channels"}
        </p>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Default channels */}
        {defaultChannels.map((channel) => (
          <ChannelItem
            key={channel.id}
            channel={channel}
            isSelected={channel.id === selectedChannelId}
            unreadCount={unreadCounts[channel.id] || 0}
            onClick={() => onSelectChannel(channel.id)}
          />
        ))}

        {/* Custom channels section */}
        {(customChannels.length > 0 || canCreateChannel) && (
          <div className="mt-2">
            <button
              onClick={() => setShowChannels(!showChannels)}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full hover:text-navy-900"
            >
              {showChannels ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Channels
              {canCreateChannel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 ml-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateChannel?.();
                  }}
                  title="Create channel"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </button>

            {showChannels &&
              customChannels.map((channel) => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isSelected={channel.id === selectedChannelId}
                  unreadCount={unreadCounts[channel.id] || 0}
                  onClick={() => onSelectChannel(channel.id)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelItem({
  channel,
  isSelected,
  unreadCount,
  onClick,
}: {
  channel: ChannelData;
  isSelected: boolean;
  unreadCount: number;
  onClick: () => void;
}) {
  const isPrivate = channel.type === "private";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors ${
        isSelected
          ? "bg-brand-blue/10 text-brand-blue font-medium"
          : unreadCount > 0
          ? "text-navy-900 font-semibold hover:bg-muted/50"
          : "text-muted-foreground hover:bg-muted/50 hover:text-navy-900"
      }`}
    >
      {isPrivate ? (
        <Lock className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <Hash className="h-3.5 w-3.5 flex-shrink-0" />
      )}
      <span className="truncate flex-1 text-left">{channel.display_name || channel.name}</span>
      {unreadCount > 0 && (
        <Badge className="h-5 min-w-[20px] px-1.5 bg-brand-blue text-white text-[10px] font-bold">
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </button>
  );
}
