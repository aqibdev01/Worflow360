"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Loader2, Trash2, Pencil, Check, X } from "lucide-react";
import { useDMMessages, DMMessageData } from "@/hooks/useDMMessages";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/lib/supabase";
import { editDMMessage, deleteDMMessage } from "@/lib/communication/dm";
import { FileMessageCard } from "./FileMessageCard";
import { TaskRefCard } from "./TaskRefCard";
import { DMMessageInput } from "./DMMessageInput";
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
import { isSameDay, format, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OtherUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface DMWindowProps {
  threadId: string;
  currentUserId: string;
  orgId: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserInitials(user?: OtherUser | null): string {
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

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMMM d, yyyy");
}

function renderMarkdownLite(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Simple markdown: **bold**, *italic*, `code`, @mentions
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|@\[([^\]]+)\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;
  let idx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(<strong key={idx++}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={idx++}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={idx++} className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
          {match[4]}
        </code>
      );
    } else if (match[5]) {
      parts.push(
        <span key={idx++} className="text-brand-blue font-medium">
          @{match[5]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// ─── Message Row ─────────────────────────────────────────────────────────────

function DMMessageRow({
  message,
  currentUserId,
  showHeader,
  onDeleted,
}: {
  message: DMMessageData;
  currentUserId: string;
  showHeader: boolean;
  onDeleted?: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const isOwn = message.sender_id === currentUserId;

  const handleDelete = async () => {
    try {
      await deleteDMMessage(message.id);
      setShowDeleteConfirm(false);
      onDeleted?.();
    } catch {
      toast.error("Failed to delete message");
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }
    try {
      await editDMMessage(message.id, editContent.trim());
      setIsEditing(false);
      onDeleted?.();
    } catch {
      toast.error("Failed to edit message");
    }
  };

  if (message.is_deleted) {
    return (
      <div className="flex items-start gap-2.5 px-4 py-1 opacity-50">
        {showHeader ? (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[10px] font-medium text-muted-foreground">
              {getUserInitials(message.users)}
            </span>
          </div>
        ) : (
          <div className="w-8 flex-shrink-0" />
        )}
        <span className="text-sm text-muted-foreground italic">
          This message was deleted
        </span>
      </div>
    );
  }

  const displayName =
    message.users?.full_name || message.users?.email?.split("@")[0] || "Unknown";

  // Task ref message
  if (message.type === "task_ref" && message.metadata) {
    return (
      <div className="px-4 py-1">
        <div className="flex items-start gap-2.5">
          {showHeader ? (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-white">
                {getUserInitials(message.users)}
              </span>
            </div>
          ) : (
            <div className="w-8 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {showHeader && (
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-sm font-semibold text-navy-900">
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(message.created_at)}
                </span>
              </div>
            )}
            <TaskRefCard metadata={message.metadata as any} />
          </div>
        </div>
      </div>
    );
  }

  // File message
  if (message.type === "file" && message.metadata) {
    return (
      <div className="px-4 py-1">
        <div className="flex items-start gap-2.5">
          {showHeader ? (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-medium text-white">
                {getUserInitials(message.users)}
              </span>
            </div>
          ) : (
            <div className="w-8 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {showHeader && (
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-sm font-semibold text-navy-900">
                  {displayName}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(message.created_at)}
                </span>
              </div>
            )}
            <FileMessageCard metadata={message.metadata as any} />
          </div>
        </div>
      </div>
    );
  }

  // Regular text message
  return (
    <div className="group relative flex items-start gap-2.5 px-4 py-1 hover:bg-muted/30 transition-colors">
      {showHeader ? (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-medium text-white">
            {getUserInitials(message.users)}
          </span>
        </div>
      ) : (
        <div className="w-8 flex-shrink-0 flex items-center justify-center">
          <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.created_at)}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-navy-900">
              {displayName}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatTime(message.created_at)}
            </span>
          </div>
        )}
        {isEditing ? (
          <div className="space-y-2 mt-1">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[60px] text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                if (e.key === "Escape") { setIsEditing(false); setEditContent(message.content); }
              }}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-7 gap-1" onClick={handleEdit}>
                <Check className="h-3 w-3" /> Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => { setIsEditing(false); setEditContent(message.content); }}>
                <X className="h-3 w-3" /> Cancel
              </Button>
              <span className="text-xs text-muted-foreground">Enter to save, Esc to cancel</span>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {renderMarkdownLite(message.content)}
            </p>
            {(message as any).edited_at && (
              <span className="text-[10px] text-muted-foreground">(edited)</span>
            )}
          </>
        )}
        {/* Legacy file attachments */}
        {message.type === "text" && message.metadata?.url && (
          <FileMessageCard metadata={message.metadata as any} />
        )}
      </div>

      {/* Action buttons */}
      {!isEditing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {isOwn && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => { setIsEditing(true); setEditContent(message.content); }}
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
        </div>
      )}

      {/* Delete confirmation */}
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
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DMWindow({ threadId, currentUserId, orgId }: DMWindowProps) {
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageLenRef = useRef(0);

  const { messages, isLoading, hasMore, loadMore, markRead } =
    useDMMessages(threadId);

  const { isOnline } = usePresence(currentUserId, orgId);

  // Load other participant's info
  useEffect(() => {
    if (!threadId || !currentUserId) return;
    async function loadParticipant() {
      try {
        const { data } = await (supabase as any)
          .from("direct_message_participants")
          .select("user_id, users(id, email, full_name, avatar_url)")
          .eq("thread_id", threadId)
          .neq("user_id", currentUserId)
          .single();
        setOtherUser(data?.users || null);
      } catch (err) {
        console.error("Error loading DM participant:", err);
      }
    }
    loadParticipant();
  }, [threadId, currentUserId]);

  // Mark as read on mount and new messages
  useEffect(() => {
    markRead().catch(() => {});
  }, [markRead, messages.length]);

  // Mark as read on window focus
  useEffect(() => {
    const handleFocus = () => markRead().catch(() => {});
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [markRead]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessageLenRef.current && prevMessageLenRef.current > 0) {
      const container = scrollContainerRef.current;
      if (container) {
        const isAtBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (isAtBottom) {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        } else {
          setShowNewMessagePill(true);
        }
      }
    } else if (!isLoading && messages.length > 0 && prevMessageLenRef.current === 0) {
      // Initial load — scroll to bottom
      bottomRef.current?.scrollIntoView();
    }
    prevMessageLenRef.current = messages.length;
  }, [messages.length, isLoading]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMessagePill(false);
  };

  // Infinite scroll — load more on scroll to top
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 50 && hasMore && !isLoading) {
      loadMore();
    }
    // Hide pill if scrolled to bottom
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isAtBottom) setShowNewMessagePill(false);
  }, [hasMore, isLoading, loadMore]);

  // ─── Group messages by date + 5-min sender grouping ────────────────────

  const otherName =
    otherUser?.full_name || otherUser?.email?.split("@")[0] || "Loading...";
  const otherInitials = getUserInitials(otherUser);
  const otherIsOnline = otherUser ? isOnline(otherUser.id) : false;

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
        <div className="relative">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-white">{otherInitials}</span>
          </div>
          {otherIsOnline && (
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-navy-900">{otherName}</h3>
          <p className="text-[11px] text-muted-foreground">
            {otherIsOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="relative mb-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center">
                <span className="text-xl font-medium text-white">{otherInitials}</span>
              </div>
              {otherIsOnline && (
                <div className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </div>
            <p className="text-sm font-medium text-navy-900">
              Start your conversation with {otherName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Send a message to begin chatting.
            </p>
          </div>
        ) : (
          <div className="py-4">
            {/* Infinite scroll loading indicator */}
            {isLoading && hasMore && (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const msgDate = new Date(msg.created_at);
              const prevDate = prev ? new Date(prev.created_at) : null;

              // Date divider
              const showDateDivider = !prevDate || !isSameDay(msgDate, prevDate);

              // 5-min grouping: show header if different sender or >5 min gap
              const showHeader =
                !prev ||
                prev.sender_id !== msg.sender_id ||
                msgDate.getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000 ||
                showDateDivider;

              return (
                <div key={msg.id}>
                  {showDateDivider && (
                    <div className="flex items-center gap-4 px-4 py-2 my-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs font-medium text-muted-foreground px-2">
                        {formatDateLabel(msgDate)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <DMMessageRow
                    message={msg}
                    currentUserId={currentUserId}
                    showHeader={showHeader}
                  />
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
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
      <DMMessageInput
        threadId={threadId}
        currentUserId={currentUserId}
        orgId={orgId}
        placeholder={`Message ${otherName}...`}
        onMessageSent={() => markRead().catch(() => {})}
      />
    </div>
  );
}
