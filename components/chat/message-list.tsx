"use client";

import { useEffect, useRef, useCallback } from "react";
import { format, isSameDay } from "date-fns";
import { Loader2 } from "lucide-react";
import { MessageBubble } from "./message-bubble";

interface MessageData {
  id: string;
  channel_id: string;
  sender_id: string;
  parent_message_id: string | null;
  content: string;
  type?: string;
  message_type?: string; // backward compat
  reply_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  metadata?: any;
  users?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  message_attachments?: any[];
  message_reactions?: any[];
}

interface MessageListProps {
  messages: MessageData[];
  loading: boolean;
  hasMore: boolean;
  currentUserId: string;
  onLoadMore: () => void;
  onOpenThread: (messageId: string) => void;
  isThread?: boolean;
}

export function MessageList({
  messages,
  loading,
  hasMore,
  currentUserId,
  onLoadMore,
  onOpenThread,
  isThread = false,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(messages.length);
  const isAtBottom = useRef(true);

  // Track if user is at bottom of scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const threshold = 100;
    isAtBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    // Load more when scrolling to top
    if (el.scrollTop < 50 && hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // Auto-scroll to bottom on new messages (only if already at bottom)
  useEffect(() => {
    if (messages.length > prevMessageCount.current && isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
    }
  }, [loading]);

  // Group messages by date
  const groupedMessages: { date: Date; messages: MessageData[] }[] = [];
  messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && isSameDay(lastGroup.date, msgDate)) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: msgDate, messages: [msg] });
    }
  });

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
      onScroll={handleScroll}
    >
      {loading && messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <p className="text-sm font-medium text-navy-900">No messages yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Be the first to send a message in this channel!
          </p>
        </div>
      ) : (
        <div className="py-4">
          {/* Load more indicator */}
          {hasMore && (
            <div className="flex justify-center py-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <button
                  onClick={onLoadMore}
                  className="text-xs text-brand-blue hover:underline"
                >
                  Load older messages
                </button>
              )}
            </div>
          )}

          {groupedMessages.map((group, gi) => (
            <div key={gi}>
              {/* Date separator */}
              <div className="flex items-center gap-4 px-4 py-2 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-medium text-muted-foreground px-2">
                  {format(group.date, "EEEE, MMMM d, yyyy")}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {group.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  currentUserId={currentUserId}
                  onOpenThread={onOpenThread}
                  isThreadReply={isThread}
                />
              ))}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
