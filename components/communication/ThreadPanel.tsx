"use client";

import { useEffect, useRef } from "react";
import { X, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThreadMessages } from "@/hooks/useChannelMessages";
import { CommunicationMessageInput } from "./MessageInput";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MessageUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface MessageData {
  id: string;
  channel_id: string;
  sender_id: string;
  parent_message_id: string | null;
  content: string;
  type: string;
  metadata: Record<string, any> | null;
  reply_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  users?: MessageUser | null;
  message_reactions?: any[];
}

interface ThreadPanelProps {
  parentMessage: MessageData;
  currentUserId: string;
  channelMembers?: any[];
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserInitials(user?: MessageUser | null): string {
  if (user?.full_name) {
    return user.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return user?.email?.charAt(0)?.toUpperCase() || "?";
}

function getDisplayName(user?: MessageUser | null): string {
  return user?.full_name || user?.email?.split("@")[0] || "Unknown";
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ─── Thread Reply Row ────────────────────────────────────────────────────────

function ThreadReply({
  message,
  currentUserId,
}: {
  message: MessageData;
  currentUserId: string;
}) {
  if (message.is_deleted) {
    return (
      <div className="flex items-start gap-2.5 px-4 py-1.5 opacity-50">
        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-medium text-muted-foreground">
            {getUserInitials(message.users)}
          </span>
        </div>
        <span className="text-sm text-muted-foreground italic">
          This message was deleted
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 px-4 py-1.5 hover:bg-muted/30 transition-colors">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[10px] font-medium text-white">
          {getUserInitials(message.users)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-foreground">
            {getDisplayName(message.users)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.created_at)}
          </span>
          {message.is_edited && (
            <span className="text-[10px] text-muted-foreground">(edited)</span>
          )}
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CommunicationThreadPanel({
  parentMessage,
  currentUserId,
  channelMembers = [],
  onClose,
}: ThreadPanelProps) {
  const { messages: replies, isLoading } = useThreadMessages(parentMessage.id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevReplyCount = useRef(replies.length);

  // Auto-scroll when new replies arrive
  useEffect(() => {
    if (replies.length > prevReplyCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevReplyCount.current = replies.length;
  }, [replies.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && replies.length > 0) {
      bottomRef.current?.scrollIntoView();
    }
  }, [isLoading, replies.length]);

  const memberSuggestions = channelMembers.map((m: any) => ({
    user_id: m.user_id,
    full_name: m.users?.full_name || null,
    email: m.users?.email || "",
  }));

  return (
    <div className="w-[350px] border-l bg-white dark:bg-slate-950 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Thread
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {parentMessage.reply_count}{" "}
            {parentMessage.reply_count === 1 ? "reply" : "replies"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent message */}
      <div className="border-b px-4 py-3 bg-muted/10">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-white">
              {getUserInitials(parentMessage.users)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">
                {getDisplayName(parentMessage.users)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTime(parentMessage.created_at)}
              </span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-0.5">
              {parentMessage.content}
            </p>
          </div>
        </div>
      </div>

      {/* Replies divider */}
      {replies.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-semibold text-muted-foreground">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Replies list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-muted-foreground">
              No replies yet. Start the conversation!
            </p>
          </div>
        ) : (
          replies.map((reply) => (
            <ThreadReply
              key={reply.id}
              message={reply}
              currentUserId={currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <CommunicationMessageInput
        channelId={parentMessage.channel_id}
        currentUserId={currentUserId}
        parentMessageId={parentMessage.id}
        channelMembers={memberSuggestions}
        placeholder="Reply in thread..."
      />
    </div>
  );
}
