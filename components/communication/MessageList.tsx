"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  format,
  isToday,
  isYesterday,
  isSameDay,
  differenceInMinutes,
} from "date-fns";
import {
  Loader2,
  MessageSquare,
  Pencil,
  Trash2,
  SmilePlus,
  Copy,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { editMessage, deleteMessage, toggleReaction } from "@/lib/communication/messages";
import { MessageReactions, ReactionPicker } from "./MessageReactions";
import { TaskRefCard } from "./TaskRefCard";
import { FileMessageCard } from "./FileMessageCard";
import { toast } from "sonner";

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

interface CommunicationMessageListProps {
  messages: MessageData[];
  loading: boolean;
  hasMore: boolean;
  currentUserId: string;
  onLoadMore: () => void;
  onOpenThread: (messageId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateDivider(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d");
}

function formatTime(dateStr: string): string {
  return format(new Date(dateStr), "h:mm a");
}

/** Render markdown-lite: **bold**, *italic*, `code`, ```code blocks```, and @mentions */
function renderContent(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split code blocks first
  const codeBlockRegex = /```([\s\S]*?)```/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(...renderInline(content.slice(lastIdx, match.index), nodes.length));
    }
    nodes.push(
      <pre
        key={`cb-${nodes.length}`}
        className="bg-muted rounded-md px-3 py-2 text-xs font-mono my-1 overflow-x-auto whitespace-pre-wrap"
      >
        {match[1].trim()}
      </pre>
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < content.length) {
    nodes.push(...renderInline(content.slice(lastIdx), nodes.length));
  }

  return nodes;
}

function renderInline(text: string, keyOffset: number): React.ReactNode[] {
  // Process inline patterns: `code`, **bold**, *italic*, @mentions
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|@\[([^\]]+)\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyOffset}-${idx++}`;

    if (token.startsWith("`")) {
      parts.push(
        <code key={key} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      parts.push(
        <strong key={key} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={key}>{token.slice(1, -1)}</em>
      );
    } else if (token.startsWith("@[")) {
      const name = match[2];
      parts.push(
        <span
          key={key}
          className="bg-indigo-600/10 text-indigo-600 px-1 rounded font-medium"
        >
          @{name}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function MessageRow({
  message,
  compact,
  currentUserId,
  onOpenThread,
}: {
  message: MessageData;
  compact: boolean;
  currentUserId: string;
  onOpenThread: (id: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwn = message.sender_id === currentUserId;

  // System messages
  if (message.type === "system") {
    return (
      <div className="flex justify-center py-2 px-4">
        <span className="text-xs text-muted-foreground italic bg-muted/30 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  // Deleted messages
  if (message.is_deleted) {
    return (
      <div className={`flex items-start gap-3 px-4 ${compact ? "py-0.5" : "py-1.5"} opacity-50`}>
        {compact ? (
          <div className="w-8 flex-shrink-0" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-xs font-medium text-muted-foreground">
              {getUserInitials(message.users)}
            </span>
          </div>
        )}
        <span className="text-sm text-muted-foreground italic">
          This message was deleted
        </span>
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

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success("Copied to clipboard");
  };

  return (
    <div
      className="group relative flex items-start gap-3 px-4 hover:bg-muted/30 transition-colors"
      style={{ paddingTop: compact ? 1 : 6, paddingBottom: compact ? 1 : 6 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
    >
      {/* Avatar or time gutter */}
      {compact ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-8 flex-shrink-0 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-muted-foreground leading-5">
                  {formatTime(message.created_at)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {format(new Date(message.created_at), "PPpp")}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-medium text-white">
            {getUserInitials(message.users)}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!compact && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">
              {getDisplayName(message.users)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.created_at)}
            </span>
            {message.is_edited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
        )}

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
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditContent(message.content);
                }
              }}
            />
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={handleEdit} className="h-7 text-xs">
                <Check className="h-3 w-3 mr-1" /> Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.content);
                }}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : message.type === "task_ref" && message.metadata ? (
          /* Task reference card */
          <TaskRefCard metadata={message.metadata as any} />
        ) : message.type === "file" && message.metadata ? (
          /* File message card */
          <FileMessageCard metadata={message.metadata as any} />
        ) : (
          <div className="text-sm text-foreground whitespace-pre-wrap break-words">
            {renderContent(message.content)}
            {compact && message.is_edited && (
              <span className="text-xs text-muted-foreground ml-1">(edited)</span>
            )}
          </div>
        )}

        {/* Legacy file attachment from metadata (text messages with attached files) */}
        {message.type !== "file" && message.type !== "task_ref" && message.metadata?.url && (
          <FileMessageCard metadata={message.metadata as any} />
        )}

        {/* Reactions */}
        <MessageReactions
          messageId={message.id}
          reactions={message.message_reactions || []}
          currentUserId={currentUserId}
        />

        {/* Thread summary footer */}
        {message.reply_count > 0 && (
          <button
            onClick={() => onOpenThread(message.id)}
            className="flex items-center gap-2 mt-1.5 py-1 text-xs text-indigo-600 hover:bg-indigo-600/5 rounded px-1.5 -ml-1.5 transition-colors group"
          >
            <MessageSquare className="h-3 w-3" />
            <span className="font-medium">
              {message.reply_count}{" "}
              {message.reply_count === 1 ? "reply" : "replies"}
            </span>
            <span className="text-muted-foreground group-hover:text-indigo-600/70">
              View thread
            </span>
          </button>
        )}
      </div>

      {/* Hover action toolbar */}
      {showActions && !isEditing && (
        <div className="absolute right-4 -top-3 flex items-center gap-0.5 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-lg shadow-sm px-1 py-0.5 z-10">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            title="Add reaction"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onOpenThread(message.id)}
            title="Reply in thread"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          {isOwn && (
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
          )}
          {isOwn && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleCopy}
            title="Copy text"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Reaction picker popover */}
      {showReactionPicker && (
        <div className="absolute right-4 top-5 z-20">
          <ReactionPicker
            messageId={message.id}
            onClose={() => setShowReactionPicker(false)}
          />
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleDelete();
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CommunicationMessageList({
  messages,
  loading,
  hasMore,
  currentUserId,
  onLoadMore,
  onOpenThread,
}: CommunicationMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(messages.length);
  const isAtBottom = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const threshold = 100;
    isAtBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

    if (el.scrollTop < 50 && hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  // Auto-scroll on new messages if at bottom
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Group messages by date, then mark compact (same sender within 5 min)
  const dateGroups: { date: Date; items: { message: MessageData; compact: boolean }[] }[] = [];

  messages.forEach((msg, i) => {
    const msgDate = new Date(msg.created_at);
    const lastGroup = dateGroups[dateGroups.length - 1];

    // Determine if compact (same sender, within 5 min, not system, not first in day)
    let compact = false;
    if (i > 0) {
      const prev = messages[i - 1];
      const prevDate = new Date(prev.created_at);
      if (
        isSameDay(prevDate, msgDate) &&
        prev.sender_id === msg.sender_id &&
        msg.type !== "system" &&
        prev.type !== "system" &&
        !msg.is_deleted &&
        !prev.is_deleted &&
        differenceInMinutes(msgDate, prevDate) < 5
      ) {
        compact = true;
      }
    }

    if (lastGroup && isSameDay(lastGroup.date, msgDate)) {
      lastGroup.items.push({ message: msg, compact });
    } else {
      dateGroups.push({ date: msgDate, items: [{ message: msg, compact: false }] });
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
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No messages yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Be the first to send a message!
          </p>
        </div>
      ) : (
        <div className="py-4">
          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <button
                  onClick={onLoadMore}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Load older messages
                </button>
              )}
            </div>
          )}

          {dateGroups.map((group, gi) => (
            <div key={gi}>
              {/* Date divider */}
              <div className="flex items-center gap-4 px-4 py-2 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] font-semibold text-muted-foreground px-2 bg-white dark:bg-slate-950">
                  {formatDateDivider(group.date)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {group.items.map(({ message, compact }) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  compact={compact}
                  currentUserId={currentUserId}
                  onOpenThread={onOpenThread}
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
