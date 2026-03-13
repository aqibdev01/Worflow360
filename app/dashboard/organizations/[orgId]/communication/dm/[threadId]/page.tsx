"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getDMMessages,
  sendDM,
  updateDMLastRead,
} from "@/lib/communication/dm";
import { supabase } from "@/lib/supabase";
import { MessageBubble } from "@/components/chat/message-bubble";
import { format, isSameDay } from "date-fns";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DMPage() {
  const params = useParams();
  const threadId = params.threadId as string;
  const { user } = useAuth();
  const currentUserId = user?.id || "";

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load thread participant info
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

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const msgs = await getDMMessages(threadId, 100);
      setMessages(msgs || []);
    } catch (err) {
      console.error("Error loading DM messages:", err);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Mark as read
  useEffect(() => {
    if (!threadId) return;
    updateDMLastRead(threadId).catch(() => {});
  }, [threadId, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, loading]);

  // Subscribe to realtime DM messages
  useEffect(() => {
    if (!threadId) return;

    const subscription = supabase
      .channel(`dm:${threadId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload: any) => {
          // Fetch the full message with user details
          (supabase as any)
            .from("direct_messages")
            .select("*, users:sender_id(id, email, full_name, avatar_url)")
            .eq("id", payload.new.id)
            .single()
            .then(({ data }: any) => {
              if (data) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === data.id)) return prev;
                  return [...prev, data];
                });
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [threadId]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
    }
  }, [content]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      await sendDM(threadId, trimmed);
      setContent("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const otherName =
    otherUser?.full_name ||
    otherUser?.email?.split("@")[0] ||
    "Loading...";
  const otherInitials = otherUser?.full_name
    ? otherUser.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : otherName[0]?.toUpperCase() || "?";

  // Group messages by date
  const groupedMessages: { date: Date; messages: any[] }[] = [];
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
    <div className="flex-1 flex flex-col min-w-0">
      {/* DM Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium text-white">
            {otherInitials}
          </span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-navy-900">{otherName}</h3>
          {otherUser?.email && (
            <p className="text-xs text-muted-foreground">{otherUser.email}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center mb-4">
              <span className="text-lg font-medium text-white">
                {otherInitials}
              </span>
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
            {groupedMessages.map((group, gi) => (
              <div key={gi}>
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
                    message={{
                      ...msg,
                      reply_count: 0,
                      is_edited: false,
                      is_deleted: msg.is_deleted || false,
                      message_reactions: [],
                    }}
                    currentUserId={currentUserId}
                    isThreadReply={true}
                  />
                ))}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* DM Input */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${otherName}...`}
              rows={1}
              className="w-full resize-none rounded-lg border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder:text-muted-foreground"
              style={{ maxHeight: 150 }}
              disabled={sending}
            />
          </div>
          <Button
            size="sm"
            className="h-9 w-9 p-0 flex-shrink-0 bg-brand-blue hover:bg-brand-blue/90"
            onClick={handleSend}
            disabled={sending || !content.trim()}
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Press Enter to send, Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
}
