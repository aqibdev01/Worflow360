"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { useThreadReplies } from "@/hooks/useRealtimeMessages";
import { supabase } from "@/lib/supabase";

interface ThreadPanelProps {
  parentMessage: {
    id: string;
    channel_id: string;
    sender_id: string;
    content: string;
    message_type: string;
    reply_count: number;
    is_edited: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    users?: any;
    message_attachments?: any[];
    message_reactions?: any[];
  };
  currentUserId: string;
  channelMembers?: any[];
  onClose: () => void;
}

export function ThreadPanel({
  parentMessage,
  currentUserId,
  channelMembers = [],
  onClose,
}: ThreadPanelProps) {
  const { replies, loading, refreshReplies } = useThreadReplies(
    parentMessage.id
  );

  // Subscribe to new replies in this thread
  useEffect(() => {
    const channel = supabase
      .channel(`thread:${parentMessage.id}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `parent_message_id=eq.${parentMessage.id}`,
        },
        () => {
          refreshReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentMessage.id, refreshReplies]);

  const memberSuggestions = channelMembers.map((m: any) => ({
    user_id: m.user_id,
    full_name: m.users?.full_name || null,
    email: m.users?.email || "",
  }));

  return (
    <div className="w-[350px] border-l bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h3 className="text-sm font-semibold text-navy-900">Thread</h3>
          <p className="text-xs text-muted-foreground">
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
      <div className="border-b py-2">
        <MessageBubble
          message={parentMessage}
          currentUserId={currentUserId}
          isThreadReply={true}
        />
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
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
            <MessageBubble
              key={reply.id}
              message={reply}
              currentUserId={currentUserId}
              isThreadReply={true}
            />
          ))
        )}
      </div>

      {/* Reply input */}
      <MessageInput
        channelId={parentMessage.channel_id}
        currentUserId={currentUserId}
        parentMessageId={parentMessage.id}
        channelMembers={memberSuggestions}
        placeholder="Reply in thread..."
        onMessageSent={refreshReplies}
      />
    </div>
  );
}
