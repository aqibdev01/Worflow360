"use client";

import { useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  MessageSquare,
  Pencil,
  Trash2,
  SmilePlus,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { editMessage, deleteMessage, addReaction, removeReaction } from "@/lib/chat-database";
import { toast } from "sonner";

interface MessageBubbleProps {
  message: {
    id: string;
    sender_id: string;
    content: string;
    message_type: string;
    reply_count: number;
    is_edited: boolean;
    is_deleted: boolean;
    created_at: string;
    users?: {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
    message_attachments?: any[];
    message_reactions?: any[];
  };
  currentUserId: string;
  onOpenThread?: (messageId: string) => void;
  isThreadReply?: boolean;
}

const QUICK_REACTIONS = ["👍", "❤️", "😄", "🎉", "👀", "🚀"];

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  return format(date, "MMM d, h:mm a");
}

function parseContent(content: string): React.ReactNode[] {
  // Parse @[Name](userId) mentions
  const parts: React.ReactNode[] = [];
  const regex = /@\[([^\]]+)\]\([^)]+\)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <span
        key={match.index}
        className="bg-brand-blue/10 text-brand-blue px-1 rounded font-medium"
      >
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
}

export function MessageBubble({
  message,
  currentUserId,
  onOpenThread,
  isThreadReply = false,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showReactions, setShowReactions] = useState(false);

  const isOwnMessage = message.sender_id === currentUserId;
  const sender = message.users;
  const initials = sender?.full_name
    ? sender.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : sender?.email?.charAt(0)?.toUpperCase() || "?";

  const displayName =
    sender?.full_name || sender?.email?.split("@")[0] || "Unknown";

  if (message.is_deleted) {
    return (
      <div className="flex items-start gap-3 px-4 py-2 opacity-50">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium text-muted-foreground">{initials}</span>
        </div>
        <div>
          <span className="text-sm text-muted-foreground italic">
            This message was deleted
          </span>
        </div>
      </div>
    );
  }

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }
    try {
      await editMessage(message.id, editContent.trim());
      setIsEditing(false);
    } catch {
      toast.error("Failed to edit message");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMessage(message.id);
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const handleReaction = async (emoji: string) => {
    try {
      const existing = message.message_reactions?.find(
        (r: any) => r.user_id === currentUserId && r.emoji === emoji
      );
      if (existing) {
        await removeReaction(message.id, currentUserId, emoji);
      } else {
        await addReaction(message.id, currentUserId, emoji);
      }
      setShowReactions(false);
    } catch {
      toast.error("Failed to update reaction");
    }
  };

  // Group reactions by emoji
  const reactionGroups: Record<string, { count: number; hasOwn: boolean }> = {};
  message.message_reactions?.forEach((r: any) => {
    if (!reactionGroups[r.emoji]) {
      reactionGroups[r.emoji] = { count: 0, hasOwn: false };
    }
    reactionGroups[r.emoji].count++;
    if (r.user_id === currentUserId) reactionGroups[r.emoji].hasOwn = true;
  });

  return (
    <div
      className="group flex items-start gap-3 px-4 py-1.5 hover:bg-muted/30 relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      {/* Avatar */}
      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs font-medium text-white">{initials}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-navy-900">
            {displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatMessageTime(message.created_at)}
          </span>
          {message.is_edited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[60px] text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleEdit();
                }
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={handleEdit}>
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.content);
                }}
              >
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {parseContent(message.content)}
          </p>
        )}

        {/* Attachments */}
        {message.message_attachments && message.message_attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.message_attachments.map((att: any) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border text-sm"
              >
                <span className="truncate max-w-[200px]">{att.file_name}</span>
                <span className="text-xs text-muted-foreground">
                  {(att.file_size / 1024).toFixed(0)}KB
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactionGroups).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  data.hasOwn
                    ? "bg-brand-blue/10 border-brand-blue/30 text-brand-blue"
                    : "bg-muted/50 border-border hover:bg-muted"
                }`}
              >
                <span>{emoji}</span>
                <span>{data.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread reply count */}
        {!isThreadReply && message.reply_count > 0 && (
          <button
            onClick={() => onOpenThread?.(message.id)}
            className="flex items-center gap-1.5 mt-1 text-xs text-brand-blue hover:underline"
          >
            <MessageSquare className="h-3 w-3" />
            {message.reply_count} {message.reply_count === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* Hover actions */}
      {showActions && !isEditing && (
        <div className="absolute right-4 -top-3 flex items-center gap-0.5 bg-white border rounded-lg shadow-sm px-1 py-0.5 z-10">
          {!isThreadReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onOpenThread?.(message.id)}
              title="Reply in thread"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowReactions(!showReactions)}
            title="Add reaction"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </Button>
          {isOwnMessage && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setIsEditing(true);
                  setEditContent(message.content);
                }}
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={handleDelete}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Quick reaction picker */}
      {showReactions && (
        <div className="absolute right-4 top-5 flex items-center gap-1 bg-white border rounded-lg shadow-lg px-2 py-1.5 z-20">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="hover:scale-125 transition-transform text-base px-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
